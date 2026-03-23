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
  "type": "comma-separated sentence types if multiple apply, e.g. 'Greeting' or 'Greeting,Inviting'. Choose from: Asking, Responding, Greeting, Expressing, Inviting, Instructing, Requesting, Directing, Introducing",
  "structure": "grammatical structure with FIXED parts in plain text and VARIABLE/CHANGEABLE parts in (parentheses). Example: 'What is (your name / the problem)?' or 'I (really / so much) like (topic noun).'",
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

const DESCRIPTION_PROMPT = (topicName: string) =>
  `You are an assistant for an English learning app (target users: Vietnamese learners).
Write ONE short Vietnamese sentence (max 10 words) describing what the topic "${topicName}" covers.
Return ONLY that sentence, nothing else. Example: "Cách chào hỏi và giới thiệu bản thân."`

export async function generateTopicDescription(topicName: string): Promise<string> {
  const client = getClient()
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: DESCRIPTION_PROMPT(topicName) }],
    temperature: 0.4,
  })
  return completion.choices[0]?.message?.content?.trim() ?? ''
}
