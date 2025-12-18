# Discord Bot Panel

> 🤖 **Low-Code Discord Bot Builder** - Visual Logic Editor

```
╔══════════════════════════════════════════════════════════════╗
║  ░▒▓ DISCORD BOT PANEL ▓▒░                                   ║
║                                                              ║
║    ██████╗  ██████╗ ████████╗   ██████╗  █████╗ ███╗   ██╗  ║
║    ██╔══██╗██╔═══██╗╚══██╔══╝   ██╔══██╗██╔══██╗████╗  ██║  ║
║    ██████╔╝██║   ██║   ██║      ██████╔╝███████║██╔██╗ ██║  ║
║    ██╔══██╗██║   ██║   ██║      ██╔═══╝ ██╔══██║██║╚██╗██║  ║
║    ██████╔╝╚██████╔╝   ██║      ██║     ██║  ██║██║ ╚████║  ║
║    ╚═════╝  ╚═════╝    ╚═╝      ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝  ║
║                                                              ║
║         Build Discord Bots Without Writing Code!             ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 📋 Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Installation](#-installation)
3. [Environment Setup](#-environment-setup)
4. [Database Setup](#-database-setup)
5. [Discord OAuth Setup](#-discord-oauth-setup)
6. [Running the Application](#-running-the-application)
7. [Project Structure](#-project-structure)
8. [API Endpoints](#-api-endpoints)
9. [Troubleshooting](#-troubleshooting)

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | v18.0.0+ | [nodejs.org](https://nodejs.org/) |
| **MySQL** | v8.0+ | [mysql.com](https://dev.mysql.com/downloads/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

### Installing Prerequisites

#### Windows

```powershell
# Install Node.js (using winget)
winget install OpenJS.NodeJS.LTS

# Install MySQL (using winget)
winget install Oracle.MySQL

# Or download MySQL Installer from:
# https://dev.mysql.com/downloads/installer/
```

#### macOS

```bash
# Install Node.js
brew install node@20

# Install MySQL
brew install mysql

# Start MySQL service
brew services start mysql
```

#### Linux (Ubuntu/Debian)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt-get install mysql-server

# Start MySQL service
sudo systemctl start mysql
```

---

## 🚀 Installation

### Step 1: Clone or Navigate to Project

```bash
# If cloning from repository
git clone https://github.com/yourusername/discord-bot-panel.git
cd discord-bot-panel

# Or if you already have the project
cd Discord-Bot-Panel
```

### Step 2: Install Dependencies

```bash
# Install all dependencies (root + workspaces)
npm install
```

This will install dependencies for:
- Root workspace (concurrently, dotenv)
- API workspace (express, drizzle-orm, better-auth, etc.)
- Web workspace (svelte, vite, tailwindcss, etc.)

---

## ⚙️ Environment Setup

### Step 1: Create Environment File

```bash
# Windows (CMD)
copy .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

### Step 2: Configure Environment Variables

Open `.env` and fill in your details:

```env
# ==============================================
# APPLICATION PORTS
# ==============================================
API_PORT=4000
WEB_PORT=5173

# Public URLs (for CORS and redirects)
PUBLIC_API_URL=http://localhost:4000
PUBLIC_WEB_URL=http://localhost:5173

# ==============================================
# DATABASE (MySQL)
# ==============================================
# Format: mysql://user:password@host:port/database
DATABASE_URL=mysql://root:your_password@localhost:3306/discord_bot_panel

# ==============================================
# AUTHENTICATION (Better-Auth)
# ==============================================
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
BETTER_AUTH_SECRET=your_32_char_secret_key_here
BETTER_AUTH_URL=http://localhost:4000

# Discord OAuth Credentials
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# ==============================================
# BOT SYSTEM (Optional)
# ==============================================
# Encryption key for bot tokens at rest
BOT_TOKEN_ENCRYPTION_KEY=your_32_byte_hex_key
```

### Step 3: Generate Secure Keys

```bash
# Generate BETTER_AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate BOT_TOKEN_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🗄️ Database Setup

### Step 1: Start MySQL Service

#### Windows
```powershell
# Start MySQL service
net start MySQL80
```

#### macOS
```bash
brew services start mysql
```

#### Linux
```bash
sudo systemctl start mysql
```

### Step 2: Create Database

```bash
# Connect to MySQL
mysql -u root -p

# In MySQL shell, run:
CREATE DATABASE discord_bot_panel;

# (Optional) Create a dedicated user
CREATE USER 'botpanel'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON discord_bot_panel.* TO 'botpanel'@'localhost';
FLUSH PRIVILEGES;

# Exit MySQL
exit
```

