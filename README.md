# 🎓 Dace — English Learning Platform

A personal, desktop-first English learning platform built around **Spaced Repetition (SRS)**, AI-powered phrase analysis, and keyboard-driven workflows. Designed for serious learners who want to own their vocabulary data.

---

## ✨ Feature Overview

### 📚 Core Learning
| Feature | Description |
|---|---|
| **Topic Management** | Organize phrases by topic with emoji icons, search, and pagination |
| **AI Auto-fill** | Groq (llama-3.3-70b) fills IPA pronunciation, translation, grammatical function, structure, and 2 contextual examples |
| **SRS Review** (SM-2) | Spaced repetition with 4 ratings: Again / Hard / Good / Easy |
| **Learn Mode** | 4-stage adaptive learning: Introduce → Multiple Choice → Fill Blank → Type Translation |
| **Quiz Mode** | 4 question types: multiple choice, fill-in-the-blank, listening, translation |
| **Match Game** | Timed pair-matching game with combo scoring |
| **Dictation Mode** | TTS reads a phrase → type it out → per-word correctness grading |
| **Starred Phrases** | Pin important phrases across topics; dedicated `/starred` review page |

### 🔍 Navigation & Search
| Feature | Description |
|---|---|
| **Global Search** `Ctrl+K` | Command palette — debounced phrase search across all topics, grouped results, keyboard navigation |
| **AI Conversation** | Roleplay chat with "Alex" (Groq llama-3.3-70b) contextualised to the current topic |
| **Quick Capture** | Paste raw text → AI extracts 5–15 useful phrases → checkbox select → bulk add |
| **Daily Dictation Import** | Paste a `dailydictation.com` URL → auto-scrape the sentence → save to topic → AI auto-fill |

### 📊 Stats & Gamification
| Feature | Description |
|---|---|
| **XP & Levels** | 11 badge tiers (Tân binh → Huyền thoại), earn XP per review, level-up toasts |
| **Streak Tracking** | Daily study streak with fire badge in sidebar |
| **Weekly Challenge** | Circular progress ring targeting ±20 reviews per week |
| **Topic Completion Badge** | 🎖️ badge when all phrases in a topic reach repetitions ≥ 3 |
| **Review Calendar** | 30-day heatmap showing upcoming SRS review load |
| **SRS Badge** | Inline mastery pill (Chưa học → Thành thạo) with ease-factor tooltip |
| **Dashboard** | Streak, XP bar, due-today count, weak topics, weekly challenge, review calendar |

### ⚙️ Customization & Productivity
| Feature | Description |
|---|---|
| **Custom Review Session** | Filter by topic + set max cards (10 / 20 / 50 / 100 / All) with live due-count preview |
| **Settings Page** | TTS voice/rate/speed, theme, auto dark-mode hours, notification hour |
| **Auto Dark Mode** | Time-based dark mode toggle (e.g. 19:00 → 07:00), checked every minute |
| **Browser Notifications** | Daily reminder at configurable hour — no service worker needed |
| **Multi-accent TTS** | Central `lib/tts.ts` utility, configurable voice URI + rate from Settings |
| **Export / Import** | Export topic as JSON, import JSON to create a new topic |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Database** | PostgreSQL via **Supabase** |
| **ORM** | Drizzle ORM |
| **AI** | Groq API — `llama-3.3-70b-versatile` |
| **Styling** | Tailwind CSS v4, Geist design tokens (shadow-as-border) |
| **UI Components** | Radix UI, Lucide icons, Sonner toasts |
| **State** | TanStack Query (server), React `useState` / `useReducer` (local) |
| **TTS** | Web Speech API |
| **Notifications** | Web Notifications API |
| **Fonts** | Mona Sans VF (via CDN @font-face) |

---

## 🚀 Getting Started

### 1. Clone & install

```bash
git clone <repo-url>
cd dace
npm install
```

### 2. Environment variables

Create `.env.local`:

```env
# Supabase / PostgreSQL
DATABASE_URL=postgresql://...

# Groq AI (https://console.groq.com)
GROQ_API_KEY=gsk_...
```

### 3. Database setup

```bash
# Push schema to database
npx drizzle-kit push

# (Optional) Seed initial data
npx tsx db/seed.ts
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📁 Project Structure

```
dace/
├── app/
│   ├── api/                    # REST API routes
│   │   ├── ai/                 # AI Auto-fill, Explain, Conversation
│   │   ├── import/             # Daily Dictation scraper
│   │   ├── phrases/            # CRUD + bulk operations
│   │   ├── review/             # SRS: due, submit, calendar
│   │   ├── search/             # Full-text phrase search
│   │   ├── stats/              # Dashboard statistics
│   │   └── topics/             # Topic CRUD + export/import
│   ├── conversation/           # AI roleplay chat
│   ├── dashboard/              # Stats + widgets
│   ├── learn/                  # 4-stage adaptive learning
│   ├── match/                  # Timed pair-matching game
│   ├── quiz/                   # Quiz + Dictation modes
│   ├── review/                 # SRS flashcard review
│   ├── settings/               # User preferences
│   ├── starred/                # Pinned phrases
│   └── topics/[id]/            # Topic detail + phrase list
├── components/
│   ├── AppBootstrap.tsx        # Auto-theme + notification scheduler
│   ├── layout/                 # Sidebar, CommandPalette
│   ├── phrases/                # PhraseForm, SRSBadge, DDImportModal, QuickCaptureModal
│   ├── review/                 # ReviewCalendar, ReviewSessionConfig
│   ├── search/                 # GlobalSearch (Ctrl+K)
│   └── xp/                    # XPBar
├── db/
│   └── schema.ts               # Drizzle schema (topics, phrases, study_logs)
└── lib/
    ├── api-client.ts           # apiFetch helper
    ├── notifications.ts        # Browser notification scheduler
    ├── settings.ts             # localStorage user preferences
    ├── srs.ts                  # SM-2 algorithm
    ├── streak.ts               # Daily streak tracking
    ├── tts.ts                  # Text-to-speech utility
    └── xp.ts                   # XP + level system
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+K` | Open Global Search |
| `Space` / `Enter` | Flip review card / submit Good |
| `1` | Rate: Again |
| `2` | Rate: Hard |
| `3` | Rate: Good |
| `4` | Rate: Easy |

---

## 🧠 SRS Algorithm (SM-2)

Review ratings map to quality scores:

| Rating | Score | Effect |
|---|---|---|
| Again | 0 | Reset interval to 1 day, EF −0.2 |
| Hard | 2 | Reset interval to 1 day, EF −0.2 |
| Good | 4 | Increase interval × EF |
| Easy | 5 | Increase interval × EF, EF +0.1 |

Ease Factor (EF) stays between **1.3 – 2.5**. Next review date is always normalized to **midnight UTC** to prevent drift.

---

## 🔄 Daily Dictation Workflow

```
1. Study on dailydictation.com
2. Copy exercise URL
3. Open target topic in Dace
4. Click "🎧 DD Import" button
5. Paste URL → Auto-fetch sentence
6. Edit if needed → "Thêm vào topic"
7. Select phrase → AI Auto-fill (IPA + translation + examples)
8. Phrase enters SRS queue automatically
```

---

## 🌐 Deployment

Deployed on **Vercel** with **Supabase** as the database backend.

```bash
# Build production bundle
npm run build

# Check for errors before pushing
npx next build
```

> [!NOTE]
> The `/review` page uses `useSearchParams()` and is wrapped in `<Suspense>` for Next.js static prerendering compatibility.
