import React from 'react';
import { CalendarEvent } from '../../types';
import { Clock, Trash2, Calendar, Sparkles } from 'lucide-react';

interface TimelineGridProps {
  date: string;
  events: CalendarEvent[];
  onDeleteEvent: (id: string) => void;
  onAddEventClick: () => void;
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  date,
  events,
  onDeleteEvent,
  onAddEventClick
}) => {
  const sortedEvents = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const categoryLabels: Record<string, string> = {
    'deep-work': 'Deep Focus',
    work: 'Execution & Tasks',
    meeting: 'Executive Sync',
    health: 'Physical Reset',
    routine: 'Calibration',
    study: 'Research & Study',
    other: 'Other'
  };

  return (
    <div className="flex flex-col rounded-card border border-theme-border bg-theme-surface p-5 shadow-warm-sm transition-colors duration-180">
      {/* Timeline Header */}
      <div className="flex items-center justify-between border-b border-theme-border pb-3.5">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-4 w-4 text-theme-accent" />
          <h3 className="font-editorial text-sm font-semibold text-theme-primary">
            Chronological Timeline ({date})
          </h3>
          <span className="rounded-md bg-theme-sidebar px-2 py-0.5 text-[10px] font-mono text-theme-muted border border-theme-border">
            {sortedEvents.length} {sortedEvents.length === 1 ? 'block' : 'blocks'}
          </span>
        </div>

        <button
          type="button"
          onClick={onAddEventClick}
          className="rounded-btn border border-theme-border bg-theme-elevated px-3 py-1 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:border-theme-borderStrong transition-all shadow-warm-sm"
        >
          + Add Time Block
        </button>
      </div>

      {/* Chronological Flow */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-[320px]">
        {sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-theme-muted space-y-2">
            <Clock className="h-8 w-8 stroke-1 text-theme-borderStrong" />
            <p className="font-editorial text-sm font-medium text-theme-primary">
              No Time Blocks Scheduled
            </p>
            <p className="text-xs text-theme-secondary max-w-sm">
              Generate a synchronized schedule with AI or manually schedule blocks above.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-3.5 before:absolute before:bottom-2 before:top-2 before:left-[11px] before:w-[1.5px] before:bg-theme-borderStrong">
            {sortedEvents.map(evt => {
              const [startH, startM] = evt.startTime.split(':').map(Number);
              const [endH, endM] = evt.endTime.split(':').map(Number);
              const durationMin = (endH * 60 + endM) - (startH * 60 + startM);

              return (
                <div
                  key={evt.id}
                  className="group relative flex items-start justify-between rounded-card border border-theme-border bg-theme-elevated p-3.5 hover:border-theme-borderStrong transition-all duration-160 shadow-warm-sm"
                >
                  {/* Timeline Dot */}
                  <div
                    className="absolute -left-[29px] top-4 h-3.5 w-3.5 rounded-full border-2 border-theme-surface shadow-sm transition-transform group-hover:scale-125"
                    style={{ backgroundColor: evt.color || 'var(--accent)' }}
                  />

                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-theme-accent">
                        {evt.startTime} - {evt.endTime}
                      </span>
                      {Number.isFinite(durationMin) && durationMin > 0 && (
                        <span className="text-[10px] text-theme-muted font-mono">
                          ({durationMin} min)
                        </span>
                      )}
                      <span className="rounded px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-theme-sidebar text-theme-secondary border border-theme-border font-medium">
                        {categoryLabels[evt.category] || evt.category}
                      </span>
                      {evt.source === 'scheduler' && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-theme-accent font-medium">
                          <Sparkles className="h-2.5 w-2.5" /> AI Synced
                        </span>
                      )}
                    </div>

                    <h4 className="font-editorial mt-1.5 text-sm font-semibold text-theme-primary">
                      {evt.title}
                    </h4>

                    {evt.notes && (
                      <p className="mt-1 text-xs text-theme-secondary leading-relaxed">
                        {evt.notes}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteEvent(evt.id)}
                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-theme-muted hover:text-rose-500 transition-opacity"
                    title="Remove block"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
