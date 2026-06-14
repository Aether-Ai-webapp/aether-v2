import { NextRequest, NextResponse } from 'next/server'

// ─── Shared prompt (used by ALL AIs) ────────────────────────────────
const TAGGING_PROMPT = `Analyze this user's thought. Return a JSON object with TWO fields:
1. 'tags': an array of 3-5 relevant, lowercase tags (e.g., ['work', 'idea', 'personal', 'study', 'link', 'project', 'learning'])
2. 'category': a single category name that best describes this content (e.g., 'Finance', 'Tech', 'Personal', 'Work', 'Learning', 'Travel', 'Health', 'Design', 'Ideas', 'Recipes')

Return ONLY the raw JSON, no markdown formatting, no extra text.`

// ─── Clean JSON helper ───────────────────────────────────────────────
const cleanJsonString = (str: string): string => {
  return str
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()
}

// ─── Parse tags and category from LLM response ──────────────────────
function parseTagResponse(rawText: string): { tags: string[]; category: string } {
  const cleaned = cleanJsonString(rawText)

  let parsed: { tags: string[]; category: string }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch {
        return { tags: [], category: '' }
      }
    } else {
      return { tags: [], category: '' }
    }
  }

  const tags = Array.isArray(parsed.tags)
    ? parsed.tags
        .filter((t: unknown) => typeof t === 'string')
        .map((t: string) => t.toLowerCase().trim())
        .filter(Boolean)
        .slice(0, 5)
    : []

  const category = typeof parsed.category === 'string' && parsed.category.trim()
    ? parsed.category.trim()
    : ''

  return { tags, category }
}

// ─── Attempt 1: z-ai-web-dev-sdk (fast, always available) ───────────
async function tryZAI(content: string): Promise<string | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: TAGGING_PROMPT },
        { role: 'user', content: `User's thought:\n${content.slice(0, 1000)}` },
      ],
      thinking: { type: 'disabled' },
    })

    return completion.choices?.[0]?.message?.content || null
  } catch (err) {
    console.warn('z-ai tagging failed:', err instanceof Error ? err.message : 'Unknown')
    return null
  }
}

// ─── Attempt 2: Groq (fast & cheap) ──────────────────────────────────
async function tryGroq(content: string): Promise<string | null> {
  const groqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY
  if (!groqKey || groqKey === 'placeholder_groq_key') return null

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: `${TAGGING_PROMPT}\n\nUser's thought:\n${content.slice(0, 1000)}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 150,
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content
  return text || null
}

// ─── Attempt 3: Gemini (failover) ────────────────────────────────────
async function tryGemini(content: string): Promise<string | null> {
  const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!geminiKey) return null

  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${TAGGING_PROMPT}\n\nUser's thought:\n${content.slice(0, 1000)}` }],
      },
    ],
    generationConfig: { temperature: 0.2, maxOutputTokens: 150 },
  })

  return result.response.text() || null
}

// ─── POST /api/auto-tag ──────────────────────────────────────────────
// Multi-AI auto-tagging: z-ai → Groq → Gemini
export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()

    if (!content?.trim()) {
      return NextResponse.json({ tags: [], category: '' }, { status: 400 })
    }

    // Race the entire multi-AI flow with a 15s timeout
    const result = await Promise.race([
      getTagsWithFailover(content),
      new Promise<{ tags: string[]; category: string }>((resolve) =>
        setTimeout(() => resolve({ tags: [], category: '' }), 15000)
      ),
    ])

    return NextResponse.json(result)
  } catch (error) {
    console.error('Auto-tag error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ tags: [], category: '' })
  }
}

// ─── Failover logic: z-ai → Groq → Gemini ───────────────────────────
async function getTagsWithFailover(content: string): Promise<{ tags: string[]; category: string }> {
  // Attempt 1: z-ai-web-dev-sdk (always available, fast)
  try {
    const zaiResponse = await tryZAI(content)
    if (zaiResponse) {
      const result = parseTagResponse(zaiResponse)
      if (result.tags.length > 0) return result
    }
  } catch (error) {
    console.error('z-ai failed, falling back to Groq', error instanceof Error ? error.message : 'Unknown error')
  }

  // Attempt 2: Groq (fast & cheap)
  try {
    const groqResponse = await tryGroq(content)
    if (groqResponse) {
      const result = parseTagResponse(groqResponse)
      if (result.tags.length > 0) return result
    }
  } catch (error) {
    console.error('Groq failed, falling back to Gemini', error instanceof Error ? error.message : 'Unknown error')
  }

  // Attempt 3: Gemini (failover)
  try {
    const geminiResponse = await tryGemini(content)
    if (geminiResponse) {
      const result = parseTagResponse(geminiResponse)
      if (result.tags.length > 0) return result
    }
  } catch (error) {
    console.error('Gemini failed too', error instanceof Error ? error.message : 'Unknown error')
  }

  // All AIs failed — return empty (keyword tags from the store still apply)
  return { tags: [], category: '' }
}
