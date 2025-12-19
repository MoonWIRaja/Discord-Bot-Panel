import { io, Socket } from 'socket.io-client';
import { browser } from '$app/environment';

const isLocal = browser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_URL = browser
    ? (import.meta.env.VITE_PUBLIC_API_URL || (isLocal ? 'http://localhost:4000' : window.location.origin))
    : '';

// Use globalThis to persist socket across module re-imports
declare global {
    var __collaborationSocket: Socket | null;
}

if (browser && typeof globalThis.__collaborationSocket === 'undefined') {
    globalThis.__collaborationSocket = null;
}

function getSocket(): Socket | null {
    return browser ? globalThis.__collaborationSocket : null;
}

function setSocket(s: Socket | null) {
    if (browser) {
        globalThis.__collaborationSocket = s;
    }
}

export interface CollaboratorUser {
    id: string;
    name: string;
    image?: string;
    color: string;
}

export interface CursorPosition {
    x: number;
    y: number;
}

export interface RemoteUser {
    socketId: string;
    user: CollaboratorUser;
    cursor?: CursorPosition;
    selectedNodeId?: string | null;
}

export function connectSocket() {
    if (!browser) return null;

    // Disconnect existing socket if any
    const existingSocket = getSocket();
    if (existingSocket) {
        if (existingSocket.connected) return existingSocket;
        existingSocket.disconnect();
    }

    console.log('[Socket] Connecting to:', API_URL);
    
    const socket = io(API_URL, {
        path: '/socket.io',
        withCredentials: true,
        transports: ['websocket', 'polling']
    });

    // Store socket globally
    setSocket(socket);

    socket.on('connect', () => {
        console.log('[Socket] Connected! Socket ID:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('[Socket] Disconnected');
    });

    socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error);
    });

    return socket;
}

export function connectToStudio(botId: string, user: { id: string; name: string; image?: string }) {
    const socket = connectSocket();

    if (socket) {
        if (socket.connected) {
            socket.emit('join-studio', { botId, user });
        } else {
            socket.on('connect', () => {
                socket.emit('join-studio', { botId, user });
            });
        }
    }

    return socket;
}

export function disconnectFromStudio() {
    const socket = getSocket();
    if (socket) {
        socket.disconnect();
        setSocket(null);
    }
}

// Emit events
let lastCursorEmit = 0;
const CURSOR_THROTTLE_MS = 30; // Emit cursor every 30ms max

export function emitCursorMove(position: CursorPosition) {
    const now = Date.now();
    if (now - lastCursorEmit < CURSOR_THROTTLE_MS) return;
    lastCursorEmit = now;
    
    const socket = getSocket();
    if (socket?.connected) {
        socket.emit('cursor-move', position);
    }
}

// Activity-based tracking - more reliable than raw cursor position
export interface UserActivity {
    type: 'idle' | 'dragging-node' | 'selecting-node' | 'dragging-sidebar-item';
    nodeId?: string | null;       // ID of node being dragged/selected
    nodePosition?: { x: number; y: number }; // Position of node being dragged
    sidebarItem?: string | null;  // Label of sidebar item being dragged
}

let lastActivityEmit = 0;
const ACTIVITY_THROTTLE_MS = 50;

export function emitUserActivity(activity: UserActivity) {
    const now = Date.now();
    if (now - lastActivityEmit < ACTIVITY_THROTTLE_MS) return;
    lastActivityEmit = now;
    
    const socket = getSocket();
    if (socket?.connected) {
        socket.emit('user-activity', activity);
    }
}

export function emitNodeMove(nodeId: string, position: { x: number; y: number }) {
    const socket = getSocket();
    if (socket?.connected) {
        console.log('[Socket] Emitting node-move:', { nodeId, position });
        socket.emit('node-move', { nodeId, position });
    } else {
        console.warn('[Socket] Cannot emit node-move - socket not connected', { 
            socketExists: !!socket, 
            connected: socket?.connected,
            socketId: socket?.id
        });
    }
}

export function emitNodeSelect(nodeId: string | null) {
    const socket = getSocket();
    socket?.emit('node-select', { nodeId });
}

export function emitNodesChange(nodes: any[], edges: any[]) {
    const socket = getSocket();
    socket?.emit('nodes-change', { nodes, edges });
}

export function emitEdgeConnect(edge: any) {
    const socket = getSocket();
    socket?.emit('edge-connect', { edge });
}

export function emitNodeDelete(nodeId: string) {
    const socket = getSocket();
    socket?.emit('node-delete', { nodeId });
}

export { getSocket };
