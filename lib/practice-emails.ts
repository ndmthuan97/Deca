/**
 * lib/practice-emails.ts
 * localStorage-based CRUD for practice emails imported from NotebookLM.
 */

const KEY = 'dace:practice-emails'

export interface PracticeEmail {
  id:         string
  title:      string     // auto or user-set
  content:    string     // full email text
  topic_id?:  number     // linked Dace topic (optional)
  topic_name?: string
  source:     'notebooklm' | 'manual'
  created_at: string     // ISO string
  extracted:  boolean    // whether phrases were extracted to SRS
  word_count: number
}

function load(): PracticeEmail[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as PracticeEmail[]
  } catch { return [] }
}

function save(emails: PracticeEmail[]): void {
  localStorage.setItem(KEY, JSON.stringify(emails))
}

export function getEmails(): PracticeEmail[] {
  return load().sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function getEmail(id: string): PracticeEmail | undefined {
  return load().find(e => e.id === id)
}

export function addEmail(data: Omit<PracticeEmail, 'id' | 'created_at' | 'word_count'>): PracticeEmail {
  const emails = load()
  const email: PracticeEmail = {
    ...data,
    id:         crypto.randomUUID(),
    created_at: new Date().toISOString(),
    word_count: data.content.trim().split(/\s+/).length,
  }
  save([email, ...emails])
  return email
}

export function markExtracted(id: string): void {
  const emails = load()
  const idx = emails.findIndex(e => e.id === id)
  if (idx !== -1) { emails[idx].extracted = true; save(emails) }
}

export function deleteEmail(id: string): void {
  save(load().filter(e => e.id !== id))
}

export function updateTitle(id: string, title: string): void {
  const emails = load()
  const idx = emails.findIndex(e => e.id === id)
  if (idx !== -1) { emails[idx].title = title; save(emails) }
}
