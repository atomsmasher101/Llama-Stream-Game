# Llama AI Training Server

A local server for crowdsourcing neural network training for the Llama Game.

## Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Run the Server

**Option A: Run in foreground**
```bash
node server.js
```

**Option B: Install as Windows Service (run as Administrator)**
```bash
install-llama-ai-server.bat --install
```

### 3. Access the Server

- Local: `http://localhost:3000`
- From other computers: `http://<YOUR-IP>:3000`

### 4. Configure Port Forwarding (for remote players)

If you want players outside your network to connect:
1. Log in to your router
2. Forward port 3000 to your computer's IP
3. Share your public IP address with players

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server status |
| `/api/networks` | GET | Get top 20 networks |
| `/api/networks` | POST | Submit networks |
| `/api/stats` | GET | Server statistics |

## Client Configuration

The game automatically connects to `http://localhost:3000`. To use a different server, modify `AI.serverUrl` in the game code.

## How It Works

1. **Submission**: When a player's AI achieves fitness > 5000, it's submitted to the server
2. **Quality Gate**: Networks below fitness 5000 are rejected
3. **Storage**: Server stores up to 100 best networks
4. **Tournament**: Random tournaments run to maintain diversity
5. **Distribution**: New players fetch top networks on startup

## Privacy

- No personal information collected
- Only network weights and fitness scores stored
- No IP addresses logged

## Troubleshooting

**Server won't start?**
- Make sure port 3000 is not in use
- Check Node.js is installed: `node --version`

**Can't connect from other computer?**
- Check firewall settings
- Verify port forwarding is configured
- Use `http://localhost:3000/health` to test locally first

**Client shows offline?**
- Server may not be running
- Check the URL in the game code matches your server
