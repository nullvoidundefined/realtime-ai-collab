# Real-time AI Collaboration — Quiz

Test your understanding of the architecture, patterns, and implementation details behind the Real-time AI Collaboration app.

---

## Architecture

**1. What transport does this app use for AI suggestion streaming?**
A) Server-Sent Events (SSE)
B) HTTP long-polling
**C) Socket.IO (WebSocket)**
D) gRPC streaming

? Why Socket.IO instead of SSE like earlier apps?

> The app already requires WebSockets for collaborative editing and presence. Using Socket.IO for AI streaming means one transport, room-based broadcasting to all users in a document, and bidirectional communication for accept/reject actions during streaming.

**2. How many packages does the monorepo contain?**
A) 1 (single fullstack package)
**B) 2 (server + web-client)**
C) 3 (server + worker + web-client)
D) 4 (server + worker + web-client + common)

? Some portfolio apps have workers and common packages.

> This app has only `server` and `web-client`. There is no separate worker process because AI streaming runs in the server process via Socket.IO, and there is no shared common package.

**3. Where does the Socket.IO server run relative to the Express HTTP server?**
A) On a separate port
B) In a separate Railway service
**C) On the same port as the Express HTTP server**
D) As a Vercel serverless function

? How is the HTTP server created?

> `createServer(app)` creates an HTTP server from the Express app, and `initSocket(httpServer)` attaches Socket.IO to the same server. Both HTTP and WebSocket traffic share one port.

**4. Which database hosts PostgreSQL for this application?**
A) Railway
B) Supabase
**C) Neon**
D) PlanetScale

? The portfolio uses a specific serverless PostgreSQL provider.

> Neon provides serverless PostgreSQL. The connection string is passed via the `DATABASE_URL` environment variable.

**5. What is the deployment target for the frontend?**
**A) Vercel**
B) Railway
C) Cloudflare Pages
D) Netlify

? The portfolio uses a consistent frontend deployment platform.

> Next.js deploys to Vercel. The server (Express + Socket.IO) deploys to Railway.

## Tools

**6. What rich text editor does the frontend use?**
A) Slate.js
B) Quill
**C) Tiptap (ProseMirror)**
D) Draft.js

? It provides a structured document model for safe remote edits.

> Tiptap 2 is a headless wrapper around ProseMirror. Its structured document model makes it straightforward to apply remote edits without corrupting editor state, which is critical for real-time collaboration.

**7. Which Claude model does this app use for AI suggestions?**
A) claude-sonnet-4-20250514
B) claude-3-haiku-20240307
**C) claude-haiku-4-5-20251001**
D) claude-opus-4-20250514

? The app prioritizes speed and cost over maximum quality.

> Claude Haiku is used because writing suggestions need to be fast and cheap. Users request them frequently during editing, so latency matters more than maximum output quality.

**8. What library handles server-side validation of request bodies?**
A) Joi
B) Yup
**C) Zod**
D) class-validator

? It provides runtime schema validation with TypeScript type inference.

> Zod 4 is used for all request body validation. Schemas are defined in `packages/server/src/schemas/` for auth and document operations.

**9. What logging library does the server use?**
A) Winston
B) Bunyan
**C) Pino**
D) Morgan

? It outputs JSON in production and pretty-prints in development.

> Pino 10 provides structured JSON logging in production and uses pino-pretty for human-readable output in development. It is combined with pino-http for request logging.

**10. What does the server use for session storage?**
A) Redis via connect-redis
B) In-memory store
**C) PostgreSQL via connect-pg-simple**
D) JWT tokens (stateless)

? Sessions are stored in a database table.

> Sessions are stored in a `sessions` table in PostgreSQL using connect-pg-simple. The session cookie (`sid`) is HTTP-only with a 7-day TTL.

## API

**11. What HTTP method and path creates a new document?**
A) PUT /documents/new
**B) POST /documents**
C) POST /api/documents/create
D) PATCH /documents

