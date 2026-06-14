import { NextRequest, NextResponse } from 'next/server'

// POST /api/ai/summary - Auto-generate summary for content
// Optimized: Groq first (<200ms), then Gemini, then z-ai fallback
export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()

    if (!content?.trim()) {
      return NextResponse.json({ summary: '' }, { status: 400 })
    }

    const truncatedContent = content.slice(0, 1000)

    // ── Attempt 1: Groq (fastest — <200ms TTFB) ──────────────────────
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
                content: 'You are a concise summarizer. Summarize the user\'s thought in 1-2 friendly, conversational sentences. Be warm but informative.',
              },
              {
                role: 'user',
                content: `Summarize this:\n\n${truncatedContent}`,
              },
            ],
            temperature: 0.3,
            max_tokens: 150,
          }),
        })

        if (groqRes.ok) {
          const data = await groqRes.json()
          const summary = data.choices?.[0]?.message?.content?.trim()
          if (summary) {
            console.log('[summary] Groq succeeded')
            return NextResponse.json({ summary })
          }
        }
      } catch (err) {
        console.warn('[summary] Groq failed:', err instanceof Error ? err.message : 'Unknown')
      }
    }

    // ── Attempt 2: z-ai-web-dev-sdk (always available) ──────────────
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'You are a concise summarizer. Summarize the user\'s thought in 1-2 friendly, conversational sentences. Be warm but informative.' },
          { role: 'user', content: `Summarize this:\n\n${truncatedContent}` },
        ],
        thinking: { type: 'disabled' },
      })

      const summary = completion.choices?.[0]?.message?.content?.trim()
      if (summary) {
        console.log('[summary] z-ai succeeded')
        return NextResponse.json({ summary })
      }
    } catch (err) {
      console.warn('[summary] z-ai failed:', err instanceof Error ? err.message : 'Unknown')
    }

    // ── Attempt 3: Gemini ──────────────────────────────────────────
    try {
      const { generateSummary } = await import('@/lib/gemini')
      const summary = await generateSummary(truncatedContent)
      if (summary) {
        console.log('[summary] Gemini succeeded')
        return NextResponse.json({ summary })
      }
    } catch (err) {
      console.warn('[summary] Gemini failed:', err instanceof Error ? err.message : 'Unknown')
    }

    return NextResponse.json({ summary: '' })
  } catch (error) {
    console.error('[summary] Error:', error)
    return NextResponse.json({ summary: '' })
  }
}
