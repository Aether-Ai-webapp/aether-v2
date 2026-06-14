import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI | null {
  if (!API_KEY) return null
  if (!genAI) {
    try {
      genAI = new GoogleGenerativeAI(API_KEY)
    } catch {
      return null
    }
  }
  return genAI
}

export async function chatWithGemini(systemPrompt: string, userMessage: string): Promise<string> {
  const ai = getGenAI()
  if (!ai) throw new Error('Gemini API key not configured')

  // Use gemini-2.0-flash for fast responses (successor to 1.5 Flash)
  const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'I understand. I am Aether, your personal AI memory assistant.' }] },
      { role: 'user', parts: [{ text: userMessage }] },
    ],
    generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 1024 },
  })

  return result.response.text() || 'I couldn\'t generate a response.'
}

export async function generateTags(content: string): Promise<string[]> {
  const ai = getGenAI()
  if (!ai) return []

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Generate 3-5 relevant tags for the following content. Return ONLY comma-separated tags, nothing else:\n\n' + content.slice(0, 500) }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 100 },
    })
    const text = result.response.text()
    return text.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 5)
  } catch {
    return []
  }
}

export async function generateSummary(content: string): Promise<string> {
  const ai = getGenAI()
  if (!ai) return ''

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Summarize the following in 1-2 concise sentences:\n\n' + content.slice(0, 500) }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 150 },
    })
    return result.response.text().trim()
  } catch {
    return ''
  }
}

/**
 * Generate a 2-sentence AI recap of a memory for the Drawer preview.
 * Tries Groq first (fastest), then falls back to Gemini.
 */
export async function generateRecap(content: string, title?: string): Promise<string> {
  const promptText = title?.trim()
    ? `Title: "${title}"\n\nContent: ${content.slice(0, 1500)}`
    : content.slice(0, 1500)

  // ── Attempt 1: Groq (fastest — <200ms) ────────────────────────────
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
        if (recap) return recap
      }
    } catch {
      // Fall through to Gemini
    }
  }

  // ── Attempt 2: Gemini Flash ───────────────────────────────────────
  const ai = getGenAI()
  if (ai) {
    try {
      const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' })
      const result = await model.generateContent([
        'You are a brilliant note-summarizer. Write exactly 2 concise, satisfying sentences that capture the essence of this thought. Be specific and informative. Output ONLY the 2 sentences.',
        `Thought:\n${promptText}`,
      ])
      const recap = result.response.text().trim()
      if (recap) return recap
    } catch {
      // Fall through
    }
  }

  return ''
}
