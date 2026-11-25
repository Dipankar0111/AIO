import { GroqModelConfig, ExtractionPreset, Note, CalendarEvent, TodoItem } from '../types';

export const GROQ_MODELS: GroqModelConfig[] = [
  {
    id: 'openai/gpt-oss-120b',
    name: 'OpenAI GPT-OSS 120B',
    description: 'Flagship open weights model for complex reasoning, multi-step planning, and coding.',
    contextWindow: 128000,
    badge: 'Flagship OSS',
    speedRating: 'fast'
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'OpenAI GPT-OSS 20B',
    description: 'Ultra-fast open weights model with sub-second inference for real-time workflows.',
    contextWindow: 128000,
    badge: 'Ultra Fast OSS',
    speedRating: 'ultra-fast'
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B',
    description: 'High-performance open weights model with strong math, logic, and reasoning capabilities.',
    contextWindow: 128000,
    badge: 'High Reasoning',
    speedRating: 'fast'
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    description: 'Flagship open model. High intelligence for reasoning, coding, and planning.',
    contextWindow: 128000,
    badge: 'Recommended',
    speedRating: 'fast'
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    description: 'Blazing-fast sub-100ms response time. Perfect for real-time iteration.',
    contextWindow: 128000,
    badge: 'Sub-100ms',
    speedRating: 'ultra-fast'
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 Distill 70B',
    description: 'State-of-the-art reasoning model running at high token throughput on Groq LPUs.',
    contextWindow: 128000,
    badge: 'Deep Reasoning',
    speedRating: 'balanced'
  },
  {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout 17B',
    description: 'Next-gen flagship multimodal vision model on Groq LPUs. High-precision OCR, charts & whiteboards.',
    contextWindow: 128000,
    isVision: true,
    badge: 'Llama 4 Vision',
    speedRating: 'fast'
  },
  {
    id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    name: 'Llama 4 Maverick 17B',
    description: 'High-capacity multimodal architecture with extended context for complex documents & diagrams.',
    contextWindow: 128000,
    isVision: true,
    badge: 'Vision Pro',
    speedRating: 'balanced'
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B (32k)',
    description: 'High-speed Mixture-of-Experts architecture for analytical and code tasks.',
    contextWindow: 32768,
    badge: 'MoE',
    speedRating: 'ultra-fast'
  }
];

export const GROQ_VISION_MODELS: GroqModelConfig[] = [
  {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout 17B',
    description: 'Next-gen flagship multimodal vision model on Groq LPUs. High-precision OCR, charts & whiteboards.',
    contextWindow: 128000,
    isVision: true,
    badge: 'Llama 4 Vision',
    speedRating: 'fast'
  },
  {
    id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    name: 'Llama 4 Maverick 17B',
    description: 'High-capacity multimodal architecture with extended context for complex documents & diagrams.',
    contextWindow: 128000,
    isVision: true,
    badge: 'Vision Pro',
    speedRating: 'balanced'
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B',
    description: 'Multimodal reasoning model for visual understanding, slides, and structured extraction.',
    contextWindow: 128000,
    isVision: true,
    badge: 'Multimodal',
    speedRating: 'fast'
  }
];

