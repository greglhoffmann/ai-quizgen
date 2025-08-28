# AI QuizGen
Dynamic quiz creation using LLMs and modern web stack


## 1. Project Overview

`ai-quizgen` is a web-based application that allows users to generate multiple-choice quizzes on any topic using **AI**. The system creates **5 questions per topic**, each with **4 options (A–D)**, and shows the correct answers after quiz submission.

This project demonstrates **full-stack integration with AI**, secure handling of API keys, caching, persistence of quiz results, lightweight topic disambiguation, and JSON output enforcement and validation.

## 2. Key Features

- AI-generate quizzes in web-hosted UX on any user-provided topic
- 5 questions per quiz, each with 4 options and one correct answer
- Score calculation and display of correct answers
- **Bonus Features**:
  - Retrieval/context injection for improved factual accuracy
  - Quiz caching using Redis (Upstash) with in-memory fallback
    - Improves performance and cost by deduplicating generations across users and sessions.
  - Quiz persistence in MongoDB Atlas
    - Demonstrates full-stack CRUD and data modeling.
  - Answer explanations / feedback
- **Extra Bonus Features**:
  - Deterministic disambiguation (prompt-only) with chosenTitle
    - LLM picks a single sense deterministically (e.g., “Mercury (planet)”) and returns `chosenTitle` so the UI can show a precise hint. Avoids complex chooser UIs while keeping output coherent.
  - Hybrid-light Wikipedia assist (best-effort)
    - Uses Wikipedia Summary API to canonicalize a title and detect obvious disambiguation pages. Provides context for accuracy without heavy retrieval complexity.
  - Strict JSON mode and Zod validation
    - Enforces JSON output using JSON mode and validates shape with Zod before serving, catching malformed or mixed-sense responses early.
  - Cost awareness and usage telemetry
    - The API surfaces token usage (`_usage`) from the model. Helpful for visibility.
  - UX-integrated generation flow
    - Dismissible hint when ambiguity is detected. Inputs are disabled while generating. “Generate a fresh one” feature forces a cache-bypass refresh for new variants.

## 3. Tech Stack

| Layer              | Technology                                     | Purpose                                                                     |
|--------------------|------------------------------------------------|-----------------------------------------------------------------------------|
| Frontend / Backend | Next.js 14 (App Router) + TypeScript           | Full-stack framework; API routes + UI in one project                        |
| AI Model           | OpenAI GPT-4o-mini (JSON mode)                 | Structured quiz generation; deterministic output and token usage telemetry  |
| Retrieval Assist   | Wikipedia REST API (page summary)              | Canonicalize titles and detect ambiguity (hybrid-light)                     |
| Caching            | Upstash Redis (optional) + in-memory fallback  | Reduce repeated API calls and improve performance                           |
| Rate Limiting      | Per-IP limiter (Redis-backed or in-memory)     | Basic abuse/DDoS mitigation; returns 429 with Retry-After                   |
| Validation         | Zod                                            | Server-side schema validation and normalization                             |
| Database           | MongoDB Atlas (optional)                       | Optional persistence of quizzes and results                                 |
| Styling            | Tailwind CSS                                   | Quick, responsive, modern UI                                                |
| Deployment         | Vercel                                         | Rapid hosting of full-stack project                                         |

## 4. Architecture
```
[Frontend: Next.js React UI]
  |
  v
[API Route: /api/generate-quiz]
  |
  +--> Per-IP rate limit (Redis-backed or in-memory)
  |
  +--> Cache key = quiz:{difficulty}:{topic}
  |    TTL ~ 1 hour; backend supports Redis or in-memory
  |
  +--> If forceFresh=true: delete key, continue (treat as miss)
  |
  +--> Cache check
  |        |
  |        +-- HIT  -> return cached quiz with _cacheHit=true
  |        |
  |        +-- MISS -> generate
  |
  +--> Optional retrieval (best-effort, cached)
  |        |
  |        +-- fetch page info (title, type) to canonicalize
  |        |      - detect disambiguation via type === 'disambiguation'
  |        |      - caches ~12h
  |        |
  |        +-- fallback to summary extract (cached ~24h)
  |
  +--> Prompt build (JSON mode)
  |        - Includes retrieval extract if available
  |        - Disambiguation is prompt-level: require a single chosenTitle
  |
  +--> OpenAI (GPT-4o-mini, JSON mode) -> quiz JSON
  |
  +--> Normalize + Zod validate
  |
  +--> Cache set (TTL ~1h)
  |
  +--> Optional persist (MongoDB)
  |
  v
     Response to UI
  - _cacheHit, _usage
  - _assumedTitle (from retrieval/model) and _ambiguous (if detected)
```