? Standard REST convention for resource creation.

> `POST /documents` creates a new document. The body optionally includes `{ title }`. All document routes require authentication.

**12. How does the share flow work?**
A) POST /documents/:id/invite with an email
**B) POST /documents/:id/share generates a token, POST /documents/join redeems it**
C) PUT /documents/:id with a collaborators array
D) GET /documents/share/:token adds the user automatically

? There are two endpoints involved in sharing.

> `POST /documents/:id/share` generates (or returns) a 32-byte hex share token. `POST /documents/join` with `{ token }` adds the authenticated user as a collaborator with edit permission.

**13. What header is required for CSRF protection on state-changing HTTP requests?**
A) X-Requested-With: XMLHttpRequest
B) Authorization: Bearer <token>
**C) X-CSRF-Token with a double-submit cookie**
D) Content-Type: application/json

? The app uses the csrf-csrf library for double-submit cookie pattern.

> The csrf-csrf library implements double-submit CSRF protection. The client fetches a token from `GET /api/csrf-token`, then sends it as the `X-CSRF-Token` header alongside the `__csrf` cookie on state-changing requests.

**14. What does the GET /health/ready endpoint check beyond basic health?**
A) Redis connectivity
B) Anthropic API availability
**C) Database connectivity via SELECT 1**
D) Socket.IO server status

? It returns 503 if the check fails.

> `/health/ready` runs `SELECT 1` against PostgreSQL. If the query succeeds, it returns `{ status: "ok", db: "connected" }`. If it fails, it returns 503 with `{ status: "degraded", db: "disconnected" }`.

**15. What rate limit applies to general API requests?**
**A) 100 requests per 15 minutes**
B) 50 requests per minute
C) 1000 requests per hour
D) 10 requests per second

? express-rate-limit is configured with windowMs and max.

> The general rate limiter allows 100 requests per 15-minute window using in-memory storage. Auth routes have a stricter limit of 20 per 15 minutes.

## Patterns

**16. What is the human-in-the-loop (HITL) pattern as implemented in this app?**
A) AI edits the document directly, users can undo
B) Users vote on AI suggestions collaboratively
**C) AI proposes suggestions that stream to all users; only the requester can accept, edit, or reject before text enters the document**
D) AI suggestions are queued and batch-applied at the end of a session

? The core constraint is that no AI text enters the document without human action.

> The HITL pattern means AI proposes, humans approve. Suggestions stream token-by-token to all users for visibility, but only the requester sees Accept/Edit/Reject controls. No AI-generated content modifies the document without explicit human approval.

**17. How does the app prevent concurrent AI suggestions on the same document?**
A) A database lock on the documents table
B) An in-memory Map on the server
**C) A Redis key (active_suggestion:{documentId}) with a 5-minute TTL**
D) A Socket.IO room-level mutex

? The lock has a TTL to prevent deadlocks.

> A Redis key `active_suggestion:{documentId}` is set when a suggestion starts streaming. New requests check this key and are rejected if it exists. The 5-minute TTL acts as a deadlock breaker if the server crashes mid-stream.

**18. What happens when a user rejects a suggestion that is still streaming?**
A) The suggestion finishes streaming, then is discarded
B) The server marks it rejected but streaming continues
**C) The server calls abort() on the AbortController, immediately stopping the Claude API call**
D) The client stops rendering tokens but the API call completes server-side

? This prevents wasted API tokens.

> An AbortController is passed to `anthropic.messages.stream()`. When the user emits `ai:reject`, the server calls `abort()` on the controller, which sends an abort signal to the SDK and immediately stops the API call. The Redis lock is also cleared.

**19. How are user colors determined for presence avatars?**
A) Randomly assigned on each connection
B) Stored in the users database table
C) Assigned sequentially from a palette
**D) Derived from a hash of the user ID mapped to a 6-color palette**

? The same user always gets the same color.

