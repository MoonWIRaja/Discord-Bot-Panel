# Discord Bot Panel

> 🤖 **Low-Code Discord Bot Builder** - Visual Logic Editor + AI-Powered Chatbot

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

## ✨ Features

### 🎛️ Web Dashboard
- **Discord OAuth Login** - Sign in with your Discord account
- **Bot Management** - Add, start, stop, restart bots from browser
- **Visual Flow Editor** - Drag-and-drop logic builder (Studio)
- **Template Library** - Pre-built bot templates (Music, AI, Notifications)
- **Real-time Collaboration** - Multi-user editing with live cursors
- **Real-time Logs** - Monitor bot activity live
- **Token Usage Tracking** - Track AI usage with daily/weekly/monthly limits
- **Training Mode** - Teach your AI bot from conversations

### 🤖 AI Integration (23 Free Tools!)
Your bot can use **23 built-in tools** - all FREE, no API keys required:

| Category | Tool | Description |
|----------|------|-------------|
| ⏰ **Time** | `get_current_time` | Get current time in any timezone |
| 🌤️ **Weather** | `get_weather` | Live weather for any city |
| 🕌 **Prayer** | `get_prayer_times` | Accurate prayer times (JAKIM) |
| 🔍 **Search** | `search_web` | DuckDuckGo web search |
| 📖 **Wikipedia** | `search_wikipedia` | Wikipedia summaries |
| 🎬 **YouTube** | `search_youtube` | Search YouTube videos |
| 💱 **Currency** | `convert_currency` | Live exchange rates |
| 📈 **Crypto** | `get_crypto_price` | Bitcoin, Ethereum prices |
| 🗣️ **Slang** | `define_slang` | Urban Dictionary definitions |
| 😂 **Memes** | `get_random_meme` | Random Reddit memes |
| 🔢 **Numbers** | `get_number_fact` | Fun facts about numbers |
| 🌐 **Webpage** | `read_webpage` | Scrape any website content |
| 🎭 **Jokes** | `get_joke` | Random jokes (programming, etc) |
| 💬 **Translate** | `translate_text` | Translate any language |
| 📖 **Quotes** | `get_quote` | Motivational quotes |
| 🔢 **Calculator** | `calculate` | Math expressions (sqrt, sin, etc) |
| 🔗 **URL** | `shorten_url` | Shorten long URLs |
| 🌍 **Countries** | `get_country_info` | Country info (capital, population) |
| 📚 **Dictionary** | `get_dictionary` | English word definitions |
| 🎬 **Anime** | `get_anime_info` | MyAnimeList info |
| ⭐ **Horoscope** | `get_horoscope` | Zodiac sign readings |
| 💻 **GitHub** | `get_github_repo` | GitHub repository info |
| 🔍 **Language** | `detect_language` | Detect text language |

### 🎨 Visual Flow Editor (Studio)
- **Drag-and-Drop Nodes** - Build logic visually
- **Trigger Types** - Commands, messages, reactions, joins
- **Action Nodes** - Reply, DM, embed, role, API calls
- **AI Nodes** - Chat, image generation, multi-provider support
- **Custom Code** - JavaScript execution for advanced logic

### 📦 Pre-built Templates
- **Live Notification Bot** - Monitor TikTok/YouTube/Twitch streamers
- **Music Bot** - Full voice channel support, YouTube/Spotify playback
- **AI Assistant Bot** - Gemini-powered chatbot with commands

---