**Workflow:**
1. User enters a topic in the frontend UI and clicks Generate.
2. API validates input, applies per-IP rate limiting, and checks cache (forceFresh can bypass). On hit, returns the cached quiz with `_cacheHit=true`.
3. On miss, the API may fetch Wikipedia page info/summary (best-effort) to canonicalize and lightly detect ambiguity, then builds a JSON-mode prompt requiring a single `chosenTitle`.
4. The model returns JSON; the server normalizes and Zod-validates it, caches the quiz (~1h), and responds with metadata (`_cacheHit`, `_usage`, `_assumedTitle`, `_ambiguous`). Persistence to MongoDB is optional (when the user chooses to save), and results are persisted on submit/save.
5. The frontend displays questions, locks inputs while generating, shows correct answers on submit, and allows “Save for review” to store the quiz and result for later viewing.

## 5. Setup and Deployment

### Production/demo use
- Access the web app at [this Vercel domain](https://ai-quizgen.vercel.app/)

### Local development
1. Clone the repo:

```bash
git clone https://github.com/greglhoffmann/ai-quizgen.git
cd ai-quizgen
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (create `.env.local`):
```bash
OPENAI_API_KEY=your_openai_api_key_here                   # required
MONGODB_URI=your_mongodb_connection_string_here           # optional (quizzes/results persistence)
UPSTASH_REDIS_REST_URL=your_redis_connection_string_here  # optional (Redis cache; falls back to in-memory)
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here            # optional (Redis cache; falls back to in-memory)
```

Notes:
- If Upstash Redis env vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) are not set, the app uses an in-memory cache (resets on server restart).
- If `MONGODB_URI` is not set, saving quizzes/results is disabled (list endpoints return empty; save endpoints return 503).

4. Start the dev server:
```bash
npm run dev
```

5. Open http://localhost:3000 in your browser.

## 6. Usage
1. Enter a topic (e.g., “Mercury”), choose a difficulty, and optionally keep “Use retrieval (Wikipedia)” on for better factual grounding.
2. Click "Generate quiz". A message may appear indicating your topic is ambiguous and could be refined.
3. If a cached quiz exists, it will be returned quickly. Click “Generate a fresh one” to bypass cache and force a new quiz.
4. After answering, submit to see your score, correct answers, and explanations. You can save for review (if MongoDB is configured).

## 7. Implementation Notes
- AI Tool Choice: OpenAI GPT-4o-mini selected for speed, cost-efficiency, and reliable structured output.
- Disambiguation: The model is instructed to pick exactly one sense and never mix; it returns `chosenTitle` so the UI can display a precise assumption instead of repeating the raw input.
- Validation: `Zod` ensures `{ topic, difficulty, questions[] }` shape on the server before caching/returning.
- JSON reliability: JSON mode with a max token limit reduces cost and output drift; if wrappers appear, we extract the JSON block and re‑parse.
- Error handling: APIs return explicit codes (429 rate limit, 400 validation, 502 model parse, 503 persistence off, 500 otherwise); the UI surfaces a single, dismissible hint/toast.

## 8. Security Best Practices

- Secrets live in `.env.local` and are never committed; an `.env.example` is provided. No secrets are exposed via `NEXT_PUBLIC_*`.
- AI calls run only on the server. Keys are never sent to the browser; logs avoid printing full prompts or secrets.
- Input hardening: `sanitizeTopic`/`isTopicValid` + Zod schemas. Invalid requests return 400. Mitigates some prompt injection risk by limiting topic length.
- Abuse control: per‑IP rate limit (Redis or in‑memory). On exceed, API returns 429 with `Retry-After`.
- Cache safety: keys are `quiz:{difficulty}:{topic}`, TTL ~1h, `forceFresh` invalidates. No PII is cached.
- Persistence is optional: if MongoDB isn’t configured, save endpoints disable gracefully (no partial writes).

## 9. What’s Included (folders of interest)

- `src/app/api/generate-quiz/route.ts` — quiz generation with rate limit, retrieval, caching; returns `_cacheHit`, `_usage`, `_ambiguous`, `_assumedTitle`; Zod-validated
- `src/lib/ai.ts` — `buildPrompt` and `generateTextJSON` (OpenAI JSON mode wrapper)
- `src/lib/retrieval.ts` — Wikipedia page info/summary (best‑effort), with caching
- `src/lib/cache.ts` — `cacheGet`/`cacheSet`/`cacheDel` via Upstash Redis or in‑memory fallback
- `src/models/quiz.ts` — Zod `QuizSchema` and types
- `src/components/TopicForm.tsx` — topic form with ambiguity hint and force‑fresh toggle
- `src/components/QuizRunner.tsx` — renders questions, submit/score, save for review



### Built with GitHub Copilot assisting code generation, refactors, and docs-in-code.
### License: MIT
