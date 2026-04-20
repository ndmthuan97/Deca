import { NextResponse } from 'next/server'

/**
 * GET /api/conversation/topics
 * Ask Groq to generate 6 fresh, creative conversation topic suggestions.
 * Returns: { topics: Array<{ emoji, label, desc }> }
 */
export async function GET() {
  const apiKey = process.env.AI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { statusCode: 500, message: 'AI_API_KEY not configured', data: null, errors: null },
      { status: 500 }
    )
  }

  const prompt = `You are a creative English conversation coach.
Generate exactly 6 interesting, varied conversation topic suggestions for an English learner to practice with an AI.

Requirements:
- Topics should be diverse: mix everyday life, opinions, hypotheticals, experiences, current trends
- Each topic must feel fresh and natural — NOT generic (avoid: "sports", "weather", "hobbies" alone)
- Make them engaging and slightly surprising to spark genuine curiosity
- Suitable for intermediate English learners

Return ONLY valid JSON in this exact format (no markdown, no explanation):
[
  { "emoji": "🎸", "label": "Learning a new skill at 30+", "desc": "Is it harder or more rewarding to learn something new as an adult?" },
  ...
]`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 1.1,   // higher = more creative variety
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      throw new Error(`Groq ${res.status}`)
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const raw = data.choices?.[0]?.message?.content?.trim() ?? ''

    // Extract JSON array — handle potential markdown code fences
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array in response')

    const topics = JSON.parse(jsonMatch[0]) as Array<{ emoji: string; label: string; desc: string }>
    if (!Array.isArray(topics) || topics.length === 0) throw new Error('Empty topics array')

    return NextResponse.json({
      statusCode: 200, message: 'ok',
      data: { topics: topics.slice(0, 6) },
      errors: null,
    })
  } catch (err) {
    console.error('[GET /api/conversation/topics]', err)
    return NextResponse.json(
      { statusCode: 500, message: 'Failed to generate topics', data: null, errors: null },
      { status: 500 }
    )
  }
}