## 📋 Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Installation](#-installation)
3. [Database Setup](#-database-setup-postgresql)
4. [Environment Setup](#-environment-setup)
5. [Discord OAuth Setup](#-discord-oauth-setup)
6. [Running the Application](#-running-the-application)
7. [Using Templates](#-using-templates)
8. [AI Provider Setup](#-ai-provider-setup)
9. [CLI Tool (dbp)](#-cli-tool-dbp)
10. [Project Structure](#-project-structure)
11. [Troubleshooting](#-troubleshooting)

---

## 📦 Prerequisites

### Required Software

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | v18.0.0+ | [nodejs.org](https://nodejs.org/) |
| **PostgreSQL** | v14.0+ | [postgresql.org](https://www.postgresql.org/download/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

---

## 🚀 Installation

```bash
# Clone repository
git clone https://github.com/MoonWIRaja/Discord-Bot-Panel.git
cd Discord-Bot-Panel

# Install all dependencies
npm install
```

---

## 🗄️ Database Setup (PostgreSQL)

### Windows

#### Option 1: Official Installer (Recommended)

1. Download PostgreSQL from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. Run installer (version 14 or higher)
3. During installation:
   - Set password for `postgres` user (remember this!)
   - Keep default port: `5432`
   - Select components: PostgreSQL Server, pgAdmin4, Command Line Tools
4. After installation, PostgreSQL service will start automatically

#### Option 2: Chocolatey

```powershell
# Install Chocolatey package manager first (if not installed)
# Then install PostgreSQL
choco install postgresql

# Start PostgreSQL service
net start postgresql-x64-14
```

### macOS

#### Option 1: Homebrew (Recommended)

```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create postgres user (if needed)
createuser -s postgres
```

#### Option 2: Postgres.app

1. Download from [postgresapp.com](https://postgresapp.com/)
2. Move to Applications folder
3. Open Postgres.app
4. Click "Initialize" to create a new server

### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Set password for postgres user
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

### Create Database

After PostgreSQL is installed and running:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database (in psql shell)
CREATE DATABASE discord_bot_panel;

# Exit psql
\q
```

**OR** use the automated script:

```bash
# Run database creation script
npm run db:create -w apps/api
```

### Initialize Schema

```bash
# Apply database schema
npm run db:push -w apps/api

# Seed default templates
npm run seed -w apps/api
```

**Database Commands:**

```bash
npm run db:push -w apps/api      # Apply schema to PostgreSQL
npm run db:generate -w apps/api  # Generate migrations
npm run db:studio -w apps/api    # Visual database viewer
npm run seed -w apps/api         # Add default templates
```

---

## ⚙️ Environment Setup

### Step 1: Create .env file

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

### Step 2: Configure Variables

Edit `.env` file:

```env
# ==============================================
# APPLICATION PORTS
# ==============================================
API_PORT=4000
WEB_PORT=5173

# Public URLs (change for production deployment)
PUBLIC_API_URL=http://localhost:4000
PUBLIC_WEB_URL=http://localhost:5173

# ==============================================
# DATABASE (PostgreSQL)
# ==============================================
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/discord_bot_panel"

# Format: postgresql://username:password@host:port/database
# Adjust username/password if you set different credentials

# ==============================================
# AUTHENTICATION
# ==============================================
BETTER_AUTH_SECRET=your_32_char_secret_key_here
BETTER_AUTH_URL=http://localhost:4000

# Cookie Domain (for production with subdomains)
# Leave empty for localhost
COOKIE_DOMAIN=

# Discord OAuth Credentials
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here

# ==============================================
# BOT SYSTEM
# ==============================================
BOT_TOKEN_ENCRYPTION_KEY=your_32_byte_hex_key_here

# ==============================================
# SERVER LOCATION (for AI tools - time/weather)
# ==============================================
SERVER_TIMEZONE=Asia/Kuala_Lumpur
SERVER_CITY=Kuala Lumpur
SERVER_COUNTRY=Malaysia
```

### Step 3: Generate Secure Keys

```bash
# Generate BETTER_AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate BOT_TOKEN_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the generated keys to your `.env` file.

---

## 🔐 Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Go to **OAuth2** → **General**
4. Add **Redirect URL**:
   ```
   http://localhost:4000/api/auth/callback/discord
   ```
   For production, add your domain:
   ```
   https://yourdomain.com/api/auth/callback/discord
   ```
5. Copy **Client ID** and **Client Secret** to `.env`

---

## 🖥️ Running the Application

### Development Mode

```bash
# Start both API and Web (recommended)
npm run dev

# OR start individually
npm run dev -w apps/api   # API only
npm run dev -w apps/web   # Web only
```

**Access:**
- **Web UI**: http://localhost:5173
- **API**: http://localhost:4000

### Production Mode

```bash
# Build all apps
npm run build

# Start production server
npm start
```

### Using CLI Tool (Recommended for Production)

```bash
# Make dbp globally available
npm link

# Start panel (runs in background)
dbp start

# Stop panel
dbp stop

# Check status
dbp status

# View logs
dbp logs

# Restart panel
dbp restart

# Setup auto-start on system boot
dbp setup-autostart
```

The `dbp` CLI tool provides:
- ✅ Background process management
- ✅ Auto-restart on system boot
- ✅ Centralized logging
- ✅ Cross-platform support (Windows, Linux, macOS)

---

## 📚 Using Templates

### 1. Browse Templates

1. Login to web dashboard: http://localhost:5173
2. Go to **Templates** page
3. View available templates:
   - Live Notification Bot
   - Music Bot
   - AI Assistant Bot

### 2. Import Template

1. Click **Import** on desired template
2. Select target bot (or create new bot)
3. Template flow will be added to your bot
4. Go to **Studio** to view/edit the flow

### 3. Customize Template

1. Open **Studio** for your bot
2. Click on nodes to edit:
   - Change command names
   - Modify responses
   - Add/remove features
3. Click **Save** when done

### 4. Create Your Own Template

1. Build a flow in **Studio**
2. Click **Export** to save as `.json`
3. Go to **Templates** page
4. Click **Upload Template**
5. Fill in details and upload your `.json` file

---

## 🤖 AI Provider Setup

### Supported Providers

- **Google Gemini** (Recommended - Free tier available)
- **OpenAI** (GPT-4, GPT-3.5-turbo)
- **Groq** (Fast inference, free tier)
- **Anthropic Claude**
- **OpenRouter** (Access 100+ models)
- **Azure OpenAI**
- **Ollama** (Local LLMs)

### Setup Steps

1. Go to **Studio** for your bot
2. Add **AI Provider** node from sidebar
3. Configure:
   - Select provider (Gemini, OpenAI, etc)
   - Enter API key
   - Choose models for different modes:
     - Chat
     - Code
     - Image
     - Vision
4. Connect commands to AI system
5. **Save** flow

All 23 built-in tools work with any provider automatically!

### Getting API Keys

- **Gemini**: [ai.google.dev](https://ai.google.dev/)
- **OpenAI**: [platform.openai.com](https://platform.openai.com/api-keys)
- **Groq**: [console.groq.com](https://console.groq.com/)
- **OpenRouter**: [openrouter.ai](https://openrouter.ai/keys)

---

## 🛠️ CLI Tool (dbp)

### Installation

```bash
# Make dbp available system-wide
npm link
```

### Commands

```bash
# Start panel (background)
dbp start

# Stop panel
dbp stop

# Restart panel
dbp restart

# Check status
dbp status

# View live logs
dbp logs

# Restore (auto-start if was running before shutdown)
dbp restore

# Setup auto-start on system boot
dbp setup-autostart

# Help
dbp help
```

### Auto-Start Setup

```bash
dbp setup-autostart
```

**What it does:**
- **Windows**: Creates startup script in `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`
- **Linux**: Creates systemd user service
- **macOS**: Creates LaunchAgent

The panel will automatically restart on system boot if it was running.

---

## 📁 Project Structure

```
Discord-Bot-Panel/
├── .env                      # Environment variables
├── .env.example              # Environment template
├── package.json              # Workspace configuration
│
├── bin/
│   └── dbp.js                # CLI tool for management
│
├── apps/
│   ├── api/                  # Backend (Express + TypeScript)
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── index.ts          # PostgreSQL connection
│   │   │   │   └── schema.ts         # Database schema
│   │   │   ├── routes/
│   │   │   │   ├── bot.routes.ts     # Bot management
│   │   │   │   ├── flow.routes.ts    # Flow CRUD
│   │   │   │   └── template.routes.ts # Templates
│   │   │   ├── services/
│   │   │   │   ├── ai.service.ts     # AI providers
│   │   │   │   ├── bot.runtime.ts    # Discord bot engine
│   │   │   │   └── tools/            # 23 AI tools
│   │   │   ├── lib/
│   │   │   │   └── auth.ts           # Better-Auth config
│   │   │   └── index.ts              # API entry point
│   │   ├── scripts/
│   │   │   ├── create-db.ts          # Database creation
│   │   │   └── migrate-sqlite-to-pg.ts # Migration tool
│   │   ├── drizzle.config.mjs        # Drizzle ORM config
│   │   └── seed-templates.ts         # Default templates
│   │
│   └── web/                  # Frontend (SvelteKit)
│       ├── src/
│       │   ├── routes/
│       │   │   ├── login/            # Login page
│       │   │   ├── dashboard/        # Dashboard
│       │   │   ├── bots/             # Bot list
│       │   │   ├── templates/        # Templates library
│       │   │   └── bots/[id]/
│       │   │       └── studio/       # Visual flow editor
│       │   └── lib/
│       │       ├── api.ts            # API client
│       │       ├── auth.ts           # Auth helpers
│       │       └── components/       # Svelte components
│       └── vite.config.ts
│
└── logs/                     # Application logs
    ├── dbp.log               # Main log file
    ├── dbp.pid               # Process ID
    └── dbp.state             # State tracking
```

---

## 🆘 Troubleshooting

### PostgreSQL Connection Failed

**Error:** `database "discord_bot_panel" does not exist`

```bash
# Create database manually
psql -U postgres -c "CREATE DATABASE discord_bot_panel;"

# OR use script
npm run db:create -w apps/api
```

**Error:** `password authentication failed for user "postgres"`

Check `DATABASE_URL` in `.env` - ensure username/password match your PostgreSQL installation.

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :4000
kill -9 <PID>
```

### PowerShell Execution Policy Error

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Discord OAuth 404 Error

1. Check redirect URL in Discord Developer Portal:
   ```
   http://localhost:4000/api/auth/callback/discord
   ```
2. Verify `BETTER_AUTH_URL` in `.env` matches `PUBLIC_API_URL`
3. Ensure `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are correct

### Templates Not Loading / Empty Canvas

1. Clear browser cache (Ctrl + Shift + Delete)
2. Hard refresh (Ctrl + Shift + R)
3. Re-seed templates:
   ```bash
   npm run seed -w apps/api
   ```
4. Restart server:
   ```bash
   dbp restart
   ```

### Database Migration Issues

If migrating from SQLite:

```bash
# Backup old database first!
cp apps/api/data.db apps/api/data.db.backup

# Run migration script
npx tsx apps/api/scripts/migrate-sqlite-to-pg.ts
```

### Build Errors

```bash
# Clean install
rm -rf node_modules apps/*/node_modules
npm install

# Rebuild
npm run build
```

---

## 📖 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `ALL` | `/api/auth/*` | Better-Auth endpoints |
| `POST` | `/api/auth/discord/` | Discord OAuth login |

### Bots
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/bots` | List user's bots |
| `POST` | `/api/bots` | Create bot |
| `GET` | `/api/bots/:id` | Get bot details |
| `POST` | `/api/bots/:id/start` | Start bot |
| `POST` | `/api/bots/:id/stop` | Stop bot |
| `POST` | `/api/bots/:id/restart` | Restart bot |
| `DELETE` | `/api/bots/:id` | Delete bot |
| `DELETE` | `/api/bots/:id/ai-history` | Clear AI messages |

### Flows
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/flows/:botId` | Get flows for bot |
| `POST` | `/api/flows` | Save/update flow |
| `DELETE` | `/api/flows/:flowId` | Delete flow |
| `PUT` | `/api/flows/:flowId` | Rename flow |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/templates` | List all templates |
| `GET` | `/api/templates/:id` | Get template details |
| `POST` | `/api/templates` | Upload template |
| `POST` | `/api/templates/:id/import/:botId` | Import to bot |

### Training
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/bots/:id/training` | Training status |
| `POST` | `/api/bots/:id/training/start` | Start training mode |
| `POST` | `/api/bots/:id/training/stop` | Stop training mode |
| `DELETE` | `/api/bots/:id/training` | Delete training data |

---

## 🔒 Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore` by default
2. **Use strong, random keys** - Generate with crypto.randomBytes()
3. **Change default PostgreSQL password** - Don't use `postgres:postgres` in production
4. **Enable HTTPS in production** - Use a reverse proxy like Nginx
5. **Rotate Discord OAuth secrets** - Periodically update credentials
6. **Backup database regularly** - See backup guide in `/brain/backup_guide.md`

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Built with [SvelteKit](https://kit.svelte.dev/)
- Database ORM: [Drizzle](https://orm.drizzle.team/)
- Auth: [Better-Auth](https://better-auth.com/)
- Discord: [discord.js](https://discord.js.org/)

---

Made with 💜 by MoonWiRaja
