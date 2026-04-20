import { NextResponse } from 'next/server'

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: Request) {
  try {
    const { messages, topicName, topicContext } = await req.json() as {
      messages: ConversationMessage[]
      topicName: string
      topicContext?: string   // sample sentences from topic to ground AI
    }

    const apiKey = process.env.AI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ statusCode: 500, message: 'AI_API_KEY not configured', data: null, errors: null }, { status: 500 })
    }

    const systemPrompt = `You are Alex, a friendly and patient native American English speaker.
Your job is to have a natural conversation with a Vietnamese English learner about the topic: "${topicName}".
${topicContext ? `\nKey phrases and sentences related to this topic:\n${topicContext}\n` : ''}
Rules:
- Keep each response SHORT (2–3 sentences max). Never lecture.
- Use natural, everyday English. Avoid overly formal or academic language.
- If the user makes a grammar or vocabulary mistake, gently correct it ONCE, naturally woven into your reply.
- Ask a follow-up question to keep the conversation going.
- If the user writes in Vietnamese, kindly encourage them to try in English first, then help them rephrase.
- Stay on topic: "${topicName}". Redirect naturally if conversation drifts.
- Never translate full sentences for the user — guide them instead.`

    // Limit to last 10 messages to control token usage
    const trimmedMessages = messages.slice(-10)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 150,   // short replies to keep it conversational
        messages: [
          { role: 'system', content: systemPrompt },
          ...trimmedMessages,
        ],
      }),
    }).finally(() => clearTimeout(timeout))

    if (!res.ok) {
      const errText = await res.text().catch(() => 'no body')
      return NextResponse.json({ statusCode: 502, message: `AI error: ${res.status}`, data: null, errors: { groq: errText } }, { status: 502 })
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const reply = data.choices?.[0]?.message?.content?.trim() ?? ''

    if (!reply) {
      return NextResponse.json({ statusCode: 502, message: 'AI returned empty response', data: null, errors: null }, { status: 502 })
    }

    return NextResponse.json({ statusCode: 200, message: 'ok', data: { reply }, errors: null })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ statusCode: 500, message: msg, data: null, errors: null }, { status: 500 })
  }
}
