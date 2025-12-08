import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity in dev
        methods: ["GET", "POST"]
    }
});

// In-memory storage
// { roomId: { hostId, racers: [], status: 'lobby' | 'countdown' | 'racing', winner: null, boostCooldowns: {} } }
const rooms = {};

function generateRoomId() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', (name, callback) => {
        const roomId = generateRoomId();
        rooms[roomId] = {
            hostId: socket.id,
            racers: [{ id: socket.id, name: name, isHost: true, colorIndex: 0 }],
            status: 'lobby',
            winner: null,
            boostCooldowns: {}
        };
        socket.join(roomId);
        callback({ roomId, isHost: true, racers: rooms[roomId].racers });
        io.to(roomId).emit('updateLobby', rooms[roomId].racers);
        console.log(`Room ${roomId} created by ${name} (${socket.id})`);
    });

    socket.on('joinRoom', ({ roomId, name }, callback) => {
        const room = rooms[roomId];
        if (!room) {
            console.log(`Join failed: Room ${roomId} not found. Available rooms: ${Object.keys(rooms).join(', ')}`);
            return callback({ error: 'Room not found' });
        }
        if (room.racers.length >= 6) {
            return callback({ error: 'Room is full' });
        }
        if (room.status !== 'lobby') {
            return callback({ error: 'Race already started' });
        }

        const colorIndex = room.racers.length;
        room.racers.push({ id: socket.id, name: name, isHost: false, colorIndex });
        socket.join(roomId);
        callback({ success: true });

        // Notify everyone in room of new list
        io.to(roomId).emit('updateLobby', room.racers);
        console.log(`${name} joined room ${roomId}`);
    });

    socket.on('startRace', (roomId) => {
        const room = rooms[roomId];
        if (!room || room.hostId !== socket.id) return;
        if (room.status !== 'lobby') return; // Prevent double starts or mid-race triggers

        room.status = 'countdown';
        room.winner = null;
        room.boostCooldowns = {};
        let countdownValue = 3;
        io.to(roomId).emit('raceCountdown', countdownValue);

        const interval = setInterval(() => {
            countdownValue -= 1;
            if (countdownValue > 0) {
                io.to(roomId).emit('raceCountdown', countdownValue);
            } else {
                clearInterval(interval);
                room.status = 'racing';
                io.to(roomId).emit('raceStarted');
                console.log(`Race started in room ${roomId}`);
            }
        }, 1000);
    });

    socket.on('syncState', ({ roomId, gameState }) => {
        // Host sends state, broadcast to everyone (client filters out own if needed)
        // console.log('syncState received:', JSON.stringify({ gameState, roomId }))
        io.to(roomId).emit('gameStateUpdate', gameState);
    });

    socket.on('boostRacer', ({ roomId, racerId }) => {
        // Client requests boost, relay to Host with light anti-bot rate limiting
        const room = rooms[roomId];
        if (!room || room.status !== 'racing') return;

        const now = Date.now();
        const last = room.boostCooldowns[racerId] || 0;
        // Allow human spam but block bot-speed spam; ~90ms window
        if (now - last < 90) return;
        room.boostCooldowns[racerId] = now;

        const racerExists = room.racers.some(r => r.id === racerId);
        if (!racerExists) return;

        io.to(room.hostId).emit('applyBoost', racerId);
    });

    socket.on('resetRoom', ({ roomId, hostName }, callback) => {
        const room = rooms[roomId];
        if (!room || room.hostId !== socket.id) return callback && callback({ success: false, error: 'Not authorized' });

        const name = (hostName || 'Host').slice(0, 30);
        room.status = 'lobby';
        room.winner = null;
        room.boostCooldowns = {};
        room.racers = [{ id: socket.id, name, isHost: true, colorIndex: 0 }];

        io.to(roomId).emit('roomReset', { roomId, hostId: room.hostId, racers: room.racers });
        io.to(roomId).emit('updateLobby', room.racers);
        callback && callback({ success: true, racers: room.racers });
    });

    socket.on('closeRoom', (roomId, callback) => {
        const room = rooms[roomId];
        if (!room || room.hostId !== socket.id) return callback && callback({ success: false, error: 'Not authorized' });

        io.to(roomId).emit('roomClosed');
        delete rooms[roomId];
        callback && callback({ success: true });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Handle cleanup (remove from rooms, etc.) - Simplified for now
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const index = room.racers.findIndex(r => r.id === socket.id);
            if (index !== -1) {
                room.racers.splice(index, 1);
                io.to(roomId).emit('updateLobby', room.racers);

                // If host left, maybe close room or migrate (simple: close)
                if (room.hostId === socket.id) {
                    io.to(roomId).emit('roomClosed');
                    delete rooms[roomId];
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
