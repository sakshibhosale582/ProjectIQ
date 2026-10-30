# ProjectIQ

AI-assisted codebase analysis and technical-interview preparation. Upload a project ZIP; ProjectIQ scans **every file**, maps the architecture, modules and risks, and then helps you prepare to explain the project: code-grounded quizzes, oral viva, mock interview and an AI mentor that answers from your own code.

**Stack:** React + Vite · Node.js + Express · MongoDB (Mongoose) · Google Gemini API

---

## What it does (as implemented)

### Analysis (static scanner, no AI needed)
* **Whole-repository scan** of the uploaded ZIP: file counts, language distribution and lines of code are computed over all readable source files (see limits below).
* **Import graph**: relative imports (JS/TS/Vue/Svelte), Python imports and Java imports are resolved to real files in the archive. Only edges between files that exist are stored.
* **Modules**: files are grouped into Controllers, Models, Routing, Middleware, Services, UI, Utils, Config/Bootstrap, plus folder-based modules for everything else. Each module carries a `category`, its real file list and evidence-based connections (e.g. "Imports from Models (3 imports)").
* **Architecture**: detected type (e.g. full-stack client + REST API), layers actually present, layer-to-layer relationships (import edges, UI→API fetch/axios calls, database-driver usage, external SDKs such as Gemini), entry points and a generated summary. Nothing is hardcoded; absent layers are not invented.
* **Endpoints** (Express, Flask/FastAPI, Django `urls.py`, Spring, Go) with mount prefixes resolved for Express `app.use('/prefix', router)`.
* **Security findings** (pattern-based): secret files shipped in the archive (`.env`, keys; their *contents are never read or stored*), hardcoded credentials, secrets in logs, `eval`, `dangerouslySetInnerHTML`/`innerHTML`, SQL built by concatenation, weak hashes, tokens in `localStorage`, permissive CORS, missing rate limiting/helmet. This is **not** a penetration test.
* **Code-quality diagnostics**: oversized files, leftover debug logging, empty catch blocks, TODO markers, missing tests/README. Results are complete (no artificial cap) and grouped per file where noisy.
* Parsing is **regex/heuristic-based, not a full AST parser**.

### AI layer (Gemini)
* AI only **explains** what the scanner found: module summaries first (map step), then a final project description (reduce step). It never supplies scores, module lists or file paths. If the AI is unavailable the upload still succeeds with `analysis.mode = "static"`, and the UI says so.
* **AI Project Mentor (RAG chat)**: code is split into overlapping chunks (with line ranges) and stored in MongoDB. Retrieval uses Gemini embeddings + cosine similarity when the embedding quota allows it, and automatically falls back to BM25-style keyword search when it does not (common on the Gemini free tier), so the mentor keeps working. The last 6 messages are sent as conversation context. The chat is disabled until indexing is really `ready`; status is shown in the UI. Answers are rendered with `react-markdown` (no raw HTML).
* **Quiz**: multiple-choice questions built from real code snippets (file path + line range + code). Each attempt gets a fresh set (recent snippets are avoided, options are shuffled). **Grading happens on the server**: the client never receives answers or explanations before submitting.
* **Oral viva** and **mock interview**: questions are project-specific; answers are scored by the AI. If the AI is unavailable the app says so and records **no** score (it does not invent one).
* **Practice rounds** by focus area (APIs, Database, Security, Frontend, Architecture) use the same server-graded mechanism and are not counted in readiness.
* **Learning roadmap** generated for the detected stack, with completion tracking.

### Readiness index (only from real attempts)
Weighted average over the components that have data, weights renormalised:

`quiz 20% · viva 20% · mock interview 30% · roadmap progress 20%`

With no quiz/viva/interview results the app shows **"Not enough data"**. There are no default or AI-guessed scores.

### Other
* JWT authentication (bcrypt), per-user data isolation on every project query.
* Printable PDF summary (browser print).

### Not implemented
XP, levels, badges and streaks are **not** implemented (earlier README versions claimed them).

---

## Limits (as enforced in code)

| Item | Limit |
|---|---|
| ZIP upload size | 200 MB |
| Entries in ZIP | 20,000 |
| Declared uncompressed size (total / per file) | 500 MB / 100 MB |
| Text analysed per file / per project | 400 KB / 80 MB (larger files are counted but not read) |
| Source text stored per project (File Inspector, quiz) | 25 MB |
| Code chunks indexed per project | 300 (highest-priority files first; configurable with `MAX_CHUNKS_PER_PROJECT`) |
| Chat question length | 2,000 characters |
| Password length | 8–72 characters |

Ignored folders: `node_modules`, `dist`, `build`, `.git`, `venv`, `target`, `vendor`, ... Binary files are counted nowhere.

## Security measures
* ZIP validation: magic-byte check, path-traversal/absolute-path/null-byte rejection (a file named `a..b.js` is fine), symlinks skipped, entry-count and size limits. Nothing from the archive is written to disk or executed.
* `helmet`, request body limit, `express-rate-limit` (global, auth, upload and AI endpoints; strict in `NODE_ENV=production`, relaxed in development).
* E-mail normalised to lowercase and validated; non-string credentials rejected (NoSQL-operator injection).
* API keys are read **only** from backend environment variables. `.env` files are git-ignored; use `.env.example` templates.
* Quiz/viva answer keys are `select: false` in the database and stay server-side.

> If a real `.env` was ever shared or committed, treat its secrets as leaked: **rotate the Gemini API key and change `JWT_SECRET`** in your Google AI Studio / hosting dashboard. This cannot be done from code.

---

## Installation

**Prerequisites:** Node.js 20.19+ (required by Vite 8; the backend alone runs on 18+), MongoDB running locally or Atlas, a Gemini API key (optional: without it the static analysis works and AI features report that they are unavailable).

### Backend
```bash
cd backend
npm install
cp .env.example .env      # then edit the values
npm start                 # http://localhost:5000
npm test                  # unit tests (node:test)
```

### Frontend
```bash
# from the project root
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:5000/api
npm run dev               # http://localhost:5173
npm run build             # production build in dist/
npm run lint
```

## Project structure
```
backend/
  server.js               app bootstrap (helmet, CORS, rate limits)
  routes/                 auth, projects, prepare (HTTP wiring)
  controllers/            auth + assessment logic (viva, interview, readiness)
  services/
    scanner.js            static analysis: imports, modules, architecture, findings
    zipReader.js          safe ZIP validation + reading
    aiAnalysis.js         AI narration (module summaries -> final summary)
    rag.js                chunking, batched embeddings, indexing status, retrieval
    quiz.js               code-grounded quiz generation + server-side grading
  models/                 Mongoose schemas
  tests/                  unit tests
src/                      React app (pages, context, components)
```

## Known limitations
* Static analysis is heuristic; unusual project layouts may be grouped into folder-based modules.
* Projects analysed with older versions lack stored source and the new architecture data; re-upload them.
* Indexing runs in the server process (no job queue); a restart marks interrupted indexing as failed and it can be re-run from the AI Mentor page.
* Gemini model names are configured in `backend/utils/aiService.js`; check they match models available to your key.
