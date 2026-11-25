import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  Note,
  CalendarEvent,
  TodoItem,
  ToastNotification,
  NoteSource
} from '../types';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type AppTheme = 'light' | 'dark';

interface AppContextType {
  // Auth
  user: User | null;
  authLoading: boolean;
  signOut: () => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;

  // Theme System
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;

  // Navigation & Drawers
  activeTab: 'playground' | 'snap-to-notes' | 'scheduler';
  setActiveTab: (tab: 'playground' | 'snap-to-notes' | 'scheduler') => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  isNotepadDrawerOpen: boolean;
  setIsNotepadDrawerOpen: (open: boolean) => void;
  isCalendarDrawerOpen: boolean;
  setIsCalendarDrawerOpen: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;

  // API Keys (Groq & Gemini)
  apiKey: string;
  setApiKey: (key: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  isConfigured: boolean;

  // Notes
  notes: Note[];
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  addNote: (data: {
    title: string;
    content: string;
    tags?: string[];
    source?: NoteSource;
    pinned?: boolean;
  }) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // Calendar
  calendarEvents: CalendarEvent[];
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => CalendarEvent;
  addMultipleEvents: (events: Array<Omit<CalendarEvent, 'id'>>) => void;
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  clearCalendarForDate: (date: string) => void;

  // To-Do
  todoItems: TodoItem[];
  addTodoItem: (todo: Omit<TodoItem, 'id' | 'createdAt'>) => TodoItem;
  addMultipleTodos: (items: Array<Omit<TodoItem, 'id' | 'createdAt'>>) => void;
  toggleTodoItem: (id: string) => void;
  updateTodoItem: (id: string, updates: Partial<TodoItem>) => void;
  deleteTodoItem: (id: string) => void;
  clearCompletedTodos: () => void;

  // Toasts
  toasts: ToastNotification[];
  showToast: (
    message: string,
    type?: 'success' | 'info' | 'warning' | 'error',
    action?: { label: string; onClick: () => void }
  ) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  THEME: 'groq_nexus_theme_v1',
  NOTES: 'groq_nexus_notes_v1',
  CALENDAR: 'groq_nexus_calendar_v1',
  TODOS: 'groq_nexus_todos_v1',
  API_KEY: 'groq_nexus_api_key',
  GEMINI_API_KEY: 'groq_nexus_gemini_api_key'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Supabase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  }, []);

  const updateProfileName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!supabase || !trimmed) return;
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: trimmed }
    });
    if (error) {
      throw error;
    }
    if (data.user) {
      setUser(data.user);
    }
  }, []);

  const getScopedKey = useCallback(
    (baseKey: string) => (user?.id ? `${baseKey}_${user.id}` : baseKey),
    [user?.id]
  );

  // Theme state: default to dark (Obsidian & Espresso) or saved preference / system
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const saved = loadFromStorage<AppTheme | null>(STORAGE_KEYS.THEME, null);
    if (saved === 'light' || saved === 'dark') return saved;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  const setTheme = useCallback((newTheme: AppTheme) => {
    setThemeState(newTheme);
    saveToStorage(STORAGE_KEYS.THEME, newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      saveToStorage(STORAGE_KEYS.THEME, next);
      return next;
    });
  }, []);

  // Sync class on documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  // Navigation
  const [activeTab, setActiveTab] = useState<'playground' | 'snap-to-notes' | 'scheduler'>('playground');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotepadDrawerOpen, setIsNotepadDrawerOpen] = useState(false);
  const [isCalendarDrawerOpen, setIsCalendarDrawerOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Groq API Key
  const [apiKey, setApiKeyState] = useState<string>(() => {
    const envKey =
      (import.meta as any).env?.VITE_GROQ_API_KEY ||
      (import.meta as any).env?.GROQ_API_KEY ||
      '';
    if (envKey) return envKey;
    if (typeof window !== 'undefined') {
      const fromLocal =
        localStorage.getItem('GROQ_API_KEY') ||
        localStorage.getItem('groq_nexus_api_key');
      if (fromLocal) return fromLocal.trim();
    }
    return loadFromStorage<string>(STORAGE_KEYS.API_KEY, '');
  });

  const setApiKey = useCallback((key: string) => {
    const clean = key.trim();
    setApiKeyState(clean);
    saveToStorage(STORAGE_KEYS.API_KEY, clean);
    if (typeof window !== 'undefined') {
      if (clean) {
        localStorage.setItem('GROQ_API_KEY', clean);
        localStorage.setItem('groq_nexus_api_key', clean);
      } else {
        localStorage.removeItem('GROQ_API_KEY');
        localStorage.removeItem('groq_nexus_api_key');
      }
    }
  }, []);

  const [geminiApiKey, setGeminiApiKeyState] = useState<string>(() => {
    return loadFromStorage<string>(STORAGE_KEYS.GEMINI_API_KEY, '');
  });

  const setGeminiApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    setGeminiApiKeyState(trimmed);
    if (typeof window !== 'undefined') {
      if (trimmed) {
        localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, trimmed);
      } else {
        localStorage.removeItem(STORAGE_KEYS.GEMINI_API_KEY);
      }
    }
  }, []);

  const isConfigured = apiKey.length > 5 || geminiApiKey.length > 5;

  // Notes (scoped per authenticated user)
  const [notes, setNotes] = useState<Note[]>(() =>
    loadFromStorage<Note[]>(STORAGE_KEYS.NOTES, [])
  );
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(notes[0]?.id || null);

  useEffect(() => {
    const loaded = loadFromStorage<Note[]>(getScopedKey(STORAGE_KEYS.NOTES), []);
    setNotes(loaded);
    setSelectedNoteId(loaded[0]?.id || null);
  }, [getScopedKey]);

  useEffect(() => {
    saveToStorage(getScopedKey(STORAGE_KEYS.NOTES), notes);
  }, [notes, getScopedKey]);

  const addNote = useCallback(
    ({
      title,
      content,
      tags = [],
      source = 'manual',
      pinned = false
    }: {
      title: string;
      content: string;
      tags?: string[];
      source?: NoteSource;
      pinned?: boolean;
    }) => {
      const now = new Date().toISOString();
      const newNote: Note = {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: title.trim() || 'Untitled Note',
        content,
        tags: tags.map(t => t.toLowerCase().trim()).filter(Boolean),
        createdAt: now,
        updatedAt: now,
        source,
        pinned
      };

      setNotes(prev => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
      return newNote;
    },
    []
  );

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes(prev =>
      prev.map(n =>
        n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
      )
    );
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const remaining = prev.filter(n => n.id !== id);
      setSelectedNoteId(currentSelected =>
        currentSelected === id ? (remaining[0]?.id ?? null) : currentSelected
      );
      return remaining;
    });
  }, []);

  // Calendar (scoped per authenticated user)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() =>
    loadFromStorage<CalendarEvent[]>(STORAGE_KEYS.CALENDAR, [])
  );

  useEffect(() => {
    setCalendarEvents(
      loadFromStorage<CalendarEvent[]>(getScopedKey(STORAGE_KEYS.CALENDAR), [])
    );
  }, [getScopedKey]);

  useEffect(() => {
    saveToStorage(getScopedKey(STORAGE_KEYS.CALENDAR), calendarEvents);
  }, [calendarEvents, getScopedKey]);

  const addCalendarEvent = useCallback((eventData: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    };
    setCalendarEvents(prev => [...prev, newEvent]);
    return newEvent;
  }, []);

  const addMultipleEvents = useCallback((events: Array<Omit<CalendarEvent, 'id'>>) => {
    const newEvents = events.map(e => ({
      ...e,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    }));
    setCalendarEvents(prev => [...prev, ...newEvents]);
  }, []);

  const updateCalendarEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => {
    setCalendarEvents(prev =>
      prev.map(e => (e.id === id ? { ...e, ...updates } : e))
    );
  }, []);

  const deleteCalendarEvent = useCallback((id: string) => {
    setCalendarEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const clearCalendarForDate = useCallback((date: string) => {
    setCalendarEvents(prev => prev.filter(e => e.date !== date));
  }, []);

  // To-Do (scoped per authenticated user)
  const [todoItems, setTodoItems] = useState<TodoItem[]>(() =>
    loadFromStorage<TodoItem[]>(STORAGE_KEYS.TODOS, [])
  );

  useEffect(() => {
    setTodoItems(loadFromStorage<TodoItem[]>(getScopedKey(STORAGE_KEYS.TODOS), []));
  }, [getScopedKey]);

  useEffect(() => {
    saveToStorage(getScopedKey(STORAGE_KEYS.TODOS), todoItems);
  }, [todoItems, getScopedKey]);

  const addTodoItem = useCallback((todoData: Omit<TodoItem, 'id' | 'createdAt'>) => {
    const newTodo: TodoItem = {
      ...todoData,
      id: `todo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    setTodoItems(prev => [newTodo, ...prev]);
    return newTodo;
  }, []);

  const addMultipleTodos = useCallback((items: Array<Omit<TodoItem, 'id' | 'createdAt'>>) => {
    const now = new Date().toISOString();
    const newTodos = items.map(item => ({
      ...item,
      id: `todo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now
    }));
    setTodoItems(prev => [...newTodos, ...prev]);
  }, []);

  const toggleTodoItem = useCallback((id: string) => {
    setTodoItems(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  const updateTodoItem = useCallback((id: string, updates: Partial<TodoItem>) => {
    setTodoItems(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const deleteTodoItem = useCallback((id: string) => {
    setTodoItems(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearCompletedTodos = useCallback(() => {
    setTodoItems(prev => prev.filter(t => !t.completed));
  }, []);

  // Toasts
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: 'success' | 'info' | 'warning' | 'error' = 'info',
      action?: { label: string; onClick: () => void }
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastNotification = {
        id,
        message,
        type,
        action,
        duration: 4000
      };

      setToasts(prev => [...prev.slice(-3), newToast]);

      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    },
    [removeToast]
  );

  // Global Keyboard Shortcuts (use Shift modifier so OS Copy Cmd+C and New Window Cmd+N still work)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNotepadDrawerOpen(prev => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setIsCalendarDrawerOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        signOut,
        updateProfileName,
        theme,
        setTheme,
        toggleTheme,
        activeTab,
        setActiveTab,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        isNotepadDrawerOpen,
        setIsNotepadDrawerOpen,
        isCalendarDrawerOpen,
        setIsCalendarDrawerOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        apiKey,
        setApiKey,
        geminiApiKey,
        setGeminiApiKey,
        isConfigured,
        notes,
        selectedNoteId,
        setSelectedNoteId,
        addNote,
        updateNote,
        deleteNote,
        calendarEvents,
        addCalendarEvent,
        addMultipleEvents,
        updateCalendarEvent,
        deleteCalendarEvent,
        clearCalendarForDate,
        todoItems,
        addTodoItem,
        addMultipleTodos,
        toggleTodoItem,
        updateTodoItem,
        deleteTodoItem,
        clearCompletedTodos,
        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
