import { ToolDefinition, ToolRegistry, ToolResult } from '../registry.js';
import { AIService } from '../../ai.service.js';
import { db } from '../../../db/index.js';
import { bots } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createReadStream } from 'fs';
import archiver from 'archiver';

// Track active file generation sessions
const activeSessions = new Map<string, {
    userId: string;
    channelId: string;
    botId: string;
    prompt: string;
    files: Array<{ path: string; content: string; description?: string }>;
    createdAt: number;
}>();

// Clean up sessions older than 1 hour
setInterval(() => {
    const now = Date.now();
    for (const [id, session] of activeSessions.entries()) {
        if (now - session.createdAt > 60 * 60 * 1000) {
            activeSessions.delete(id);
        }
    }
}, 5 * 60 * 1000);

const generateFileTool: ToolDefinition = {
    name: 'generate_file',
    description: '📁 FILE GENERATOR - Creates code files and sends them immediately. Use DIRECTLY when user asks to create apps, websites, scripts. DO NOT ask questions.\n\nSINGLE FILE examples: "create an HTML calculator", "make a Python script", "an HTML page"\n\nMULTI-FILE examples: "create a React app", "build a full stack todo app", "make a Node.js API"\n\nFor single files → sends individual file immediately. For multi-file projects → sends ZIP with proper folder structure immediately.',
    category: 'utility',
    parameters: {
        action: {
            type: 'string',
            description: 'Action: "create" to generate and send files immediately',
            required: true
        },
        prompt: {
            type: 'string',
            description: 'What to create: "a todo web app", "a Python scraper", "an HTML calculator"',
            required: false
        },
        filename: {
            type: 'string',
            description: 'Specific filename for single file: "index.html", "app.py"',
            required: false
        },
        language: {
            type: 'string',
            description: 'Language: "html", "python", "javascript", "react", "nodejs", "vue"',
            required: false
        },
        description: {
            type: 'string',
            description: 'Additional requirements',
            required: false
        }
    },
    handler: async ({ action, prompt, filename, language, description, sessionId }, { botId, userId, channelId }): Promise<string | ToolResult> => {
        console.log(`[Tool:generate_file] Action: ${action}, Prompt: ${prompt?.substring(0, 50)}...`);

        try {
            if (action === 'create') {
                if (!prompt) {
                    return '❌ Please describe what to create.';
                }

                const newSessionId = randomUUID();
                const files: Array<{ path: string; content: string; description?: string }> = [];

                // Determine if single file or multi-file project
                const wantsSingleFile = isSingleFileRequest(prompt);
                const lang = language?.toLowerCase() || guessLanguage(prompt);

                if (wantsSingleFile) {
                    // Single file request
                    const defaultFilename = filename || getDefaultFilename(lang, prompt);
                    const code = await generateFileContent(defaultFilename, prompt, lang, description, botId);
                    files.push({
                        path: defaultFilename,
                        content: code,
                        description: prompt.substring(0, 100)
                    });
                } else {
                    // Multi-file project with proper folder structure
                    const projectStructure = generateProjectStructure(prompt, lang);
                    for (const file of projectStructure) {
                        const code = await generateFileContent(file.name, prompt, lang, description, botId);
                        files.push({
                            path: file.path || file.name,
                            content: code,
                            description: file.description || file.name
                        });
                    }
                }

                // Store session
                activeSessions.set(newSessionId, {
                    userId,
                    channelId,
                    botId,
                    prompt,
                    files,
                    createdAt: Date.now()
                });

                const fileList = files.map(f => `  📄 ${f.path}`).join('\n');
                const isSingle = files.length === 1;
                const isMulti = files.length > 1;

                // Prepare files for immediate sending (don't require "send" action)
                const filesToSend: Array<{ name: string; content: string; size: number }> = [];

                if (isSingle) {
                    const file = files[0];
                    filesToSend.push({
                        name: file.path,
                        content: Buffer.from(file.content).toString('base64'),
                        size: file.content.length
                    });
                } else {
                    // Multi-file → Create ZIP
                    const zipBuffer = await createProperZip(files, prompt);
                    const zipName = `${sanitizeFilename(prompt.substring(0, 30))}_project.zip`;
                    filesToSend.push({
                        name: zipName,
                        content: zipBuffer.toString('base64'),
                        size: zipBuffer.length
                    });
                }

                console.log(`[Tool:generate_file] Created ${files.length} file(s), sending immediately`);

                return {
                    content: `✅ **Code Generated!** 🗂️

📝 **Project:** ${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}
🔧 **Stack:** ${lang}
📁 **Files:** ${files.length} file(s)

**Project Structure:**
${fileList}

📎 **File${isSingle ? '' : 's'} attached below!**${isMulti ? ' 📦 Extract the ZIP and run!' : ''}`,
                    files: filesToSend
                };
            }

            if (action === 'send') {
                console.log(`[Tool:generate_file] Send action - sessionId: ${sessionId}, userId: ${userId}, channelId: ${channelId}`);

                // Find the session - by ID or find most recent for this user/channel
                let session: {
                    userId: string;
                    channelId: string;
                    botId: string;
                    prompt: string;
                    files: Array<{ path: string; content: string; description?: string }>;
                    createdAt: number;
                } | undefined;

                if (sessionId) {
                    session = activeSessions.get(sessionId);
                } else {
                    // Try to find the most recent session for this user/channel
                    for (const [id, sess] of activeSessions.entries()) {
                        if (sess.userId === userId && sess.channelId === channelId) {
                            session = sess;
                            console.log(`[Tool:generate_file] Found session: ${id} with ${sess.files.length} files`);
                            break;
                        }
                    }
                }

                if (!session) {
                    console.log(`[Tool:generate_file] No session found! Active sessions: ${activeSessions.size}`);
                    return '❌ No active project found. Create one first.';
                }

                if (session.files.length === 0) {
                    return '❌ No files in project.';
                }

                console.log(`[Tool:generate_file] Sending ${session.files.length} file(s)`);

                // Single file → send as individual file
                // Multi-file → send as ZIP
                if (session.files.length === 1) {
                    const file = session.files[0];
                    console.log(`[Tool:generate_file] Sending single file: ${file.path}, size: ${file.content.length}`);
                    return {
                        content: `📄 **Sending file...**

\`${file.path}\` (${formatSize(file.content.length)})`,
                        files: [{
                            name: file.path,
                            content: Buffer.from(file.content).toString('base64'),
                            size: file.content.length
                        }]
                    };
                }

                // Multi-file → Create ZIP with proper folder structure
                console.log(`[Tool:generate_file] Creating ZIP with ${session.files.length} files`);
                const zipBuffer = await createProperZip(session.files, session.prompt);
                const zipName = `${sanitizeFilename(session.prompt.substring(0, 30))}_project.zip`;
                console.log(`[Tool:generate_file] ZIP created: ${zipName}, size: ${zipBuffer.length}`);

                return {
                    content: `📦 **Sending ZIP with ${session.files.length} files...**

**Project:** ${session.prompt.substring(0, 60)}...

${session.files.map((f, i) => `  ${i + 1}. \`${f.path}\``).join('\n')}

📂 **Just extract the ZIP and run!** All files are properly organized.`,
                    files: [{
                        name: zipName,
                        content: zipBuffer.toString('base64'),
                        size: zipBuffer.length
                    }]
                };
            }

            return '❌ Invalid action. Use "create" or "send"';

        } catch (error: any) {
            console.error('[Tool:generate_file] Error:', error);
            return `❌ Error: ${error.message}`;
        }
    }
};

/**
 * Check if user wants a single file or full project
 * Single file patterns have HIGHEST priority
 */
function isSingleFileRequest(prompt: string): boolean {
    const lower = prompt.toLowerCase();

    // Single file indicators (HIGHEST PRIORITY - check first!)
    const singlePatterns = [
        'single-file', 'single file', 'one file', 'just one file',
        'html page', 'html file', 'an html', 'single html',
        'python script', 'python file', 'a python file', 'a python script',
        'javascript file', 'js file',
        'simple html', 'basic html',
        'calculator in html', 'todo in html'
    ];

    // Check single patterns FIRST
    for (const pattern of singlePatterns) {
        if (lower.includes(pattern)) return true;
    }

    // Multi-file indicators (only if not single-file)
    const multiPatterns = [
        'full stack', 'full project', 'complete app with',
        'with backend', 'with api', 'with database',
        'react app', 'vue app', 'next.js app', 'nextjs app',
        'nodejs app', 'express app', 'node app',
        'multi-file', 'multiple files',
        'web app with backend', 'web app with api'
    ];

    // Check multi patterns
    for (const pattern of multiPatterns) {
        if (lower.includes(pattern)) return false;
    }

    // Default: simple "web app", "website" = single file HTML
    // Only multi-file if explicitly asks for backend/database/complex structure
    return true;
}

/**
 * Generate project structure with proper folders
 */
function generateProjectStructure(prompt: string, lang: string): Array<{ name: string; path?: string; description?: string }> {
    const lower = prompt.toLowerCase();
    const files: Array<{ name: string; path?: string; description?: string }> = [];

    if (lang === 'react' || lower.includes('react')) {
        files.push(
            { name: 'package.json', path: 'package.json', description: 'Dependencies' },
            { name: 'public/index.html', path: 'public/index.html', description: 'HTML entry' },
            { name: 'src/index.js', path: 'src/index.js', description: 'Entry point' },
            { name: 'src/App.jsx', path: 'src/App.jsx', description: 'Main component' },
            { name: 'src/index.css', path: 'src/index.css', description: 'Styles' },
            { name: 'src/components/App.css', path: 'src/components/App.css', description: 'Component styles' },
            { name: 'README.md', path: 'README.md', description: 'Documentation' },
            { name: '.gitignore', path: '.gitignore', description: 'Git ignore' }
        );
    } else if (lang === 'next' || lower.includes('next')) {
        files.push(
            { name: 'package.json', path: 'package.json', description: 'Dependencies' },
            { name: 'app/page.jsx', path: 'app/page.jsx', description: 'Home page' },
            { name: 'app/layout.jsx', path: 'app/layout.jsx', description: 'Root layout' },
            { name: 'app/globals.css', path: 'app/globals.css', description: 'Global styles' },
            { name: 'next.config.js', path: 'next.config.js', description: 'Next.js config' },
            { name: 'README.md', path: 'README.md', description: 'Documentation' }
        );
    } else if (lang === 'vue') {
        files.push(
            { name: 'package.json', path: 'package.json', description: 'Dependencies' },
            { name: 'src/App.vue', path: 'src/App.vue', description: 'Main component' },
            { name: 'src/main.js', path: 'src/main.js', description: 'Entry point' },
            { name: 'src/style.css', path: 'src/style.css', description: 'Styles' },
            { name: 'index.html', path: 'index.html', description: 'HTML entry' },
            { name: 'vite.config.js', path: 'vite.config.js', description: 'Vite config' },
            { name: 'README.md', path: 'README.md', description: 'Documentation' }
        );
    } else if (lang === 'python' || lower.includes('python')) {
        files.push(
            { name: 'app.py', path: 'app.py', description: 'Main app' },
            { name: 'requirements.txt', path: 'requirements.txt', description: 'Dependencies' },
            { name: '.env.example', path: '.env.example', description: 'Env template' },
            { name: 'README.md', path: 'README.md', description: 'Documentation' },
            { name: '.gitignore', path: '.gitignore', description: 'Git ignore' }
        );
        // Add extra files for API/backend
        if (lower.includes('api') || lower.includes('backend') || lower.includes('server')) {
            files.push(
                { name: 'routes.py', path: 'routes.py', description: 'API routes' },
                { name: 'models.py', path: 'models.py', description: 'Data models' },
                { name: 'config.py', path: 'config.py', description: 'Configuration' }
            );
        }
    } else if (lang === 'nodejs' || lower.includes('node') || lower.includes('express')) {
        files.push(
            { name: 'package.json', path: 'package.json', description: 'Dependencies' },
            { name: 'server.js', path: 'server.js', description: 'Server entry' },
            { name: 'routes/index.js', path: 'routes/index.js', description: 'API routes' },
            { name: 'middleware/index.js', path: 'middleware/index.js', description: 'Express middleware' },
            { name: '.env.example', path: '.env.example', description: 'Env template' },
            { name: 'README.md', path: 'README.md', description: 'Documentation' },
            { name: '.gitignore', path: '.gitignore', description: 'Git ignore' }
        );
    } else if (lang === 'html' && lower.includes('app')) {
        // Multi-file HTML project
        files.push(
            { name: 'index.html', path: 'index.html', description: 'Main HTML' },
            { name: 'css/style.css', path: 'css/style.css', description: 'Styles' },
            { name: 'js/app.js', path: 'js/app.js', description: 'JavaScript' },
            { name: 'README.md', path: 'README.md', description: 'Documentation' }
        );
    } else {
        // Generic multi-file structure
        const ext = getFileExtension(lang);
        files.push(
            { name: `main.${ext}`, path: `main.${ext}`, description: 'Main file' },
            { name: 'config.json', path: 'config.json', description: 'Config' },
            { name: 'README.md', path: 'README.md', description: 'Documentation' }
        );
    }

    return files;
}

/**
 * Create a proper ZIP file using archiver
 */
async function createProperZip(files: Array<{ path: string; content: string }>, projectName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];

        // Create output stream
        const archive = archiver('zip', {
            zlib: { level: 6 } // Balanced compression (reliable)
        });

        let totalSize = 0;

        archive.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
            totalSize += chunk.length;
        });

        archive.on('error', (err: Error) => {
            console.error('[ZIP] Error:', err);
            reject(err);
        });

        archive.on('warning', (err: any) => {
            if (err.code !== 'ENTRY_PERMISSION_MODE') {
                console.warn('[ZIP] Warning:', err);
            }
        });

        archive.on('end', () => {
            console.log(`[ZIP] Created: ${files.length} files, ${totalSize} bytes`);
            resolve(Buffer.concat(chunks));
        });

        // Add files to ZIP
        console.log(`[ZIP] Adding ${files.length} files to archive`);
        for (const file of files) {
            archive.append(file.content, { name: file.path });
        }

        // Finalize the archive
        archive.finalize();
    });
}

/**
 * Generate content for a file using the bot's configured AI provider
 */
async function generateFileContent(filename: string, projectPrompt: string, lang: string, additionalDesc: string, botId: string): Promise<string> {
    // Generate config files locally
    if (filename === 'package.json') {
        return generatePackageJson(projectPrompt, lang);
    }
    if (filename === 'requirements.txt') {
        return generateRequirementsTxt(projectPrompt);
    }
    if (filename === '.env.example') {
        return generateEnvExample();
    }
    if (filename === '.gitignore') {
        return generateGitignore(lang);
    }
    if (filename === 'README.md') {
        return generateReadme(projectPrompt, lang);
    }
    if (filename === 'next.config.js') {
        return generateNextConfig();
    }
    if (filename === 'vite.config.js') {
        return generateViteConfig();
    }
    if (filename === 'app/page.jsx' || filename === 'app/layout.jsx') {
        return generateNextFile(filename);
    }
    if (filename === 'src/index.js' || filename === 'src/main.js') {
        return generateEntryFile(filename, lang);
    }
    if (filename === 'public/index.html') {
        return generatePublicIndex();
    }

    // Use AI to generate code - get the bot's configured provider from database
    const bot = await db.select().from(bots).where(eq(bots.id, botId));
    if (!bot[0]) {
        return `// Error: Bot not found for code generation\n// File: ${filename}`;
    }

    const config = typeof bot[0].config === 'string' ? JSON.parse(bot[0].config) : bot[0].config;
    const aiConfig = config.ai || {};

    // Get providers array and find the default or first provider
    const providers = aiConfig.providers || [];
    if (providers.length === 0) {
        return `// Error: No AI providers configured for this bot\n// File: ${filename}`;
    }

    const defaultProviderId = aiConfig.defaultProvider || providers[0]?.id;
    const providerConfig = providers.find((p: any) => p.id === defaultProviderId) || providers[0];

    if (!providerConfig) {
        return `// Error: Provider configuration not found\n// File: ${filename}`;
    }

    const apiKey = providerConfig.apiKey;
    if (!apiKey) {
        return `// Error: API key not configured for provider\n// File: ${filename}`;
    }

    const systemPrompt = `You are an expert developer. Generate complete, working code.

CRITICAL RULES:
1. Output ONLY the code - no explanations, no markdown blocks (no \`\`\`)
2. Include ALL necessary code
3. Add comments for complex parts
4. Make it production-ready
5. For HTML: include CSS and JS in same file when possible

File: ${filename}
Project: ${projectPrompt}
Language: ${lang}

Output format: JUST the raw code, nothing else.`;

    try {
        // Get the provider type (generic provider like 'azure', 'openai', 'gemini', etc)
        const genericProviderId = providerConfig.provider || defaultProviderId || 'openai';

        // Azure uses deployment names, NOT model names - always use empty model for Azure
        let chatModel = '';
        if (genericProviderId !== 'azure') {
            // For non-Azure providers, get the chat model from config
            chatModel = providerConfig.models?.chat || providerConfig.models?.auto || '';
        }

        const response = await AIService.chat({
            provider: genericProviderId as any,
            apiKey: apiKey,
            model: chatModel,
            mode: 'chat' as const,
            azureEndpoint: providerConfig.azureEndpoint || providerConfig.endpoint || '',
            azureDeployment: providerConfig.azureDeployment || '',
            endpoint: providerConfig.endpoint || providerConfig.zanaiEndpoint || ''
        }, [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate: ${filename}\n${additionalDesc || ''}` }
        ]);

        if (!response.content) {
            return `// Error generating content for ${filename}`;
        }

        let code = response.content
            .replace(/^```[\w]*\n?/gm, '')
            .replace(/^```\n?/gm, '')
            .trim();

        return code;
    } catch (e: any) {
        return `// Error: ${e?.message || 'Unknown error'}\n// File: ${filename}`;
    }
}

function generatePackageJson(prompt: string, lang: string): string {
    const isReact = lang === 'react';
    const isVue = lang === 'vue';
    const isNext = lang === 'next';
    const isNode = lang === 'nodejs';

    const deps: Record<string, string> = {};
    const devDeps: Record<string, string> = {};

    if (isNext) {
        deps['next'] = '^14.2.0';
        deps['react'] = '^18.3.0';
        deps['react-dom'] = '^18.3.0';
    } else if (isReact) {
        deps['react'] = '^18.3.0';
        deps['react-dom'] = '^18.3.0';
        deps['react-scripts'] = '5.0.1';
    } else if (isVue) {
        deps['vue'] = '^3.4.0';
        devDeps['@vitejs/plugin-vue'] = '^5.0.0';
        devDeps['vite'] = '^5.0.0';
    }

    if (isNode) {
        deps['express'] = '^4.19.0';
        deps['cors'] = '^2.8.5';
        deps['dotenv'] = '^16.4.0';
    }

    const name = sanitizeFilename(prompt).toLowerCase().replace(/\s+/g, '-');

    return JSON.stringify({
        name,
        version: '1.0.0',
        type: 'module',
        description: prompt.substring(0, 100),
        scripts: isNext ? {
            dev: 'next dev',
            build: 'next build',
            start: 'next start'
        } : isReact ? {
            start: 'react-scripts start',
            build: 'react-scripts build'
        } : isVue ? {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview'
        } : isNode ? {
            start: 'node server.js',
            dev: 'nodemon server.js'
        } : {},
        dependencies: deps,
        devDependencies: devDeps
    }, null, 2);
}

function generateRequirementsTxt(prompt: string): string {
    const items: string[] = [];
    const lower = prompt.toLowerCase();

    if (lower.includes('flask') || lower.includes('api') || lower.includes('web')) {
        items.push('flask==3.0.0', 'flask-cors==4.0.0', 'python-dotenv==1.0.0');
    }
    if (lower.includes('scrape') || lower.includes('scraper')) {
        items.push('requests==2.31.0', 'beautifulsoup4==4.12.0');
    }

    return items.length > 0 ? items.join('\n') + '\n' : 'flask==3.0.0\n';
}

function generateEnvExample(): string {
    return `PORT=3000
NODE_ENV=development
DATABASE_URL=your_database_url_here
API_KEY=your_api_key_here
`;
}

function generateGitignore(lang: string): string {
    const base = [
        'node_modules/',
        'dist/',
        'build/',
        '.env',
        '.DS_Store',
        '*.log'
    ];

    if (lang === 'python') {
        base.push('__pycache__/', '*.pyc', '.venv/', 'venv/', '*.egg-info/');
    }

    return base.join('\n') + '\n';
}

function generateReadme(prompt: string, lang: string): string {
    const name = sanitizeFilename(prompt).substring(0, 50);
    return `# ${name}

${prompt}

## Installation

\`\`\`bash
${lang === 'python' ? 'pip install -r requirements.txt\npython app.py' : ''}
${lang === 'nodejs' || lang === 'react' || lang === 'next' || lang === 'vue' ? 'npm install\nnpm start' : ''}
${lang === 'html' ? 'Just open index.html in your browser' : ''}
\`\`\`

## Usage

[Add usage instructions]

## Features

- [List features]

## License

MIT
`;
}

function generateNextConfig(): string {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
`;
}

function generateViteConfig(): string {
    return `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})
`;
}

function generateNextFile(filename: string): string {
    if (filename === 'app/page.jsx') {
        return `export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Welcome</h1>
      <p>Get started by editing app/page.jsx</p>
    </main>
  )
}
`;
    }
    if (filename === 'app/layout.jsx') {
        return `import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`;
    }
    return '// File';
}

function generateEntryFile(filename: string, lang: string): string {
    if (filename === 'src/index.js') {
        return `import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;
    }
    if (filename === 'src/main.js') {
        return `import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')
`;
    }
    return '// Entry file';
}

