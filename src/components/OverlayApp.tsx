import { useEffect, useState } from 'react';

interface IpcRendererLike {
  on(channel: string, listener: (...args: unknown[]) => void): void;
  removeListener(channel: string, listener: (...args: unknown[]) => void): void;
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
}

interface OverlayState {
  progress: number;
  actualWpm: number;
  elapsedMs: number;
  estimatedMs: number;
  isPaused: boolean;
  isTyping: boolean;
}

const INITIAL: OverlayState = {
  progress: 0,
  actualWpm: 0,
  elapsedMs: 0,
  estimatedMs: 0,
  isPaused: false,
  isTyping: false,
};

function getIpcRenderer(): IpcRendererLike | null {
  return window.autoTyperIPC ?? null;
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function OverlayApp() {
  const [state, setState] = useState<OverlayState>(INITIAL);

  useEffect(() => {
    const ipc = getIpcRenderer();
    if (!ipc) return;

    const handleUpdate = (...args: unknown[]) => {
      const payload = args[0] as Partial<OverlayState> | undefined;
      if (!payload || typeof payload !== 'object') return;
      setState(prev => ({ ...prev, ...payload }));
    };

    ipc.on('overlay-state', handleUpdate);
    ipc.invoke('overlay-ready').catch(console.error);

    return () => {
      ipc.removeListener('overlay-state', handleUpdate);
    };
  }, []);

  const remainingMs = Math.max(0, state.estimatedMs - state.elapsedMs);
  const progress = Math.max(0, Math.min(100, state.progress));

  const statusLabel = !state.isTyping
    ? 'Idle'
    : state.isPaused
      ? 'Paused'
      : 'Typing';

  const statusColor = !state.isTyping
    ? '#71717a'
    : state.isPaused
      ? '#fbbf24'
      : '#34d399';

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        padding: '10px 14px',
        boxSizing: 'border-box',
        background: 'rgba(15, 17, 24, 0.86)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(130, 87, 254, 0.3)',
        borderRadius: 12,
        color: '#f4f4f5',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        userSelect: 'none',
        // @ts-expect-error — Electron-specific CSS property for window dragging
        WebkitAppRegion: 'drag',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: statusColor,
            boxShadow: `0 0 8px ${statusColor}`,
          }}
          aria-hidden="true"
        />
        <span style={{ fontWeight: 600 }}>Auto-Typer</span>
        <span style={{ color: '#a1a1aa', fontSize: 11 }}>· {statusLabel}</span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontVariantNumeric: 'tabular-nums',
            color: '#e4e4e7',
            fontWeight: 600,
          }}
        >
          {progress.toFixed(1)}%
        </span>
      </div>

      <div
        style={{
          height: 4,
          width: '100%',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background:
              'linear-gradient(90deg, #8257fe 0%, #b59bff 60%, #fbbf24 120%)',
            transition: 'width 200ms ease-out',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontVariantNumeric: 'tabular-nums',
          color: '#a1a1aa',
          fontSize: 11,
        }}
      >
        <span>
          <span style={{ color: '#71717a' }}>wpm </span>
          <span style={{ color: '#e4e4e7', fontWeight: 600 }}>
            {state.actualWpm > 0 ? state.actualWpm.toFixed(0) : '—'}
          </span>
        </span>
        <span>
          <span style={{ color: '#71717a' }}>elapsed </span>
          <span style={{ color: '#e4e4e7', fontWeight: 600 }}>
            {formatClock(state.elapsedMs)}
          </span>
        </span>
        <span>
          <span style={{ color: '#71717a' }}>eta </span>
          <span style={{ color: '#e4e4e7', fontWeight: 600 }}>
            {formatClock(remainingMs)}
          </span>
        </span>
      </div>
    </div>
  );
}
