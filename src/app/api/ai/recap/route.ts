import { NextRequest, NextResponse } from 'next/server'

// POST /api/ai/recap — Generate a concise 2-sentence AI recap of a memory
// Used automatically after memory creation for the Drawer preview
// Optimized: Groq first (<200ms), then Gemini, then z-ai fallback
export async function POST(req: NextRequest) {
  try {
    const { content, title } = await req.json()

    if (!content?.trim()) {
      return NextResponse.json({ recap: '' }, { status: 400 })
    }

    const truncatedContent = content.slice(0, 1500)
    const promptText = title?.trim()
      ? `Title: "${title}"\n\nContent: ${truncatedContent}`
      : truncatedContent

    // ── Attempt 1: Groq (fastest — <200ms TTFB) ────────────────────────
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
              {
                role: 'system',
                content: 'You are a brilliant note-summarizer. Given a user\'s note or thought, write exactly 2 concise, satisfying sentences that capture the essence. Be specific and informative. Output ONLY the 2 sentences, nothing else.',
              },
              {
                role: 'user',
                content: `Summarize this thought in exactly 2 sentences:\n\n${promptText}`,
              },
            ],
            temperature: 0.3,
            max_tokens: 150,
          }),
        })

        if (groqRes.ok) {
          const data = await groqRes.json()
          const recap = data.choices?.[0]?.message?.content?.trim()
          if (recap) {
            console.log('[recap] Groq succeeded')
            return NextResponse.json({ recap })
          }
        }
      } catch (err) {
        console.warn('[recap] Groq failed:', err instanceof Error ? err.message : 'Unknown')
      }
    }

    // ── Attempt 2: Gemini 2.0 Flash ────────────────────────────────────
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

      if (GEMINI_KEY) {
        const genAI = new GoogleGenerativeAI(GEMINI_KEY)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const result = await model.generateContent([
          'You are a brilliant note-summarizer. Write exactly 2 concise, satisfying sentences that capture the essence of this thought. Be specific and informative. Output ONLY the 2 sentences.',
          `Thought:\n${promptText}`,
        ])

        const recap = result.response.text().trim()
        if (recap) {
          console.log('[recap] Gemini succeeded')
          return NextResponse.json({ recap })
        }
      }
    } catch (err) {
      console.warn('[recap] Gemini failed:', err instanceof Error ? err.message : 'Unknown')
    }

    // ── Attempt 3: z-ai-web-dev-sdk (always available) ─────────────────
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: 'You are a brilliant note-summarizer. Given a user\'s note or thought, write exactly 2 concise, satisfying sentences that capture the essence. Be specific, warm, and informative. Never use filler words. Output ONLY the 2 sentences, nothing else.',
          },
          {
            role: 'user',
            content: `Summarize this thought in exactly 2 sentences:\n\n${promptText}`,
          },
        ],
        thinking: { type: 'disabled' },
      })

      const recap = completion.choices?.[0]?.message?.content?.trim()
      if (recap) {
        console.log('[recap] z-ai succeeded')
        return NextResponse.json({ recap })
      }
    } catch (err) {
      console.warn('[recap] z-ai failed:', err instanceof Error ? err.message : 'Unknown')
    }

    return NextResponse.json({ recap: '' })
  } catch (error) {
    console.error('[recap] Error:', error instanceof Error ? error.message : 'Unknown')
    return NextResponse.json({ recap: '' })
  }
}
