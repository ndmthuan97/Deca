import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export interface CapturedSentence {
  sentence: string
  translation: string
  note: string   // short Vietnamese note on why this sentence is useful
}

const EXTRACT_PROMPT = (text: string) => `You are an English learning assistant for Vietnamese learners.

Given the following raw text (could be a transcript, article, conversation, or any English content):

---
${text.slice(0, 3000)}
---

Extract the 5 to 15 MOST USEFUL English sentences or phrases for a Vietnamese learner to memorize.

Criteria for selection:
- Natural, conversational sentences that a native speaker would actually say
- Useful in daily life or professional communication
- Not too long (under 20 words)
- Prefer varied grammar patterns
- Skip filler words, repeated sentences, or trivial phrases

Return ONLY a valid JSON array. Each item must have:
{
  "sentence": "The original English sentence",
  "translation": "Bản dịch tiếng Việt ngắn gọn",
  "note": "Câu này hữu ích vì... (tối đa 10 từ tiếng Việt)"
}

Return ONLY the JSON array, no explanation.`

export async function POST(req: Request) {
  try {
    const { text } = await req.json() as { text: string }

    if (!text?.trim() || text.trim().length < 20) {
      return NextResponse.json(
        { statusCode: 400, message: 'Text quá ngắn (cần ít nhất 20 ký tự)', data: null, errors: null },
        { status: 400 },
      )
    }

    const apiKey = process.env.AI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ statusCode: 500, message: 'AI_API_KEY not configured', data: null, errors: null }, { status: 500 })
    }

    const groq = new Groq({ apiKey })

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',   // fast model — just extraction
      temperature: 0.3,
      max_tokens: 1500,
      messages: [{ role: 'user', content: EXTRACT_PROMPT(text) }],
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content ?? '[]'

    // Handle both array and {sentences: [...]} shape
    let parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>
      parsed = obj.sentences ?? obj.data ?? obj.results ?? obj.items ?? Object.values(obj)[0] ?? []
    }

    const sentences = Array.isArray(parsed) ? parsed as CapturedSentence[] : []

    return NextResponse.json({
      statusCode: 200,
      message: `Trích được ${sentences.length} câu`,
      data: { sentences },
      errors: null,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[POST /api/phrases/quick-capture]', msg)
    return NextResponse.json({ statusCode: 500, message: msg, data: null, errors: null }, { status: 500 })
  }
}
