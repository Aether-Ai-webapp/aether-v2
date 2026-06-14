import { NextRequest, NextResponse } from 'next/server'

// POST /api/ai/summary - Auto-generate summary for content
export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()

    if (!content?.trim()) {
      return NextResponse.json({ summary: '' }, { status: 400 })
    }

    const truncatedContent = content.slice(0, 1000)

    // ── Attempt 1: z-ai-web-dev-sdk (always available) ──────────────
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
        return NextResponse.json({ summary })
      }
    } catch (err) {
      console.warn('z-ai summary failed:', err instanceof Error ? err.message : 'Unknown')
    }

    // ── Attempt 2: Gemini ──────────────────────────────────────────
    try {
      const { generateSummary } = await import('@/lib/gemini')
      const summary = await generateSummary(truncatedContent)
      if (summary) {
        return NextResponse.json({ summary })
      }
    } catch (err) {
      console.warn('Gemini summary failed:', err instanceof Error ? err.message : 'Unknown')
    }

    return NextResponse.json({ summary: '' })
  } catch (error) {
    console.error('Summary generation error:', error)
    return NextResponse.json({ summary: '' })
  }
}
