import { NextResponse } from 'next/server'
import { generateTopicIcon } from '@/lib/ai'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')?.trim()

  if (!name || name.length < 2) {
    return NextResponse.json({ icon: '📚' })
  }

  try {
    const icon = await generateTopicIcon(name)
    return NextResponse.json({ icon })
  } catch (error) {
    console.warn('[GET /api/topics/suggest-icon] AI error:', error)
    return NextResponse.json({ icon: '📚' })
  }
}
