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
const rooms = {}; // { roomId: { hostId, racers: [], status: 'lobby' | 'racing' } }

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
            status: 'lobby'
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
        if (room.racers.length >= 5) {
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
        if (room && room.hostId === socket.id) {
            room.status = 'racing';
            io.to(roomId).emit('raceStarted');
            console.log(`Race started in room ${roomId}`);
        }
    });

    socket.on('syncState', ({ roomId, gameState }) => {
        // Host sends state, broadcast to everyone (client filters out own if needed)
        // console.log('syncState received:', JSON.stringify({ gameState, roomId }))
        io.to(roomId).emit('gameStateUpdate', gameState);
    });

    socket.on('boostRacer', ({ roomId, racerId }) => {
        // Client requests boost, relay to Host
        const room = rooms[roomId];
        if (room) {
            io.to(room.hostId).emit('applyBoost', racerId);
        }
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
