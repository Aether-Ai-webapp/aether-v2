import { NextRequest } from 'next/server'

// ═══════════════════════════════════════════════════════════════════════
// POST /api/ai/chat — RAG-powered AI chat with memory synthesis
//
// Pipeline: User Query → Embedding → Vector Search → Context Injection
//           → Fast Streaming LLM (Groq > Gemini Flash > z-ai fallback)
//
// Speed Optimizations:
//   - Groq llama-3.3-70b-versatile with TRUE SSE streaming (<100ms TTFB)
//   - Gemini 1.5 Flash as failover (fast, non-streaming)
//   - z-ai-web-dev-sdk as last resort (always available, slower)
//
// Synthesis Optimizations:
//   - Top-10 semantic search via pgvector match_memories RPC
//   - Rich context: content (500 chars), summary, recap, tags, timestamps
//   - Synthesis-focused system prompt that connects dots across memories
// ═══════════════════════════════════════════════════════════════════════

// ── Synthesis System Prompt (injected with retrieved memories) ─────────
function buildSystemPrompt(memoryContext: string, memoryCount: number): string {
  return `You are Aether, the user's highly advanced digital Second Brain. Your superpower is synthesis. You are being provided a user query and a collection of retrieved memories from their database.

Retrieved Memories Context:
${memoryContext || 'No memories found in the database yet.'}

Instructions:
1. Analyze ALL the provided memories simultaneously to connect the dots. Look for hidden patterns, related topics, or timelines across separate notes.
2. Formulate a highly concise, satisfying, and direct response that synthesizes these memories together to answer the user's true intent.
3. If the memories contain conflicting or evolutionary updates over time, synthesize them chronologically.
4. Keep the tone sharp, premium, and clean. Never say "Based on the context provided". Speak naturally as their internal brain extension.`
}

// ── Format a single memory for the context block ───────────────────────
function formatMemory(m: Record<string, unknown>): string {
  const type = (m.type as string || 'text').toUpperCase()
  const title = m.title ? `"${m.title}"` : 'Untitled'
  const content = (m.content as string || '').slice(0, 500)
  const tags = m.tags ? (m.tags as string).split(',').filter(Boolean).join(', ') : ''
  const summary = m.summary ? ` | Summary: ${(m.summary as string).slice(0, 200)}` : ''
  const recap = m.recap ? ` | Recap: ${(m.recap as string).slice(0, 200)}` : ''
  const date = m.created_at
    ? ` [${new Date(m.created_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}]`
    : ''

  return `[${type}]${date} ${title}: ${content}${tags ? ` | Tags: ${tags}` : ''}${summary}${recap}`
}

// ── RAG: Retrieve memories via semantic search or recent fallback ──────
async function retrieveMemories(
  message: string,
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server')['createClient']>>,
  userId: string
): Promise<{ context: string; count: number; method: string }> {
  // ── ATTEMPT 1: Semantic search with pgvector ───────────────────────
  const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(geminiKey)
      const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })
      const embedResult = await embeddingModel.embedContent(message)
      const queryEmbedding = embedResult.embedding.values

      const { data: matchedMemories, error: rpcError } = await supabase.rpc(
        'match_memories',
        {
          query_embedding: queryEmbedding,
          match_user_id: userId,
          match_count: 10,
        }
      )

      if (!rpcError && matchedMemories && matchedMemories.length > 0) {
        const context = (matchedMemories as Record<string, unknown>[])
          .map(formatMemory)
          .join('\n\n')
        return { context, count: matchedMemories.length, method: 'semantic' }
      }
    } catch (semanticErr) {
      console.warn('[chat] Semantic search failed:', semanticErr instanceof Error ? semanticErr.message : 'Unknown')
    }
  }

  // ── ATTEMPT 2: Recent memories fallback ─────────────────────────────
  try {
    const { data, error } = await supabase
      .from('memories')
      .select('type, title, content, summary, recap, tags, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data && data.length > 0) {
      const context = (data as Record<string, unknown>[])
        .map(formatMemory)
        .join('\n\n')
      return { context, count: data.length, method: 'recent' }
    }
  } catch (recentErr) {
    console.warn('[chat] Recent memories fallback failed:', recentErr instanceof Error ? recentErr.message : 'Unknown')
  }

  return { context: '', count: 0, method: 'none' }
}

