#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const args = process.argv.slice(2);
const command = args[0] || 'start';

const rootDir = path.resolve(__dirname, '..');
const logDir = path.join(rootDir, 'logs');
const pidFile = path.join(logDir, 'dbp.pid'); 
const stateFile = path.join(logDir, 'dbp.state');
const logFile = path.join(logDir, 'dbp.log');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const killProcess = (pid) => {
    try {
        if (os.platform() === 'win32') {
            exec(`taskkill /PID ${pid} /T /F`);
        } else {
            process.kill(-pid, 'SIGKILL');
        }
        return true;
    } catch (e) {
        return false;
    }
};

const commands = {
    start: () => {
        // Check if already running
        if (fs.existsSync(pidFile)) {
            const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
            try {
                process.kill(pid, 0); // Check if process exists
                console.log(`⚠️  DBP is already running (PID: ${pid})`);
                console.log(`Type 'dbp stop' to stop it first.`);
                process.exit(0);
            } catch (e) {
                // Stale PID file
                fs.unlinkSync(pidFile);
            }
        }

        // Write state file
        try { fs.writeFileSync(stateFile, 'RUNNING'); } catch(e) {}

        console.log('🚀 Starting Discord Bot Panel (Background)...');
        
        if (process.platform === 'win32') {
            const psDebugLog = path.join(logDir, 'ps.debug.log');

            // Delete old debug log
            if (fs.existsSync(psDebugLog)) {
                 try { fs.unlinkSync(psDebugLog); } catch(e) {}
            }

            // PowerShell script: Start process using cmd /c wrapper for reliability
            // We launch cmd.exe which runs npm start. 
            // We use -PassThru to get the PID of the cmd process (which is sufficient for taskkill /T)
            const psScript = `
$ErrorActionPreference = "Stop"
"Starting launch..." | Out-File "${psDebugLog}"
try {
    # We use cmd redirection (2>&1) to merge stdout and stderr into a single file.
    # We remove Start-Process redirection arguments to avoid "same file" errors.
    $arg = "/c npm run start > ""${logFile}"" 2>&1"
    "Arguments: $arg" | Out-File -Append "${psDebugLog}"
    
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList $arg -WindowStyle Hidden -PassThru -WorkingDirectory "${rootDir}"
    
    if ($proc) { 
        "Process started with PID: $($proc.Id)" | Out-File -Append "${psDebugLog}"
        Write-Output "PID:$($proc.Id)"
    } else {
        "Failed to get process object" | Out-File -Append "${psDebugLog}"
        Write-Error "Failed to create process object"
    }
} catch {
    "Exception: $($_.Exception.Message)" | Out-File -Append "${psDebugLog}"
    Write-Error $_.Exception.Message
}
`;
            
            const startScriptPath = path.join(rootDir, 'start_background.ps1');
            fs.writeFileSync(startScriptPath, psScript);
            
            console.log('⏳ Launching background process...');

            // Spawn PowerShell attached to capture output
            const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', startScriptPath], {
                cwd: rootDir,
                stdio: ['ignore', 'pipe', 'pipe'], 
                windowsHide: true
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (d) => { stdout += d.toString(); });
            child.stderr.on('data', (d) => { stderr += d.toString(); });

            child.on('close', (code) => {
                const match = stdout.match(/PID:(\d+)/);
                if (match && match[1]) {
                    const pid = match[1];
                    fs.writeFileSync(pidFile, pid);
                    
                    // Clean up temp script
                    try { fs.unlinkSync(startScriptPath); } catch(e) {}

                    console.log(`✅ Started successfully! (PID: ${pid})`);
                    console.log('⏳ Waiting for server to be ready...');

                    // Poll logs for the startup banner
                    let attempts = 0;
                    const maxAttempts = 60; // 30 seconds (500ms * 60)
                    let foundBanner = false;

                    const scanLogs = setInterval(() => {
                        attempts++;
                        try {
                            if (fs.existsSync(logFile)) {
                                const content = fs.readFileSync(logFile, 'utf8');
                                // Look for the banner frame and content
                                if (content.includes('Public URL:') && content.includes('Local:')) {
                                    clearInterval(scanLogs);
                                    foundBanner = true;
                                    
                                    // Extract the banner using regex to match the box structure
                                    const bannerMatch = content.match(/(\[WEB\]\s+╔═+╗[\s\S]*?\[WEB\]\s+╚═+╝)/);
                                    
                                    if (bannerMatch) {
                                        // Clean up [WEB] prefix and extra spaces to show a clean banner
                                        const cleanBanner = bannerMatch[0]
                                            .split('\n')
                                            .map(line => line.replace(/^.*?\[WEB\]\s*/, '')) // Remove date/time/prefix
                                            .join('\n');
                                        console.log('\n' + cleanBanner + '\n');
                                    } else {
                                        // Fallback using simple server ready message
                                        console.log('\n✅ Server is ready! (See logs for details)');
                                    }
                                    
                                    console.log(`📋 Logs: logs/dbp.log`);
                                    console.log(`🛑 Stop: dbp stop`);
                                    process.exit(0);
                                }
                            }
                        } catch (err) {
                            // Ignore read errors (file locked etc)
                        }

                        if (attempts >= maxAttempts) {
                            clearInterval(scanLogs);
                            console.log('⚠️  Server started, but timed out waiting for URL display.');
                            console.log(`📋 Check detailed logs: logs/dbp.log`);
                            console.log(`🛑 Stop: dbp stop`);
                            process.exit(0);
                        }
                    }, 500);

                } else {
                    console.error('❌ Failed to start.');
                    console.error('--- PS Debug Log ---');
                    if (fs.existsSync(psDebugLog)) {
                        console.error(fs.readFileSync(psDebugLog, 'utf8'));
                    }
                    console.error('--- Standard Error ---');
                    console.error(stderr || 'No stderr output');
                    process.exit(1);
                }
            });

            // Timeout for launcher
            setTimeout(() => {
                console.error('❌ Timeout waiting for launcher.');
                console.error('--- PS Debug Log ---');
                if (fs.existsSync(psDebugLog)) {
                    console.error(fs.readFileSync(psDebugLog, 'utf8'));
                }
                child.kill();
                process.exit(1);
            }, 10000);

            return;
        }

        // Linux/Mac: Use spawn with detached
        const out = fs.openSync(logFile, 'a');
        const err = fs.openSync(logFile, 'a');

        const child = spawn('npm', ['run', 'start'], {
            cwd: rootDir,
            detached: true,
            stdio: ['ignore', out, err]
        });

        child.unref();

        fs.writeFileSync(pidFile, child.pid.toString());
        console.log(`✅ Started successfully!`);
        console.log(`📋 Logs: logs/dbp.log`);
        console.log(`🛑 Stop: dbp stop`);
        process.exit(0);
    },

    restore: () => {
        if (fs.existsSync(stateFile)) {
            const state = fs.readFileSync(stateFile, 'utf8').trim();
            if (state === 'RUNNING') {
                console.log('🔄 Auto-Restore triggered: System was running before shutdown.');
                commands.start();
            } else {
                console.log('🛑 Auto-Restore skipped: System was stopped manually.');
                process.exit(0);
            }
        } else {
            console.log('⚪ No previous state found. Skipping restore.');
            process.exit(0);
        }
    },

    // Setup Auto-Start for all platforms
    'setup-autostart': () => {
        const platform = os.platform();
        const nodePath = process.execPath;
        const scriptPath = path.join(__dirname, 'dbp.js');
        
        console.log(`⚙️  Configuring Auto-Start for ${platform}...`);

        if (platform === 'win32') {
            const startupDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
            const batFile = path.join(startupDir, 'dbp-autostart.bat');
            const batContent = `@echo off\ncd /d "${rootDir}"\n"${nodePath}" "${scriptPath}" restore`;
            
            try {
                fs.writeFileSync(batFile, batContent);
                console.log(`✅ Windows Startup script created: ${batFile}`);
            } catch (e) {
                console.error('❌ Failed to create startup script:', e.message);
            }
        } 
        else if (platform === 'linux') {
            // Systemd User Service
            const serviceDir = path.join(os.homedir(), '.config', 'systemd', 'user');
            const serviceFile = path.join(serviceDir, 'dbp-restore.service');
            const serviceContent = `[Unit]
Description=Discord Bot Panel Auto-Restore
After=network.target

[Service]
Type=oneshot
ExecStart=${nodePath} ${scriptPath} restore
WorkingDirectory=${rootDir}
StandardOutput=append:${path.join(logDir, 'autostart.log')}
StandardError=append:${path.join(logDir, 'autostart.err.log')}

[Install]
WantedBy=default.target
`;
            try {
                if (!fs.existsSync(serviceDir)) fs.mkdirSync(serviceDir, { recursive: true });
                fs.writeFileSync(serviceFile, serviceContent);
                console.log(`✅ Systemd service created: ${serviceFile}`);
                console.log('👉 To enable, run: systemctl --user enable dbp-restore.service');
            } catch (e) {
                console.error('❌ Failed to create systemd service:', e.message);
            }
        }
        else if (platform === 'darwin') {
            // macOS Launch Agent
            const launchDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
            const plistFile = path.join(launchDir, 'com.dbp.restore.plist');
            const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.dbp.restore</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${scriptPath}</string>
        <string>restore</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${path.join(logDir, 'autostart.log')}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(logDir, 'autostart.err.log')}</string>
</dict>
</plist>`;
            try {
                if (!fs.existsSync(launchDir)) fs.mkdirSync(launchDir, { recursive: true });
                fs.writeFileSync(plistFile, plistContent);
                console.log(`✅ LaunchAgent plist created: ${plistFile}`);
                console.log('👉 To enable, run: launchctl load ~/Library/LaunchAgents/com.dbp.restore.plist');
            } catch (e) {
                console.error('❌ Failed to create LaunchAgent:', e.message);
            }
        }
        else {
            console.log('⚠️  Auto-start configuration not supported on this platform directly.');
        }
    },

    stop: () => {
        // Write state file immediately to prevent auto-restart logic
        try { fs.writeFileSync(stateFile, 'STOPPED'); } catch(e) {}

        let mainPid = null;
        if (fs.existsSync(pidFile)) {
            mainPid = parseInt(fs.readFileSync(pidFile, 'utf8'));
            console.log(`🛑 Stopping DBP (Main PID: ${mainPid})...`);
            killProcess(mainPid);
            try { fs.unlinkSync(pidFile); } catch(e) {}
        } else {
            console.log('⚠️  No PID file found. Checking for rogue processes...');
        }

        // Helper to kill process on specific port
        const killPort = (port) => {
            try {
                if (os.platform() === 'win32') {
                    // Find PID using netstat
                    const findCmd = `netstat -ano | findstr :${port}`;
                    exec(findCmd, (err, stdout) => {
                        if (!stdout) return;
                        const lines = stdout.split('\n');
                        lines.forEach(line => {
                            const parts = line.trim().split(/\s+/);
                            const pid = parts[parts.length - 1];
                            if (pid && !isNaN(pid) && pid !== '0') {
                                console.log(`🧹 Cleaning up port ${port} (PID: ${pid})...`);
                                try { exec(`taskkill /PID ${pid} /F`); } catch(e) {}
                            }
                        });
                    });
                } else {
                    // Linux/Mac lsof
                    exec(`lsof -t -i:${port}`, (err, stdout) => {
                        if (stdout) {
                            const pids = stdout.split('\n').filter(p => p);
                            pids.forEach(pid => {
                                console.log(`🧹 Cleaning up port ${port} (PID: ${pid})...`);
                                process.kill(pid, 'SIGKILL');
                            });
                        }
                    });
                }
            } catch (e) {
                // Ignore errors
            }
        };

        // Explicitly kill API (4000) and Web (5173) ports
        killPort(4000);
        killPort(5173);

        console.log('✅ Stopped successfully');
        process.exit(0);
    },

    status: () => {
        if (fs.existsSync(pidFile)) {
            const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
            try {
                process.kill(pid, 0);
                console.log(`🟢 DBP is RUNNING (PID: ${pid})`);
            } catch (e) {
                console.log(`🔴 DBP is NOT RUNNING (PID ${pid} not found)`);
                fs.unlinkSync(pidFile);
            }
        } else {
            console.log('⚪ DBP is STOPPED');
        }
    },

    logs: () => {
        console.log(`📋 Tailing logs from ${logFile}... (Ctrl+C to exit)`);
        const tail = spawn('tail', ['-f', logFile], { stdio: 'inherit' });
        
        if (os.platform() === 'win32') {
            console.log('⚠️  Note: On Windows, use Notepad or VS Code to view logs for real-time updates.');
            console.log(`Path: ${logFile}`);
        }
    },

    // Regular build/dev commands (Foreground)
    dev: () => runType('dev'),
    build: () => runType('build')
};

// Helper for foreground commands
const runType = (scriptName) => {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'cmd' : 'npm';
    const args = isWin ? ['/c', 'npm', 'run', scriptName] : ['run', scriptName];
    
    // Pipe both stdout and stderr to filter them
    const options = {
        cwd: rootDir,
        stdio: ['inherit', 'pipe', 'pipe'], 
        shell: false
    };

    if (scriptName === 'dev') console.log('🔧 Starting Discord Bot Panel (Development)...');
    if (scriptName === 'build') console.log('📦 Building Discord Bot Panel...');

    const child = spawn(cmd, args, options);

    const filterOutput = (data, streamName) => {
        const output = data.toString();
        // Skip specific warnings
        if (output.includes('handleConnectionChange') && (output.includes('xyflow') || output.includes('never used'))) {
            return; 
        }
        if (streamName === 'stdout') process.stdout.write(data);
        if (streamName === 'stderr') process.stderr.write(data);
    };

    child.stdout.on('data', (data) => filterOutput(data, 'stdout'));
    child.stderr.on('data', (data) => filterOutput(data, 'stderr'));
    
    child.on('close', (code) => process.exit(code));
};

const cmd = args[0] || 'help';

if (commands[cmd]) {
    commands[cmd]();
} else if (cmd === 'help') {
     console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ░▒▓ DISCORD BOT PANEL CLI ▓▒░                               ║
╚══════════════════════════════════════════════════════════════╝

Usage: dbp <command>

Commands:
  start     Start production server in BACKGROUND
  stop      Stop the background server
  restore   Auto-start if system was running previously
  setup-autostart  Configure auto-start for current OS (Win/Lin/Mac)
  status    Check if server is running
  logs      View server logs
  dev       Start development mode (Foreground)
  build     Build for production
  help      Show this help message

Examples:
  dbp start     # Start in background
  dbp stop      # Stop server
  dbp logs      # View logs
        `);
} else {
    console.log(`Unknown command: ${cmd}`);
    commands.help();
}
