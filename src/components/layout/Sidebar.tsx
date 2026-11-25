import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Camera,
  CalendarDays,
  FileText,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isNotepadDrawerOpen,
    setIsNotepadDrawerOpen,
    isCalendarDrawerOpen,
    setIsCalendarDrawerOpen,
    setIsSettingsModalOpen,
    notes,
    todoItems,
    isConfigured
  } = useApp();

  const pendingTodos = todoItems.filter(t => !t.completed).length;

  return (
    <aside
      className={`hidden md:flex relative z-30 h-full shrink-0 flex-col justify-between border-r border-theme-border bg-theme-sidebar py-3 select-none transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'w-[64px]' : 'w-[240px]'
      }`}
    >
      {/* Small circular collapse/expand toggle button overlapping the right border */}
      <button
        type="button"
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="absolute -right-3 top-5 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-theme-borderStrong bg-theme-surface text-theme-secondary hover:text-theme-primary hover:border-theme-accent hover:scale-105 transition-all duration-160 shadow-warm-sm"
        title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Top Section: Brand Header & Navigation */}
      <div className="flex flex-col gap-4">
        {/* Brand Header */}
        <div
          onClick={() => isSidebarCollapsed && setIsSidebarCollapsed(false)}
          className={`flex h-12 items-center px-3 cursor-pointer ${
            isSidebarCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-theme-brand text-theme-surface shadow-warm-sm transition-transform duration-160 hover:scale-105">
              <span className="font-editorial text-xs italic font-bold tracking-tight">AIO</span>
            </div>

            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <span className="font-editorial text-sm font-bold tracking-tight text-theme-primary truncate">
                  AIO Studio
                </span>
                <span className="text-[10px] text-theme-muted tracking-wide font-mono truncate">
                  AI Chat · Notes · To-Do
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Workspaces Primary Navigation */}
        <nav className="flex flex-col gap-1 px-2.5">
          {/* LLM Playground */}
          <button
            type="button"
            onClick={() => setActiveTab('playground')}
            className={`flex items-center rounded-btn py-2 text-xs font-medium transition-all duration-160 ${
              isSidebarCollapsed
                ? 'justify-center h-10 w-full'
                : 'gap-3 px-3 w-full'
            } ${
              activeTab === 'playground'
                ? 'bg-theme-surface text-theme-primary shadow-warm-sm border border-theme-borderStrong font-semibold'
                : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-surface/70'
            }`}
            title="LLM Playground"
          >
            <Sparkles
              className={`h-4 w-4 shrink-0 ${
                activeTab === 'playground' ? 'text-theme-accent' : 'text-theme-muted'
              }`}
            />
            {!isSidebarCollapsed && (
              <span className="truncate whitespace-nowrap">LLM Playground</span>
            )}
          </button>

          {/* Snap-to-Notes */}
          <button
            type="button"
            onClick={() => setActiveTab('snap-to-notes')}
            className={`flex items-center rounded-btn py-2 text-xs font-medium transition-all duration-160 ${
              isSidebarCollapsed
                ? 'justify-center h-10 w-full'
                : 'gap-3 px-3 w-full'
            } ${
              activeTab === 'snap-to-notes'
                ? 'bg-theme-surface text-theme-primary shadow-warm-sm border border-theme-borderStrong'
                : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-surface/70'
            }`}
            title="Snap-to-Notes"
          >
            <Camera
              className={`h-4 w-4 shrink-0 ${
                activeTab === 'snap-to-notes' ? 'text-theme-accent' : 'text-theme-muted'
              }`}
            />
            {!isSidebarCollapsed && (
              <span className="truncate whitespace-nowrap">Snap-to-Notes</span>
            )}
          </button>

          {/* Daily Scheduler */}
          <button
            type="button"
            onClick={() => setActiveTab('scheduler')}
            className={`flex items-center rounded-btn py-2 text-xs font-medium transition-all duration-160 ${
              isSidebarCollapsed
                ? 'justify-center h-10 w-full'
                : 'gap-3 px-3 w-full'
            } ${
              activeTab === 'scheduler'
                ? 'bg-theme-surface text-theme-primary shadow-warm-sm border border-theme-borderStrong'
                : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-surface/70'
            }`}
            title="Daily Scheduler"
          >
            <CalendarDays
              className={`h-4 w-4 shrink-0 ${
                activeTab === 'scheduler' ? 'text-theme-accent' : 'text-theme-muted'
              }`}
            />
            {!isSidebarCollapsed && (
              <span className="truncate whitespace-nowrap">Daily Scheduler</span>
            )}
          </button>

          {/* Divider */}
          <div className="my-2 h-[1px] w-full bg-[#D6D1C7] dark:bg-theme-border/70" />

          {/* Shared Workspace Shortcuts */}
          {/* Notepad */}
          <button
            type="button"
            onClick={() => setIsNotepadDrawerOpen(!isNotepadDrawerOpen)}
            className={`relative flex items-center rounded-btn py-2 text-xs font-medium transition-all duration-160 ${
              isSidebarCollapsed
                ? 'justify-center h-10 w-full'
                : 'justify-between px-3 w-full'
            } ${
              isNotepadDrawerOpen
                ? 'bg-theme-accentLight text-theme-primary border border-theme-borderStrong'
                : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-surface/70'
            }`}
            title="Shared Notepad (⌘⇧N)"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-4 w-4 shrink-0 text-theme-accent" />
              {!isSidebarCollapsed && (
                <span className="truncate whitespace-nowrap">Notepad</span>
              )}
            </div>

            {notes.length > 0 && (
              isSidebarCollapsed ? (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-theme-surface px-1 text-[9px] font-mono text-theme-accent font-semibold border border-theme-borderStrong shadow-warm-sm">
                  {notes.length}
                </span>
              ) : (
                <span className="rounded-full bg-theme-surface px-2 py-0.5 text-[10px] font-mono text-theme-secondary border border-theme-border">
                  {notes.length}
                </span>
              )
            )}
          </button>

          {/* Calendar & Tasks */}
          <button
            type="button"
            onClick={() => setIsCalendarDrawerOpen(!isCalendarDrawerOpen)}
            className={`relative flex items-center rounded-btn py-2 text-xs font-medium transition-all duration-160 ${
              isSidebarCollapsed
                ? 'justify-center h-10 w-full'
                : 'justify-between px-3 w-full'
            } ${
              isCalendarDrawerOpen
                ? 'bg-theme-accentLight text-theme-primary border border-theme-borderStrong'
                : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-surface/70'
            }`}
            title="Calendar & Tasks (⌘⇧C)"
          >
            <div className="flex items-center gap-3 min-w-0">
              <CheckSquare className="h-4 w-4 shrink-0 text-theme-accent" />
              {!isSidebarCollapsed && (
                <span className="truncate whitespace-nowrap">Calendar &amp; Tasks</span>
              )}
            </div>

            {pendingTodos > 0 && (
              isSidebarCollapsed ? (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-theme-accent/20 px-1 text-[9px] font-mono text-theme-accent font-semibold border border-theme-accent/30 shadow-warm-sm">
                  {pendingTodos}
                </span>
              ) : (
                <span className="rounded-full bg-theme-accent/20 px-2 py-0.5 text-[10px] font-mono text-theme-accent font-semibold border border-theme-accent/30">
                  {pendingTodos}
                </span>
              )
            )}
          </button>
        </nav>
      </div>

      {/* Bottom Section: Engine Status & Settings */}
      <div className="flex flex-col gap-1.5 px-2.5">
        {/* Engine Status */}
        <button
          type="button"
          onClick={() => setIsSettingsModalOpen(true)}
          className={`flex items-center rounded-btn py-2 text-xs transition-colors ${
            isSidebarCollapsed
              ? 'justify-center h-10 w-full'
              : 'gap-3 px-3 w-full text-left'
          } ${
            isConfigured
              ? 'text-theme-secondary hover:text-theme-primary hover:bg-theme-surface/70'
              : 'text-theme-accent hover:bg-theme-surface/70'
          }`}
          title={isConfigured ? 'Groq LPU Active (Sub-second inference)' : 'Demo Mode (Click to configure API key)'}
        >
          <div className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isConfigured ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-theme-accent'
              }`}
            />
          </div>

          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">
                {isConfigured ? 'Groq LPU Active' : 'Demo Mode (Mock)'}
              </span>
              <span className="text-[10px] text-theme-muted font-mono truncate">
                {isConfigured ? 'Sub-second inference' : 'API key needed'}
              </span>
            </div>
          )}
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={() => setIsSettingsModalOpen(true)}
          className={`flex items-center rounded-btn py-2 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-surface/70 transition-colors ${
            isSidebarCollapsed
              ? 'justify-center h-10 w-full'
              : 'gap-3 px-3 w-full'
          }`}
          title="Workspace Settings"
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!isSidebarCollapsed && (
            <span className="truncate whitespace-nowrap">Settings</span>
          )}
        </button>
      </div>
    </aside>
  );
};