> Colors are deterministic. The `getUserColor` function hashes the user ID string and maps the result to one of 6 predefined colors. This means a user always has the same color across sessions, documents, and reconnections.

**20. How does the Tiptap editor prevent feedback loops when receiving remote edits?**
A) It debounces all edit events by 500ms
B) It compares content hashes before applying
**C) An isRemoteUpdate flag distinguishes local edits from Socket.IO updates**
D) It uses operational transforms to merge edits

? Without this, a remote edit would trigger onUpdate which would re-broadcast the same edit.

> The editor uses an `isRemoteUpdate` flag. When a remote `edit` event arrives via Socket.IO, the flag is set to true before updating the editor content. The `onUpdate` callback checks this flag and skips emitting an `edit` event when it is true, breaking the feedback loop.

## Config

**21. What is the default HTTP port for the server?**
A) 3000
**B) 3001**
C) 8080
D) 5000

? The getPort function parses process.env.PORT with a fallback.

> `getPort()` returns `parseInt(process.env.PORT ?? '3001', 10)`. The default is 3001 when no PORT environment variable is set.

**22. What is the session cookie name?**
**A) sid**
B) session_id
C) connect.sid
D) \_\_session

? It is defined in a constants file.

> The session cookie is named `sid`, defined in `packages/server/src/constants/session.ts`. It is HTTP-only, Secure in production, SameSite=lax, with a 7-day maxAge.

**23. How does the Socket.IO connection authenticate?**
A) JWT token in the Authorization header
**B) userId + csrfToken passed in socket.handshake.auth**
C) Session cookie validated server-side
D) API key in query parameters

? The middleware checks both userId and CSRF token.

> Socket.IO connections pass `userId` and `csrfToken` in the `auth` object during handshake. The server middleware rejects connections without a userId and validates the CSRF token using a fake request object constructed from the handshake headers and cookies.

**24. Why is Helmet's Content Security Policy disabled?**
A) It conflicts with Next.js hydration
B) It blocks TanStack Query requests
**C) Socket.IO requires inline scripts and WebSocket connections that CSP would block**
D) It is not needed because the app uses CSRF protection

? Helmet is configured with contentSecurityPolicy: false.

> CSP restricts inline scripts and WebSocket connections by default. Since Socket.IO relies on both, CSP is disabled to avoid breaking real-time functionality. Other Helmet protections (X-Frame-Options, etc.) remain active.

**25. What is the maximum request body size the server accepts?**
A) 100KB
B) 500KB
**C) 1MB**
D) 10MB

? express.json() is configured with a limit option.

> `express.json({ limit: '1mb' })` is set in the middleware stack. This accommodates document content updates which may contain substantial text.

## AI / LLM

**26. What is the max_tokens setting for Claude suggestion requests?**
A) 256
B) 512
**C) 1024**
D) 4096

? Suggestions should be concise writing continuations, not long-form content.

> The `streamSuggestion` function passes `max_tokens: 1024` to the Claude API. This keeps suggestions focused and reasonably sized for the continue/improve/summarize/expand operations.

**27. What are the four AI suggestion prompt types?**
A) Write, Rewrite, Shorten, Lengthen
B) Draft, Revise, Condense, Elaborate
**C) Continue, Improve, Summarize, Expand**
D) Complete, Refine, Compress, Detail

? Each has a dedicated prompt builder function.

> The four types are Continue (keep writing in the same style), Improve (rewrite for clarity and impact), Summarize (condense into a brief summary), and Expand (add more detail and examples). Each has a builder in `packages/server/src/prompts/`.

**28. What system prompt is sent with every Claude API call?**
A) "You are a helpful assistant."
B) "You are an expert editor. Provide detailed analysis."
**C) "You are a collaborative writing assistant. Provide focused suggestions. Just provide the suggestion text directly without commentary."**
D) "You are a document editor. Always explain your changes."

? The prompt instructs Claude to give raw suggestion text.

