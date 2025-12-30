# Panel Bot Discord

> 🤖 **Pembina Bot Discord Tanpa Kod** - Editor Logik Visual + Chatbot Berkuasa AI

**Bahasa / Language:**
- 🇲🇾 **Bahasa Melayu** (Anda di sini)
- 🇬🇧 [English](README.md)

```
╔══════════════════════════════════════════════════════════════╗
║  ░▒▓ PANEL BOT DISCORD ▓▒░                                   ║
║                                                              ║
║    ██████╗  ██████╗ ████████╗   ██████╗  █████╗ ███╗   ██╗  ║
║    ██╔══██╗██╔═══██╗╚══██╔══╝   ██╔══██╗██╔══██╗████╗  ██║  ║
║    ██████╔╝██║   ██║   ██║      ██████╔╝███████║██╔██╗ ██║  ║
║    ██╔══██╗██║   ██║   ██║      ██╔═══╝ ██╔══██║██║╚██╗██║  ║
║    ██████╔╝╚██████╔╝   ██║      ██║     ██║  ██║██║ ╚████║  ║
║    ╚═════╝  ╚═════╝    ╚═╝      ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝  ║
║                                                              ║
║            Bina Bot Discord Tanpa Tulis Kod!                 ║
╚══════════════════════════════════════════════════════════════╝
```

---

## ✨ Ciri-ciri Utama

### 🎛️ Dashboard Web
- **Login Discord OAuth** - Log masuk dengan akaun Discord anda
- **Pengurusan Bot** - Tambah, start, stop, restart bot dari browser
- **Editor Flow Visual** - Pembina logik drag-and-drop (Studio)
- **Perpustakaan Templat** - Templat bot sedia ada (Muzik, AI, Notifikasi)
- **Kolaborasi Masa Nyata** - Edit bersama dengan cursor live
- **Log Masa Nyata** - Pantau aktiviti bot secara langsung
- **Penjejakan Penggunaan Token** - Jejak penggunaan AI dengan had harian/mingguan/bulanan
- **Mod Latihan** - Ajar AI bot anda dari perbualan

### 🤖 Integrasi AI (23 Tools PERCUMA!)
Bot anda boleh guna **23 alatan terbina** - SEMUA PERCUMA, tak perlu API keys:

| Kategori | Alatan | Keterangan |
|----------|--------|------------|
| ⏰ **Masa** | `get_current_time` | Masa semasa untuk mana-mana timezone |
| 🌤️ **Cuaca** | `get_weather` | Cuaca live untuk mana-mana bandar |
| 🕌 **Waktu Solat** | `get_prayer_times` | Waktu solat tepat (JAKIM) |
| 🔍 **Carian** | `search_web` | Carian web DuckDuckGo |
| 📖 **Wikipedia** | `search_wikipedia` | Ringkasan Wikipedia |
| 🎬 **YouTube** | `search_youtube` | Cari video YouTube |
| 💱 **Mata Wang** | `convert_currency` | Kadar pertukaran live |
| 📈 **Kripto** | `get_crypto_price` | Harga Bitcoin, Ethereum |
| 🗣️ **Slanga** | `define_slang` | Definisi Urban Dictionary |
| 😂 **Memes** | `get_random_meme` | Memes random dari Reddit |
| 🔢 **Nombor** | `get_number_fact` | Fakta menarik tentang nombor |
| 🌐 **Webpage** | `read_webpage` | Scrape kandungan laman web |
| 🎭 **Lawak** | `get_joke` | Lawak random (programming, dll) |
| 💬 **Terjemah** | `translate_text` | Terjemah mana-mana bahasa |
| 📖 **Quotes** | `get_quote` | Petikan motivasi |
| 🔢 **Kalkulator** | `calculate` | Ungkapan matematik (sqrt, sin, dll) |
| 🔗 **URL** | `shorten_url` | Pendekkan URL panjang |
| 🌍 **Negara** | `get_country_info` | Info negara (ibu negara, populasi) |
| 📚 **Kamus** | `get_dictionary` | Definisi perkataan Inggeris |
| 🎬 **Anime** | `get_anime_info` | Info MyAnimeList |
| ⭐ **Horoskop** | `get_horoscope` | Bacaan zodiak |
| 💻 **GitHub** | `get_github_repo` | Info repositori GitHub |
| 🔍 **Bahasa** | `detect_language` | Kesan bahasa teks |

