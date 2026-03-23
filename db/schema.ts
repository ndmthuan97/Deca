import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core'

// Using snake_case column names in JS to match frontend expectations
export const topics = pgTable('topics', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon').default('📚'),
  order_index: integer('order_index').default(0),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const phrases = pgTable('phrases', {
  id: serial('id').primaryKey(),
  topic_id: integer('topic_id').references(() => topics.id, { onDelete: 'cascade' }),
  type: text('type'),
  structure: text('structure'),
  function: text('function'),
  sample_sentence: text('sample_sentence').notNull(),
  translation: text('translation'),
  pronunciation: text('pronunciation'),
  example1: text('example1'),
  example1_translation: text('example1_translation'),
  example1_pronunciation: text('example1_pronunciation'),
  example2: text('example2'),
  example2_translation: text('example2_translation'),
  example2_pronunciation: text('example2_pronunciation'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type Topic = typeof topics.$inferSelect
export type NewTopic = typeof topics.$inferInsert
export type Phrase = typeof phrases.$inferSelect
export type NewPhrase = typeof phrases.$inferInsert

// Extended type returned by GET /api/topics (includes computed phrase_count)
export type TopicWithCount = Topic & { phrase_count: number }
