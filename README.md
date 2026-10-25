# SyncPad — Type together, in real time

A **real-time collaborative editor** for code and notes: multiple people type in the same document at the same time, see each other's cursors live, and the document never diverges — built on a **CRDT (Yjs)** and the **Monaco** editor (the engine inside VS Code).

> **🔴 Live:** [sync-pad-tawny.vercel.app](https://sync-pad-tawny.vercel.app) · API at [syncpad-4k8d.onrender.com](https://syncpad-4k8d.onrender.com)
>
> **Status:** Sprint 4 complete — **deployed and verified in production**: two users on two devices typing live in one pad, share-link joins, and restart recovery all confirmed against the live deployment. (The free-tier backend sleeps when idle, so the first request can take up to a minute.)

## Why this is hard

CRUD apps store *values*; SyncPad stores *operations* from many people racing each other. Two users typing at the same position at the same moment would silently lose text in a naive "save the whole document" design. A CRDT gives every operation an identity and a place in a shared sequence, so every replica converges to the same document regardless of arrival order — including edits made while offline.

## Features

**Sprint 1 (current)**
- Sign up / log in with JWT authentication
- Documents dashboard: create (title + language), open, rename, delete
- Monaco editor with 11 languages, a custom dark theme matching the app, and debounced autosave with a live save-state indicator
- Dark, premium UI: violet accent, Space Grotesk / Inter / JetBrains Mono

**Sprint 2 (current)**
- Everything in Sprint 1, plus the real-time core:
- **Yjs CRDT sync** over WebSockets (y-websocket) — one room per document, JWT-checked on connect; only the owner and joined collaborators get in
- **y-monaco binding** — editor content is owned by the CRDT, so simultaneous edits merge instead of overwriting
- **Live presence** — remote cursors with name flags and per-user colours, selection highlights, and a "who's here" avatar stack with an online count (awareness protocol)
- **Share by link** — owners copy a join link; anyone who opens it (after logging in) becomes a collaborator and the pad appears in their dashboard
- Room content is seeded from, and mirrored back to, MongoDB as plain text

**Sprint 3 (current)**
- Everything in Sprints 1–2, plus durability:
- **CRDT persistence in MongoDB** via y-websocket's `setPersistence` hooks — every Yjs update is appended to an `ydoc_updates` log; when a room closes it is compacted into a single `ydoc_snapshots` state and the covered log is cleared
- **Restart-proof rooms** — on open, a room is rebuilt by applying the snapshot and replaying any log entries on top; even a crash before compaction loses nothing, because the log alone is enough
- **Offline edits merge** — disconnect, keep typing, reconnect: the sync protocol exchanges state vectors and both sides converge (no duplicates, no loss)
- Documents created in Sprints 1–2 are migrated automatically: their stored plain text is seeded into CRDT history on first open
- Deleting a document also deletes its CRDT log and snapshot; the dashboard shows collaborator counts

**Sprint 4 (current)**
- Everything in Sprints 1–3, plus production:
- **Deployed** — backend (REST API + collab WebSockets on a single service) on Render, frontend on Vercel, data on MongoDB Atlas
- **Production-verified** — live typing between two accounts on two devices in the same pad, share-link joins in a fresh browser, and refresh/restart persistence, all confirmed against the live deployment
- SPA deep links (`/join/…`, `/editor/…`, `/dashboard`) served correctly on Vercel via rewrites, so shared links and refreshes work from anywhere

## Tech stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18, Vite, Tailwind CSS, Monaco Editor |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB Atlas |
| Auth | JWT + bcryptjs |
| Real-time | Yjs (CRDT), y-websocket, y-monaco, awareness protocol |

## Run it locally

You need two terminals — one for the server, one for the client.

**1. Server**
```bash
cd server
npm install
cp .env.example .env   # then fill in your values (see below)
npm run dev            # http://localhost:5000
```

`server/.env` needs:
- `MONGO_URI` — a MongoDB Atlas connection string. **Use a database named `syncpad`** in the path, e.g. `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/syncpad?...` (the part before `.mongodb.net` is the cluster name — leave it untouched; only the database name after it changes per app)
- `JWT_SECRET` — any long random string
- `CLIENT_URL` — `http://localhost:5173`

**2. Client**
```bash
cd client
npm install
npm run dev            # http://localhost:5173
```

Register an account, create a pad, and start typing. To see the real-time magic: hit **Share** in the editor, open the link in a second browser (or incognito window) with a second account, and type in both windows at once.

## Project layout

```
client/   React + Vite + Tailwind frontend (Monaco editor, self-hosted)
server/   Express API — JWT auth, documents CRUD, content autosave
```

## Author

Built by **Utkarsh Rawat (EMRE)** — B.Tech Computer Science, Class of 2028. Project 3 of an internship portfolio, after [CampusKhoj](https://github.com/Its-Emre/Campuskhoj) and [NoteWise](https://github.com/Its-Emre/NoteWise).
