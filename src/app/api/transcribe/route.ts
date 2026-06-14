import { NextRequest, NextResponse } from 'next/server'

// POST /api/transcribe — Voice transcription via Groq Whisper
// Accepts audio form-data blob, returns transcribed text string
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Validate file size (max 25MB for Groq Whisper)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 400 })
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY

    if (!GROQ_API_KEY) {
      // Fallback: try z-ai-web-dev-sdk
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default
        const zai = await ZAI.create()
        // z-ai doesn't have speech-to-text, so we return a hint
        console.warn('[transcribe] No GROQ_API_KEY, transcription unavailable')
        return NextResponse.json({ text: '', error: 'Voice transcription not configured' }, { status: 503 })
      } catch {
        return NextResponse.json({ text: '', error: 'Voice transcription not configured' }, { status: 503 })
      }
    }

    // Forward the audio to Groq's Whisper API
    const groqFormData = new FormData()
    groqFormData.append('file', audioFile)
    groqFormData.append('model', 'whisper-large-v3-turbo')
    groqFormData.append('response_format', 'json')
    groqFormData.append('language', 'en')

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: groqFormData,
    })

    if (!groqRes.ok) {
      const errBody = await groqRes.text()
      console.error('[transcribe] Groq API error:', groqRes.status, errBody)
      return NextResponse.json({ text: '', error: 'Transcription failed' }, { status: 502 })
    }

    const data = await groqRes.json()
    const transcribedText = data.text?.trim() || ''

    return NextResponse.json({ text: transcribedText })
  } catch (error) {
    console.error('[transcribe] Error:', error instanceof Error ? error.message : 'Unknown')
    return NextResponse.json({ text: '', error: 'Transcription failed' }, { status: 500 })
  }
}
