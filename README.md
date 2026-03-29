# Realtime AI Collaboration

A collaborative writing workspace where multiple users edit shared documents in real time. AI suggests edits (continue, improve, summarize, expand) that stream token-by-token. Users accept, reject, or edit suggestions before they are committed — a human-in-the-loop (HITL) pattern.

## Architecture

```
packages/
├── server/     # Express 5 + Socket.IO + PostgreSQL + Redis
└── web-client/ # Next.js 15 App Router + Tiptap editor
```

| Layer          | Technology                                                 |
| -------------- | ---------------------------------------------------------- |
| Frontend       | Next.js 15, React 19, Tiptap, TanStack Query, SCSS Modules |
| Backend        | Express 5, Socket.IO 4, Pino logging                       |
| Database       | PostgreSQL (pg + node-pg-migrate)                          |
| Cache/Presence | Redis (ioredis)                                            |
| AI             | Anthropic Claude API (streaming)                           |
| Auth           | express-session + bcryptjs                                 |

## Socket.IO Events

### Client → Server

| Event        | Payload                                                    | Description                  |
| ------------ | ---------------------------------------------------------- | ---------------------------- |
| `join`       | `documentId`                                               | Join a document room         |
| `edit`       | `{ documentId, content }`                                  | Broadcast text edit          |
| `cursor`     | `{ documentId, position }`                                 | Broadcast cursor position    |
| `ai:request` | `{ documentId, promptType, context }`                      | Request AI suggestion        |
| `ai:accept`  | `{ documentId, suggestionId, currentContent }`             | Accept and commit suggestion |
| `ai:reject`  | `{ documentId, suggestionId }`                             | Reject and abort suggestion  |
| `ai:edit`    | `{ documentId, suggestionId, editedText, currentContent }` | Commit edited suggestion     |

### Server → Client

| Event          | Payload                       | Description                      |
| -------------- | ----------------------------- | -------------------------------- |
| `user:joined`  | `{ userId, color }`           | A user joined the document       |
| `user:left`    | `{ userId }`                  | A user left the document         |
| `edit`         | `{ content, userId }`         | Document content changed         |
| `cursor`       | `{ userId, position, color }` | Cursor position update           |
| `presence`     | `{ users }`                   | Snapshot of all online users     |
| `ai:stream`    | `{ token, suggestionId }`     | Streaming AI token               |
| `ai:complete`  | `{ suggestionId, text }`      | AI streaming complete            |
| `ai:committed` | `{ content }`                 | Suggestion committed to document |
| `ai:rejected`  | `{ suggestionId }`            | Suggestion rejected              |
| `ai:error`     | `{ message }`                 | AI error occurred                |

## Human-in-the-Loop (HITL) Pattern

1. User clicks an AI action (Continue, Improve, Summarize, Expand)
2. Server creates a `streaming` suggestion and begins streaming tokens from Claude
3. All users in the room see the suggestion stream in real time
4. The requesting user sees Accept / Edit / Reject buttons
5. On **Accept**: suggestion is appended to document, version snapshot saved
6. On **Edit**: user modifies the text, then commits — saves version snapshot
7. On **Reject**: stream is aborted (AbortController), suggestion marked rejected
8. Only one AI suggestion per document at a time (enforced via Redis)

## REST API

```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/me

GET    /documents
POST   /documents
POST   /documents/join
GET    /documents/:id
PUT    /documents/:id
DELETE /documents/:id
POST   /documents/:id/share
GET    /documents/:id/versions
GET    /documents/:id/suggestions?status=accepted,rejected,edited

GET    /health
```

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL database
- Redis server

### Install

```bash
pnpm install
```

### Configure Environment

```bash
cp packages/server/.env.example packages/server/.env
cp packages/web-client/.env.example packages/web-client/.env.local
# Edit both files with your values
```

### Run Migrations

```bash
cd packages/server
DATABASE_URL=<your-db-url> pnpm migrate
```

### Develop

```bash
# Terminal 1: API server
pnpm dev:server

# Terminal 2: Frontend
pnpm dev:web
```

## Environment Variables

### Server (`packages/server/.env`)

| Variable            | Description                                    |
| ------------------- | ---------------------------------------------- |
| `NODE_ENV`          | `development` or `production`                  |
| `PORT`              | HTTP server port (default: 3001)               |
| `DATABASE_URL`      | PostgreSQL connection string                   |
| `REDIS_URL`         | Redis connection string                        |
| `ANTHROPIC_API_KEY` | Anthropic API key                              |
| `SESSION_SECRET`    | Session signing secret                         |
| `CORS_ORIGIN`       | Frontend origin (e.g. `http://localhost:3000`) |

### Web Client (`packages/web-client/.env.local`)

| Variable              | Description          |
| --------------------- | -------------------- |
| `NEXT_PUBLIC_API_URL` | Backend API URL      |
| `NEXT_PUBLIC_WS_URL`  | WebSocket server URL |

## Database Schema

- **users** — email/password auth
- **documents** — owned documents with optional share token
- **document_collaborators** — invited users with edit/view/suggest permissions
- **ai_suggestions** — HITL suggestion lifecycle (streaming → pending → accepted/rejected/edited)
- **document_versions** — content snapshots on each accepted/edited suggestion