### Step 3: Update DATABASE_URL

If you created a dedicated user, update your `.env`:

```env
DATABASE_URL=mysql://botpanel:your_password@localhost:3306/discord_bot_panel
```

### Step 4: Run Database Migrations

```bash
# Generate migrations
npm run db:generate -w apps/api

# Apply migrations
npm run db:migrate -w apps/api

# (Optional) View database in Drizzle Studio
npm run db:studio -w apps/api
```

---

## 🔐 Discord OAuth Setup

### Step 1: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Enter a name (e.g., "Bot Panel Dev")
4. Click **"Create"**

### Step 2: Configure OAuth2

1. Go to **OAuth2** → **General**
2. Add a **Redirect URL**:
   ```
   http://localhost:4000/api/auth/callback/discord
   ```
3. Copy the **Client ID**
4. Click **"Reset Secret"** and copy the **Client Secret**

### Step 3: Update Environment Variables

```env
# In your .env file
DISCORD_CLIENT_ID=123456789012345678
DISCORD_CLIENT_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

### Step 4: (Optional) Add Bot Token for Testing

If you want to test bot functionality:
1. Go to **Bot** section in Discord Developer Portal
2. Click **"Add Bot"**
3. Under **Token**, click **"Reset Token"** and copy it
4. You can add this token later in the dashboard

---

## 🖥️ Running the Application

### Development Mode (Recommended)

```bash
# Start both API and Web in development mode
npm run dev
```

This will start:
- **API Server**: http://localhost:4000
- **Web Dashboard**: http://localhost:5173

### Individual Services

```bash
# Start only API
npm run dev -w apps/api

# Start only Web
npm run dev -w apps/web
```

### Production Mode

```bash
# Build all apps
npm run build

# Start in production mode
npm run start
```

### Database Commands

```bash
# Push schema changes to database
npm run db:push -w apps/api

# Generate migrations
npm run db:generate -w apps/api

# Open Drizzle Studio (visual database viewer)
npm run db:studio -w apps/api
```

---

## 📁 Project Structure

```
discord-bot-panel/
├── .env                        # Root environment file
├── .env.example                # Example environment template
├── package.json                # Root workspace config
├── README.md                   # This file
│
├── apps/
│   ├── api/                    # Backend - Express + TypeScript
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point
│   │   │   ├── db/
│   │   │   │   ├── schema.ts   # Drizzle schema
│   │   │   │   └── index.ts    # DB connection
│   │   │   ├── lib/
│   │   │   │   └── auth.ts     # Better-Auth config
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts     # Auth middleware
│   │   │   ├── routes/
│   │   │   │   ├── bot.routes.ts
│   │   │   │   └── flow.routes.ts
│   │   │   └── services/
│   │   │       └── bot.service.ts
│   │   ├── drizzle.config.ts   # Drizzle config
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── web/                    # Frontend - SvelteKit
│       ├── src/
│       │   ├── routes/         # SvelteKit pages
│       │   ├── lib/            # Components & utils
│       │   └── app.css         # Styles
│       ├── vite.config.ts
│       └── package.json
│
└── packages/                   # (Future) Shared packages
```

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `ALL` | `/api/auth/*` | Better-Auth handler (login, register, etc.) |

### Bots

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/bots` | List all user's bots |
| `POST` | `/api/bots` | Add a new bot |
| `GET` | `/api/bots/:id` | Get bot details |
| `DELETE` | `/api/bots/:id` | Delete a bot |

### Flows

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/flows/:botId` | Get flows for a bot |
| `POST` | `/api/flows` | Save/Update a flow |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Check API status |

---

## 🆘 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Windows - Find process using port 4000
netstat -ano | findstr :4000

# Kill the process
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :4000
kill -9 <PID>
```

#### MySQL Connection Failed

1. Ensure MySQL service is running
2. Verify `DATABASE_URL` in `.env`
3. Check if database exists:
   ```bash
   mysql -u root -p -e "SHOW DATABASES;"
   ```

#### PowerShell Script Execution Error

If you see `npm.ps1 cannot be loaded`:

```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or use npm.cmd instead
npm.cmd install
```

#### Discord OAuth Callback Error

1. Verify redirect URL in Discord Developer Portal matches exactly:
   ```
   http://localhost:4000/api/auth/callback/discord
   ```
2. Ensure `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are correct
3. Check `BETTER_AUTH_URL` matches your API URL

#### Migration Fails

```bash
# Verify connection
npm run db:generate -w apps/api

# If tables exist but migration fails:
# You might need to manually drop tables if this is a fresh setup
```

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

Made with 💜 by MoonWiRaja
