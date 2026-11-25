import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Camera,
  CalendarDays,
  FileText,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Pencil,
  Check,
  X
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    user,
    signOut,
    updateProfileName,
    showToast,
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

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const pendingTodos = todoItems.filter(t => !t.completed).length;

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    (user?.user_metadata?.name as string | undefined)?.trim() ||
    user?.email?.split('@')[0] ||
    'User';
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) || '';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('') || 'U';

  const startEditingName = () => {
    setNameDraft(displayName);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === displayName) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    try {
      await updateProfileName(trimmed);
      showToast('Profile name updated', 'success');
      setIsEditingName(false);
    } catch {
      showToast('Failed to update profile name', 'error');
    } finally {
      setIsSavingName(false);
    }
  };

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
                  AIO
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

        {/* User Profile & Sign Out (when authenticated) */}
        {user && (
          <div className="mt-1 border-t border-theme-border pt-2">
            {isSidebarCollapsed ? (
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-theme-brand/15 text-theme-accent border border-theme-borderStrong text-xs font-semibold overflow-hidden hover:border-theme-accent transition-colors"
                  title={`${displayName} (${user.email || 'Account'})`}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex h-8 w-full items-center justify-center rounded-btn text-theme-secondary hover:text-rose-500 hover:bg-theme-surface/70 transition-colors"
                  title={`Sign out (${user.email || 'Account'})`}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-btn px-2 py-1.5 hover:bg-theme-surface/50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-theme-brand/15 text-theme-accent border border-theme-borderStrong text-xs font-semibold overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    {isEditingName ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={nameDraft}
                          onChange={e => setNameDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveName();
                            if (e.key === 'Escape') setIsEditingName(false);
                          }}
                          autoFocus
                          disabled={isSavingName}
                          className="w-full min-w-0 rounded border border-theme-accent bg-theme-surface px-1.5 py-0.5 text-xs text-theme-primary focus:outline-none"
                          placeholder="Your name"
                        />
                        <button
                          type="button"
                          onClick={handleSaveName}
                          disabled={isSavingName}
                          className="p-0.5 text-emerald-500 hover:text-emerald-400"
                          title="Save name"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingName(false)}
                          disabled={isSavingName}
                          className="p-0.5 text-theme-muted hover:text-theme-primary"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="group flex items-center gap-1 min-w-0">
                        <button
                          type="button"
                          onClick={startEditingName}
                          className="text-left text-xs font-medium text-theme-primary truncate hover:text-theme-accent transition-colors"
                          title="Click to edit profile name"
                        >
                          {displayName}
                        </button>
                        <button
                          type="button"
                          onClick={startEditingName}
                          className="opacity-0 group-hover:opacity-100 text-theme-muted hover:text-theme-accent transition-opacity shrink-0"
                          title="Edit profile name"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    <span
                      className="text-[10px] text-theme-muted font-mono truncate"
                      title={user.email || ''}
                    >
                      {user.email}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={signOut}
                  className="shrink-0 rounded-btn p-1.5 text-theme-secondary hover:text-rose-500 hover:bg-theme-surface transition-colors"
                  title={`Sign out (${user.email || 'Account'})`}
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
