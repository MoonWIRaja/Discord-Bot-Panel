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

const lines = [
    '🤖 Discord Bot Panel - Web',
    `🌐 Public URL: ${publicUrl}`,
    `🖥️  Local:      http://localhost:${port}`
];

// Calculate visually required width
// We add extra padding to ensure emojis don't break alignment (simple heuristic)
const lengths = lines.map(line => line.length);
const maxLength = Math.max(...lengths);

// Define internal width (max length + padding)
// We add 4 spaces of padding (2 left, 2 right roughly)
const contentPadding = 4;
const innerWidth = maxLength + contentPadding;

const boxWidth = innerWidth + 2; // +2 for borders

const top = '╔' + '═'.repeat(innerWidth) + '╗';
const separator = '╠' + '═'.repeat(innerWidth) + '╣';
const bottom = '╚' + '═'.repeat(innerWidth) + '╝';

// Function to calculate visual padding needed
const getPadding = (str) => {
    return ' '.repeat(innerWidth - str.length);
};

// Center align helper
const center = (text) => {
    const space = innerWidth - text.length;
    const left = Math.floor(space / 2);
    const right = space - left;
    return '║' + ' '.repeat(left) + text + ' '.repeat(right) + '║';
};

// Left align helper with fixed left indent
const left = (text) => {
    // Indent 2 spaces from left border
    return '║  ' + text + ' '.repeat(innerWidth - text.length - 2) + '║';
};

console.log('\n');
console.log('  ' + top);
console.log('  ' + center(lines[0]));
console.log('  ' + separator);
console.log('  ' + left(lines[1]));
console.log('  ' + left(lines[2]));
console.log('  ' + bottom);
console.log('\n');

// Start the server
import('./build/index.js');