> The system prompt tells Claude to be a collaborative writing assistant, provide focused suggestions, and output suggestion text directly without meta-commentary. This ensures streamed tokens can be appended to the document as-is.

**29. What is the per-user rate limit for AI suggestion requests?**
A) 5 per minute
**B) 10 per 5 minutes**
C) 20 per 15 minutes
D) 50 per hour

? Redis tracks suggestion request counts per user.

> The `checkSuggestionRate` function uses a Redis key `suggestion_rate:{userId}` with INCR and a 300-second (5-minute) expiry. If the count exceeds 10, the request is rejected with a `rate_limited` event.

**30. What happens to an AI suggestion if the server crashes mid-stream?**
A) The suggestion is lost permanently
B) The document is corrupted
**C) The Redis lock expires after 5 minutes, allowing new suggestions**
D) The worker process retries the suggestion

? The TTL on the Redis lock prevents permanent deadlock.

> The `active_suggestion:{documentId}` Redis key has a 5-minute TTL (`'EX', 300`). If the server crashes mid-stream, the lock auto-expires and users can request new suggestions. The in-progress suggestion row remains in the database with status `streaming` but does not block future operations.

## Database

**31. How many tables does the database schema include?**
A) 4
B) 5
**C) 6**
D) 8

? Count all tables including the session table.

> The 6 tables are: `users`, `documents`, `document_collaborators`, `ai_suggestions`, `document_versions`, and `sessions` (managed by connect-pg-simple).

**32. What type are all primary keys in the schema?**
A) Auto-incrementing integers
B) BIGSERIAL
**C) UUID (gen_random_uuid())**
D) ULID strings

? PostgreSQL generates them with a built-in function.

> All primary keys are UUIDs generated by `gen_random_uuid()`. This avoids sequential ID enumeration and works well with distributed systems.

**33. What are the valid statuses for an ai_suggestions row?**
A) created, processing, done, failed
B) queued, streaming, complete, applied
**C) streaming, pending, accepted, rejected, edited**
D) draft, review, approved, declined, modified

? The status column has a CHECK constraint.

> The status column allows exactly 5 values: `streaming` (Claude is generating tokens), `pending` (streaming complete, awaiting user action), `accepted` (user accepted as-is), `rejected` (user rejected), and `edited` (user modified before committing).

**34. What happens to related records when a document is deleted?**
A) They are set to NULL via ON DELETE SET NULL
B) The delete is blocked by foreign key constraints
**C) They are automatically deleted via ON DELETE CASCADE**
D) A trigger archives them to a history table

? All foreign keys reference documents with a specific delete behavior.

> All foreign keys use `ON DELETE CASCADE`. Deleting a document automatically removes its collaborators, suggestions, and version snapshots.

**35. What does the document_versions table store?**
A) Diffs between consecutive versions
B) Git-style patches
**C) Full document content snapshots (content_snapshot TEXT)**
D) Pointers to external storage

? Each version captures the complete document state.

> `document_versions` stores a `content_snapshot` column containing the full document text at that point in time. Versions are created only when an AI suggestion is accepted or edited, making each entry a meaningful checkpoint.

**36. What is the primary key of the document_collaborators table?**
A) An auto-generated id column
B) A UUID primary key
**C) A composite key of (document_id, user_id)**
D) The document_id alone

? This is a many-to-many join table.

> The composite primary key `(document_id, user_id)` ensures each user can only be a collaborator once per document. The table uses UPSERT (`ON CONFLICT (document_id, user_id)`) when adding collaborators.

## Error Handling

**37. How does Express 5 simplify error handling in this app?**
A) It provides built-in validation middleware
B) It auto-retries failed requests
**C) It automatically catches errors thrown in async route handlers and passes them to the error middleware**
D) It logs errors to an external service

? Earlier Express versions required explicit try/catch or next(err) in async handlers.

