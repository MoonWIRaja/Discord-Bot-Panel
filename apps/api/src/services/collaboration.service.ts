import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

interface User {
    id: string;
    name: string;
    image?: string;
    color: string;
}

interface CursorPosition {
    x: number;
    y: number;
}

interface StudioRoom {
    botId: string;
    users: Map<string, User>;
    cursors: Map<string, CursorPosition>;
}

// Store active studio rooms
const studioRooms: Map<string, StudioRoom> = new Map();

// User colors for collaboration
const userColors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
    '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
    '#6366f1', '#8b5cf6', '#a855f7', '#ec4899'
];

let colorIndex = 0;
function getNextColor(): string {
    const color = userColors[colorIndex % userColors.length];
    colorIndex++;
    return color;
}

// Store active studio rooms
let ioInstance: SocketServer | null = null;
export function getIO(): SocketServer | null {
    return ioInstance;
}

export function initializeSocketServer(httpServer: HttpServer) {
    // Parse allowed origins from env
    const allowedOrigins = process.env.API_ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
    
    const io = new SocketServer(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true
        },
        path: '/socket.io'
    });

    ioInstance = io;

    console.log('[Socket.io] Server initialized');

    io.on('connection', (socket: Socket) => {
        console.log(`[Socket.io] Client connected: ${socket.id}`);

        let currentRoom: string | null = null;
        let currentUser: User | null = null;

        // Join bot logs room (for dashboard)
        socket.on('join-bot-logs', (botId: string) => {
            const logsRoom = `bot-${botId}`;
            socket.join(logsRoom);
            console.log(`[Socket.io] Client ${socket.id} joined logs for bot ${botId}`);
        });

        // Join a studio room
        socket.on('join-studio', (data: { botId: string; user: { id: string; name: string; image?: string } }) => {
            const { botId, user } = data;
            currentRoom = `studio:${botId}`;
            currentUser = {
                ...user,
                color: getNextColor()
            };

            socket.join(currentRoom);

            // Initialize room if not exists
            if (!studioRooms.has(currentRoom)) {
                studioRooms.set(currentRoom, {
                    botId,
                    users: new Map(),
                    cursors: new Map()
                });
            }

            const room = studioRooms.get(currentRoom)!;
            room.users.set(socket.id, currentUser);

            // Notify others that user joined
            socket.to(currentRoom).emit('user-joined', {
                socketId: socket.id,
                user: currentUser
            });

            // Send current users to the new user
            const activeUsers = Array.from(room.users.entries()).map(([sid, u]) => ({
                socketId: sid,
                user: u
            }));
            socket.emit('room-users', activeUsers);

            console.log(`[Socket.io] User ${user.name} joined studio ${botId}`);
        });

        // Cursor movement
        socket.on('cursor-move', (position: CursorPosition) => {
            if (!currentRoom || !currentUser) return;

            const room = studioRooms.get(currentRoom);
            if (room) {
                room.cursors.set(socket.id, position);
            }

            socket.to(currentRoom).emit('cursor-update', {
                socketId: socket.id,
                user: currentUser,
                position
            });
        });

        // Node moved
        socket.on('node-move', (data: { nodeId: string; position: { x: number; y: number } }) => {
            if (!currentRoom || !currentUser) return;

            socket.to(currentRoom).emit('node-moved', {
                socketId: socket.id,
                user: currentUser,
                ...data
            });
        });

        // Node selected
        socket.on('node-select', (data: { nodeId: string | null }) => {
            if (!currentRoom || !currentUser) return;

            socket.to(currentRoom).emit('node-selected', {
                socketId: socket.id,
                user: currentUser,
                nodeId: data.nodeId
            });
        });

        // Nodes changed (added/removed)
        socket.on('nodes-change', (data: { nodes: any[]; edges: any[] }) => {
            if (!currentRoom || !currentUser) return;

            socket.to(currentRoom).emit('nodes-changed', {
                socketId: socket.id,
                user: currentUser,
                ...data
            });
        });

        // Edge connected
        socket.on('edge-connect', (data: { edge: any }) => {
            if (!currentRoom || !currentUser) return;

            socket.to(currentRoom).emit('edge-connected', {
                socketId: socket.id,
                user: currentUser,
                ...data
            });
        });

        // User activity (dragging, selecting, etc.)
        socket.on('user-activity', (data: { 
            type: string; 
            nodeId?: string | null;
            nodePosition?: { x: number; y: number };
            sidebarItem?: string | null;
        }) => {
            if (!currentRoom || !currentUser) return;

            socket.to(currentRoom).emit('user-activity-update', {
                socketId: socket.id,
                user: currentUser,
                ...data
            });
        });

        // Node deleted
        socket.on('node-delete', (data: { nodeId: string }) => {
            if (!currentRoom || !currentUser) return;

            socket.to(currentRoom).emit('node-deleted', {
                socketId: socket.id,
                user: currentUser,
                ...data
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            if (currentRoom) {
                const room = studioRooms.get(currentRoom);
                if (room) {
                    room.users.delete(socket.id);
                    room.cursors.delete(socket.id);

                    // Notify others
                    socket.to(currentRoom).emit('user-left', {
                        socketId: socket.id
                    });

                    // Clean up empty rooms
                    if (room.users.size === 0) {
                        studioRooms.delete(currentRoom);
                    }
                }
            }
            console.log(`[Socket.io] Client disconnected: ${socket.id}`);
        });
    });

    return io;
}
