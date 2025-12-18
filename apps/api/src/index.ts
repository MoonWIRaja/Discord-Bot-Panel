import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.API_PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.PUBLIC_WEB_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { botRoutes } from "./routes/bot.routes.js";
import { flowRoutes } from "./routes/flow.routes.js";

// ... previous imports

app.all("/api/auth/*", toNodeHandler(auth));
app.use("/api/bots", botRoutes);
app.use("/api/flows", flowRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[API] Server is running on port ${PORT}`);
});
