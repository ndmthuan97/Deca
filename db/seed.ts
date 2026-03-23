import { db } from './index'
import { topics } from './schema'

const seedTopics = [
  { name: '1 - Greetings', slug: 'greetings', description: 'Các câu chào hỏi cơ bản', icon: '👋', orderIndex: 1 },
]

async function seed() {
  console.log('🌱 Seeding topics...')

  for (const topic of seedTopics) {
    await db
      .insert(topics)
      .values(topic)
      .onConflictDoNothing({ target: topics.slug })
  }

  console.log('✅ Seed completed!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
