# Llama Stream Game

A browser-based llama platformer with optional shared AI training infrastructure.

## Project Layout

- `index.html` - main game client.
- `ai.html` - AI-focused client entry point.
- `monitor.html` - local monitoring page.
- `replay.html` - replay page.
- `server/` - Node.js service for collecting and distributing trained networks.

## Quick Start (Game Client)

Because the game is static HTML/JS, you can run it with any static web server.

### Option 1: Open directly

Open `index.html` in your browser.

### Option 2: Serve locally (recommended)

From the repository root:

```bash
python -m http.server 8080
```

Then open:

- `http://localhost:8080/index.html`
- `http://localhost:8080/ai.html`
- `http://localhost:8080/monitor.html`
- `http://localhost:8080/replay.html`

## AI Server (Optional)

The server enables crowd-sourced neural network sharing between players.

### Install dependencies

```bash
cd server
npm install
```

### Run

```bash
node server.js
```

Default URL: `http://localhost:3000`

Key endpoints:

- `GET /health` - server health and uptime
- `GET /api/networks` - fetch top networks
- `POST /api/networks` - submit trained networks
- `GET /api/stats` - aggregate fitness stats
- `DELETE /api/networks/:id` - remove a specific network
- `DELETE /api/networks/clear` - clear all stored networks

## Deployment Notes

- The root site can be hosted on any static host (GitHub Pages, Netlify, etc.).
- The AI server must run on Node.js where `server/networks.json` is writable.
- If exposing the AI server publicly, place it behind HTTPS and appropriate firewall/rate limits.

## Troubleshooting

- **Blank page or assets missing:** run through a local HTTP server instead of `file://`.
- **Server won’t start:** verify Node.js is installed and port `3000` is available.
- **No AI sharing:** confirm the client is configured to point to the running server URL.

## License

No explicit license file is currently included in this repository.
