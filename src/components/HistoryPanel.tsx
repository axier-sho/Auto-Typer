import { useState } from 'react';
import { History, Trash2, RotateCcw, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { HistoryEntry } from '../types/typing';
import { formatTime } from '../engine/planning';

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onReload: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  disabled: boolean;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString();
}

export default function HistoryPanel({
  entries,
  onReload,
  onDelete,
  onClear,
  disabled,
}: HistoryPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) {
    return null;
  }

  const visible = expanded ? entries : entries.slice(0, 3);

  return (
    <section className="surface p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-inset ring-primary-500/25">
            <History className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Recent sessions</p>
            <h2 className="section-title">History</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip">{entries.length}</span>
          <button
            type="button"
            onClick={() => {
              if (confirm('Clear all history?')) onClear();
            }}
            className="btn-secondary !py-1.5 !px-2.5 text-xs"
            title="Clear history"
            aria-label="Clear history"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <ul className="space-y-2">
        {visible.map(entry => (
          <li
            key={entry.id}
            className="group rounded-lg border border-white/[0.05] bg-ink-900/60 p-3 transition-colors hover:border-white/[0.1]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink-100 font-medium truncate" title={entry.textPreview}>
                  {entry.textPreview || '(empty)'}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {formatDate(entry.createdAt)}
                  </span>
                  <span className="font-mono">{entry.targetWpm} wpm target</span>
                  <span className="font-mono">{entry.actualWpm.toFixed(1)} actual</span>
                  <span className="font-mono">{formatTime(entry.durationMs)}</span>
                  <span className="font-mono">{entry.textLength} chars</span>
                  {!entry.completed && (
                    <span className="text-amber-300">stopped</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => onReload(entry)}
                  disabled={disabled}
                  className="btn-secondary !py-1 !px-2 text-xs"
                  title="Load this text"
                  aria-label="Load this text"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(entry.id)}
                  className="btn-secondary !py-1 !px-2 text-xs"
                  title="Delete entry"
                  aria-label="Delete entry"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {entries.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-3 w-full text-[11px] uppercase tracking-wider text-ink-400 hover:text-ink-200 flex items-center justify-center gap-1 py-2"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="w-3 h-3" aria-hidden="true" />
            </>
          ) : (
            <>
              Show all {entries.length} <ChevronDown className="w-3 h-3" aria-hidden="true" />
            </>
          )}
        </button>
      )}
    </section>
  );
}
