import { NextRequest } from 'next/server'

// POST /api/ai/chat - Chat with AI about memories (RAG-powered)
export async function POST(req: NextRequest) {
  try {
    // ── Parse request body with validation ───────────────────────────
    let message = ''
    try {
      const body = await req.json()
      message = body?.message || ''
    } catch (parseErr) {
      console.error('Chat: Failed to parse request body:', parseErr instanceof Error ? parseErr.message : 'Unknown')
      return new Response('Invalid JSON body', { status: 400 })
    }

    if (!message.trim()) {
      return new Response('Message is required', { status: 400 })
    }

    // ── Build memory context ──────────────────────────────────────────
    let memoryContext = ''
    let memoryCount = 0
    let typeSummary = ''
    let searchMethod = 'none'

    // ── ATTEMPT 1: Recent memories from Supabase ─────────────────────
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Try semantic search with pgvector first
        const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
        if (geminiKey) {
          try {
            const { GoogleGenerativeAI } = await import('@google/generative-ai')
            const genAI = new GoogleGenerativeAI(geminiKey)
            // FIX: Must pass object, not bare string
            const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })
            const embedResult = await embeddingModel.embedContent(message)
            const queryEmbedding = embedResult.embedding.values

            const { data: matchedMemories, error: rpcError } = await supabase.rpc(
              'match_memories',
              {
                query_embedding: queryEmbedding,
                match_user_id: user.id,
                match_count: 10,
              }
            )

            if (!rpcError && matchedMemories && matchedMemories.length > 0) {
              memoryCount = matchedMemories.length
              memoryContext = (matchedMemories as Record<string, unknown>[])
                .map((m) => {
                  const tags = m.tags ? (m.tags as string).split(',').filter(Boolean).join(', ') : ''
                  return `[${m.type}] "${m.title || 'Untitled'}": ${(m.content as string || '').slice(0, 300)}${tags ? ` | Tags: ${tags}` : ''}`
                })
                .join('\n')
              searchMethod = 'semantic'
            }
          } catch (semanticErr) {
            console.warn('Semantic search failed:', semanticErr instanceof Error ? semanticErr.message : 'Unknown')
          }
        }

        // Fallback: recent memories
        if (!memoryContext) {
          const { data, error } = await supabase
            .from('memories')
            .select('type, title, content, tags')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

          if (!error && data && data.length > 0) {
            memoryCount = data.length
            memoryContext = (data as Record<string, unknown>[])
              .map((m) => {
                const tags = m.tags ? (m.tags as string).split(',').filter(Boolean).join(', ') : ''
                return `[${m.type}] "${m.title || 'Untitled'}": ${(m.content as string || '').slice(0, 200)}${tags ? ` | Tags: ${tags}` : ''}`
              })
              .join('\n')
            searchMethod = 'recent'
          }
        }
      }
    } catch (supabaseErr) {
      console.warn('Supabase query failed:', supabaseErr instanceof Error ? supabaseErr.message : 'Unknown')
    }

    // ── ATTEMPT 2: Prisma fallback (last 20) ─────────────────────────
    if (!memoryContext) {
      try {
        const { db } = await import('@/lib/db')
        const memories = await db.memory.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            collections: {
              include: {
                collection: { select: { name: true } },
              },
            },
          },
        })

        memoryCount = memories.length
        const memoryTypes = memories.reduce((acc, m) => {
          acc[m.type] = (acc[m.type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        typeSummary = Object.entries(memoryTypes).map(([t, c]) => `${c} ${t}${c > 1 ? 's' : ''}`).join(', ')

        memoryContext = memories
          .map((m) => {
            const collections = m.collections.map((mc) => mc.collection.name).join(', ')
            const tags = m.tags ? m.tags.split(',').filter(Boolean).join(', ') : ''
            return `[${m.type}] "${m.title || 'Untitled'}": ${m.content.slice(0, 200)}${tags ? ` | Tags: ${tags}` : ''}${collections ? ` | Collections: ${collections}` : ''}`
          })
          .join('\n')

        searchMethod = 'recent-prisma'
      } catch (prismaErr) {
        console.warn('Prisma query failed:', prismaErr instanceof Error ? prismaErr.message : 'Unknown')
      }
    }

    // ── Build system prompt ───────────────────────────────────────────
    const systemPrompt = `You are Aether, a warm and friendly personal AI memory assistant — like a smart friend who remembers everything for them. You speak naturally, casually, and with genuine enthusiasm about helping.

${searchMethod === 'semantic'
      ? `I found the most semantically relevant memories for your question (using AI-powered search):`
      : searchMethod !== 'none'
        ? `Here are the user's recent memories:`
        : ''}

${memoryContext || 'No memories saved yet.'}

Personality & Style:
- Be warm, friendly, and conversational — like chatting with a thoughtful friend
- Use natural language: "Hey!", "Oh nice!", "I found something cool for you"
- Show genuine excitement when finding connections between memories
- Use "you" and "your" — make it personal
- Keep responses concise but warm — no corporate/robotic tone

Memory Handling:
- Reference specific memories by quoting their title or content
- When you find connections between memories, highlight them excitedly
- Use markdown formatting for readability (bold, lists, etc.)
- If memories don't answer the question, be honest but helpful — suggest what they could save
- Always end with an encouraging note or follow-up suggestion`

    // ── Try z-ai-web-dev-sdk (PRIMARY) ───────────────────────────────
    let responseText = ''
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

      responseText = completion.choices?.[0]?.message?.content || ''
      if (responseText) console.log('Chat: z-ai succeeded')
    } catch (zaiError) {
      console.warn('z-ai failed, trying Gemini:', zaiError instanceof Error ? zaiError.message : 'Unknown')
    }

    // ── Try Gemini (FAILOVER 1) ──────────────────────────────────────
    if (!responseText) {
      const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
      if (geminiKey) {
        try {
          const { GoogleGenerativeAI } = await import('@google/generative-ai')
          const genAI = new GoogleGenerativeAI(geminiKey)
          // FIX: Must pass object with model property, not bare string
          const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

          const result = await model.generateContent({
            contents: [
              { role: 'user', parts: [{ text: systemPrompt }] },
              { role: 'model', parts: [{ text: 'I am Aether, your memory assistant.' }] },
              { role: 'user', parts: [{ text: message }] },
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
          })

          responseText = result.response.text() || ''
          if (responseText) console.log('Chat: Gemini succeeded')
        } catch (geminiError) {
          console.warn('Gemini failed, trying Groq:', geminiError instanceof Error ? geminiError.message : 'Unknown')
        }
      }
    }

    // ── Try Groq (FAILOVER 2) ────────────────────────────────────────
    if (!responseText) {
      const groqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY
      if (groqKey && groqKey !== 'placeholder_groq_key') {
        try {
          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message },
              ],
              temperature: 0.7,
              max_tokens: 1024,
            }),
          })

          if (groqResponse.ok) {
            const data = await groqResponse.json()
            responseText = data.choices?.[0]?.message?.content || ''
            if (responseText) console.log('Chat: Groq succeeded')
          } else {
            console.warn('Groq API returned:', groqResponse.status, groqResponse.statusText)
          }
        } catch (groqError) {
          console.warn('Groq failed:', groqError instanceof Error ? groqError.message : 'Unknown')
        }
      }
    }

    // ── Built-in fallback (always works) ──────────────────────────────
    if (!responseText) {
      console.log('Chat: All AI providers failed, using built-in fallback')
      responseText = `Hey! 👋 Here's what I found in your memories:\n\n` +
        `You have **${memoryCount} memories** saved (${typeSummary || 'none yet'}).${searchMethod === 'semantic' ? ' (AI-powered semantic search)' : ''}\n\n` +
        (memoryCount > 0
          ? `I'd love to help you explore your memories more deeply! My AI connection is currently experiencing issues, but I can still help you browse and organize your saved content. Try the **Memories** tab to search and filter your notes.`
          : `You haven't saved any memories yet. Try typing a thought in the capture bar to add your first note, link, or idea!`)
    }

    // ── Return as streaming response (word-by-word for typing effect) ──
    const encoder = new TextEncoder()
    const words = responseText.split(/(\s+)/)
    let index = 0

    const stream = new ReadableStream({
      async pull(controller) {
        if (index < words.length) {
          controller.enqueue(encoder.encode(words[index]))
          index++
          // Small delay for natural typing feel
          if (index < words.length) {
            await new Promise((r) => setTimeout(r, 12))
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
      },
    })
  } catch (error) {
    console.error('Chat error (outer):', error)

    // Return a simple error response (not a stream, to avoid issues)
    const errorText = "I'm having trouble connecting right now. Please try again in a moment."
    return new Response(errorText, {
      status: 200, // Return 200 so the frontend doesn't throw
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}
