# Real-Time Typing Race

A real-time multiplayer typing platform built using Node.js, Express, and Socket.IO that synchronizes typing races between connected players in real time.

---

## Features

- Real-time multiplayer gameplay
- Live WPM calculation
- Accuracy tracking
- Countdown timer
- Dynamic leaderboard
- WebSocket communication using Socket.IO
- Responsive user interface

---

## Tech Stack

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express.js
- Socket.IO

---

## Screenshots

### Home Screen
![Home](screenshots/home.png)

---

### Race Screen
![Race](screenshots/race.png)

---

### Leaderboard
![Leaderboard](screenshots/leaderboard.png)

---

## Installation

Clone the repository:

```bash
git clone https://github.com/PriyanshuuuSinghh/real-time-typing-race.git
```

Move into the project folder:

```bash
cd real-time-typing-race
```

Install dependencies:

```bash
npm install
```

Start the server:

```bash
node server/index.js
```

Open in browser:

```txt
http://localhost:3000
```

---

## Project Architecture

The frontend communicates with the backend using Socket.IO WebSockets for low-latency real-time synchronization.

The server handles:
- player connections
- race progress updates
- timer synchronization
- leaderboard calculations

---

## Future Improvements

- Authentication system
- Matchmaking system
- Global leaderboard
- Player profiles
- Race history
- Mobile responsiveness

---

## License

MIT License