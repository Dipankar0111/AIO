# Groq Nexus Workspace ⚡

> **A Unified Tri-Workspace Web Application Powered by Groq LPUs**  
> *Seamlessly integrating an interactive LLM Playground, Snap-to-Notes Multimodal Vision Studio, and an AI-driven Smart Daily Scheduler with persistent cross-workspace Notepad and Calendar/To-Do synchronization.*

---

## 🌟 Overview & Architecture

**Groq Nexus Workspace** unites three core productivity pillars into a single ultra-low-latency interface designed with an Awwwards/Linear/Apple-grade design aesthetic:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GROQ NEXUS TOPOLOGY                             │
├───────────────────────┬───────────────────────┬────────────────────────┤
│   1. LLM PLAYGROUND   │   2. SNAP-TO-NOTES    │   3. DAILY SCHEDULER   │
│  Multi-Turn Arena     │  Multimodal Vision    │  Time-Blocking Engine  │
│  Model & Param Tuner  │  OCR & Transcriber    │  Routine Harmonizer    │
│  Action Detectors     │  Auto-Save to Notes   │  2-Way Calendar Sync   │
└───────────┬───────────┴───────────┬───────────┴───────────┬────────────┘
            │                       │                       │
            ▼                       ▼                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│            CENTRALIZED REACTIVE STORE (localStorage Sync)              │
│  • Shared Notepad (Markdown, tags, search, pinned, .md exports)       │
│  • Shared Calendar (Color-coded scheduled time blocks, hourly view)    │
│  • Shared To-Do System (Prioritized tasks, checklist, linked notes)    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

### 1. Unified Shared State (Zero Data Loss)
- **Shared Notepad**:
  - Full Markdown rendering with syntax-highlighted code blocks, tables, and lists.
  - Live editing, instant search by title/tag/content, tags manager, and pin-to-top.
  - Export notes as `.md` files or copy to clipboard with a single click.
  - Source tracking badges indicating whether a note came from the *Playground*, *Snap-to-Notes*, *Scheduler*, or was *Manually Written*.
- **Shared Calendar & To-Do Engine**:
  - Structured time blocks (date, start time, end time, category, color, notes).
  - Priority-tiered to-do items (High, Medium, Low) with completion strike-through and celebratory confetti interactions.
  - Slide-over quick drawer access (`⌘N` / `Ctrl+N` for Notepad, `⌘C` / `Ctrl+C` for Calendar & Tasks) accessible from **any section at any time**.

### 2. Section 1: LLM Playground (Chat & Prompt Studio)
- **Model Selector**: Switch between Groq's flagship models:
  - `llama-3.3-70b-versatile` (Flagship reasoning & architecture)
  - `llama-3.1-8b-instant` (Sub-100ms ultra-low latency)
  - `llama-3.2-11b-vision-preview` (Multimodal intelligence)
  - `deepseek-r1-distill-llama-70b` (Deep mathematical logic)
  - `mixtral-8x7b-32768` (High-context MoE)
  - `gemma2-9b-it` (Concise factual responses)
  - Plus **Custom Model ID** input.
- **Parameter Controls**: Real-time sliders for `Temperature`, `Max Tokens`, and `Top P`.
- **System Prompt Library**: Pre-configured expert personas (Unified Executive Assistant, Senior Software Architect, Productivity & Routine Planner, Academic Researcher).
- **Direct Workspace Integrations**:
  - "Save to Notepad" button directly on assistant responses.
  - **Tool-Like Action Detection**: Assistant-suggested notes, calendar meetings, and to-do items render as interactive cards that can be executed and synced into the central store with one click.
- **Telemetry**: Latency in milliseconds and throughput in tokens/second (up to 400+ tok/s on Groq LPUs).

### 3. Section 2: Snap-to-Notes (Image to Notepad Studio)
- **Versatile Image Inputs**:
  - Drag-and-drop or file upload (PNG, JPG, WEBP).
  - Clipboard paste anywhere in the viewport (`Ctrl+V` / `Cmd+V`).
  - Integrated live **Webcam / Camera viewfinder** with real-time snapshot capture.
  - Pre-loaded sample diagrams (System Architecture Whiteboard, Sprint Action Items Board).
- **5 Extraction Modes**:
  1. *Clean Summary & Key Points* (Executive synthesis and high-level takeaways)
  2. *Verbatim Text / OCR* (Faithful transcription of tables, code, and handwriting)
  3. *Study Notes & Definitions* (Flashcard-style concepts, definitions, and review queries)
  4. *Action Items & To-Dos* (Extracts checkboxes directly into the To-Do checklist)
  5. *Custom Prompt* (Tailored instruction for niche extractions)
- **Auto-Save & Markdown Preview**:
  - Live preview toggle, editable title, and one-click manual or automatic save to the Shared Notepad.

### 4. Section 3: Smart Daily Scheduler (Routine, To-Do & Calendar Sync)
- **Intelligent Schedule Generation**:
  - Input target date, wake/sleep hours, and an unstructured natural language brain-dump.
  - Built-in task builder with duration estimation and priority levels.
  - Groq AI generates non-overlapping, energy-balanced time blocks with lunch and deep-work buffers.
- **Two-Way Synchronization**:
  - Automatically syncs blocks to the **Shared Calendar**.
  - Adds prioritized action items to the **Shared To-Do List**.
  - Formats a comprehensive Daily Blueprint note into the **Shared Notepad**.
- **Interactive Timeline**:
  - Chronological vertical timeline track with duration tags, category color coding, and quick deletion/addition.
  - Side-by-side interactive to-do checklist.

---

## 🛠️ Local Development & Setup

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### 1. Clone & Install Dependencies
```bash
cd Implimentation
npm install
```

### 2. Configure Your Groq API Key
You can configure your Groq API key in either of two ways:

#### Option A: Via the Web UI (Recommended)
1. Launch the app and click the **Settings (gear)** icon in the top right navigation bar.
2. Paste your free Groq API key (starts with `gsk_...`). Get one at [console.groq.com/keys](https://console.groq.com/keys).
3. Click **"Test Connection"** to verify latency and connectivity.
4. Click **"Save & Apply"**. The key is securely stored in your local browser `localStorage`.

#### Option B: Via Environment Variable
Create a `.env` file in the project root:
```env
VITE_GROQ_API_KEY=gsk_your_groq_api_key_here
```

*Note: If no API key is provided, the application runs seamlessly in **Demo Mode**, providing realistic simulated inference, sample images, and responsive data so you can test all features immediately!*

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Production Build
```bash
npm run build
npm run preview
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘N` or `Ctrl+N` | Toggle Shared Notepad Drawer |
| `⌘C` or `Ctrl+C` | Toggle Shared Calendar & To-Do Drawer |
| `Enter` | Send message in LLM Playground |
| `Shift + Enter` | New line in textareas |
| `⌘V` or `Ctrl+V` | Paste image into Snap-to-Notes from clipboard |

---

## 🔒 Security & Privacy
- **Zero Third-Party Relays**: All requests are dispatched directly from your browser to the official Groq API endpoint (`https://api.groq.com/openai/v1/chat/completions`).
- **Local Persistence**: Notes, calendar events, to-dos, and API keys are stored solely inside your browser's `localStorage`.
# AIO
