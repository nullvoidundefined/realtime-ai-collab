# Real-time AI Collaboration — Application Summary

## What Is It?

Real-time AI Collaboration is a collaborative document editing workspace where multiple users can write together in real time with AI-powered writing assistance. Request an AI suggestion — continue, improve, summarize, or expand — and watch it stream in token by token. Then accept it, edit it, or reject it before it touches the document. Every accepted suggestion creates a version snapshot you can review later.

---

## What It Does

- **Collaborative real-time editing** — multiple users edit the same document simultaneously via Socket.IO
- **AI writing suggestions** — request Continue, Improve, Summarize, or Expand suggestions powered by Claude AI
- **Human-in-the-loop workflow** — AI proposes, humans approve. Accept, edit, or reject every suggestion before it's committed
- **Live streaming** — AI tokens stream in real time to all users in the document room
- **Presence awareness** — see who's online in your document with colored avatars
- **Cursor tracking** — see other users' cursor positions in real time
- **Document sharing** — generate a share link so others can join and collaborate
- **Version history** — every accepted or edited suggestion creates a version snapshot for review

---

## User Flows

### 1. Creating an Account

1. Click **Create Account** on the home page
2. Enter your name, email, and a password (minimum 8 characters)
3. You're logged in immediately and taken to your dashboard

### 2. Logging In

1. Click **Sign In** on the home page
2. Enter your email and password
3. Your session lasts 7 days — you won't need to log in again on the same device

### 3. Creating a Document

1. From the dashboard, click **+ New Document**
2. A new "Untitled" document opens in the editor
3. Click the title at the top to rename it

### 4. Editing a Document

1. Open a document from the dashboard
2. Type in the Tiptap rich text editor — formatting toolbar available at the top
3. Changes are broadcast to all other users in the document in real time

### 5. Requesting an AI Suggestion

1. Select some text in the document (or position your cursor where you want the AI to continue)
2. Choose a suggestion type from the toolbar:
   - **Continue** — keeps writing in the same tone and style
   - **Improve** — rewrites for clarity, flow, and impact
   - **Summarize** — condenses the text into a brief summary
   - **Expand** — adds more detail and examples
3. Watch the AI suggestion stream in token by token — all users in the document see it
4. Only one suggestion can be active at a time per document

### 6. Accepting, Editing, or Rejecting a Suggestion

Only the user who requested the suggestion sees the action buttons:

- **Accept** — appends the suggestion to the document as-is and creates a version snapshot
- **Edit** — lets you modify the suggestion text before committing it
- **Reject** — discards the suggestion entirely (streaming is cancelled if still in progress)

All users see the result — accepted or edited text appears in the document for everyone.

### 7. Sharing a Document

1. Click **Share** in the document header
2. A share link is generated (or shown if one already exists)
3. Send the link to anyone — when they open it and are logged in, they're added as a collaborator with edit permission

### 8. Joining a Shared Document

1. Open the share link you received
2. If you're logged in, you're automatically added as a collaborator and redirected to the document
3. If you're not logged in, you'll be prompted to sign in first

### 9. Viewing Version History

1. Open the version history panel in a document
2. See snapshots of the document at every point where a suggestion was accepted or edited
3. Each version shows who created it and when

### 10. Signing Out

Click **Sign Out** on the dashboard page.

---

## Key Behaviors to Know

- **One suggestion at a time.** Each document can only have one active AI suggestion. If someone is already streaming or reviewing a suggestion, new requests are blocked until it's resolved.
- **Suggestions are streamed to everyone.** All users in the document see the AI tokens appear in real time, but only the requester can accept, edit, or reject.
- **Rejecting cancels streaming.** If you reject a suggestion while it's still streaming, the server aborts the Claude API call immediately — no wasted tokens.
- **Version snapshots are automatic.** Every accepted or edited suggestion creates a full document snapshot. You don't need to manually save versions.
- **Presence has a 5-minute timeout.** If a user disconnects or loses connection, they're removed from the presence list after the Redis key expires.
- **Cursor positions are ephemeral.** Cursor tracking data lives in Redis with a 30-second TTL — it's not stored permanently.
- **Sessions last 7 days.** The session cookie is HTTP-only and stored in PostgreSQL.
