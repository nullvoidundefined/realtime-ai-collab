# Real-time AI Collaboration — Technical Summary

Real-time AI Collaboration is a collaborative document editing workspace where multiple users write together in real time with AI-powered writing assistance. It is App 6 in a portfolio of eight progressive full-stack AI applications and demonstrates the **human-in-the-loop (HITL)** pattern: AI proposes writing suggestions that stream token-by-token to all connected users, but no AI-generated content enters the document until a human explicitly accepts, edits, or rejects it. The application combines Socket.IO-based real-time collaboration (presence, cursors, live edits) with streaming AI suggestions from Anthropic Claude, all managed through a Redis-backed concurrency lock that enforces one active suggestion per document at a time.

## Architecture

The system is a two-package pnpm monorepo: a **server** package (Express 5 + Socket.IO 4) and a **web-client** package (Next.js 15 with App Router). The server runs on Railway as a single Node.js process that handles both HTTP REST endpoints and WebSocket connections on the same port. The frontend deploys to Vercel. PostgreSQL on Neon stores all persistent data (users, documents, collaborators, suggestions, versions, sessions). Redis on Railway provides ephemeral state: user presence sets, cursor positions with 30-second TTL, suggestion locks with 5-minute TTL, and per-user suggestion rate limits. The Anthropic Claude API streams writing suggestions through the server, which relays tokens to all users in a Socket.IO room.

## Stack

| Layer            | Technology                                   | Notes                                             |
| ---------------- | -------------------------------------------- | ------------------------------------------------- |
| Frontend         | Next.js 15 (App Router)                      | Server + client components, SCSS modules          |
| UI Library       | React 19                                     | TanStack Query for server state                   |
| Rich Text Editor | Tiptap 2 (ProseMirror)                       | Extensible, structured document model             |
| API Server       | Express 5                                    | Async error propagation, no try/catch boilerplate |
| Real-time        | Socket.IO 4                                  | WebSocket with HTTP long-polling fallback         |
| Database         | PostgreSQL 13+ (Neon)                        | 6 tables, UUID primary keys, CASCADE deletes      |
| Cache / Presence | Redis (Railway, ioredis)                     | Sets, strings with TTL, sorted operations         |
| LLM              | Anthropic Claude (claude-haiku-4-5-20251001) | Streaming via SDK with AbortController            |
| Auth             | Custom sessions                              | bcryptjs + express-session + connect-pg-simple    |
| CSRF             | csrf-csrf (double submit)                    | Cookie + token validated on HTTP and WebSocket    |
| Validation       | Zod 4                                        | All request bodies validated at handler level     |
| Logging          | Pino 10                                      | JSON in production, pino-pretty in development    |
| Package Manager  | pnpm 9                                       | Workspace monorepo                                |

## Key Patterns

1. **Human-in-the-Loop (HITL)** — AI suggestions stream to all users in a document room, but only the requester sees Accept/Edit/Reject controls. No AI text enters the document without explicit human approval. This is the core pattern the app demonstrates.

2. **One-Suggestion-at-a-Time Lock** — A Redis key (`active_suggestion:{documentId}`) with a 5-minute TTL prevents concurrent suggestions per document. The TTL acts as a deadlock breaker if the server crashes mid-stream. New requests are rejected while a suggestion is active.

3. **Socket.IO Room-Based Broadcasting** — Each document is a Socket.IO room. Events (edits, cursors, AI tokens, presence changes) are broadcast to all room members. AI streaming uses Socket.IO instead of SSE because the app already needs bidirectional WebSocket communication for collaboration.

4. **AbortController for Stream Cancellation** — When a user rejects a suggestion that is still streaming, the server calls `abort()` on the AbortController passed to the Anthropic SDK, immediately stopping the API call and preventing wasted tokens.

5. **Deterministic User Colors** — User avatar colors are derived from a hash of the user ID mapped to a 6-color palette. The same user always gets the same color across sessions and documents.

6. **Server-Side Auth Guard** — The `(protected)/layout.tsx` is a Next.js server component that calls `/auth/me` with request cookies before rendering. Unauthenticated users are redirected before any client JavaScript runs.

## Data Flow

1. User opens a document -- the frontend establishes a Socket.IO connection (authenticated with userId + CSRF token) and emits `join` with the document ID.
2. Server adds the user to the Redis presence set and the Socket.IO room, broadcasts `user:joined` to others, and sends the joining user a `presence` snapshot.
3. User types in the Tiptap editor -- `onUpdate` emits an `edit` event with the full content; server broadcasts to the room. An `isRemoteUpdate` flag prevents feedback loops on the receiving end.
4. User clicks a suggestion type (Continue, Improve, Summarize, Expand) -- client emits `ai:request` with document context and prompt type.
5. Server checks the Redis suggestion rate limit (10 per 5 minutes per user) and the active suggestion lock. If clear, it inserts an `ai_suggestions` row with status `streaming`, sets the Redis lock, and starts streaming from Claude.
6. Each token from Claude is emitted as `ai:stream` to the room. When streaming completes, the suggestion status is updated to `pending` and `ai:complete` is emitted.
7. The requester accepts, edits, or rejects. On accept/edit, the server appends the text to the document, creates a `document_versions` snapshot, and emits `ai:committed` so all users update their editor content. On reject, the AbortController aborts if still streaming, and `ai:rejected` is emitted.