export const SYSTEM_PROMPT_PRESETS = [
  {
    name: 'Unified Executive Assistant',
    prompt: `You are an elite, highly organized AI executive partner connected to the Groq Nexus Workspace.
When asked to summarize, write notes, or organize schedules:
- Provide clear, punchy, well-structured answers using clean Markdown.
- If the user asks to save a note, schedule an event, or add a to-do, you may provide your answer AND explicitly append one of the following JSON action blocks at the end:
\`\`\`action:save_note
{"title": "Note Title", "content": "Full markdown content...", "tags": ["tag1", "tag2"]}
\`\`\`
\`\`\`action:add_event
{"title": "Meeting Title", "date": "YYYY-MM-DD", "startTime": "09:00", "endTime": "10:00", "category": "work", "notes": "Details"}
\`\`\`
\`\`\`action:add_todo
{"title": "Action Item", "priority": "high", "dueDate": "YYYY-MM-DD"}
\`\`\`
The application will automatically detect these and offer the user instant one-click execution.`
  },
  {
    name: 'Senior Software Architect',
    prompt: `You are a Principal Software Architect and Creative Technologist.
Provide clean, idiomatic, production-ready code with concise explanations.
Favor modern standards, TypeScript safety, efficient algorithms, and elegant architecture. Format code with appropriate language tags.`
  },
  {
    name: 'Productivity & Routine Planner',
    prompt: `You are a world-class time management expert specializing in Time-Blocking, deep work, and energy-management protocols (similar to Cal Newport and Andrew Huberman).
Break complex days into realistic, non-fatiguing focus blocks, integrate deliberate rest buffers, and clarify priorities.`
  },
  {
    name: 'Academic Researcher & Note-Taker',
    prompt: `You are an academic researcher and note-taking specialist. Transform complex concepts into clear Feynman-style explanations, synthesis summaries, definitions, and memorable bullet points.`
  }
];

export const EXTRACTION_PRESETS: ExtractionPreset[] = [
  {
    id: 'summary',
    label: 'Clean Summary & Key Points',
    description: 'Extracts core insights, high-level takeaways, and a structured executive brief.',
    iconName: 'FileText',
    promptInstruction: 'Analyze the provided image in detail. Extract the central themes, synthesize key takeaways into clear bullet points, and provide an executive summary note formatted in clean Markdown.'
  },
  {
    id: 'verbatim',
    label: 'Verbatim OCR / Full Text',
    description: 'Faithfully transcribes every line of text, table, handwritten note, or code block.',
    iconName: 'ScanText',
    promptInstruction: 'Transcribe all visible text from this image verbatim. Preserve layout, headings, bullet lists, math formulas, and code snippets exactly as shown. If portions are handwritten or low-contrast, transcribe them as faithfully as possible.'
  },
  {
    id: 'study',
    label: 'Study Notes & Definitions',
    description: 'Generates structured flashcard-style concepts, definitions, and mental models.',
    iconName: 'BookOpen',
    promptInstruction: 'Turn the content of this image into high-yield study notes. Include: 1) Core Concept Definitions, 2) Key Principles / Rules, 3) Important Formulas or Diagrams described in text, and 4) Quick self-test review questions.'
  },
  {
    id: 'action-items',
    label: 'Action Items & To-Dos',
    description: 'Converts whiteboard brainstorms, meeting slides, or sticky notes into tasks.',
    iconName: 'CheckSquare',
    promptInstruction: 'Inspect this image for tasks, decisions, follow-ups, and action items. Generate a prioritized checklist of actionable to-do items with checkboxes (- [ ] Task) and identify any deadlines or owners mentioned.'
  },
  {
    id: 'custom',
    label: 'Custom Instruction',
    description: 'Provide your own tailored prompt to extract or transform the image data.',
    iconName: 'Sparkles',
    promptInstruction: ''
  }
];

