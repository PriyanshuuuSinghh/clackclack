
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

/* =========================
   STATIC FILES
========================= */

app.use(express.static(path.join(__dirname, '..')));

app.get('/', (req, res) => {

    res.sendFile(
        path.join(__dirname, '..', 'index.html')
    );

});

/* =========================
   ROOMS
========================= */

let rooms = {};

/* =========================
   SOCKET CONNECTION
========================= */

io.on('connection', (socket) => {

    console.log('✅ User Connected:', socket.id);

    /* CREATE ROOM */
    socket.on('create-room', () => {

        const roomId =
            Math.floor(1000 + Math.random() * 9000).toString();

        rooms[roomId] = {
            players: []
        };

        socket.join(roomId);

        rooms[roomId].players.push({
            id: socket.id,
            progress: 0
        });

        socket.emit('room-created', roomId);

        console.log(`🏠 Room created: ${roomId}`);
    });

    /* JOIN ROOM */
    socket.on('join-room', (roomId) => {

        if (!rooms[roomId]) return;

        socket.join(roomId);

        if (
            !rooms[roomId].players.find(
                p => p.id === socket.id
            )
        ) {

            rooms[roomId].players.push({
                id: socket.id,
                progress: 0
            });
        }

        io.to(roomId)
        .emit('update-ghosts', rooms[roomId].players);

        console.log(
            `👥 User ${socket.id} joined room ${roomId}`
        );

        /* START COUNTDOWN */
        if (rooms[roomId].players.length === 2) {

            let count = 3;

            const interval = setInterval(() => {

                io.to(roomId).emit('countdown', count);

                if (count === 1) {

                    clearInterval(interval);

                    setTimeout(() => {

                        io.to(roomId)
                        .emit('race-begin');

                    }, 1000);
                }

                count--;

            }, 1000);
        }
    });

    /* UPDATE PROGRESS */
    socket.on('update-progress', ({ roomId, progress }) => {

        if (!rooms[roomId]) return;

        const player =
            rooms[roomId].players.find(
                p => p.id === socket.id
            );

        if (player) {

            player.progress = progress;

            io.to(roomId)
            .emit('update-ghosts', rooms[roomId].players);
        }
    });

    /* FINISH EVENT */
    socket.on('player-finished', (roomId) => {

        if (!rooms[roomId]) return;

        console.log("🏆 Winner:", socket.id);

        io.to(roomId)
        .emit('race-ended', socket.id);
    });

    /* DISCONNECT */
    socket.on('disconnect', () => {

        for (const roomId in rooms) {

            rooms[roomId].players =
                rooms[roomId].players.filter(
                    p => p.id !== socket.id
                );

            io.to(roomId)
            .emit('update-ghosts', rooms[roomId].players);

            if (
                rooms[roomId].players.length === 0
            ) {

                delete rooms[roomId];
            }
        }

        console.log('❌ User Disconnected:', socket.id);
    });
});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {

    console.log(
        `🚀 SERVER LIVE ON PORT ${PORT}`
    );
});

