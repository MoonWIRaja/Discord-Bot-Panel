import 'dotenv/config';
import path from 'path';
import { config } from 'dotenv';

// Load .env from root directory
config({ path: path.resolve(process.cwd(), '../../.env') });

// Set PORT from WEB_PORT in .env
const port = process.env.WEB_PORT || '5173';
const publicUrl = process.env.VITE_PUBLIC_WEB_URL || `http://localhost:${port}`;

process.env.PORT = port;
process.env.ORIGIN = publicUrl;

// Show custom startup message
console.log('\n');
console.log('  ╔════════════════════════════════════════════╗');
console.log('  ║       🤖 Discord Bot Panel - Web          ║');
console.log('  ╠════════════════════════════════════════════╣');
console.log(`  ║  🌐 Public URL: ${publicUrl.padEnd(25)} ║`);
console.log(`  ║  🖥️  Local:      http://localhost:${port}        ║`);
console.log('  ╚════════════════════════════════════════════╝');
console.log('\n');

// Start the server
import('./build/index.js');