## API Endpoints

| Method | Path                         | Auth | Description                               |
| ------ | ---------------------------- | ---- | ----------------------------------------- |
| POST   | `/auth/register`             | No   | Create user + session                     |
| POST   | `/auth/login`                | No   | Validate credentials, create session      |
| POST   | `/auth/logout`               | No   | Destroy session, clear cookie             |
| GET    | `/auth/me`                   | Yes  | Return current user from session          |
| GET    | `/documents`                 | Yes  | List own + collaborated documents         |
| POST   | `/documents`                 | Yes  | Create new document                       |
| GET    | `/documents/:id`             | Yes  | Get single document                       |
| PUT    | `/documents/:id`             | Yes  | Update title/content                      |
| DELETE | `/documents/:id`             | Yes  | Delete document (cascades)                |
| POST   | `/documents/:id/share`       | Yes  | Generate or return share token            |
| POST   | `/documents/join`            | Yes  | Join via share token                      |
| GET    | `/documents/:id/suggestions` | Yes  | List suggestions (optional status filter) |
| GET    | `/documents/:id/versions`    | Yes  | List version snapshots                    |
| GET    | `/health`                    | No   | Basic health check                        |
| GET    | `/health/ready`              | No   | Health check with DB ping                 |
| GET    | `/api/csrf-token`            | No   | Get CSRF token for double-submit          |

## Database Schema

| Table                    | Purpose                              | Key Columns                                                                                                                                    |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                  | User accounts                        | id (UUID), email (unique), password_hash, name                                                                                                 |
| `documents`              | Documents                            | id (UUID), owner_id (FK users), title, content, share_token (unique)                                                                           |
| `document_collaborators` | Many-to-many join                    | document_id + user_id (composite PK), permission (edit/view/suggest)                                                                           |
| `ai_suggestions`         | AI suggestion lifecycle              | id (UUID), document_id (FK), requested_by (FK), prompt_type, suggestion_text, status (streaming/pending/accepted/rejected/edited), resolved_by |
| `document_versions`      | Content snapshots                    | id (UUID), document_id (FK), content_snapshot, created_by (FK)                                                                                 |
| `sessions`               | Express sessions (connect-pg-simple) | sid (PK), sess (JSON), expire                                                                                                                  |

## Environment Variables

| Variable              | Package    | Required   | Description                              |
| --------------------- | ---------- | ---------- | ---------------------------------------- |
| `DATABASE_URL`        | server     | Yes        | PostgreSQL connection string (Neon)      |
| `REDIS_URL`           | server     | Yes (prod) | Redis connection string                  |
| `ANTHROPIC_API_KEY`   | server     | Yes        | Claude API key for streaming suggestions |
| `SESSION_SECRET`      | server     | Yes        | Secret for signing session cookies       |
| `CSRF_SECRET`         | server     | Yes (prod) | Secret for double-submit CSRF tokens     |
| `CORS_ORIGIN`         | server     | Yes (prod) | Frontend URL for CORS and Socket.IO      |
| `NODE_ENV`            | server     | No         | `production` on Railway                  |
| `PORT`                | server     | No         | HTTP port (default 3001)                 |
| `GCP_PROJECT_ID`      | server     | No         | GCP project for Secret Manager           |
| `GCP_SA_JSON`         | server     | No         | GCP service account credentials          |
| `NEXT_PUBLIC_API_URL` | web-client | Yes        | API base URL for REST calls              |
| `NEXT_PUBLIC_WS_URL`  | web-client | Yes        | WebSocket URL for Socket.IO              |

## Decisions

- **Socket.IO over SSE for AI streaming** — Earlier portfolio apps use SSE, but this app already requires WebSockets for collaborative editing and presence. Using Socket.IO for AI streaming as well means one transport, room-based broadcasting to all users (not just the requester), and bidirectional communication for accept/reject during streaming.
- **Claude Haiku over Sonnet** — Writing suggestions need to be fast and cheap. Users request them frequently during editing; latency matters more than maximum output quality for continue/improve/summarize/expand operations.
- **Version snapshots only on accept/edit** — Versions are created only when a suggestion is committed, not on every keystroke. This keeps version history meaningful -- each entry represents a deliberate AI-assisted change.
- **Tiptap (ProseMirror) over raw contenteditable** — ProseMirror provides a structured document model that makes applying remote edits safe. Raw contenteditable would require custom operational transform logic.
- **Fail-open Redis** — Redis is treated as optional for core CRUD. If Redis is unavailable, presence and cursors degrade silently. The suggestion lock also fails open -- worst case, two suggestions could run concurrently, which the UI handles gracefully.
