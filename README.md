# ClackClack - Cyber Typing Matrix Platform

ClackClack is a full-stack real-time typing platform built with JavaScript, HTML5, Vanilla CSS, Express, and Socket.io. It offers single-player speed testing, isolated accuracy practice drills, LeetCode-style activity heatmaps, zero-latency mechanical keyboard sound synthesis, and a 4-stage competitive multiplayer matchmaking engine.

---

## Project Overview

ClackClack provides a comprehensive typing environment designed for accuracy, speed development, and competitive racing. The application features a Cyber Matrix design system with dynamic theme switching, local telemetry persistence, and a real-time WebSocket backend.

---

## Features

### Solo Typing Arena
- Real-time Words Per Minute (WPM) and Accuracy calculations.
- Configurable test durations (15s, 30s, 60s, 120s).
- Optional punctuation and numbers modes.
- Personal Best (PB) tracking stored per test duration.
- SVG WPM trajectory graph on completion.

### Precision Practice Drills
- Isolated drill categories: Common Trigrams, Weak Finger Exercises, Code Syntaxes, and Special Symbols.
- Real-time error counting and accuracy percentages.

### LeetCode-Style Activity Heatmap
- 365-day practice submission visualization grouped into 12 month blocks.
- Yearly submission totals, active days count, and continuous max streak tracking.
- Practice velocity color scaling based on total daily minutes spent typing.

### Procedural Mechanical Keyboard Sound Synthesizer
- Synthesizes Cherry MX mechanical key clicks, spacebar thuds, backspace snaps, and enter keypresses using Web Audio API.
- Low-latency pre-warming system ensuring instant audio feedback on keystroke.

### Competitive 4-Stage Multiplayer
- Stage 1: Pre-Race Lobby with custom pilot usernames, duration selection, room creation/joining, and live waiting room status.
- Stage 2: Match Found VS screen displaying pilot hero cards and ready confirmations.
- Stage 3: Dedicated Race Screen containing HUD live rank badges (1st/2nd place), telemetry progress tracks, and focused word typing clip.
- Stage 4: Results Podium with detailed character metrics and playful post-match cartoon winner celebration.
- AI Bot Mode available for solo competitive testing.

---

## Tech Stack

### Frontend
- HTML5 & CSS3 (Vanilla Cyber SaaS Matrix Design Tokens)
- JavaScript (ES6+ Modules)
- Web Audio API (Procedural sound synthesis)
- Canvas API (Interactive particle background and confetti effects)

### Backend
- Node.js
- Express.js
- Socket.io (WebSocket telemetry synchronization)

---

## Security & Production Optimizations

- Express Security Headers Middleware (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy).
- Server-side Socket Input Sanitization & Progress Clamping.
- Socket Rate Limiting to prevent room creation flooding.
- Automatic stale room memory garbage collection.
- Client-side XSS escaping on dynamic string rendering.

---

## Installation & Local Development

1. Clone the repository:
```bash
git clone https://github.com/PriyanshuuuSinghh/real-time-typing-race.git
```

2. Navigate into the project directory:
```bash
cd real-time-typing-race
```

3. Install backend dependencies:
```bash
cd server
npm install
```

4. Launch the application server from the `server` directory:
```bash
node index.js
```

The Express server serves the frontend and the Socket.IO connection together. No separate frontend server is required.

5. Open your browser and navigate to:
```txt
http://localhost:3000
```

---

## License

MIT License