function generatePublicIndex(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React App</title>
</head>
<body>
    <div id="root"></div>
    <noscript>You need to enable JavaScript to run this app.</noscript>
</body>
</html>
`;
}

function guessLanguage(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.includes('react') && !lower.includes('next')) return 'react';
    if (lower.includes('next') || lower.includes('next.js')) return 'next';
    if (lower.includes('vue')) return 'vue';
    if (lower.includes('python')) return 'python';
    if (lower.includes('node') || lower.includes('express') || lower.includes('api')) return 'nodejs';
    if (lower.includes('html')) return 'html';
    if (lower.includes('typescript') || lower.includes('ts')) return 'typescript';
    return 'javascript';
}

function getDefaultFilename(lang: string, prompt: string): string {
    const lower = prompt.toLowerCase();

    if (lower.includes('html') || lower.includes('website') || lower.includes('webpage')) {
        return 'index.html';
    }
    if (lower.includes('calculator')) {
        return lang === 'python' ? 'calculator.py' : 'calculator.html';
    }
    if (lower.includes('todo')) {
        return lang === 'python' ? 'todo.py' : 'todo.html';
    }

    const defaults: Record<string, string> = {
        'html': 'index.html',
        'python': 'app.py',
        'javascript': 'script.js',
        'typescript': 'index.ts'
    };

    return defaults[lang] || 'code.txt';
}

function getFileExtension(lang: string): string {
    const exts: Record<string, string> = {
        'html': 'html',
        'python': 'py',
        'javascript': 'js',
        'typescript': 'ts',
        'react': 'jsx',
        'next': 'jsx',
        'vue': 'vue',
        'nodejs': 'js'
    };
    return exts[lang] || 'txt';
}

function sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export function getSession(sessionId: string) {
    return activeSessions.get(sessionId);
}

export function deleteSession(sessionId: string) {
    return activeSessions.delete(sessionId);
}

ToolRegistry.register(generateFileTool);
export default generateFileTool;
