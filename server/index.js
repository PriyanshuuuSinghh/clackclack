const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// SECURITY HEADERS MIDDLEWARE
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// STATIC FILE SERVING
app.use(express.static(path.join(__dirname, '..')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// IN-MEMORY ROOM MANAGER
let rooms = {};

// STALE ROOM GARBAGE COLLECTION (Every 10 Minutes)
setInterval(() => {
    const now = Date.now();
    for (const roomId in rooms) {
        if (rooms[roomId].players.length === 0 || (now - rooms[roomId].createdAt > 1800000)) {
            delete rooms[roomId];
        }
    }
}, 600000);

// SOCKET TELEMETRY CONTROLLER
io.on('connection', (socket) => {
    let roomsCreatedCount = 0;

    socket.on('create-room', () => {
        if (roomsCreatedCount > 5) {
            socket.emit('error-msg', 'Room creation rate limit exceeded. Please wait.');
            return;
        }
        roomsCreatedCount++;

        const roomId = Math.floor(1000 + Math.random() * 9000).toString();

        rooms[roomId] = {
            players: [],
            createdAt: Date.now()
        };

        socket.join(roomId);
        rooms[roomId].players.push({
            id: socket.id,
            progress: 0
        });

        socket.emit('room-created', roomId);
    });

    socket.on('join-room', (rawRoomId) => {
        const roomId = String(rawRoomId).trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
        if (!rooms[roomId]) return;

        socket.join(roomId);

        if (!rooms[roomId].players.find(p => p.id === socket.id)) {
            rooms[roomId].players.push({
                id: socket.id,
                progress: 0
            });
        }

        io.to(roomId).emit('update-ghosts', rooms[roomId].players);

        if (rooms[roomId].players.length === 2) {
            let count = 3;
            const interval = setInterval(() => {
                io.to(roomId).emit('countdown', count);
                if (count === 1) {
                    clearInterval(interval);
                    setTimeout(() => {
                        io.to(roomId).emit('race-begin');
                    }, 1000);
                }
                count--;
            }, 1000);
        }
    });

    socket.on('update-progress', ({ roomId, progress }) => {
        const cleanRoomId = String(roomId).trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
        if (!rooms[cleanRoomId]) return;

        const sanitizedProgress = Math.min(100, Math.max(0, Number(progress) || 0));
        const player = rooms[cleanRoomId].players.find(p => p.id === socket.id);

        if (player) {
            player.progress = sanitizedProgress;
            io.to(cleanRoomId).emit('update-ghosts', rooms[cleanRoomId].players);
        }
    });

    socket.on('player-finished', (rawRoomId) => {
        const roomId = String(rawRoomId).trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
        if (!rooms[roomId]) return;

        io.to(roomId).emit('race-ended', socket.id);
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
            io.to(roomId).emit('update-ghosts', rooms[roomId].players);

            if (rooms[roomId].players.length === 0) {
                delete rooms[roomId];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`ClackClack Server listening on port ${PORT}`);
});
