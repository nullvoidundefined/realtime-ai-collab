# App 6: Real-time AI Collaboration

Collaborative writing workspace. Multiple users edit shared documents via Socket.IO. AI suggestions (continue, improve, summarize, expand) stream in real-time. Users accept, reject, or edit suggestions.

## Key AI pattern
Human-in-the-loop (HITL): AI proposes, humans approve. One-suggestion-at-a-time constraint. Client-side acceptance workflow with diff display.

## Stack
- Monorepo: `packages/api`, `packages/web`
- Next.js on Vercel, Express + Socket.IO on Railway
- PostgreSQL on Neon, Redis on Railway (presence + cursor state)
- Tiptap editor for collaborative editing
- Anthropic Claude API (streaming via Socket.IO, not SSE)

## Spec
Read `FULL_APPLICATION_SPEC.md` for full system design, DB schema, and task breakdown.

## Build order
POC → one document, one user, request AI suggestion, see it stream in, accept it → then multi-user → then suggestion types → then frontend polish.
