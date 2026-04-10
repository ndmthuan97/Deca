import { NextResponse } from 'next/server'
import { generatePhraseFields, isVocabularyInput } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sampleSentence, topicName } = body

    if (!sampleSentence || typeof sampleSentence !== 'string') {
      return NextResponse.json({ error: 'sampleSentence is required' }, { status: 400 })
    }

    // Log mode for debugging
    const mode = isVocabularyInput(sampleSentence) ? 'vocabulary' : 'sentence'
    console.info(`[POST /api/generate] mode=${mode} input="${sampleSentence}"`)

    const result = await generatePhraseFields(
      sampleSentence,
      topicName || 'English Conversation'
    )

    // result includes inputType field for FE badge display
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/generate]', message)
    return NextResponse.json(
      { error: `AI generation failed: ${message}` },
      { status: 500 }
    )
  }
}