### 🎨 Editor Flow Visual (Studio)
- **Drag-and-Drop Nodes** - Bina logik secara visual
- **Jenis Trigger** - Commands, mesej, reactions, joins
- **Action Nodes** - Reply, DM, embed, role, API calls
- **AI Nodes** - Chat, generasi imej, sokongan multi-provider
- **Kod Custom** - Pelaksanaan JavaScript untuk logik advanced

### 📦 Templat Sedia Ada
- **Bot Notifikasi Live** - Monitor streamers TikTok/YouTube/Twitch
- **Bot Muzik** - Sokongan voice channel penuh, main YouTube/Spotify
- **Bot Pembantu AI** - Chatbot berkuasa Gemini dengan commands

---

## 📋 Isi Kandungan

1. [Keperluan](#-keperluan)
2. [Panduan Pemasangan Lengkap A-Z](#-panduan-pemasangan-lengkap-a-hingga-z)
3. [Setup Pangkalan Data (PostgreSQL)](#-setup-pangkalan-data-postgresql)
4. [Konfigurasi Environment](#-konfigurasi-environment)
5. [Setup Discord OAuth](#-setup-discord-oauth)
6. [Jalankan Aplikasi](#-jalankan-aplikasi)
7. [Guna Templat](#-guna-templat)
8. [Setup AI Provider](#-setup-ai-provider)
9. [Alat CLI (dbp)](#-alat-cli-dbp)
10. [Troubleshooting](#-troubleshooting)

---

## 📦 Keperluan

### Perisian Yang Diperlukan

| Perisian | Versi Minimum | Disyorkan | Muat Turun |
|----------|---------------|-----------|-----------|
| **Node.js** | v18.0.0 | v20.x LTS | [nodejs.org](https://nodejs.org/) |
| **PostgreSQL** | v14.0 | v18.x | [postgresql.org](https://www.postgresql.org/download/) |
| **Git** | Apa-apa | Terkini | [git-scm.com](https://git-scm.com/) |

### Keperluan Sistem

- **RAM**: Minimum 2GB, Disyorkan 4GB+
- **Storan**: 500MB ruang bebas
- **OS**: Windows 10/11, macOS 10.15+, Ubuntu 20.04+

---

## 🎯 Panduan Pemasangan Lengkap (A Hingga Z)

Bahagian ini menyediakan **arahan langkah demi langkah** untuk pemula sepenuhnya.

### Bahagian 1: Install Keperluan

#### Windows

**1.1 Install Node.js**

1. Pergi ke [nodejs.org](https://nodejs.org/)
2. Muat turun **versi LTS** (v20.x disyorkan)
3. Jalankan installer → Klik "Next" semua langkah
4. ✅ Sahkan pemasangan:
   ```cmd
   node --version
   npm --version
   ```
   Sepatutnya tunjuk nombor versi (contoh: `v20.11.0`)

**1.2 Install PostgreSQL 18**

1. Pergi ke [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. Muat turun installer **PostgreSQL 18**
3. Jalankan installer:
   - **Password**: Masukkan `postgres` (atau ingat password custom anda)
   - **Port**: Kekalkan default `5432`
   - **Locale**: Default
   - **Components**: Pilih semua (PostgreSQL Server, pgAdmin 4, Command Line Tools)
4. Tunggu pemasangan selesai
5. ✅ Sahkan pemasangan:
   ```cmd
   psql --version
   ```
   Sepatutnya tunjuk: `psql (PostgreSQL) 18.x`

**1.3 Install Git**

1. Pergi ke [git-scm.com](https://git-scm.com/)
2. Muat turun untuk Windows
3. Jalankan installer → Guna tetapan default
4. ✅ Sahkan pemasangan:
   ```cmd
   git --version
   ```

#### macOS

**1.1 Install Homebrew** (jika belum ada)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**1.2 Install Node.js**

```bash
brew install node@20

# Sahkan
node --version
npm --version
```

**1.3 Install PostgreSQL 18**

```bash
brew install postgresql@18

# Start servis PostgreSQL
brew services start postgresql@18

# Sahkan
psql --version
```

**1.4 Install Git**

```bash
brew install git

# Sahkan
git --version
```

#### Linux (Ubuntu/Debian)

**1.1 Install Node.js 20**

```bash
# Tambah repositori NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Sahkan
node --version
npm --version
```

**1.2 Install PostgreSQL 18**

```bash
# Tambah repositori PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Update dan install
sudo apt-get update
sudo apt-get install -y postgresql-18

# Start servis
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Set password untuk user postgres
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Sahkan
psql --version
```

**1.3 Install Git**

```bash
sudo apt-get install -y git

# Sahkan
git --version
```

---

### Bahagian 2: Muat Turun & Setup Projek

**2.1 Clone Repository**

Buka terminal/command prompt:

```bash
# Navigate ke mana anda nak letak projek (contoh: Desktop)
cd Desktop

# Clone repository
git clone https://github.com/MoonWIRaja/Discord-Bot-Panel.git

# Masuk ke direktori
cd Discord-Bot-Panel
```

**2.2 Install Dependencies**

```bash
# Ini akan install semua package yang diperlukan (ambil masa 2-5 minit)
npm install
```

Output yang dijangka: Tiada error, banyak packages dipasang

### Kemas Kini Ke Versi Terkini

Jika anda sudah install projek dan nak update ke versi terkini dari GitHub:

```bash
# Navigate ke direktori projek
cd Discord-Bot-Panel

# Stop server dulu (jika sedang running)
dbp stop
# ATAU jika guna npm directly
# Tekan Ctrl+C untuk stop

# Ambil perubahan terkini dari GitHub
git pull origin main

# Update dependencies (kalau ada package baru ditambah)
npm install

# Update schema database (jika ada perubahan schema)
npm run db:push -w apps/api

# Restart server
dbp start
# ATAU
npm run dev
```

**Nota Penting:**
- Sentiasa **backup database** anda sebelum pull updates
- Check release notes atau commit messages untuk breaking changes
- Jika anda ubah kod, mungkin perlu resolve merge conflicts

---

### Bahagian 3: Setup Pangkalan Data

**3.1 Cipta Database**

**Pilihan A: Guna psql (Semua platform)**

```bash
# Sambung ke PostgreSQL
psql -U postgres

# Anda akan diminta password (masukkan: postgres)
# Kemudian dalam psql shell, jalankan:
CREATE DATABASE discord_bot_panel;

# Sahkan database dah dicipta
\l

# Keluar dari psql
\q
```

**Pilihan B: Guna skrip automatik**

```bash
npm run db:create -w apps/api
```

**3.2 Initialize Schema Database**

```bash
# Apply jadual dan struktur database
npm run db:push -w apps/api
```

Output yang dijangka:
```
✅ Pushing schema to database...
✅ Done!
```

**3.3 Tambah Templat Default**

```bash
# Masukkan templat bot sedia ada
npm run seed -w apps/api
```

Output yang dijangka:
```
[Seed] ✅ Added default template: Live Notification Bot
[Seed] ✅ Added default template: Music Bot
[Seed] ✅ Added default template: AI Assistant Bot
```

---

### Bahagian 4: Konfigurasi Environment

**4.1 Cipta Fail .env**

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

**4.2 Generate Security Keys**

Jalankan arahan ini untuk generate kunci random yang selamat:

```bash
# Generate BETTER_AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate BOT_TOKEN_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Anda akan dapat output macam:
```
a1b2c3d4e5f6...  (64 aksara)
```

**4.3 Edit Fail .env**

Buka `.env` dalam text editor dan update:

```env
# 1. Database (check username/password sepadan dengan PostgreSQL anda)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/discord_bot_panel"

# 2. Tampal kunci yang telah digenerate di sini
BETTER_AUTH_SECRET=tampal_kunci_pertama_anda_di_sini
BOT_TOKEN_ENCRYPTION_KEY=tampal_kunci_kedua_anda_di_sini

# 3. Discord OAuth (kita akan set di bahagian seterusnya)
DISCORD_CLIENT_ID=client_id_discord_anda
DISCORD_CLIENT_SECRET=client_secret_discord_anda

# 4. Lokasi server (pilihan - untuk alatan AI)
SERVER_TIMEZONE=Asia/Kuala_Lumpur
SERVER_CITY=Kuala Lumpur
SERVER_COUNTRY=Malaysia
```

Simpan fail tersebut.

---

### Bahagian 5: Setup Discord OAuth

**5.1 Cipta Discord Application**

1. Pergi ke [discord.com/developers/applications](https://discord.com/developers/applications)
2. Klik **"New Application"**
3. Masukkan nama: `Panel Bot Saya` (atau nama lain)
4. Klik **"Create"**

**5.2 Dapatkan OAuth Credentials**

1. Dalam aplikasi anda, pergi ke **OAuth2** → **General**
2. Copy **CLIENT ID** → Tampal dalam `.env` sebagai `DISCORD_CLIENT_ID`
3. Klik **"Reset Secret"** → Copy
4. Tampal dalam `.env` sebagai `DISCORD_CLIENT_SECRET`

**5.3 Tambah Redirect URL**

1. Masih dalam **OAuth2** → **General**
2. Klik **"Add Redirect"**
3. Masukkan:
   ```
   http://localhost:4000/api/auth/callback/discord
   ```
4. Klik **"Save Changes"**

---

### Bahagian 6: Jalankan Kali Pertama

**6.1 Start Development Server**

```bash
npm run dev
```

Output yang dijangka:
```
╔══════════════════════════════════════════════╗
║          🤖 Discord Bot Panel - Web          ║
╠══════════════════════════════════════════════╣
║  🌐 Public URL: http://localhost:5173        ║
║  🖥️  Local:      http://localhost:5173      ║
╚══════════════════════════════════════════════╝

API Server running on http://localhost:4000
```

**6.2 Akses Dashboard Web**

1. Buka browser
2. Pergi ke: **http://localhost:5173**
3. Anda sepatutnya nampak halaman login
4. Klik **"Continue with Discord"**
5. Authorize aplikasi
6. Anda akan dialihkan ke Dashboard!

---

### Bahagian 7: Cipta Bot Pertama Anda

**7.1 Tambah Bot**

1. Dalam Dashboard, klik **"+ Add Bot"**
2. Isi maklumat:
   - **Nama Bot**: `Bot Pertama Saya`
   - **Discord Bot Token**: Dapatkan dari [discord.com/developers/applications](https://discord.com/developers/applications)
     - Pergi ke aplikasi anda → **Bot** → Klik **"Reset Token"**
     - Copy token tersebut
3. Klik **"Create Bot"**

**7.2 Start Bot Anda**

1. Klik butang **"Start"**
2. Status sepatutnya tukar kepada **"Online"** (hijau)
3. Check Discord - bot anda sepatutnya online!

**7.3 Guna Templat**

1. Pergi ke halaman **Templates**
2. Klik **"Import"** pada **"Music Bot"** atau **"AI Assistant Bot"**
3. Pilih bot anda
4. Klik **"Import"**
5. Pergi ke **Studio** untuk lihat flow
6. Klik **"Save"**

**7.4 Test Bot Anda**

1. Jemput bot ke server anda:
   - Pergi ke Discord Developer Portal
   - **OAuth2** → **URL Generator**
   - Pilih scopes: `bot`, `applications.commands`
   - Pilih permissions: `Administrator` (atau permissions khusus)
   - Copy URL yang digenerate, tampal dalam browser
   - Tambah ke server test anda

2. Dalam Discord, test commands:
   - `/play` - Jika anda import Music Bot
   - `/aichat` - Jika anda import AI Assistant Bot

**Selesai! 🎉 Bot anda dah running!**

---

## 📚 Guna Templat

### 1. Senaraikan Templat

1. Login ke web dashboard: http://localhost:5173
2. Pergi ke halaman **Templates**
3. Lihat templat yang ada:
   - Bot Notifikasi Live
   - Bot Muzik
   - Bot Pembantu AI

### 2. Import Templat

1. Klik **Import** pada templat yang dikehendaki
2. Pilih bot sasaran (atau cipta bot baru)
3. Flow templat akan ditambah ke bot anda
4. Pergi ke **Studio** untuk lihat/edit flow

### 3. Customize Templat

1. Buka **Studio** untuk bot anda
2. Klik pada nodes untuk edit:
   - Tukar nama command
   - Ubah responses
   - Tambah/buang features
3. Klik **Save** bila dah siap

### 4. Cipta Templat Sendiri

1. Bina flow dalam **Studio**
2. Klik **Export** untuk save sebagai `.json`
3. Pergi ke halaman **Templates**
4. Klik **Upload Template**
5. Isi butiran dan upload fail `.json` anda

---

## 🤖 Setup AI Provider

### Providers Yang Disokong

- **Google Gemini** (Disyorkan - Free tier tersedia)
- **OpenAI** (GPT-4, GPT-3.5-turbo)
- **Groq** (Inferens pantas, free tier)
- **Anthropic Claude**
- **OpenRouter** (Akses 100+ models)
- **Azure OpenAI**
- **Ollama** (LLMs lokal)

### Langkah Setup

1. Pergi ke **Studio** untuk bot anda
2. Tambah node **AI Provider** dari sidebar
3. Konfigurasikan:
   - Pilih provider (Gemini, OpenAI, dll)
   - Masukkan API key
   - Pilih models untuk mod berbeza:
     - Chat
     - Code
     - Image
     - Vision
4. Sambung commands ke sistem AI
5. **Save** flow

Semua 23 alatan terbina berfungsi dengan mana-mana provider secara automatik!

### Dapatkan API Keys

- **Gemini**: [ai.google.dev](https://ai.google.dev/)
- **OpenAI**: [platform.openai.com](https://platform.openai.com/api-keys)
- **Groq**: [console.groq.com](https://console.groq.com/)
- **OpenRouter**: [openrouter.ai](https://openrouter.ai/keys)

---

## 🛠️ Alat CLI (dbp)

### Pemasangan

```bash
# Buat dbp tersedia di seluruh sistem
npm link
```

### Arahan

```bash
# Start panel (background)
dbp start

# Stop panel
dbp stop

# Restart panel
dbp restart

# Check status
dbp status

# Lihat logs live
dbp logs

# Restore (auto-start jika running sebelum shutdown)
dbp restore

# Setup auto-start bila sistem boot
dbp setup-autostart

# Help
dbp help
```

### Setup Auto-Start

```bash
dbp setup-autostart
```

**Apa yang dilakukan:**
- **Windows**: Cipta startup script dalam `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`
- **Linux**: Cipta systemd user service
- **macOS**: Cipta LaunchAgent

Panel akan automatically restart bila sistem boot jika ia sedang running.

---

## 🆘 Troubleshooting

### Sambungan PostgreSQL Gagal

**Error:** `database "discord_bot_panel" does not exist`

```bash
# Cipta database secara manual
psql -U postgres -c "CREATE DATABASE discord_bot_panel;"

# ATAU guna script
npm run db:create -w apps/api
```

**Error:** `password authentication failed for user "postgres"`

Check `DATABASE_URL` dalam `.env` - pastikan username/password sepadan dengan pemasangan PostgreSQL anda.

### Port Sudah Digunakan

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

1. Check redirect URL dalam Discord Developer Portal:
   ```
   http://localhost:4000/api/auth/callback/discord
   ```
2. Sahkan `BETTER_AUTH_URL` dalam `.env` sepadan dengan `PUBLIC_API_URL`
3. Pastikan `DISCORD_CLIENT_ID` dan `DISCORD_CLIENT_SECRET` betul

### Templat Tak Load / Canvas Kosong

1. Clear browser cache (Ctrl + Shift + Delete)
2. Hard refresh (Ctrl + Shift + R)
3. Re-seed templat:
   ```bash
   npm run seed -w apps/api
   ```
4. Restart server:
   ```bash
   dbp restart
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

## 📄 Lesen

Lesen MIT - Lihat [LICENSE](LICENSE) untuk butiran.

---

## 🙏 Penghargaan

- Dibuat dengan [SvelteKit](https://kit.svelte.dev/)
- Database ORM: [Drizzle](https://orm.drizzle.team/)
- Auth: [Better-Auth](https://better-auth.com/)
- Discord: [discord.js](https://discord.js.org/)

---

Made with 💜 by MoonWiRaja (KRACKED DEV)
