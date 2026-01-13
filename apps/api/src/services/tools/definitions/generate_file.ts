import { ToolDefinition, ToolRegistry, ToolResult } from '../registry.js';
import { AIService } from '../../ai.service.js';
import { randomUUID } from 'crypto';
import { rm } from 'fs/promises';
import { join } from 'path';
import { AttachmentBuilder } from 'discord.js';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

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
    description: 'Generate complete projects, web apps, scripts, or single files. Creates a ZIP file with proper folder structure. Examples: "create a full stack todo app", "make a React portfolio website", "build a Python web scraper with requirements.txt".',
    category: 'utility',
    parameters: {
        action: {
            type: 'string',
            description: 'Action: "create" (generate new project), "add" (add file to existing project), "list" (show current project files), "send" (send ZIP file)',
            required: true
        },
        prompt: {
            type: 'string',
            description: 'What to create (e.g., "a full stack MERN todo app with MongoDB backend", "a React dashboard with charts", "a Python Flask REST API")',
            required: false
        },
        filename: {
            type: 'string',
            description: 'Specific filename for single file (e.g., "index.html", "app.py"). Not needed for full projects.',
            required: false
        },
        language: {
            type: 'string',
            description: 'Programming language or framework (e.g., "react", "python", "nodejs", "vue", "nextjs")',
            required: false
        },
        sessionId: {
            type: 'string',
            description: 'Session ID for multi-file projects (use returned session ID when adding more files)',
            required: false
        },
        description: {
            type: 'string',
            description: 'Additional requirements for the project',
            required: false
        },
        structure: {
            type: 'string',
            description: 'Project structure preference: "single" (one file), "multi" (multiple files in ZIP), "full" (complete project with folders)',
            required: false
        }
    },
    handler: async ({ action, prompt, filename, language, sessionId, description, structure }, { botId, userId, channelId }): Promise<string | ToolResult> => {
        console.log(`[Tool:generate_file] Action: ${action}, Prompt: ${prompt?.substring(0, 50)}...`);

        try {
            if (action === 'create') {
                if (!prompt) {
                    return '❌ Please describe what you want to create. Example: "create a todo web app" or "make a Python script for image processing"';
                }

                const newSessionId = randomUUID();
                const files: Array<{ path: string; content: string; description?: string }> = [];

                // Determine if user wants a full project or single file
                const projectStructure = structure || guessStructure(prompt);
                const lang = language?.toLowerCase() || guessLanguage(prompt);

                // Generate project structure based on prompt
                const fileStructure = generateProjectStructure(prompt, lang, projectStructure);

                // Generate content for each file
                for (const file of fileStructure) {
                    const code = await generateFileContent(file.path, prompt, lang, description, fileStructure);
                    files.push({
                        path: file.path,
                        content: code,
                        description: file.description || file.path
                    });
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

                const fileCount = files.length;
                const fileList = files.map(f => `  📄 ${f.path}`).join('\n');

                return `✅ **Project Generated!** 🗂️

📝 **Project:** ${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}
🔧 **Stack:** ${lang}
📁 **Files:** ${fileCount} file(s)

**Project Structure:**
${fileList}

🆔 **Session ID:** \`${newSessionId}\`
💬 Say **"send the files"** or **"send zip"** to download the ZIP file

**Next steps:**
• "add a README.md" → adds README file
• "add .env.example" → adds env template
• "send the files" → sends ZIP with everything`;

            }

            if (action === 'add') {
                if (!sessionId) {
                    return '❌ Please provide a session ID. Use the session ID from a previous "create" action.';
                }

                const session = activeSessions.get(sessionId);
                if (!session) {
                    return '❌ Session not found. It may have expired (sessions last 1 hour). Create a new project first.';
                }

                if (!prompt) {
                    return '❌ Please describe what file to add. Example: "add a README.md" or "add a docker-compose.yml"';
                }

                const lang = language?.toLowerCase() || guessLanguage(prompt);
                const filename = prompt.match(/add\s+(?:a\s+)?(?:file\s+)?["']?([\w\./\-]+)["']?/i)?.[1] ||
                                 prompt.includes('readme') ? 'README.md' :
                                 prompt.includes('.env') ? '.env.example' :
                                 prompt.includes('docker') ? 'Dockerfile' :
                                 `new_file.${getFileExtension(lang)}`;

                // Generate the new file content
                const code = await generateFileContent(filename, session.prompt + ' + ' + prompt, lang, description, session.files);

                session.files.push({
                    path: filename,
                    content: code,
                    description: prompt.substring(0, 100)
                });

                return `✅ **File Added!** 📁

📝 **File:** \`${filename}\`
📂 **Project now has ${session.files.length} file(s)**

**Updated structure:**
${session.files.map(f => `  📄 ${f.path}`).join('\n')}

🆔 **Session ID:** \`${sessionId}\`
💬 Say **"send the files"** to download the ZIP`;

            }

            if (action === 'list') {
                if (sessionId) {
                    const session = activeSessions.get(sessionId);
                    if (!session) {
                        return '❌ Session not found or expired.';
                    }

                    return `📂 **Project Files** (${session.files.length} total)

${session.files.map((f, i) => `
**${i + 1}.** \`${f.path}\`
   └─ ${f.description || 'No description'}
   └─ ${f.content.length} characters
`).join('\n')}

🆔 **Session ID:** \`${sessionId}\``;
                }

                // List all active sessions for this user/channel
                const userSessions = Array.from(activeSessions.entries())
                    .filter(([_, s]) => s.userId === userId && s.channelId === channelId)
                    .map(([id, s]) => ({
                        id,
                        prompt: s.prompt,
                        fileCount: s.files.length,
                        createdAt: s.createdAt
                    }));

                if (userSessions.length === 0) {
                    return '📂 **No active projects.**\n\nStart a new project with: "create a [description]"';
                }

                return `📂 **Your Active Projects** (${userSessions.length})

${userSessions.map((s, i) => `
**${i + 1}.** ${s.prompt.substring(0, 50)}...
   └─ ${s.fileCount} file(s)
   └─ Session: \`${s.id}\`
   └─ Created: ${new Date(s.createdAt).toLocaleTimeString()}
`).join('\n')}

Use a session ID to add files or send the project.`;
            }

            if (action === 'send') {
                if (!sessionId) {
                    return '❌ Please provide a session ID. Use "list" action to see your active projects.';
                }

                const session = activeSessions.get(sessionId);
                if (!session) {
                    return '❌ Session not found or expired.';
                }

                if (session.files.length === 0) {
                    return '❌ No files in this project.';
                }

                // Create ZIP file
                const zipPath = await createZipFile(sessionId, session.files, session.prompt);

                // Read the ZIP file
                const fs = await import('fs/promises');
                const zipBuffer = await fs.readFile(zipPath);

                // Clean up temp file
                await rm(zipPath).catch(() => {});

                // Return as base64 for sending
                return {
                    content: `📦 **Sending ${session.files.length} file(s) as ZIP...**

**Project:** ${session.prompt.substring(0, 60)}...

${session.files.map((f, i) => `  ${i + 1}. \`${f.path}\` (${formatSize(f.content.length)})`).join('\n')}

💡 **Tip:** Keep the session ID to add more files later!`,
                    files: [{
                        name: `${sanitizeFilename(session.prompt.substring(0, 30))}.zip`,
                        content: zipBuffer.toString('base64'),
                        size: zipBuffer.length
                    }],
                    sessionId: sessionId
                };
            }

            return '❌ Invalid action. Use: "create", "add", "list", or "send"';

        } catch (error: any) {
            console.error('[Tool:generate_file] Error:', error);
            return `❌ Error generating file: ${error.message}`;
        }
    }
};

/**
 * Generate project structure based on prompt and language
 */
function generateProjectStructure(prompt: string, lang: string, structure: string): Array<{ path: string; description?: string }> {
    const lowerPrompt = prompt.toLowerCase();
    const files: Array<{ path: string; description?: string }> = [];

    if (structure === 'single') {
        // Single file project
        const ext = getFileExtension(lang);
        files.push({ path: `project.${ext}`, description: 'Main project file' });
        return files;
    }

    // Full/multi project structure
    if (lang === 'react' || lang === 'next' || lowerPrompt.includes('react') || lowerPrompt.includes('next')) {
        // React/Next.js project structure
        files.push(
            { path: 'package.json', description: 'Dependencies and scripts' },
            { path: 'src/App.jsx', description: 'Main App component' },
            { path: 'src/index.css', description: 'Global styles' },
            { path: 'src/components/README.md', description: 'Components documentation' }
        );

        if (lowerPrompt.includes('full') || lowerPrompt.includes('backend') || lowerPrompt.includes('api')) {
            files.push(
                { path: 'server.js', description: 'Node.js backend server' },
                { path: 'api/routes.js', description: 'API routes' }
            );
        }

        if (lowerPrompt.includes('todo') || lowerPrompt.includes('task')) {
            files.push(
                { path: 'src/components/TodoList.jsx', description: 'Todo list component' },
                { path: 'src/components/TodoItem.jsx', description: 'Single todo item' },
                { path: 'src/utils/storage.js', description: 'Local storage utilities' }
            );
        }
    } else if (lang === 'python') {
        // Python project structure
        files.push(
            { path: 'app.py', description: 'Main application' },
            { path: 'requirements.txt', description: 'Python dependencies' },
            { path: 'README.md', description: 'Project documentation' }
        );

        if (lowerPrompt.includes('web') || lowerPrompt.includes('flask') || lowerPrompt.includes('api')) {
            files.push(
                { path: 'routes.py', description: 'API routes' },
                { path: 'models.py', description: 'Data models' },
                { path: 'config.py', description: 'Configuration' }
            );
        }

        if (lowerPrompt.includes('scraper') || lowerPrompt.includes('scrape')) {
            files.push(
                { path: 'scraper.py', description: 'Web scraper' },
                { path: 'utils.py', description: 'Helper functions' },
                { path: 'data/output.json', description: 'Sample output' }
            );
        }
    } else if (lang === 'nodejs' || lang === 'express' || lowerPrompt.includes('node') || lowerPrompt.includes('express')) {
        // Node.js/Express project
        files.push(
            { path: 'package.json', description: 'Dependencies and scripts' },
            { path: 'server.js', description: 'Main server file' },
            { path: 'routes.js', description: 'API routes' },
            { path: 'middleware.js', description: 'Express middleware' },
            { path: '.env.example', description: 'Environment variables template' }
        );
    } else if (lang === 'html' || lowerPrompt.includes('website') || lowerPrompt.includes('web app')) {
        // HTML/JS website
        files.push(
            { path: 'index.html', description: 'Main HTML file' },
            { path: 'styles.css', description: 'Styles' },
            { path: 'script.js', description: 'JavaScript logic' }
        );

        if (lowerPrompt.includes('todo') || lowerPrompt.includes('task')) {
            files.push(
                { path: 'README.md', description: 'Project documentation' }
            );
        }
    } else if (lang === 'vue') {
        // Vue.js project
        files.push(
            { path: 'package.json', description: 'Dependencies' },
            { path: 'src/App.vue', description: 'Main App component' },
            { path: 'src/main.js', description: 'Entry point' },
            { path: 'src/router/index.js', description: 'Vue Router' }
        );
    } else {
        // Generic structure
        const ext = getFileExtension(lang);
        files.push(
            { path: `main.${ext}`, description: 'Main file' },
            { path: `utils.${ext}`, description: 'Utilities' },
            { path: 'README.md', description: 'Documentation' }
        );
    }

    // Always add README if not present
    if (!files.find(f => f.path === 'README.md')) {
        files.push({ path: 'README.md', description: 'Project documentation' });
    }

    return files;
}

/**
 * Generate content for a single file
 */
async function generateFileContent(filepath: string, projectPrompt: string, lang: string, additionalDesc: string, allFiles: Array<{ path: string }>): Promise<string> {
    const ext = filepath.split('.').pop();
    const isConfig = filepath.includes('package.json') || filepath.includes('requirements.txt') || filepath.includes('.env') || filepath === 'README.md';

    let systemPrompt = '';

    if (filepath === 'package.json') {
        return generatePackageJson(projectPrompt, lang);
    }

    if (filepath === 'requirements.txt') {
        return generateRequirementsTxt(projectPrompt);
    }

    if (filepath === '.env.example') {
        return generateEnvExample(projectPrompt);
    }

    if (filepath === 'README.md') {
        return generateReadme(projectPrompt, lang, allFiles);
    }

    // Code generation
    systemPrompt = `You are an expert developer. Generate complete, working code.

CRITICAL RULES:
1. Output ONLY the code - no explanations, no markdown blocks (no \`\`\`)
2. Include ALL necessary code
3. Add comments for complex parts
4. Make it production-ready with proper error handling
5. For HTML: include CSS and JS in the same file when possible
6. For React/Vue: complete component with imports and exports
7. For Python: include proper imports and if __name__ guards

File: ${filepath}
Project: ${projectPrompt}
Language: ${lang}

Output format: JUST the raw code, nothing else.`;

    try {
        const response = await AIService.chat({
            provider: 'openai',
            apiKey: 'dummy',
            model: 'gpt-4'
        }, [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate: ${filepath}\n${additionalDesc ? 'Requirements: ' + additionalDesc : ''}` }
        ]);

        if (!response.content) {
            return `// Error generating content for ${filepath}`;
        }

        // Clean up the response
        let code = response.content
            .replace(/^```[\w]*\n?/gm, '')
            .replace(/^```\n?/gm, '')
            .trim();

        return code;
    } catch (e: any) {
        return `// Error: ${e?.message || 'Unknown error'}\n// File: ${filepath}`;
    }
}

function generatePackageJson(prompt: string, lang: string): string {
    const isNext = prompt.toLowerCase().includes('next');
    const isReact = prompt.toLowerCase().includes('react') || lang === 'react';
    const isVue = lang === 'vue';
    const isExpress = prompt.toLowerCase().includes('express') || lang === 'express';

    const dependencies: Record<string, string> = {};
    const devDependencies: Record<string, string> = {};

    if (isNext) {
        dependencies['next'] = '^14.0.0';
        dependencies['react'] = '^18.2.0';
        dependencies['react-dom'] = '^18.2.0';
    } else if (isReact) {
        dependencies['react'] = '^18.2.0';
        dependencies['react-dom'] = '^18.2.0';
        dependencies['react-scripts'] = '5.0.1';
    } else if (isVue) {
        dependencies['vue'] = '^3.3.0';
    }

    if (isExpress) {
        dependencies['express'] = '^4.18.0';
        dependencies['cors'] = '^2.8.5';
        dependencies['dotenv'] = '^16.0.0';
    }

    // Common dependencies
    if (prompt.toLowerCase().includes('axios')) {
        dependencies['axios'] = '^1.6.0';
    }

    return JSON.stringify({
        name: sanitizeFilename(prompt).replace(/\s+/g, '-').toLowerCase(),
        version: '1.0.0',
        description: prompt.substring(0, 100),
        main: isExpress ? 'server.js' : 'src/index.js',
        scripts: isNext ? {
            dev: 'next dev',
            build: 'next build',
            start: 'next start'
        } : isReact ? {
            start: 'react-scripts start',
            build: 'react-scripts build',
            test: 'react-scripts test'
        } : isVue ? {
            serve: 'vue-cli-service serve',
            build: 'vue-cli-service build'
        } : isExpress ? {
            start: 'node server.js',
            dev: 'nodemon server.js'
        } : {
            start: 'node index.js'
        },
        dependencies,
        devDependencies
    }, null, 2);
}

function generateRequirementsTxt(prompt: string): string {
    const reqs: string[] = [];

    if (prompt.toLowerCase().includes('flask') || prompt.toLowerCase().includes('api')) {
        reqs.push('flask==3.0.0', 'flask-cors==4.0.0', 'python-dotenv==1.0.0');
    }

    if (prompt.toLowerCase().includes('scraper') || prompt.toLowerCase().includes('scrape')) {
        reqs.push('requests==2.31.0', 'beautifulsoup4==4.12.0', 'lxml==4.9.0');
    }

    if (prompt.toLowerCase().includes('data') || prompt.toLowerCase().includes('pandas')) {
        reqs.push('pandas==2.1.0', 'numpy==1.24.0');
    }

    if (reqs.length === 0) {
        reqs.push('flask==3.0.0', 'requests==2.31.0');
    }

    return reqs.join('\n') + '\n';
}

function generateEnvExample(prompt: string): string {
    const lines = [
        '# Server Configuration',
        'PORT=3000',
        'NODE_ENV=development',
        '',
        '# Database',
        'DATABASE_URL=your_database_url_here',
        '',
        '# API Keys (add your own)',
        'API_KEY=your_api_key_here',
        ''
    ];

    return lines.join('\n');
}

function generateReadme(prompt: string, lang: string, files: Array<{ path: string }>): string {
    const projectName = sanitizeFilename(prompt.substring(0, 50));
    const fileCount = files.length;

    return `# ${projectName}

${prompt}

## Project Structure

${files.map(f => `- \`${f.path}\``).join('\n')}

## Installation

### For Node.js/React/Next.js:
\`\`\`bash
npm install
npm start
\`\`\`

### For Python:
\`\`\`bash
pip install -r requirements.txt
python app.py
\`\`\`

### For HTML:
Simply open \`index.html\` in your browser.

## Usage

[Add usage instructions here]

## Features

- [List main features]

## License

MIT
`;
}

/**
 * Create a ZIP file from project files
 */
async function createZipFile(sessionId: string, files: Array<{ path: string; content: string }>, projectName: string): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Create temp directory for this project
    const tempDir = join(tmpdir(), `project_${sessionId}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create all files and directories
    for (const file of files) {
        const filePath = join(tempDir, file.path);
        const fileDir = path.dirname(filePath);

        // Create directory if it doesn't exist
        await fs.mkdir(fileDir, { recursive: true });

        // Write file content
        await fs.writeFile(filePath, file.content, 'utf-8');
    }

    // Create ZIP file
    const zipPath = join(tmpdir(), `${sanitizeFilename(sessionId)}.zip`);

    try {
        // Use system zip command or create simple archive
        if (process.platform === 'win32') {
            // Windows - use PowerShell
            execSync(`powershell Compress-Archive -Path "${tempDir}\\*" -DestinationPath "${zipPath}" -Force`, { stdio: 'ignore' });
        } else {
            // Unix/Linux/macOS - use zip command
            execSync(`cd "${tempDir}" && zip -r "${zipPath}" .`, { stdio: 'ignore' });
        }
    } catch (e: any) {
        // Fallback: create a simple structure info file if zip fails
        const fallbackPath = join(tmpdir(), `${sanitizeFilename(sessionId)}_files.txt`);
        await fs.writeFile(fallbackPath, files.map(f => `=== ${f.path} ===\n\n${f.content}\n\n`).join('\n'));
        return fallbackPath;
    }

    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});

    return zipPath;
}

function guessLanguage(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.includes('react') || lower.includes('next')) return 'react';
    if (lower.includes('vue')) return 'vue';
    if (lower.includes('python')) return 'python';
    if (lower.includes('node') || lower.includes('express') || lower.includes('api')) return 'nodejs';
    if (lower.includes('flask') || lower.includes('django')) return 'python';
    if (lower.includes('html') || lower.includes('website') || lower.includes('web app')) return 'html';
    if (lower.includes('typescript') || lower.includes('ts')) return 'typescript';
    if (lower.includes('java')) return 'java';
    if (lower.includes('go') || lower.includes('golang')) return 'go';
    if (lower.includes('rust')) return 'rust';
    return 'javascript';
}

function guessStructure(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.includes('full') || lower.includes('complete') || lower.includes('app with')) return 'full';
    if (lower.includes('project') || lower.includes('app')) return 'multi';
    return 'single';
}

function getFileExtension(lang: string): string {
    const extensions: Record<string, string> = {
        'html': 'html',
        'css': 'css',
        'javascript': 'js',
        'typescript': 'ts',
        'react': 'jsx',
        'next': 'jsx',
        'vue': 'vue',
        'nodejs': 'js',
        'python': 'py',
        'java': 'java',
        'go': 'go',
        'rust': 'rs',
        'php': 'php',
        'ruby': 'rb',
        'swift': 'swift',
        'kotlin': 'kt',
        'sql': 'sql',
        'bash': 'sh'
    };
    return extensions[lang] || 'txt';
}

function sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Export session functions
export function getSession(sessionId: string) {
    return activeSessions.get(sessionId);
}

export function deleteSession(sessionId: string) {
    return activeSessions.delete(sessionId);
}

ToolRegistry.register(generateFileTool);
export default generateFileTool;
