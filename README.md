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
- **Real-time Logs** - Monitor bot activity live
- **Token Usage Tracking** - Track AI usage with daily/weekly/monthly limits
- **Training Mode** - Teach your AI bot from conversations
- **Clear AI History** - Bulk delete messages in AI channels

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
- **AI Nodes** - Chat, image generation, text-to-speech
- **Condition Nodes** - If/else logic, filters

---

## 📋 Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Installation](#-installation)
3. [Environment Setup](#-environment-setup)
4. [Database Setup](#-database-setup)
5. [Discord OAuth Setup](#-discord-oauth-setup)
6. [Running the Application](#-running-the-application)
7. [AI Provider Setup](#-ai-provider-setup)
8. [Project Structure](#-project-structure)
9. [API Endpoints](#-api-endpoints)
10. [Troubleshooting](#-troubleshooting)

---

## 📦 Prerequisites

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | v18.0.0+ | [nodejs.org](https://nodejs.org/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

> 💡 **No external database required!** Uses **SQLite** (file-based).

---

## 🚀 Installation

```bash
# Clone repository
git clone https://github.com/MoonWIRaja/discord-bot-panel.git
cd discord-bot-panel

# Install all dependencies
npm install
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

```env
# ==============================================
# APPLICATION PORTS
# ==============================================
API_PORT=4000
WEB_PORT=5173

# Public URLs
PUBLIC_API_URL=http://localhost:4000
PUBLIC_WEB_URL=http://localhost:5173

# ==============================================
# AUTHENTICATION
# ==============================================
BETTER_AUTH_SECRET=your_32_char_secret_key
BETTER_AUTH_URL=http://localhost:4000

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# ==============================================
# BOT SYSTEM
# ==============================================
BOT_TOKEN_ENCRYPTION_KEY=your_32_byte_hex_key

# ==============================================
# SERVER LOCATION (for time/weather defaults)
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

---

## 🗄️ Database Setup

```bash
# Initialize database
npm run db:push -w apps/api
```

Database file: `apps/api/data.db`

### Commands

```bash
npm run db:push -w apps/api      # Apply schema
npm run db:generate -w apps/api  # Generate migrations
npm run db:studio -w apps/api    # Visual database viewer
```

---

## 🔐 Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create **New Application**
3. Go to **OAuth2** → Add redirect URL:
   ```
   http://localhost:4000/api/auth/callback/discord
   ```
4. Copy **Client ID** and **Client Secret** to `.env`

---

## 🖥️ Running the Application

### Development

```bash
npm run dev
```

- **API**: http://localhost:4000
- **Web**: http://localhost:5173

### Production

```bash
npm run build
npm run start
```

---

## 🤖 AI Provider Setup

Go to **Dashboard** → **Bot** → **Studio** → **Add AI Node**

Supported providers:
- **OpenAI** (GPT-4, GPT-3.5)
- **Google Gemini** (gemini-pro, gemini-1.5-flash)
- **Anthropic Claude**
- **OpenRouter** (access to 100+ models)
- **Groq** (fast inference)
- **Together.AI**

All 23 tools work automatically with any provider!

---

## 📁 Project Structure

```
discord-bot-panel/
├── .env                  # Environment variables
├── package.json          # Workspace config
├── apps/
│   ├── api/              # Backend (Express + TypeScript)
│   │   ├── src/
│   │   │   ├── db/       # Database schema
│   │   │   ├── routes/   # API routes
│   │   │   ├── services/ # Business logic
│   │   │   │   ├── ai.service.ts      # AI providers
│   │   │   │   ├── bot.runtime.ts     # Discord bot engine
│   │   │   │   └── tools/             # 23 AI tools
│   │   │   └── lib/      # Auth config
│   │   └── data.db       # SQLite database
│   │
│   └── web/              # Frontend (SvelteKit)
│       └── src/
│           ├── routes/   # Pages
│           └── lib/      # Components
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `ALL` | `/api/auth/*` | Discord OAuth |

### Bots
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/bots` | List user's bots |
| `POST` | `/api/bots` | Add bot |
| `GET` | `/api/bots/:id` | Get bot details |
| `POST` | `/api/bots/:id/start` | Start bot |
| `POST` | `/api/bots/:id/stop` | Stop bot |
| `DELETE` | `/api/bots/:id` | Delete bot |
| `DELETE` | `/api/bots/:id/ai-history` | Clear AI channel messages |

### Flows
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/flows/:botId` | Get flows |
| `POST` | `/api/flows` | Save flow |

### Training
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/bots/:id/training` | Training status |
| `POST` | `/api/bots/:id/training/start` | Start training |
| `POST` | `/api/bots/:id/training/stop` | Stop training |
| `DELETE` | `/api/bots/:id/training` | Delete training data |

---

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :4000
kill -9 <PID>
```

### PowerShell Error

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Discord OAuth Error

1. Check redirect URL: `http://localhost:4000/api/auth/callback/discord`
2. Verify Client ID & Secret in `.env`
3. Check `BETTER_AUTH_URL` matches API URL

### Database Issues

```bash
rm apps/api/data.db
npm run db:push -w apps/api
```

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

Made with 💜 by MoonWiRaja
