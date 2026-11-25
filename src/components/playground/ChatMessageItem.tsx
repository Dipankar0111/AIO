import React, { useState } from 'react';
import { ChatMessage } from '../../types';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import {
  FileText,
  Calendar,
  CheckSquare,
  Copy,
  Check,
  Clock,
  Sparkles,
  ThumbsUp,
  Bookmark,
  Zap,
  Pin
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { triggerConfetti } from '../../utils/confetti';

interface ChatMessageItemProps {
  message: ChatMessage;
  onSaveToNotepad: (content: string, title?: string) => void;
  onTogglePin?: (id: string) => void;
  onRegenerate?: () => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onSaveToNotepad,
  onTogglePin
}) => {
  const { addNote, addCalendarEvent, addTodoItem, showToast, setIsNotepadDrawerOpen, setIsCalendarDrawerOpen } = useApp();
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [executedActions, setExecutedActions] = useState<Record<number, boolean>>({});

  const isAssistant = message.role === 'assistant';

  const handleCopy = () => {
    navigator.clipboard
      .writeText(message.content)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showToast('Message copied to clipboard', 'info');
      })
      .catch(() => showToast('Clipboard access denied', 'error'));
  };

  const handleExecuteAction = (action: any, index: number) => {
    if (executedActions[index]) return;

    if (action.type === 'save_note') {
      const savedNote = addNote({
        title: action.payload.title || 'Note from Chat',
        content: action.payload.content || message.content,
        tags: action.payload.tags || ['chat', 'editorial'],
        source: 'playground'
      });
      setExecutedActions(prev => ({ ...prev, [index]: true }));
      triggerConfetti();
      showToast(`Saved note "${savedNote.title}"`, 'success', {
        label: 'Open Notepad',
        onClick: () => setIsNotepadDrawerOpen(true)
      });
    } else if (action.type === 'add_event') {
      const todayStr = new Date().toISOString().split('T')[0];
      addCalendarEvent({
        title: action.payload.title || 'Scheduled Event',
        date: action.payload.date || todayStr,
        startTime: action.payload.startTime || '10:00',
        endTime: action.payload.endTime || '11:00',
        category: action.payload.category || 'work',
        notes: action.payload.notes || '',
        color: '#B18B68',
        source: 'playground'
      });
      setExecutedActions(prev => ({ ...prev, [index]: true }));
      triggerConfetti();
      showToast(`Added "${action.payload.title}" to Calendar`, 'success', {
        label: 'View Calendar',
        onClick: () => setIsCalendarDrawerOpen(true)
      });
    } else if (action.type === 'add_todo') {
      addTodoItem({
        title: action.payload.title || 'New Task',
        priority: action.payload.priority || 'medium',
        completed: false,
        dueDate: action.payload.dueDate
      });
      setExecutedActions(prev => ({ ...prev, [index]: true }));
      triggerConfetti();
      showToast(`Added to-do: "${action.payload.title}"`, 'success', {
        label: 'View Tasks',
        onClick: () => setIsCalendarDrawerOpen(true)
      });
    }
  };

  return (
    <div
      className={`group flex w-full transition-all duration-240 ${
        isAssistant ? 'justify-start' : 'justify-end'
      }`}
    >
      {isAssistant ? (
        /* Assistant Message: Natural editorial left-aligned flow */
        <div className="flex w-full items-start gap-3.5 max-w-3xl">
          {/* Refined Monogram Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-btn bg-theme-sidebar border border-theme-border text-theme-accent shadow-warm-sm mt-0.5">
            <span className="font-editorial text-[11px] font-bold italic">AIO</span>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            {/* Header Telemetry */}
            <div className="flex items-center justify-between text-xs text-theme-muted">
              <div className="flex items-center gap-2">
                <span className="font-editorial text-xs font-semibold text-theme-primary tracking-wide">
                  AIO Intelligence
                </span>
                <span className="text-[10px] text-theme-muted font-mono">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {message.metrics && (
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="inline-flex items-center gap-1 rounded bg-theme-surface px-2 py-0.5 text-theme-secondary border border-theme-border">
                    <Clock className="h-3 w-3 text-theme-muted" />
                    {message.metrics.latencyMs}ms
                  </span>
                  {message.metrics.tokensPerSecond ? (
                    <span className="inline-flex items-center gap-1 rounded bg-theme-accentLight px-2 py-0.5 text-theme-accent font-semibold border border-theme-borderStrong">
                      <Zap className="h-3 w-3 fill-theme-accent" />
                      {message.metrics.tokensPerSecond} tok/s
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Markdown Content */}
            <div className="text-theme-primary leading-relaxed text-sm">
              <MarkdownRenderer content={message.content} />
            </div>

            {/* Detected Action Cards */}
            {message.detectedActions && message.detectedActions.length > 0 && (
              <div className="mt-3 rounded-card border border-theme-border bg-theme-surface/70 p-3 space-y-2 shadow-warm-sm">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-accent flex items-center gap-1.5 font-mono">
                  <Sparkles className="h-3 w-3" /> Synchronizable Actions
                </span>
                <div className="flex flex-wrap gap-2">
                  {message.detectedActions.map((action, idx) => {
                    const isExecuted = executedActions[idx];
                    const icons = {
                      save_note: <FileText className="h-3.5 w-3.5 text-theme-accent" />,
                      add_event: <Calendar className="h-3.5 w-3.5 text-theme-accent" />,
                      add_todo: <CheckSquare className="h-3.5 w-3.5 text-theme-accent" />
                    };

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isExecuted}
                        onClick={() => handleExecuteAction(action, idx)}
                        className={`inline-flex items-center gap-2 rounded-btn border px-3 py-1.5 text-xs font-medium transition-all duration-160 ${
                          isExecuted
                            ? 'border-theme-accent bg-theme-accentLight text-theme-accent cursor-default'
                            : 'border-theme-border bg-theme-surface text-theme-primary hover:border-theme-borderStrong hover:bg-theme-elevated shadow-warm-sm'
                        }`}
                      >
                        {isExecuted ? <Check className="h-3.5 w-3.5 text-theme-accent" /> : icons[action.type]}
                        <span>{isExecuted ? 'Executed & Synced' : action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Assistant Action Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-theme-border/60 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const lines = message.content.split('\n').filter(Boolean);
                    const firstLine = lines[0]?.replace(/^#+\s*/, '').slice(0, 50) || 'Assistant Response';
                    onSaveToNotepad(message.content, firstLine);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-btn px-2.5 py-1 text-theme-secondary hover:text-theme-primary hover:bg-theme-surface transition-colors font-medium text-[11px] border border-theme-border"
                >
                  <FileText className="h-3.5 w-3.5 text-theme-accent" />
                  <span>Save to Notepad</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded-btn px-2 py-1 text-theme-secondary hover:text-theme-primary hover:bg-theme-surface transition-colors text-[11px]"
                  title="Copy response"
                >
                  {copied ? <Check className="h-3 w-3 text-theme-accent" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setLiked(!liked);
                    showToast(liked ? 'Feedback removed' : 'Marked as helpful', 'info');
                  }}
                  className={`p-1.5 rounded-btn transition-colors ${
                    liked ? 'text-theme-accent bg-theme-accentLight' : 'text-theme-muted hover:text-theme-secondary'
                  }`}
                  title="Helpful response"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>

                {onTogglePin && (
                  <button
                    type="button"
                    onClick={() => onTogglePin(message.id)}
                    className={`p-1.5 rounded-btn transition-colors ${
                      message.pinned ? 'text-theme-accent bg-theme-accentLight' : 'text-theme-muted hover:text-theme-secondary'
                    }`}
                    title={message.pinned ? 'Unpin from context window' : 'Pin to context window (always retained)'}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setBookmarked(!bookmarked);
                    showToast(bookmarked ? 'Bookmark removed' : 'Bookmarked message', 'info');
                  }}
                  className={`p-1.5 rounded-btn transition-colors ${
                    bookmarked ? 'text-theme-accent bg-theme-accentLight' : 'text-theme-muted hover:text-theme-secondary'
                  }`}
                  title="Bookmark"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* User Message: Refined warm bubble with crisp typography */
        <div className="flex flex-col items-end max-w-xl">
          <div className="rounded-card bg-theme-surface border border-theme-borderStrong px-4 py-3 shadow-warm-sm">
            <p className="whitespace-pre-wrap text-sm text-theme-primary font-sans leading-relaxed">
              {message.content}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-1.5 pr-2">
            {onTogglePin && (
              <button
                type="button"
                onClick={() => onTogglePin(message.id)}
                className={`p-1 rounded transition-colors ${
                  message.pinned ? 'text-theme-accent bg-theme-accentLight' : 'text-theme-muted hover:text-theme-secondary'
                }`}
                title={message.pinned ? 'Unpin from context window' : 'Pin to context window'}
              >
                <Pin className="h-3 w-3" />
              </button>
            )}
            <span className="text-[10px] text-theme-muted font-mono">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
