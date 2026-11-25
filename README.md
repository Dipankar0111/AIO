# AIO ⚡

> **All-in-One AI Chat · Smart Notes · Daily Scheduler**  
> *Seamlessly integrating an interactive Groq LPU LLM Playground, Snap-to-Notes Multimodal Vision Studio, and an AI-driven Smart Daily Scheduler with Supabase authentication and per-user persistent Notepad & Calendar/To-Do synchronization.*

**Live App:** [aio-five-sand.vercel.app](https://aio-five-sand.vercel.app)

---

## 🌟 Overview & Architecture

**AIO** unites three core productivity pillars into a single ultra-low-latency interface with Light & Dark themes and per-user workspace isolation:

```
┌────────────────────────────────────────────────────────────────────────┐
│                            AIO TOPOLOGY                                │
├───────────────────────┬───────────────────────┬────────────────────────┤
│   1. LLM PLAYGROUND   │   2. SNAP-TO-NOTES    │   3. DAILY SCHEDULER   │
│  Multi-Turn Arena     │  Multimodal Vision    │  Time-Blocking Engine  │
│  Model & Param Tuner  │  OCR & Transcriber    │  Routine Harmonizer    │
│  Action Detectors     │  Auto-Save to Notes   │  2-Way Calendar Sync   │
└───────────┬───────────┴───────────┬───────────┴───────────┬────────────┘
            │                       │                       │
            ▼                       ▼                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│       SUPABASE AUTH + USER-SCOPED REACTIVE STORE (localStorage)        │
│  • Auth & Profile (Email/Password, Google & GitHub OAuth, Inline Name) │
│  • Shared Notepad (Markdown, tags, search, pinned, .md exports)        │
│  • Shared Calendar (Color-coded scheduled time blocks, hourly view)    │
│  • Shared To-Do System (Prioritized tasks, checklist, linked notes)    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

### 1. Authentication & User Profile
- **Supabase Auth**: Sign up or sign in with Email & Password, **Google**, or **GitHub** OAuth.
- **Per-User Workspace Isolation**: Notes, calendar events, and to-dos are scoped per authenticated user and start clean for new accounts.
- **Sidebar Profile**: Displays your avatar/initials, editable profile name (synced to Supabase), signed-in email, and one-click Sign Out.

### 2. Unified Shared State
- **Shared Notepad**:
  - Full Markdown rendering with syntax-highlighted code blocks, tables, and lists.
  - Live editing, instant search by title/tag/content, tags manager, and pin-to-top.
  - Export notes as `.md` files or copy to clipboard with a single click.
  - Source tracking badges indicating whether a note came from the *Playground*, *Snap-to-Notes*, *Scheduler*, or was *Manually Written*.
- **Shared Calendar & To-Do Engine**:
  - Structured time blocks (date, start time, end time, category, color, notes).
  - Priority-tiered to-do items (High, Medium, Low) with completion strike-through and celebratory confetti interactions.
  - Slide-over quick drawer access (`⌘⇧N` for Notepad, `⌘⇧C` for Calendar & Tasks) accessible from **any section at any time**.

### 3. LLM Playground (Chat & Prompt Studio)
- **Model Selector**: Switch between Groq's flagship models (including GPT-OSS 120B/20B, Qwen 3.8 27B, Llama 3.3 70B, Llama 3.1 8B, DeepSeek R1, Llama 4 Vision) plus **Custom Model ID** input.
- **Parameter Controls**: Real-time sliders for `Temperature`, `Max Tokens`, and `Top P`.
- **System Prompt Library**: Pre-configured expert personas.
- **Direct Workspace Integrations**: "Save to Notepad" button and interactive action cards to sync suggested notes, calendar events, and to-dos with one click.
- **Telemetry**: Latency in milliseconds and throughput in tokens/second.

### 4. Snap-to-Notes (Image to Notepad Studio)
- **Versatile Image Inputs**: Drag-and-drop/upload (PNG, JPG, WEBP), clipboard paste (`Ctrl+V` / `Cmd+V`), live **Webcam / Camera** capture, or sample diagrams.
- **5 Extraction Modes**: Clean Summary & Key Points, Verbatim Text / OCR, Study Notes & Definitions, Action Items & To-Dos, and Custom Prompt.
- **Auto-Save & Markdown Preview**: Live preview toggle, editable title, and one-click save to the Shared Notepad.

### 5. Smart Daily Scheduler (Routine, To-Do & Calendar Sync)
- **Intelligent Schedule Generation**: Input target date, wake/sleep hours, and natural language brain-dump to generate non-overlapping, energy-balanced time blocks.
- **Two-Way Synchronization**: Syncs blocks to the **Shared Calendar**, action items to the **Shared To-Do List**, and a Daily Blueprint note to the **Shared Notepad**.

---

## 🛠️ Local Development & Setup

### Prerequisites
- Node.js (v18+ recommended)
- npm
- A [Supabase](https://supabase.com) project (for authentication)
- A free [Groq](https://console.groq.com/keys) API key

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Dipankar0111/AIO.git
cd AIO
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

### 3. Configure Your Groq API Key
1. Launch the app and click **Settings** in the left sidebar.
2. Paste your Groq API key (`gsk_...`) from [console.groq.com/keys](https://console.groq.com/keys).
3. Click **Test Connection**, then **Save & Apply** (stored in browser `localStorage`).

*Note: Without a Groq API key, the app runs in **Demo Mode** so you can still test the UI.*

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Production Build
```bash
npm run build
npm run preview
```

---

## ☁️ Deploying to Vercel

1. In **Vercel → Project → Settings → Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with **Type** set to **Config**.
2. Redeploy so Vite bundles the environment variables.
3. In **Supabase → Authentication → URL Configuration**, set **Site URL** to your Vercel URL and add `https://your-app.vercel.app/**` to **Redirect URLs**.
4. If using **Google OAuth**, add your Vercel URL to **Authorized JavaScript origins** in Google Cloud Console.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘⇧N` or `Ctrl+Shift+N` | Toggle Shared Notepad Drawer |
| `⌘⇧C` or `Ctrl+Shift+C` | Toggle Shared Calendar & To-Do Drawer |
| `Enter` | Send message in LLM Playground |
| `Shift + Enter` | New line in textareas |
| `⌘V` or `Ctrl+V` | Paste image into Snap-to-Notes from clipboard |

---

## 🔒 Security & Privacy
- **Direct API Calls**: Inference requests are sent directly from your browser to the official Groq API (`https://api.groq.com/openai/v1/chat/completions`).
- **Supabase Auth & Scoped Persistence**: User sessions are managed by Supabase Auth; notes, calendar events, to-dos, and Groq API keys are stored per user in browser `localStorage`.
