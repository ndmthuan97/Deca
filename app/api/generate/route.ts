import { NextResponse } from 'next/server'
import { generatePhraseFields } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sampleSentence, topicName } = body

    if (!sampleSentence) {
      return NextResponse.json({ error: 'sampleSentence is required' }, { status: 400 })
    }

    const fields = await generatePhraseFields(
      sampleSentence,
      topicName || 'English Conversation'
    )

    return NextResponse.json(fields)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/generate]', message)
    return NextResponse.json(
      { error: `AI generation failed: ${message}` },
      { status: 500 }
    )
  }
}
