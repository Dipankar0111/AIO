export type NoteSource = 'playground' | 'snap-to-notes' | 'scheduler' | 'manual';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  source: NoteSource;
  pinned?: boolean;
}

export type EventCategory = 'work' | 'study' | 'health' | 'routine' | 'meeting' | 'deep-work' | 'other';

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  title: string;
  category: EventCategory;
  color: string; // e.g. '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'
  notes?: string;
  source: 'scheduler' | 'manual' | 'playground';
}

export type TodoPriority = 'low' | 'medium' | 'high';

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority: TodoPriority;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  linkedNoteId?: string;
  category?: string;
  estimatedMinutes?: number;
  createdAt: string;
}

export interface GroqModelConfig {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  isVision?: boolean;
  badge?: string;
  speedRating: 'ultra-fast' | 'fast' | 'balanced';
  provider?: 'groq' | 'gemini';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  pinned?: boolean;
  metrics?: {
    latencyMs: number;
    completionTokens?: number;
    promptTokens?: number;
    totalTokens?: number;
    tokensPerSecond?: number;
  };
  detectedActions?: {
    type: 'save_note' | 'add_event' | 'add_todo';
    label: string;
    payload: any;
    executed?: boolean;
  }[];
}

export type ExtractionMode = 'summary' | 'verbatim' | 'study' | 'action-items' | 'custom';

export interface ExtractionPreset {
  id: ExtractionMode;
  label: string;
  description: string;
  iconName: string;
  promptInstruction: string;
}

export interface DailyScheduleAIResponse {
  schedule: Array<{
    startTime: string;
    endTime: string;
    title: string;
    category: EventCategory;
    notes?: string;
    color?: string;
  }>;
  todos: Array<{
    title: string;
    priority: TodoPriority;
    estimatedMinutes?: number;
  }>;
  dailySummaryNote: {
    title: string;
    content: string;
    tags: string[];
  };
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}
