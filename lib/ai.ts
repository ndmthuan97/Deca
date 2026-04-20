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

export interface GeneratedPhraseResult extends GeneratedPhraseFields {
  inputType: 'sentence' | 'vocabulary'
}

// ─── Detect: từ đơn / cụm từ ngắn ≤3 từ, không kết thúc bằng dấu câu ───────
export function isVocabularyInput(text: string): boolean {
  const trimmed = text.trim()
  if (/[?.!]$/.test(trimmed)) return false   // câu có dấu kết thúc → không phải từ
  const wordCount = trimmed.split(/\s+/).length
  return wordCount <= 3
}

// ─── Prompt v2 cho CÂU giao tiếp (sentence) ─────────────────────────────────
const SENTENCE_PROMPT = (sampleSentence: string, topicName: string) =>
  `You are an expert American English language teaching assistant for Vietnamese learners. Topic: "${topicName}".

IMPORTANT RULES:
1. Use AMERICAN ENGLISH (General American accent) for ALL IPA transcriptions.
2. IPA must be accurate — use correct phonemes: ə (schwa), ɪ (kit), ʊ (foot), æ (trap), ɑː (lot), eɪ (face), oʊ (goat), aɪ (price), aʊ (mouth), ɔɪ (choice). Wrap in /slashes/.
3. Examples must be NATURAL, CONVERSATIONAL, and DIFFERENT in context from "${sampleSentence}".
4. function field: explain WHEN a real native speaker says this — include social/emotional context.
5. Return ONLY a valid JSON object. No markdown, no extra text.

Analyze: "${sampleSentence}"

{
  "type": "Communicative speech act(s), comma-separated. Choose from: Asking, Responding, Greeting, Expressing, Inviting, Instructing, Requesting, Directing, Introducing, Apologizing, Complimenting, Refusing",
  "structure": "Grammatical template. Fixed words as-is, interchangeable parts in (parentheses with / options). E.g.: 'Could you (help me / show me) (the way / the report)?'",
  "function": "Vietnamese sentence ≤15 words: WHEN and WHY a native speaker says this. Mention social context (formal/casual/urgent). Do NOT translate.",
  "translation": "Precise Vietnamese translation of '${sampleSentence}'",
  "pronunciation": "Full American English IPA of '${sampleSentence}'. Include stress marks (ˈ primary, ˌ secondary). E.g.: /haʊ ɑːr juː ˈduːɪŋ/",
  "example1": "Natural American English sentence using the SAME grammatical pattern. Different topic/scenario from '${sampleSentence}'. Sounds like something from a TV show or real conversation.",
  "example1_translation": "Vietnamese translation of example1",
  "example1_pronunciation": "Full American English IPA of example1 with stress marks",
  "example2": "Another natural American English sentence, DIFFERENT scenario and vocabulary from both '${sampleSentence}' and example1.",
  "example2_translation": "Vietnamese translation of example2",
  "example2_pronunciation": "Full American English IPA of example2 with stress marks"
}`

// ─── Prompt v2 cho TỪ VỰNG / CỤM TỪ NGẮN (vocabulary) ─────────────────────
const VOCAB_PROMPT = (word: string, topicName: string) =>
  `You are an expert American English vocabulary teaching assistant for Vietnamese learners. Topic: "${topicName}".

IMPORTANT RULES:
1. Use AMERICAN ENGLISH (General American accent) for ALL IPA transcriptions.
2. IPA must be phonemically accurate with stress marks (ˈ primary, ˌ secondary). Wrap in /slashes/.
3. Examples must feel like REAL sentences from books, podcasts, or conversations — not textbook-simple.
4. function field: explain meaning AND nuance (formal/informal, positive/negative connotation, when to use).
5. Return ONLY a valid JSON object. No markdown, no extra text.

Word/phrase: "${word}"

{
  "type": "Part(s) of speech: Noun, Verb, Adjective, Adverb, Phrasal Verb, Idiom, Preposition, Conjunction, Interjection. List all that apply, comma-separated.",
  "structure": "Word forms + collocations. Format: inflections first (e.g. 'go → went → gone'), then 2-3 natural collocations with SLOT in (parentheses). E.g.: 'go + (home/abroad/viral) | go (for a walk / out of business)'",
  "function": "Vietnamese ≤15 words: meaning, nuance, and WHEN to use '${word}'. Include register (formal/informal/slang) and connotation (positive/neutral/negative).",
  "translation": "Vietnamese meaning(s). List up to 2 most common separated by '; '. E.g.: 'chạy; hoạt động'",
  "pronunciation": "American English IPA of '${word}' with stress marks. E.g.: /ˈbjuːt̬ɪfəl/",
  "example1": "Natural, engaging American English sentence using '${word}' (or inflected form) in clear realistic context. 8-15 words. Sounds like real speech.",
  "example1_translation": "Vietnamese translation of example1",
  "example1_pronunciation": "Full American English IPA of example1 with stress marks",
  "example2": "Another natural sentence using '${word}' in a DIFFERENT meaning or context from example1. Avoid repeating vocabulary from example1.",
  "example2_translation": "Vietnamese translation of example2",
  "example2_pronunciation": "Full American English IPA of example2 with stress marks"
}`

const MODEL = 'llama-3.3-70b-versatile'  // v2: upgraded from 8b for better IPA accuracy

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
): Promise<GeneratedPhraseResult> {
  const client = getClient()
  const isVocab = isVocabularyInput(sampleSentence)
  const prompt = isVocab
    ? VOCAB_PROMPT(sampleSentence, topicName)
    : SENTENCE_PROMPT(sampleSentence, topicName)

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: isVocab ? 0.4 : 0.3,
  })

  const text = completion.choices[0]?.message?.content ?? ''
  const fields = JSON.parse(extractJson(text)) as GeneratedPhraseFields
  return { ...fields, inputType: isVocab ? 'vocabulary' : 'sentence' }
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
