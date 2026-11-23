# React Miami: Neon Nights

A GTA-style multiplayer browser game set at the Hyatt Regency Miami for React Miami, presented by Neon (Diamond Sponsor).

## Run locally

```bash
npm install
npm run build
npm start          # Express + WebSocket server on PORT (default 3000)
```

Use `npm run dev` for the Vite dev server.

## Deploy

- **Frontend (Vercel):** import this repo. `vercel.json` builds with Vite into `dist`. On `*.vercel.app`, the game connects to the Fly multiplayer server automatically. To use a different server, set `VITE_WS_URL` (e.g. `wss://your-server/ws`).
- **Multiplayer server (Fly.io):** `fly deploy`. It serves the game, the `/ws` WebSocket and `/health`. Golden-ticket claims are saved on the `rm_data` volume at `/data`.
