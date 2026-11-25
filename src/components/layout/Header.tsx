import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  CheckSquare,
  Settings,
  Sun,
  Moon,
  Sparkles,
  Camera,
  CalendarDays
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isNotepadDrawerOpen,
    setIsNotepadDrawerOpen,
    isCalendarDrawerOpen,
    setIsCalendarDrawerOpen,
    setIsSettingsModalOpen,
    theme,
    setTheme,
    notes,
    todoItems
  } = useApp();

  const pendingTodos = todoItems.filter(t => !t.completed).length;

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-theme-border bg-theme-main/95 px-6 backdrop-blur-md transition-colors duration-180 select-none">
      {/* Left side is kept ultra-clean (no redundant sub-headers) */}
      <div className="flex items-center gap-2">
        {/* Mobile quick switcher for very small screens */}
        <div className="flex md:hidden items-center rounded-btn bg-theme-sidebar p-1 border border-theme-border">
          <button
            type="button"
            onClick={() => setActiveTab('playground')}
            className={`p-1 rounded-md ${activeTab === 'playground' ? 'bg-theme-surface text-theme-primary shadow-warm-sm' : 'text-theme-muted'}`}
            title="Playground"
          >
            <Sparkles className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('snap-to-notes')}
            className={`p-1 rounded-md ${activeTab === 'snap-to-notes' ? 'bg-theme-surface text-theme-primary shadow-warm-sm' : 'text-theme-muted'}`}
            title="Snap-to-Notes"
          >
            <Camera className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scheduler')}
            className={`p-1 rounded-md ${activeTab === 'scheduler' ? 'bg-theme-surface text-theme-primary shadow-warm-sm' : 'text-theme-muted'}`}
            title="Scheduler"
          >
            <CalendarDays className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Right-Aligned Controls Row */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        {/* 1. Notepad Pill Button */}
        <button
          type="button"
          onClick={() => setIsNotepadDrawerOpen(!isNotepadDrawerOpen)}
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-all duration-160 shadow-warm-sm ${
            isNotepadDrawerOpen
              ? 'bg-theme-accentLight text-theme-accent border border-theme-borderStrong font-semibold'
              : 'border border-theme-border bg-theme-surface text-theme-secondary hover:text-theme-primary hover:border-theme-borderStrong'
          }`}
          title="Shared Notepad (⌘⇧N)"
        >
          <FileText className="h-3.5 w-3.5 text-theme-accent" />
          <span className="hidden sm:inline">Notepad</span>
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-theme-sidebar px-1 text-[10px] font-mono text-theme-secondary border border-theme-border">
            {notes.length}
          </span>
        </button>

        {/* 2. Calendar Pill Button */}
        <button
          type="button"
          onClick={() => setIsCalendarDrawerOpen(!isCalendarDrawerOpen)}
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-all duration-160 shadow-warm-sm ${
            isCalendarDrawerOpen
              ? 'bg-theme-accentLight text-theme-accent border border-theme-borderStrong font-semibold'
              : 'border border-theme-border bg-theme-surface text-theme-secondary hover:text-theme-primary hover:border-theme-borderStrong'
          }`}
          title="Calendar & Tasks (⌘⇧C)"
        >
          <CheckSquare className="h-3.5 w-3.5 text-theme-accent" />
          <span className="hidden sm:inline">Calendar</span>
          {pendingTodos > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-theme-accent/20 px-1 text-[10px] font-mono text-theme-accent font-semibold border border-theme-accent/30">
              {pendingTodos}
            </span>
          )}
        </button>

        {/* 3. Segmented Light | Dark Theme Toggle Switch */}
        <div className="flex items-center rounded-full bg-theme-surface p-0.5 border border-theme-border shadow-warm-sm">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-160 ${
              theme === 'light'
                ? 'bg-theme-brand text-theme-surface font-semibold shadow-warm-sm'
                : 'text-theme-muted hover:text-theme-primary'
            }`}
            title="Ivory Mode (Light)"
          >
            <Sun className="h-3 w-3" />
            <span className="hidden sm:inline">Light</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-160 ${
              theme === 'dark'
                ? 'bg-theme-brand text-theme-surface font-semibold shadow-warm-sm'
                : 'text-theme-muted hover:text-theme-primary'
            }`}
            title="Obsidian Mode (Dark)"
          >
            <Moon className="h-3 w-3" />
            <span className="hidden sm:inline">Dark</span>
          </button>
        </div>

        {/* 4. Settings / Profile Icon Button */}
        <button
          type="button"
          onClick={() => setIsSettingsModalOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-theme-border bg-theme-surface text-theme-secondary hover:text-theme-primary hover:border-theme-borderStrong transition-all duration-160 shadow-warm-sm"
          title="Engine Credentials & Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
};