// Seed initial state so the workspace is immediately vibrant on first launch
export const INITIAL_NOTES: Note[] = [
  {
    id: 'note-welcome-1',
    title: 'Groq Nexus Workspace Overview',
    content: `# Welcome to Groq Nexus Workspace 🚀

A unified tri-workspace powered by **ultra-low-latency Groq LPUs**:

1. **LLM Playground**: High-speed multi-turn chat, parameter controls (Temperature, Top-P, System Prompts), and instant response-to-notepad archiving.
2. **Snap-to-Notes**: Multimodal image intelligence. Upload or paste screenshots, book pages, whiteboards, or receipts to generate structured notes with **Llama 4 Vision**.
3. **Smart Daily Scheduler**: Turn raw brain-dumps into synchronized time-blocked calendar entries and prioritized to-do tasks in seconds.

### Quick Shortcuts:
- Toggle **Notepad Drawer** at any time from the top right button (\`Ctrl/Cmd + N\`).
- Toggle **Calendar / To-Do Drawer** anytime (\`Ctrl/Cmd + C\`).
- Set your free Groq API key in the top right Settings gear.`,
    tags: ['welcome', 'guide', 'groq'],
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    source: 'manual',
    pinned: true
  },
  {
    id: 'note-architecture-2',
    title: 'Llama 4 Vision & Open Model Highlights',
    content: `## Recommended Groq Models for Nexus

| Model | Context | Best Used For |
|---|---|---|
| **meta-llama/llama-4-scout-17b-16e-instruct** | 128k | Multimodal Vision OCR, diagrams, handwritten notes |
| **openai/gpt-oss-120b** | 128k | Flagship open weights reasoning & code synthesis |
| **openai/gpt-oss-20b** | 128k | Ultra-fast open weights conversational throughput |
| **qwen/qwen3.8-27b** | 128k | High-density math, logic, and instruction following |
| **llama-3.3-70b-versatile** | 128k | Complex reasoning, deep scheduling, planning |
| **llama-3.1-8b-instant** | 128k | Sub-100ms rapid conversational loops |
| **deepseek-r1-distill-llama-70b** | 128k | Chain-of-thought mathematical & logical deduction |

> **Pro Tip**: You can directly click **"Save to Notepad"** on any response in the Playground to file it here!`,
    tags: ['models', 'specs', 'cheatsheet'],
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    source: 'playground'
  }
];

const todayStr = new Date().toISOString().split('T')[0];

export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'evt-1',
    date: todayStr,
    startTime: '09:00',
    endTime: '10:30',
    title: 'Deep Work: Core Architecture & State Sync',
    category: 'deep-work',
    color: '#10b981', // Emerald
    notes: 'Implement centralized state and verify instant localStorage persistence.',
    source: 'scheduler'
  },
  {
    id: 'evt-2',
    date: todayStr,
    startTime: '11:00',
    endTime: '12:00',
    title: 'Vision Model Benchmark & OCR Extraction Test',
    category: 'work',
    color: '#3b82f6', // Blue
    notes: 'Test Llama 4 Vision against whiteboard and document snapshots.',
    source: 'scheduler'
  },
  {
    id: 'evt-3',
    date: todayStr,
    startTime: '14:00',
    endTime: '15:15',
    title: 'Team Sync & Product Strategy Review',
    category: 'meeting',
    color: '#8b5cf6', // Violet
    notes: 'Walkthrough of LLM Playground ergonomics and To-Do sync features.',
    source: 'manual'
  },
  {
    id: 'evt-4',
    date: todayStr,
    startTime: '17:00',
    endTime: '18:00',
    title: 'Cardio & Strength Reset Session',
    category: 'health',
    color: '#f59e0b', // Amber
    notes: 'Zone 2 running + mobility drills.',
    source: 'scheduler'
  }
];

export const INITIAL_TODOS: TodoItem[] = [
  {
    id: 'todo-1',
    title: 'Configure Groq API Key in Settings modal',
    completed: false,
    priority: 'high',
    dueDate: todayStr,
    dueTime: '10:00',
    category: 'Setup',
    estimatedMinutes: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: 'todo-2',
    title: 'Test Snap-to-Notes with a whiteboard or screenshot image',
    completed: false,
    priority: 'medium',
    dueDate: todayStr,
    dueTime: '12:30',
    category: 'Testing',
    estimatedMinutes: 10,
    createdAt: new Date().toISOString()
  },
  {
    id: 'todo-3',
    title: 'Run AI Daily Schedule Generator with daily routine dump',
    completed: false,
    priority: 'high',
    dueDate: todayStr,
    dueTime: '15:00',
    category: 'Productivity',
    estimatedMinutes: 5,
    createdAt: new Date().toISOString()
  },
  {
    id: 'todo-4',
    title: 'Verify cross-workspace persistence across all tabs',
    completed: true,
    priority: 'low',
    dueDate: todayStr,
    category: 'Quality',
    estimatedMinutes: 5,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];
