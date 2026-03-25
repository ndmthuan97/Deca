import Groq from 'groq-sdk'

export interface GeneratedPhraseFields {
  type: string
  structure: string
  function: string
  translation: string
  pronunciation: string
  example1: string
  example1_translation: string
  example1_pronunciation: string
  example2: string
  example2_translation: string
  example2_pronunciation: string
}

const PROMPT = (sampleSentence: string, topicName: string) =>
  `You are an American English language teaching assistant. Topic: "${topicName}".
Use AMERICAN ENGLISH pronunciation (General American accent) for all IPA transcriptions.
Analyze this sentence: "${sampleSentence}"

Return ONLY a valid JSON object with these fields — follow each field's purpose EXACTLY:

{
  "type": "The communicative speech act type(s), comma-separated if multiple. Choose from: Asking, Responding, Greeting, Expressing, Inviting, Instructing, Requesting, Directing, Introducing",
  "structure": "The grammatical pattern/template: write FIXED words as-is, wrap INTERCHANGEABLE parts in (parentheses with / options). Example: 'What is (your name / your issue)?' or 'I (really / totally) enjoy (activity).'",
  "function": "A SHORT Vietnamese sentence (≤15 words) explaining WHEN and WHY a speaker uses this sentence in conversation. Do NOT translate — explain the communicative purpose.",
  "translation": "The Vietnamese TRANSLATION of the sentence '${sampleSentence}' — translate the meaning, not explain it.",
  "pronunciation": "Full IPA transcription of '${sampleSentence}' in American English, wrapped in slashes. Example: /haʊ ɑːr juː/",
  "example1": "A NEW natural American English sentence using the same pattern — MUST be completely different from '${sampleSentence}'",
  "example1_translation": "Vietnamese translation of example1",
  "example1_pronunciation": "IPA transcription of example1 in American English",
  "example2": "Another NEW American English sentence with the same pattern — MUST differ from both '${sampleSentence}' and example1",
  "example2_translation": "Vietnamese translation of example2",
  "example2_pronunciation": "IPA transcription of example2 in American English"
}`

const MODEL = 'llama-3.1-8b-instant'

// Robust JSON extraction (handle markdown code blocks)
function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) return match[1].trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]
  return text
}

let groqClient: Groq | null = null
function getClient(): Groq {
  if (!process.env.AI_API_KEY) throw new Error('AI_API_KEY chưa được cấu hình trong .env.local')
  return (groqClient ??= new Groq({ apiKey: process.env.AI_API_KEY }))
}

export async function generatePhraseFields(
  sampleSentence: string,
  topicName: string
): Promise<GeneratedPhraseFields> {
  const client = getClient()

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: PROMPT(sampleSentence, topicName) }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const text = completion.choices[0]?.message?.content ?? ''
  return JSON.parse(extractJson(text)) as GeneratedPhraseFields
}

const ICON_PROMPT = (topicName: string) =>
  `You are a helpful assistant. I am creating a topic for an English learning app.
The topic name is: "${topicName}".
Please return a single relevant Unicode emoji that represents this topic.
Return ONLY the emoji character, nothing else. For example, if the topic is "Food", return 🍔. If the topic is "Travel", return ✈️.`

export async function generateTopicIcon(topicName: string): Promise<string> {
  const client = getClient()

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: ICON_PROMPT(topicName) }],
    temperature: 0.2,
  })

  const text = completion.choices[0]?.message?.content?.trim() ?? ''
  const match = text.match(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F/u)
  return match ? match[0] : '📚'
}

const DESCRIPTION_PROMPT = (topicName: string) =>
  `You are an assistant for an English learning app (target users: Vietnamese learners).
Write ONE short Vietnamese sentence (max 10 words) describing what the topic "${topicName}" covers.
Return ONLY that sentence, nothing else. Example: "Cách chào hỏi và giới thiệu bản thân."`

export async function generateTopicDescription(topicName: string): Promise<string> {
  const client = getClient()
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: DESCRIPTION_PROMPT(topicName) }],
    temperature: 0.4,
  })
  return completion.choices[0]?.message?.content?.trim() ?? ''
}
