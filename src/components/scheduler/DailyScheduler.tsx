import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { generateScheduleWithGroq, fetchGroqModels } from '../../services/groq';
import { GROQ_MODELS } from '../../utils/constants';
import { GroqModelConfig } from '../../types';
import { triggerConfetti, triggerScheduleSyncConfetti } from '../../utils/confetti';
import { TimelineGrid } from './TimelineGrid';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import {
  Calendar,
  Sparkles,
  CheckSquare,
  FileText,
  Plus,
  Trash2,
  RefreshCw,
  ArrowRight,
  ListTodo,
  ChevronDown
} from 'lucide-react';
import { EventCategory, TodoPriority } from '../../types';

export const DailyScheduler: React.FC = () => {
  const {
    apiKey,
    calendarEvents,
    addMultipleEvents,
    deleteCalendarEvent,
    clearCalendarForDate,
    todoItems,
    addMultipleTodos,
    toggleTodoItem,
    deleteTodoItem,
    clearCompletedTodos,
    addNote,
    showToast,
    setIsNotepadDrawerOpen,
    setIsCalendarDrawerOpen
  } = useApp();

  // Inputs
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepTime, setSleepTime] = useState('22:30');
  const [rawBrainDump, setRawBrainDump] = useState('');
  const [inputTasks, setInputTasks] = useState<Array<{ id: string; title: string; priority: TodoPriority; duration: number }>>([
    { id: '1', title: 'Deep Work: Core architectural synthesis', priority: 'high', duration: 90 },
    { id: '2', title: 'Executive Alignment & Sync', priority: 'medium', duration: 45 },
    { id: '3', title: 'Physical Movement & Cardio Reset', priority: 'medium', duration: 60 }
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TodoPriority>('medium');
  const [newTaskDuration, setNewTaskDuration] = useState(30);

  // Sync checkboxes
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const [syncToTodos, setSyncToTodos] = useState(true);
  const [syncToNotepad, setSyncToNotepad] = useState(true);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlueprint, setGeneratedBlueprint] = useState<string>('');
  const [activeRightTab, setActiveRightTab] = useState<'timeline' | 'todos' | 'blueprint'>('timeline');

  // AI Model Selection
  const [availableModels, setAvailableModels] = useState<GroqModelConfig[]>(GROQ_MODELS);
  const [selectedModel, setSelectedModel] = useState<string>('llama-3.3-70b-versatile');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (apiKey && apiKey.trim()) {
      fetchGroqModels(apiKey).then(models => {
        if (models && models.length > 0) {
          setAvailableModels(models);
        }
      });
    }
  }, [apiKey]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentModelConfig = availableModels.find(m => m.id === selectedModel) || GROQ_MODELS.find(m => m.id === selectedModel);
  const modelDisplayName = currentModelConfig
    ? `${currentModelConfig.name}${currentModelConfig.badge ? ` · ${currentModelConfig.badge}` : ''}`
    : selectedModel;

  // Manual block modal/form
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualStart, setManualStart] = useState('11:00');
  const [manualEnd, setManualEnd] = useState('12:00');
  const [manualCategory, setManualCategory] = useState<EventCategory>('work');

  // Filter events for the target date
  const eventsForTargetDate = calendarEvents.filter(e => e.date === targetDate);

  // Templates
  const applyTemplate = (type: 'engineer' | 'executive' | 'study') => {
    if (type === 'engineer') {
      setWakeTime('07:00');
      setSleepTime('23:00');
      setRawBrainDump(`Goal: Ship the real-time state synchronization pipeline.
Constraints: Avoid early morning meetings. Team standup is at 11:30 AM. Need 2 hours of uninterrupted deep work before lunch. Evening training session at 5:30 PM.`);
      setInputTasks([
        { id: 't1', title: 'Implement WebSocket client heartbeat', priority: 'high', duration: 90 },
        { id: 't2', title: 'Attend 11:30 AM Standup Sync', priority: 'medium', duration: 30 },
        { id: 't3', title: 'Write integration test suite', priority: 'high', duration: 60 },
        { id: 't4', title: 'Review pull requests from design team', priority: 'low', duration: 30 }
      ]);
      showToast('Loaded "Engineering Sprint" template', 'info');
    } else if (type === 'executive') {
      setWakeTime('06:30');
      setSleepTime('22:00');
      setRawBrainDump(`Goal: Strategic roadmap alignment & quarterly partner review.
Constraints: 1:1 meetings with 3 department heads in the morning. Afternoon board presentation prep. Need 45-minute midday walk to clear head.`);
      setInputTasks([
        { id: 't1', title: 'Quarterly roadmap strategic deck', priority: 'high', duration: 60 },
        { id: 't2', title: '1:1 Executive Lead Syncs', priority: 'high', duration: 90 },
        { id: 't3', title: 'Inbox zero and contract approvals', priority: 'medium', duration: 45 }
      ]);
      showToast('Loaded "Executive Lead" template', 'info');
    } else {
      setWakeTime('07:30');
      setSleepTime('23:30');
      setRawBrainDump(`Goal: Deep research paper synthesis and academic lecture notes.
Constraints: 3 hours dedicated to reading and Feynman flashcards. Review distributed systems chapter. Take breaks every 50 minutes.`);
      setInputTasks([
        { id: 't1', title: 'Read Chapter 4: Consensus Protocols', priority: 'high', duration: 75 },
        { id: 't2', title: 'Draft Feynman study notes in Notepad', priority: 'high', duration: 45 },
        { id: 't3', title: 'Complete practice review problems', priority: 'medium', duration: 60 }
      ]);
      showToast('Loaded "Deep Research" template', 'info');
    }
  };

  const handleAddTaskInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setInputTasks(prev => [
      ...prev,
      {
        id: `inp-${Date.now()}`,
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        duration: newTaskDuration || 30
      }
    ]);

    setNewTaskTitle('');
  };

  const handleRemoveTaskInput = (id: string) => {
    setInputTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleGenerateSchedule = async () => {
    setIsGenerating(true);

    try {
      const response = await generateScheduleWithGroq({
        apiKey,
        date: targetDate,
        wakeTime,
        sleepTime,
        rawDetails: rawBrainDump,
        todos: inputTasks.map(t => ({ title: t.title, priority: t.priority, duration: t.duration })),
        model: selectedModel
      });

      // 1. Sync Time Blocks to Calendar
      if (syncToCalendar && response.schedule.length > 0) {
        clearCalendarForDate(targetDate);
        addMultipleEvents(
          response.schedule.map(s => ({
            date: targetDate,
            startTime: s.startTime,
            endTime: s.endTime,
            title: s.title,
            category: s.category || 'work',
            color: s.color || '#B18B68',
            notes: s.notes || '',
            source: 'scheduler'
          }))
        );
      }

      // 2. Sync Tasks to To-Do List
      if (syncToTodos && response.todos.length > 0) {
        addMultipleTodos(
          response.todos.map(t => ({
            title: t.title,
            priority: t.priority,
            completed: false,
            dueDate: targetDate,
            estimatedMinutes: t.estimatedMinutes
          }))
        );
      }

      // 3. Sync Daily Blueprint to Notepad
      if (syncToNotepad && response.dailySummaryNote) {
        addNote({
          title: response.dailySummaryNote.title || `Daily Blueprint (${targetDate})`,
          content: response.dailySummaryNote.content,
          tags: response.dailySummaryNote.tags || ['schedule', 'blueprint'],
          source: 'scheduler'
        });
      }

      setGeneratedBlueprint(response.dailySummaryNote?.content || '');
      setActiveRightTab('timeline');
      triggerScheduleSyncConfetti();

      showToast(
        `Synchronized ${response.schedule.length} calendar blocks & ${response.todos.length} tasks!`,
        'success'
      );
    } catch (err: any) {
      console.error('Schedule generation failed:', err);
      showToast(err.message || 'Failed to generate schedule with AI', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;
    if (manualEnd <= manualStart) {
      showToast('End time must be after start time', 'warning');
      return;
    }

    addMultipleEvents([
      {
        date: targetDate,
        startTime: manualStart,
        endTime: manualEnd,
        title: manualTitle.trim(),
        category: manualCategory,
        color:
          manualCategory === 'deep-work'
            ? '#B18B68'
            : manualCategory === 'meeting'
            ? '#625044'
            : manualCategory === 'health'
            ? '#A67C52'
            : '#81766A',
        source: 'manual'
      }
    ]);

    setManualTitle('');
    setShowAddBlockModal(false);
    showToast('Time block added', 'success');
  };

  const handleToggleTodoItem = (id: string, currentlyCompleted: boolean) => {
    toggleTodoItem(id);
    if (!currentlyCompleted) {
      triggerConfetti();
      showToast('Task accomplished!', 'success');
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8.5rem)] w-full space-y-6">
      {/* Editorial Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-theme-border bg-theme-surface p-5 shadow-warm-sm transition-colors duration-180">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-editorial text-xl sm:text-2xl font-bold tracking-tight text-theme-primary">
              Daily Harmonizer &amp; Time-Blocking
            </h2>
            <span className="rounded-btn bg-theme-accentLight px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-theme-accent font-semibold border border-theme-borderStrong">
              Groq LPU
            </span>
          </div>
          <p className="text-[13px] text-theme-secondary leading-relaxed">
            Turn priorities and constraints into a balanced daily blueprint synced across your calendar, tasks, and notepad.
          </p>
        </div>

        {/* Templates */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-theme-muted hidden sm:inline">Presets:</span>
          <button
            type="button"
            onClick={() => applyTemplate('engineer')}
            className="rounded-btn border border-theme-border bg-theme-elevated px-3 py-1.5 text-xs font-semibold text-theme-secondary hover:text-theme-primary hover:border-theme-borderStrong transition-all shadow-warm-sm"
          >
            Engineering Sprint
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('executive')}
            className="rounded-btn border border-theme-border bg-theme-elevated px-3 py-1.5 text-xs font-semibold text-theme-secondary hover:text-theme-primary hover:border-theme-borderStrong transition-all shadow-warm-sm"
          >
            Executive Lead
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('study')}
            className="rounded-btn border border-theme-border bg-theme-elevated px-3 py-1.5 text-xs font-semibold text-theme-secondary hover:text-theme-primary hover:border-theme-borderStrong transition-all shadow-warm-sm"
          >
            Deep Research
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Clean, Modular Configuration Cards */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Card 1: Focus Window & Daily Directives */}
          <div className="rounded-card border border-theme-border bg-theme-surface p-5 space-y-4 shadow-warm-sm">
            <div className="space-y-3">
              <h3 className="font-editorial text-sm font-bold text-theme-primary">
                Target Date &amp; Focus Window
              </h3>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-theme-muted block mb-1">Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full rounded-btn border border-theme-border bg-theme-elevated px-2.5 py-2 text-xs font-medium text-theme-primary focus:border-theme-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-theme-muted block mb-1">Wake</label>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={e => setWakeTime(e.target.value)}
                    className="w-full rounded-btn border border-theme-border bg-theme-elevated px-2.5 py-2 text-xs font-medium text-theme-primary focus:border-theme-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-theme-muted block mb-1">Shutdown</label>
                  <input
                    type="time"
                    value={sleepTime}
                    onChange={e => setSleepTime(e.target.value)}
                    className="w-full rounded-btn border border-theme-border bg-theme-elevated px-2.5 py-2 text-xs font-medium text-theme-primary focus:border-theme-accent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-theme-border space-y-2">
              <h3 className="font-editorial text-sm font-bold text-theme-primary">
                Daily Directives &amp; Context
              </h3>
              <textarea
                value={rawBrainDump}
                onChange={e => setRawBrainDump(e.target.value)}
                placeholder="Describe your schedule constraints, fixed meetings, or focus goals..."
                rows={4}
                className="w-full rounded-input border border-theme-border bg-theme-elevated p-3 text-[13px] leading-relaxed text-theme-primary placeholder:text-theme-muted focus:border-theme-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Card 2: Target Objectives */}
          <div className="rounded-card border border-theme-border bg-theme-surface p-5 space-y-3.5 shadow-warm-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-editorial text-sm font-bold text-theme-primary">
                Target Objectives
              </h3>
              <span className="rounded-full bg-theme-elevated px-2.5 py-0.5 text-[11px] font-mono font-semibold text-theme-accent border border-theme-border">
                {inputTasks.length}
              </span>
            </div>

            <form onSubmit={handleAddTaskInput} className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Add a task..."
                className="flex-1 min-w-0 rounded-btn border border-theme-border bg-theme-elevated px-3 py-2 text-xs font-medium text-theme-primary placeholder:text-theme-muted focus:border-theme-accent focus:outline-none"
              />
              <select
                value={newTaskPriority}
                onChange={e => setNewTaskPriority(e.target.value as TodoPriority)}
                className="rounded-btn border border-theme-border bg-theme-elevated px-2 py-2 text-xs font-semibold text-theme-secondary font-mono"
              >
                <option value="high">High</option>
                <option value="medium">Med</option>
                <option value="low">Low</option>
              </select>
              <input
                type="number"
                min="5"
                max="240"
                step="15"
                value={newTaskDuration}
                onChange={e => setNewTaskDuration(parseInt(e.target.value, 10) || 30)}
                className="w-16 rounded-btn border border-theme-border bg-theme-elevated px-2 py-2 text-xs font-semibold text-theme-primary font-mono text-center"
                title="Duration in minutes"
              />
              <button
                type="submit"
                className="rounded-btn bg-theme-brand px-3 py-2 text-theme-surface hover:bg-theme-brandHover transition-colors shadow-warm-sm"
                title="Add Objective"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </button>
            </form>

            {inputTasks.length > 0 && (
              <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                {inputTasks.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-btn border border-theme-border bg-theme-elevated px-3 py-2 text-xs text-theme-primary"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono uppercase font-bold border ${
                          t.priority === 'high'
                            ? 'bg-theme-accentLight text-theme-accent border-theme-borderStrong'
                            : 'bg-theme-sidebar text-theme-secondary border-theme-border'
                        }`}
                      >
                        {t.priority}
                      </span>
                      <span className="truncate font-medium text-[13px]">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[11px] text-theme-muted font-mono font-medium">
                        {t.duration}m
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTaskInput(t.id)}
                        className="text-theme-muted hover:text-rose-500 p-0.5 transition-colors"
                        title="Remove objective"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: AI Engine, Sync & Generate */}
          <div className="rounded-card border border-theme-border bg-theme-surface p-5 space-y-4 shadow-warm-sm">
            {/* Clean Two-Way Sync Pills */}
            <div className="space-y-2">
              <h3 className="font-editorial text-sm font-bold text-theme-primary">
                Sync Destinations
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSyncToCalendar(!syncToCalendar)}
                  className={`flex items-center justify-center gap-1.5 rounded-btn border px-2.5 py-2 text-xs font-semibold transition-all ${
                    syncToCalendar
                      ? 'border-theme-accent bg-theme-accentLight text-theme-primary'
                      : 'border-theme-border bg-theme-elevated text-theme-muted hover:text-theme-primary'
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 text-theme-accent" />
                  <span>Calendar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSyncToTodos(!syncToTodos)}
                  className={`flex items-center justify-center gap-1.5 rounded-btn border px-2.5 py-2 text-xs font-semibold transition-all ${
                    syncToTodos
                      ? 'border-theme-accent bg-theme-accentLight text-theme-primary'
                      : 'border-theme-border bg-theme-elevated text-theme-muted hover:text-theme-primary'
                  }`}
                >
                  <CheckSquare className="h-3.5 w-3.5 text-theme-accent" />
                  <span>To-Dos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSyncToNotepad(!syncToNotepad)}
                  className={`flex items-center justify-center gap-1.5 rounded-btn border px-2.5 py-2 text-xs font-semibold transition-all ${
                    syncToNotepad
                      ? 'border-theme-accent bg-theme-accentLight text-theme-primary'
                      : 'border-theme-border bg-theme-elevated text-theme-muted hover:text-theme-primary'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 text-theme-accent" />
                  <span>Notepad</span>
                </button>
              </div>
            </div>

            {/* AI Model Selector Row (non-wrapping label) */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-theme-border">
              <span className="font-editorial text-sm font-bold text-theme-primary whitespace-nowrap">
                AI Engine
              </span>
              <div className="relative" ref={modelDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#B8976C] dark:border-[#B29672] bg-theme-surface hover:bg-stone-500/10 dark:hover:bg-stone-800/40 px-3.5 py-1.5 text-xs text-stone-900 dark:text-[#FAF8F5] hover:border-theme-accent dark:hover:border-[#E5C158] transition-all duration-160 shadow-warm-sm group"
                >
                  <span className="font-sans font-medium text-stone-900 dark:text-[#FAF8F5] whitespace-nowrap">
                    {modelDisplayName}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-stone-600 dark:text-[#C4A482] group-hover:text-stone-900 dark:group-hover:text-white transition-transform duration-160 ${
                      isModelDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isModelDropdownOpen && (
                  <div className="absolute right-0 bottom-full mb-2 w-80 rounded-card border border-[#C8C2B6] dark:border-theme-borderStrong bg-theme-surface p-2 shadow-warm-lg z-50 animate-slide-up">
                    <div className="px-3 py-1.5 border-b border-theme-border mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted font-semibold">
                        Select Groq Model
                      </span>
                      <span className="text-[9px] font-mono text-theme-accent font-semibold">LPU Fast</span>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {availableModels.filter(m => !m.isVision).map(m => {
                        const isSelected = selectedModel === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(m.id);
                              setIsModelDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-btn px-2.5 py-2 text-left text-xs transition-colors ${
                              isSelected
                                ? 'bg-theme-accentLight text-theme-primary border border-theme-borderStrong font-semibold'
                                : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
                            }`}
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="truncate text-xs font-medium">
                                {m.name}
                                {m.badge ? ` · ${m.badge}` : ''}
                              </span>
                              <span className="text-[10px] text-theme-muted truncate">
                                {m.description}
                              </span>
                            </div>
                            {m.badge && (
                              <span className="shrink-0 rounded-full bg-theme-sidebar px-2 py-0.5 text-[9px] font-mono text-theme-accent border border-theme-border font-medium">
                                {m.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="button"
              onClick={handleGenerateSchedule}
              disabled={isGenerating}
              className="w-full flex h-11 items-center justify-center gap-2 rounded-btn bg-theme-brand text-[13px] font-bold text-theme-surface hover:bg-theme-brandHover disabled:opacity-40 transition-all duration-160 shadow-warm-sm"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-theme-accent" />
                  <span>Synthesizing Schedule on Groq LPU...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-theme-accent" />
                  <span>Generate &amp; Sync Schedule with AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column (7 cols): Timeline & Interactive List */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Sub-Tabs Switcher */}
          <div className="flex items-center justify-between rounded-card border border-theme-border bg-theme-surface p-2 shadow-warm-sm">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveRightTab('timeline')}
                className={`flex items-center gap-2 rounded-btn px-3 py-1.5 text-xs font-medium transition-all duration-160 ${
                  activeRightTab === 'timeline'
                    ? 'bg-theme-brand text-theme-surface font-semibold shadow-warm-sm'
                    : 'text-theme-secondary hover:text-theme-primary'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Timeline ({eventsForTargetDate.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRightTab('todos')}
                className={`flex items-center gap-2 rounded-btn px-3 py-1.5 text-xs font-medium transition-all duration-160 ${
                  activeRightTab === 'todos'
                    ? 'bg-theme-brand text-theme-surface font-semibold shadow-warm-sm'
                    : 'text-theme-secondary hover:text-theme-primary'
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>To-Do Checklist ({todoItems.length})</span>
              </button>

              {generatedBlueprint && (
                <button
                  type="button"
                  onClick={() => setActiveRightTab('blueprint')}
                  className={`flex items-center gap-2 rounded-btn px-3 py-1.5 text-xs font-medium transition-all duration-160 ${
                    activeRightTab === 'blueprint'
                      ? 'bg-theme-brand text-theme-surface font-semibold shadow-warm-sm'
                      : 'text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Daily Blueprint Note</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsCalendarDrawerOpen(true)}
              className="text-xs text-theme-accent hover:underline flex items-center gap-1 font-mono font-medium px-2"
            >
              <span>Full Drawer</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Timeline Grid Tab */}
          {activeRightTab === 'timeline' && (
            <TimelineGrid
              date={targetDate}
              events={eventsForTargetDate}
              onDeleteEvent={id => {
                deleteCalendarEvent(id);
                showToast('Removed time block', 'info');
              }}
              onAddEventClick={() => setShowAddBlockModal(true)}
            />
          )}

          {/* To-Do Checklist Tab */}
          {activeRightTab === 'todos' && (
            <div className="rounded-card border border-theme-border bg-theme-surface p-5 space-y-4 shadow-warm-sm">
              <div className="flex items-center justify-between border-b border-theme-border pb-3.5">
                <div className="flex items-center gap-2.5">
                  <ListTodo className="h-4 w-4 text-theme-accent" />
                  <h3 className="font-editorial text-sm font-semibold text-theme-primary">
                    Daily Action Items
                  </h3>
                  <span className="rounded-md bg-theme-sidebar px-2 py-0.5 text-[10px] font-mono text-theme-muted border border-theme-border">
                    {todoItems.filter(t => t.completed).length} / {todoItems.length} Done
                  </span>
                </div>

                {todoItems.some(t => t.completed) && (
                  <button
                    type="button"
                    onClick={clearCompletedTodos}
                    className="text-xs text-theme-muted hover:text-theme-primary underline font-mono"
                  >
                    Clear Completed
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto">
                {todoItems.length === 0 ? (
                  <div className="text-center py-12 text-xs text-theme-muted">
                    No active tasks. Add tasks or generate with AI above.
                  </div>
                ) : (
                  todoItems.map(t => (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between rounded-card border p-3.5 transition-all duration-160 ${
                        t.completed
                          ? 'border-theme-border/50 bg-theme-sidebar/40 opacity-60'
                          : 'border-theme-border bg-theme-elevated hover:border-theme-borderStrong shadow-warm-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={t.completed}
                          onChange={() => handleToggleTodoItem(t.id, t.completed)}
                          className="h-4 w-4 rounded border-theme-borderStrong text-theme-brand cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p
                            className={`text-xs ${
                              t.completed ? 'line-through text-theme-muted' : 'text-theme-primary font-medium'
                            }`}
                          >
                            {t.title}
                          </p>
                          {t.estimatedMinutes && (
                            <span className="text-[10px] text-theme-muted font-mono">
                              Est: {t.estimatedMinutes} mins
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-theme-sidebar text-theme-accent border border-theme-border font-semibold">
                          {t.priority}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            deleteTodoItem(t.id);
                            showToast('Task removed', 'info');
                          }}
                          className="p-1 text-theme-muted hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Daily Blueprint Note Tab */}
          {activeRightTab === 'blueprint' && (
            <div className="rounded-card border border-theme-border bg-theme-surface p-5 space-y-3.5 shadow-warm-sm">
              <div className="flex items-center justify-between border-b border-theme-border pb-3.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-theme-accent" />
                  <h3 className="font-editorial text-sm font-semibold text-theme-primary">
                    Daily Blueprint Document
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotepadDrawerOpen(true)}
                  className="inline-flex items-center gap-1 text-xs text-theme-accent hover:underline font-mono"
                >
                  <span>Open in Notepad Drawer</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[460px]">
                <MarkdownRenderer content={generatedBlueprint} />
              </div>
            </div>
          )}

          {/* Manual Add Block Modal */}
          {showAddBlockModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <form
                onSubmit={handleManualAddEvent}
                className="w-full max-w-md rounded-card border border-theme-border bg-theme-surface p-6 shadow-warm-lg space-y-4"
              >
                <div className="flex items-center justify-between border-b border-theme-border pb-3">
                  <h3 className="font-editorial text-base font-semibold text-theme-primary">
                    Schedule Time Block
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddBlockModal(false)}
                    className="text-theme-muted hover:text-theme-primary"
                  >
                    ×
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-editorial uppercase tracking-wider text-theme-muted block mb-1">
                    Block Title
                  </label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={e => setManualTitle(e.target.value)}
                    placeholder="E.g., Deep Focus: Architecture Synthesis..."
                    className="w-full rounded-btn border border-theme-border bg-theme-elevated px-3 py-2 text-xs text-theme-primary focus:border-theme-accent focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-theme-muted block mb-1">Start</label>
                    <input
                      type="time"
                      value={manualStart}
                      onChange={e => setManualStart(e.target.value)}
                      className="w-full rounded-btn border border-theme-border bg-theme-elevated px-3 py-1.5 text-xs text-theme-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-theme-muted block mb-1">End</label>
                    <input
                      type="time"
                      value={manualEnd}
                      onChange={e => setManualEnd(e.target.value)}
                      className="w-full rounded-btn border border-theme-border bg-theme-elevated px-3 py-1.5 text-xs text-theme-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-editorial uppercase tracking-wider text-theme-muted block mb-1">
                    Category Tag
                  </label>
                  <select
                    value={manualCategory}
                    onChange={e => setManualCategory(e.target.value as EventCategory)}
                    className="w-full rounded-btn border border-theme-border bg-theme-elevated px-3 py-2 text-xs text-theme-primary font-mono"
                  >
                    <option value="deep-work">Deep Focus (Champagne)</option>
                    <option value="work">Execution & Tasks (Espresso)</option>
                    <option value="meeting">Executive Sync (Taupe)</option>
                    <option value="health">Physical Movement (Amber)</option>
                    <option value="routine">Routine & Calibration (Slate)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-theme-border">
                  <button
                    type="button"
                    onClick={() => setShowAddBlockModal(false)}
                    className="rounded-btn px-3 py-1.5 text-xs text-theme-secondary hover:text-theme-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-btn bg-theme-brand px-4 py-1.5 text-xs font-semibold text-theme-surface hover:bg-theme-brandHover shadow-warm-sm"
                  >
                    Add Block
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
