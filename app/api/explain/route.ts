import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { sentence, translation, structure } = await req.json() as {
      sentence: string
      translation?: string
      structure?: string
    }

    const apiKey = process.env.AI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ statusCode: 500, message: 'AI_API_KEY not configured', data: null, errors: null }, { status: 500 })
    }

    const prompt = `Bạn là giáo viên tiếng Anh. Hãy giải thích ngắn gọn câu sau bằng tiếng Việt:

Câu: "${sentence}"
${translation ? `Nghĩa: "${translation}"` : ''}
${structure ? `Cấu trúc: "${structure}"` : ''}

Giải thích gồm 3 phần (mỗi phần 1-2 câu ngắn):
1. **Cấu trúc ngữ pháp** — phân tích cú pháp, loại câu
2. **Sắc thái & ngữ cảnh** — dùng khi nào, với ai, formal hay informal
3. **Lưu ý thường gặp** — lỗi phổ biến người Việt hay mắc hoặc điểm cần nhớ

Trả lời bằng tiếng Việt, súc tích, không bullet points thừa.`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: 'system', content: 'You are a Vietnamese English teacher. Be concise and practical.' },
          { role: 'user', content: prompt },
        ],
      }),
    }).finally(() => clearTimeout(timeout))

    if (!res.ok) {
      const errText = await res.text().catch(() => 'no body')
      console.error('[explain] Groq HTTP error', res.status, errText)
      return NextResponse.json({ statusCode: 502, message: `AI error: ${res.status}`, data: null, errors: { groq: errText } }, { status: 502 })
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const explanation = data.choices?.[0]?.message?.content?.trim() ?? ''

    if (!explanation) {
      console.error('[explain] empty response', JSON.stringify(data))
      return NextResponse.json({ statusCode: 502, message: 'AI returned empty response', data: null, errors: null }, { status: 502 })
    }

    return NextResponse.json({ statusCode: 200, message: 'ok', data: { explanation }, errors: null })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[explain] caught error:', msg)
    return NextResponse.json({ statusCode: 500, message: msg, data: null, errors: null }, { status: 500 })
  }
}
