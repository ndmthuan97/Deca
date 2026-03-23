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
Return ONLY a valid JSON object for this sentence: "${sampleSentence}"

{
  "type": "sentence type (Asking/Responding/Greeting/Expressing/etc.)",
  "structure": "grammatical pattern, e.g. Who + are + (you)?",
  "function": "brief Vietnamese description of usage",
  "translation": "Vietnamese translation",
  "pronunciation": "American English IPA transcription e.g. /huː ɑːr juː/",
  "example1": "natural American English example",
  "example1_translation": "Vietnamese translation of example1",
  "example1_pronunciation": "American English IPA of example1",
  "example2": "another American English example",
  "example2_translation": "Vietnamese translation of example2",
  "example2_pronunciation": "American English IPA of example2"
}`

let groqClient: Groq | null = null
function getClient(): Groq {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY chưa được cấu hình trong .env.local')
  return (groqClient ??= new Groq({ apiKey: process.env.GROQ_API_KEY }))
}

export async function generatePhraseFields(
  sampleSentence: string,
  topicName: string
): Promise<GeneratedPhraseFields> {
  const client = getClient()

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: PROMPT(sampleSentence, topicName) }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const text = completion.choices[0]?.message?.content ?? ''
  return JSON.parse(text) as GeneratedPhraseFields
}

const ICON_PROMPT = (topicName: string) =>
  `You are a helpful assistant. I am creating a topic for an English learning app.
The topic name is: "${topicName}".
Please return a single relevant Unicode emoji that represents this topic.
Return ONLY the emoji character, nothing else. For example, if the topic is "Food", return 🍔. If the topic is "Travel", return ✈️.`

export async function generateTopicIcon(topicName: string): Promise<string> {
  const client = getClient()

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: ICON_PROMPT(topicName) }],
    temperature: 0.2,
  })

  const text = completion.choices[0]?.message?.content?.trim() ?? ''
  // Try to extract just the first emoji if the model returned extra text
  const match = text.match(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F/u)
  return match ? match[0] : '📚' // Default to book if no emoji found
}