// ── Parse Groq SSE stream and yield text deltas ───────────────────────
async function* parseGroqSSE(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data: ')) continue

        try {
          const parsed = JSON.parse(trimmed.slice(6))
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) yield delta
        } catch {
          // Malformed SSE chunk — skip
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    // ── 1. Parse & validate request ────────────────────────────────────
    let message = ''
    try {
      const body = await req.json()
      message = body?.message || ''
    } catch (parseErr) {
      console.error('[chat] Failed to parse request body:', parseErr instanceof Error ? parseErr.message : 'Unknown')
      return new Response('Invalid JSON body', { status: 400 })
    }

    if (!message.trim()) {
      return new Response('Message is required', { status: 400 })
    }

    // ── 2. RAG: Retrieve memory context ────────────────────────────────
    let memoryContext = ''
    let memoryCount = 0
    let searchMethod = 'none'

    // Try Supabase (authenticated user)
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const result = await retrieveMemories(message, supabase, user.id)
        memoryContext = result.context
        memoryCount = result.count
        searchMethod = result.method
      }
    } catch (supabaseErr) {
      console.warn('[chat] Supabase query failed:', supabaseErr instanceof Error ? supabaseErr.message : 'Unknown')
    }

    // Prisma fallback (unauthenticated / shared pool)
    if (!memoryContext) {
      try {
        const { db } = await import('@/lib/db')
        const memories = await db.memory.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            type: true, title: true, content: true, tags: true,
            summary: true, recap: true, createdAt: true,
          },
        })

        if (memories.length > 0) {
          memoryCount = memories.length
          memoryContext = memories
            .map((m) => formatMemory(m as unknown as Record<string, unknown>))
            .join('\n\n')
          searchMethod = 'recent-prisma'
        }
      } catch (prismaErr) {
        console.warn('[chat] Prisma query failed:', prismaErr instanceof Error ? prismaErr.message : 'Unknown')
      }
    }

    // ── 3. Build synthesis system prompt ───────────────────────────────
    const systemPrompt = buildSystemPrompt(memoryContext, memoryCount)
    console.log(`[chat] RAG: ${searchMethod} | ${memoryCount} memories | query: "${message.slice(0, 60)}"`)

    // ── 4. Try Groq with TRUE SSE streaming (PRIMARY — fastest) ───────
    const groqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY
    if (groqKey && groqKey !== 'placeholder_groq_key') {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
            stream: true,
            temperature: 0.7,
            max_tokens: 1024,
          }),
        })

        if (groqRes.ok && groqRes.body) {
          console.log('[chat] Streaming via Groq llama-3.3-70b-versatile')

          // Pipe Groq SSE → raw text stream → client
          const encoder = new TextEncoder()

          const stream = new ReadableStream({
            async start(controller) {
              try {
                for await (const delta of parseGroqSSE(groqRes.body!)) {
                  controller.enqueue(encoder.encode(delta))
                }
              } catch (streamErr) {
                console.warn('[chat] Groq stream interrupted:', streamErr instanceof Error ? streamErr.message : 'Unknown')
              } finally {
                controller.close()
              }
            },
          })

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Transfer-Encoding': 'chunked',
              'X-RAG-Method': searchMethod,
              'X-RAG-Count': String(memoryCount),
              'X-LLM-Provider': 'groq',
            },
          })
        } else {
          const errBody = await groqRes.text()
          console.warn('[chat] Groq API error:', groqRes.status, errBody.slice(0, 200))
        }
      } catch (groqError) {
        console.warn('[chat] Groq failed:', groqError instanceof Error ? groqError.message : 'Unknown')
      }
    }

    // ── 5. Try Gemini 1.5 Flash (FAILOVER 1 — fast, non-streaming) ────
    const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (geminiKey) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const result = await model.generateContent({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'I am Aether, your second brain. I synthesize your memories to answer your questions.' }] },
            { role: 'user', parts: [{ text: message }] },
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        })

        const responseText = result.response.text() || ''
        if (responseText) {
          console.log('[chat] Gemini 2.0 Flash succeeded (non-streaming)')
          // Simulated streaming for consistent UX
          return createSimulatedStream(responseText, searchMethod, memoryCount, 'gemini')
        }
      } catch (geminiError) {
        console.warn('[chat] Gemini failed:', geminiError instanceof Error ? geminiError.message : 'Unknown')
      }
    }

    // ── 6. Try z-ai-web-dev-sdk (FAILOVER 2 — always available) ───────
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content: message },
        ],
        thinking: { type: 'disabled' },
      })

      const responseText = completion.choices?.[0]?.message?.content || ''
      if (responseText) {
        console.log('[chat] z-ai succeeded (non-streaming)')
        return createSimulatedStream(responseText, searchMethod, memoryCount, 'z-ai')
      }
    } catch (zaiError) {
      console.warn('[chat] z-ai failed:', zaiError instanceof Error ? zaiError.message : 'Unknown')
    }

    // ── 7. Built-in fallback (always works) ────────────────────────────
    console.log('[chat] All AI providers failed — using built-in fallback')
    const fallbackText = `I found **${memoryCount} memories** in your database${
      searchMethod === 'semantic' ? ' (via AI semantic search)' : ''
    }.\n\n${
      memoryCount > 0
        ? `My AI connection is currently experiencing issues, but your memories are safe. Try again in a moment for a synthesized response, or browse the **Memories** tab directly.`
        : `You haven't saved any memories yet. Use the capture bar to add your first thought!`
    }`

    return createSimulatedStream(fallbackText, searchMethod, memoryCount, 'fallback')
  } catch (error) {
    console.error('[chat] Outer error:', error)
    const errorText = "I'm having trouble connecting right now. Please try again in a moment."
    return new Response(errorText, {
      status: 200, // Return 200 so the frontend doesn't throw
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

// ── Helper: Create simulated word-by-word stream for non-streaming LLMs ─
function createSimulatedStream(
  text: string,
  searchMethod: string,
  memoryCount: number,
  provider: string
): Response {
  const encoder = new TextEncoder()
  const words = text.split(/(\s+)/)
  let index = 0

  const stream = new ReadableStream({
    async pull(controller) {
      if (index < words.length) {
        controller.enqueue(encoder.encode(words[index]))
        index++
        // Small delay for natural typing feel
        if (index < words.length) {
          await new Promise((r) => setTimeout(r, 10))
        }
      } else {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-RAG-Method': searchMethod,
      'X-RAG-Count': String(memoryCount),
      'X-LLM-Provider': provider,
    },
  })
}
