# SyncPad — Type together, in real time

A **real-time collaborative editor** for code and notes: multiple people type in the same document at the same time, see each other's cursors live, and the document never diverges — built on a **CRDT (Yjs)** and the **Monaco** editor (the engine inside VS Code).

> **Status:** Sprint 2 complete — **real-time collaboration is live**: share a link, and collaborators type in the same document at the same time with live cursors, while a CRDT guarantees nobody's text is ever lost. CRDT persistence across server restarts is Sprint 3; deployment is Sprint 4.

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

**Planned**
- **Sprint 3** — CRDT persistence in MongoDB (append-only update log + periodic snapshots), offline-edit → reconnect merging, the five-test gauntlet (same-spot typing, reconnect merge, 5+ users, paste storm, server restart)
- **Sprint 4** — Deploy (Render + Vercel) and launch

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
