# Note Craft (Noter) — Local-Only Version

A modern, minimal note-taking web app. This version keeps everything from
the original project **except** the cloud/auth integration — no IBM Cloud
App ID, no OAuth login, no cloud database. It still runs on a small local
Node/Express server, and all your notes and reminders are saved as plain
JSON files right next to the code, on your own machine.

## What changed from the original

- Removed the IBM Cloud App ID login (`passport`, `passport-openidconnect`,
  `ibmcloud-appid`, `express-session`) — the app no longer requires signing
  in or an internet connection to any cloud identity service.
- `/api/notes` and `/api/reminders` no longer require authentication or a
  per-user email — they read/write directly to `notes.json` and
  `reminders.json` in the project folder.
- `.env.example` only has `PORT` now — no client IDs, secrets, or OAuth
  URLs to configure.
- Everything else — the UI, the note cards, archive/trash/calendar,
  `login-failed.html`/`logged-out.html` (kept for completeness, though
  unreachable now that there's no login flow) — is unchanged.

## How to run it

```bash
npm install
npm start
```

Then open **http://localhost:5000** in your browser.

Your data lives in `notes.json` and `reminders.json` in this folder —
back them up like any other file if you care about not losing your notes.
There's no sync across devices; it's all local to wherever you run the
server.

## Files

- `server.js` — local Express server, static file hosting + notes/reminders API.
- `package.json` / `package-lock.json` — dependencies (trimmed of cloud/auth packages).
- `.env.example` — copy to `.env` if you want to change the port.
- `notes.json`, `reminders.json` — your local data, plain JSON.
- `public/` — the frontend (`index.html`, `style.css`, `script.js`).
- `.gitignore` — ignores `node_modules`, `.env`, etc.
