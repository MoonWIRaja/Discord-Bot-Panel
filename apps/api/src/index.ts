import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { botRoutes } from "./routes/bot.routes.js";
import { flowRoutes } from "./routes/flow.routes.js";
import { initializeSocketServer } from "./services/collaboration.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const httpServer = createServer(app);
const PORT = process.env.API_PORT || 3000;

// Parse allowed origins from env
const allowedOrigins = process.env.API_ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Discord Bot Panel API', status: 'running', version: '2.0' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug route - to test if /api/auth/* paths are being matched by Express
app.get('/api/auth/test', (req, res) => {
  res.json({ test: 'auth route working', path: req.path, url: req.url });
});

// Better Auth - handle ALL requests to /api/auth/* 
const authHandler = toNodeHandler(auth);
app.all('/api/auth/*', (req, res) => {
  console.log('[AUTH]', req.method, req.url);
  authHandler(req, res);
});

// Also handle exact /api/auth path
app.all('/api/auth', (req, res) => {
  console.log('[AUTH]', req.method, req.url);
  authHandler(req, res);
});

// API routes (must be after auth to avoid conflicts)
app.use("/api/bots", express.json(), botRoutes);
app.use("/api/flows", express.json(), flowRoutes);

// Initialize Socket.io for real-time collaboration
initializeSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[API] Server is running on port ${PORT}`);
  console.log(`[API] Auth routes: /api/auth/*`);
  console.log(`[API] Socket.io enabled for real-time collaboration`);
});
