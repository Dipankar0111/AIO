import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Calendar,
  CheckSquare,
  Plus,
  Trash2,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { triggerConfetti } from '../../utils/confetti';
import { EventCategory, TodoPriority } from '../../types';

export const CalendarDrawer: React.FC = () => {
  const {
    isCalendarDrawerOpen,
    setIsCalendarDrawerOpen,
    setActiveTab,
    calendarEvents,
    addCalendarEvent,
    deleteCalendarEvent,
    todoItems,
    addTodoItem,
    toggleTodoItem,
    deleteTodoItem,
    clearCompletedTodos,
    showToast
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'events' | 'todos'>('events');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Quick Event Form
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [newCategory, setNewCategory] = useState<EventCategory>('work');

  // Quick Todo Form
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<TodoPriority>('medium');

  if (!isCalendarDrawerOpen) return null;

  const eventsForDate = calendarEvents
    .filter(e => e.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (newEndTime <= newStartTime) {
      showToast('End time must be after start time', 'warning');
      return;
    }

    addCalendarEvent({
      date: selectedDate,
      startTime: newStartTime,
      endTime: newEndTime,
      title: newTitle.trim(),
      category: newCategory,
      color:
        newCategory === 'deep-work'
          ? '#B18B68'
          : newCategory === 'meeting'
          ? '#625044'
          : newCategory === 'health'
          ? '#A67C52'
          : '#81766A',
      source: 'manual'
    });

    setNewTitle('');
    setIsAddingEvent(false);
    showToast('Event added to calendar', 'success');
  };

  const handleCreateTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    addTodoItem({
      title: newTodoTitle.trim(),
      completed: false,
      priority: newTodoPriority,
      dueDate: selectedDate
    });

    setNewTodoTitle('');
    showToast('Task added to to-do list', 'info');
  };

  const handleToggleTodo = (id: string, currentlyCompleted: boolean) => {
    toggleTodoItem(id);
    if (!currentlyCompleted) {
      triggerConfetti();
      showToast('Task completed!', 'success');
    }
  };

  const jumpToSchedulerWorkspace = () => {
    setIsCalendarDrawerOpen(false);
    setActiveTab('scheduler');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in transition-colors duration-180">
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-theme-border bg-theme-main text-theme-primary shadow-warm-lg">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-theme-border px-6 bg-theme-sidebar/50">
          <div className="flex items-center gap-3">
            <h2 className="font-editorial text-base font-semibold text-theme-primary">
              Schedule &amp; Action Items
            </h2>
            <span className="rounded-btn bg-theme-elevated px-2 py-0.5 text-xs text-theme-muted border border-theme-border font-mono">
              {eventsForDate.length} events · {todoItems.filter(t => !t.completed).length} pending
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCalendarDrawerOpen(false)}
            className="rounded-btn p-2 text-theme-secondary hover:bg-theme-surface hover:text-theme-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher & Date Picker */}
        <div className="p-4 border-b border-theme-border space-y-3 bg-theme-sidebar/30">
          <div className="flex rounded-btn bg-theme-elevated p-1 border border-theme-border">
            <button
              type="button"
              onClick={() => setActiveSubTab('events')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium transition-all ${
                activeSubTab === 'events'
                  ? 'bg-theme-brand text-theme-surface font-semibold shadow-warm-sm'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Timeline</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('todos')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium transition-all ${
                activeSubTab === 'todos'
                  ? 'bg-theme-brand text-theme-surface font-semibold shadow-warm-sm'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>To-Do List</span>
            </button>
          </div>

          {/* Date Picker Bar */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-theme-secondary font-mono text-[11px]">Selected Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="rounded-btn border border-theme-border bg-theme-elevated px-2.5 py-1 text-xs text-theme-primary focus:border-theme-accent focus:outline-none"
            />
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeSubTab === 'events' ? (
            /* Events Timeline */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-editorial text-xs font-semibold uppercase tracking-wider text-theme-muted">
                  Timeline Blocks ({eventsForDate.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingEvent(!isAddingEvent)}
                  className="inline-flex items-center gap-1 rounded-btn border border-theme-border bg-theme-elevated px-2.5 py-1 text-xs font-medium text-theme-primary hover:border-theme-borderStrong transition-colors shadow-warm-sm"
                >
                  <Plus className="h-3 w-3" />
                  Add Event
                </button>
              </div>

              {/* Add Event Form */}
              {isAddingEvent && (
                <form
                  onSubmit={handleCreateEvent}
                  className="rounded-card border border-theme-borderStrong bg-theme-surface p-4 space-y-3 shadow-warm-sm animate-slide-up"
                >
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Event title..."
                    className="w-full rounded-btn border border-theme-border bg-theme-elevated px-3 py-1.5 text-xs text-theme-primary focus:border-theme-accent focus:outline-none"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-theme-muted font-mono block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={newStartTime}
                        onChange={e => setNewStartTime(e.target.value)}
                        className="w-full rounded-btn border border-theme-border bg-theme-elevated px-2 py-1 text-xs text-theme-primary font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-theme-muted font-mono block mb-1">End Time</label>
                      <input
                        type="time"
                        value={newEndTime}
                        onChange={e => setNewEndTime(e.target.value)}
                        className="w-full rounded-btn border border-theme-border bg-theme-elevated px-2 py-1 text-xs text-theme-primary font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as EventCategory)}
                      className="rounded-btn border border-theme-border bg-theme-elevated px-2 py-1 text-xs text-theme-secondary font-mono"
                    >
                      <option value="deep-work">Deep Focus</option>
                      <option value="work">Execution</option>
                      <option value="meeting">Meeting</option>
                      <option value="health">Physical Reset</option>
                      <option value="routine">Routine</option>
                    </select>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingEvent(false)}
                        className="rounded-btn px-2.5 py-1 text-xs text-theme-muted hover:text-theme-primary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-btn bg-theme-brand px-3 py-1 text-xs font-semibold text-theme-surface hover:bg-theme-brandHover"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Event Cards */}
              {eventsForDate.length === 0 ? (
                <div className="rounded-card border border-dashed border-theme-border p-8 text-center text-xs text-theme-muted">
                  No scheduled blocks for this date.
                </div>
              ) : (
                <div className="space-y-2">
                  {eventsForDate.map(evt => (
                    <div
                      key={evt.id}
                      className="group flex items-start justify-between rounded-card border border-theme-border bg-theme-surface p-3 hover:border-theme-borderStrong transition-all shadow-warm-sm"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="mt-1 h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: evt.color || 'var(--accent)' }}
                        />
                        <div className="min-w-0">
                          <h4 className="font-editorial text-xs font-semibold text-theme-primary truncate">
                            {evt.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-theme-secondary font-mono">
                            <Clock className="h-3 w-3" />
                            <span>
                              {evt.startTime} - {evt.endTime}
                            </span>
                            <span className="capitalize text-[10px] text-theme-muted">
                              · {evt.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          deleteCalendarEvent(evt.id);
                          showToast('Event removed', 'info');
                        }}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-theme-muted hover:text-rose-500 transition-opacity"
                        title="Delete event"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* To-Do Checklist */
            <div className="space-y-3">
              <form onSubmit={handleCreateTodo} className="flex gap-2">
                <input
                  type="text"
                  value={newTodoTitle}
                  onChange={e => setNewTodoTitle(e.target.value)}
                  placeholder="New task..."
                  className="flex-1 rounded-btn border border-theme-border bg-theme-elevated px-3 py-2 text-xs text-theme-primary placeholder:text-theme-muted focus:border-theme-accent focus:outline-none"
                />
                <select
                  value={newTodoPriority}
                  onChange={e => setNewTodoPriority(e.target.value as TodoPriority)}
                  className="rounded-btn border border-theme-border bg-theme-elevated px-2 py-2 text-xs text-theme-secondary font-mono"
                >
                  <option value="high">High</option>
                  <option value="medium">Med</option>
                  <option value="low">Low</option>
                </select>
                <button
                  type="submit"
                  className="rounded-btn bg-theme-brand px-3 py-2 text-xs font-semibold text-theme-surface hover:bg-theme-brandHover"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </form>

              <div className="flex items-center justify-between text-xs text-theme-muted pt-1 font-mono text-[11px]">
                <span>Tasks ({todoItems.length})</span>
                {todoItems.some(t => t.completed) && (
                  <button
                    type="button"
                    onClick={clearCompletedTodos}
                    className="hover:text-theme-primary underline"
                  >
                    Clear Completed
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {todoItems.map(t => (
                  <div
                    key={t.id}
                    className={`group flex items-center justify-between rounded-card border p-3 transition-all ${
                      t.completed
                        ? 'border-theme-border/40 bg-theme-sidebar/40 opacity-60'
                        : 'border-theme-border bg-theme-surface hover:border-theme-borderStrong shadow-warm-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={t.completed}
                        onChange={() => handleToggleTodo(t.id, t.completed)}
                        className="h-4 w-4 rounded border-theme-borderStrong text-theme-brand cursor-pointer"
                      />
                      <span
                        className={`text-xs truncate ${
                          t.completed
                            ? 'line-through text-theme-muted'
                            : 'text-theme-primary font-medium'
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-theme-sidebar text-theme-accent border border-theme-border font-semibold">
                        {t.priority}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteTodoItem(t.id)}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-theme-muted hover:text-rose-500 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Shortcut */}
        <div className="border-t border-theme-border p-4 bg-theme-sidebar/50">
          <button
            type="button"
            onClick={jumpToSchedulerWorkspace}
            className="flex w-full items-center justify-between rounded-btn border border-theme-borderStrong bg-theme-elevated px-4 py-2.5 text-xs font-semibold text-theme-primary hover:border-theme-accent transition-all shadow-warm-sm"
          >
            <div className="flex items-center gap-2 font-editorial">
              <Sparkles className="h-3.5 w-3.5 text-theme-accent" />
              <span>Open Harmonizer Workspace</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-theme-muted" />
          </button>
        </div>
      </div>
    </div>
  );
};