> Express 5 has built-in async error propagation. When an async handler throws, Express catches the rejection and forwards it to the centralized `errorHandler` middleware. This eliminates try/catch boilerplate in every route handler.

**38. What happens if Redis is unavailable?**
A) The entire application crashes
B) All requests return 503
**C) Presence, cursors, and suggestion locks degrade silently; core CRUD still works**
D) The app switches to an in-memory fallback automatically

? Redis is treated as optional infrastructure for non-critical features.

> Redis is fail-open. If unavailable, presence tracking and cursor sharing stop working, and the suggestion lock cannot be enforced (worst case: two concurrent suggestions). But document CRUD, authentication, and the database all continue to function normally.

**39. What is the request timeout for non-Socket.IO, non-SSE requests?**
A) 10 seconds
B) 15 seconds
**C) 30 seconds**
D) 60 seconds

? A middleware sets both request and response timeouts.

> A middleware checks if the request path starts with `/socket.io` or accepts `text/event-stream`. If neither, it sets `req.setTimeout(30_000)` and `res.setTimeout(30_000)`. Socket.IO and streaming paths are exempt from the timeout.

**40. How does the server handle uncaught exceptions and unhandled rejections?**
A) It ignores them and continues running
B) It restarts the process via PM2
**C) It logs a fatal error with Pino, flushes the log, and exits with code 1**
D) It sends an alert to Sentry and continues

? Process-level handlers are registered in startServer().

> Both `process.on('uncaughtException')` and `process.on('unhandledRejection')` log the error at FATAL level using Pino, call `logger.flush()` to ensure the log is written, and then call `process.exit(1)`. Railway automatically restarts the process.

**41. What graceful shutdown steps does the server perform on SIGTERM/SIGINT?**
A) It just calls process.exit(0)
B) It closes the database pool only
**C) It closes the HTTP server, then Socket.IO, then the database pool, then Redis, then exits**
D) It saves all in-memory state to Redis before exiting

? The shutdown function follows a specific order.

> The shutdown sequence is: (1) close HTTP server to stop new connections, (2) close Socket.IO to disconnect all sockets, (3) drain the PostgreSQL pool, (4) quit Redis. This ensures in-flight requests complete and all connections are cleanly closed before exit.

**42. What happens when a user emits ai:accept for a suggestion that does not exist?**
A) The server crashes with an unhandled error
B) The document content is set to undefined
**C) The handler emits ai:error with "Suggestion not found" back to the client**
D) The event is silently ignored

? The handler checks the return value of updateSuggestionStatus.

> After calling `updateSuggestionStatus`, the handler checks if the result is null. If so, it emits `ai:error` with the message "Suggestion not found" to the requesting socket and returns early without modifying the document.

**43. What cursor TTL is used in Redis?**
A) 5 seconds
B) 10 seconds
**C) 30 seconds**
D) 5 minutes

? Cursor data is ephemeral and expires quickly.

> Cursor positions are stored with `redis.setex(..., 30, ...)`, giving them a 30-second TTL. This means stale cursor data from disconnected users automatically disappears without explicit cleanup.

**44. How does the app handle a suggestion request when one is already active?**
A) It queues the request for later
B) It cancels the active suggestion and starts a new one
**C) It emits ai:error with "Another AI suggestion is in progress" to the requester**
D) It silently drops the request

? The Redis lock check happens before creating the suggestion.

> The handler checks `redis.get(active_suggestion:{documentId})`. If a value exists, it immediately emits `ai:error` to the requesting socket with the message "Another AI suggestion is in progress" and returns without creating a new suggestion.

**45. What password hashing configuration does the auth service use?**
**A) bcryptjs with 12 salt rounds**
B) Argon2id with default parameters
C) scrypt with N=16384
D) SHA-256 with a random salt

? The app uses a specific library and salt round count.

> bcryptjs handles password hashing with 12 salt rounds. This provides strong protection while keeping hash computation time reasonable for login/register operations.
