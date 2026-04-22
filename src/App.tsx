/**
 * Auto-Typer - Human-like Typing Simulator
 * Developed by Axier
 * Website: https://axier.dev
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Play, Pause, Square, Settings as SettingsIcon, Keyboard, Command, ExternalLink } from 'lucide-react';
import { planTyping, getDefaultSettings, validateSettings, calculateActualWPM } from './engine/planning';
import { TypingSettings, TypingEvent, TypingProfile, HistoryEntry } from './types/typing';
import SettingsPanel from './components/SettingsPanel';
import StatsDisplay from './components/StatsDisplay';
import TextInput from './components/TextInput';
import HistoryPanel from './components/HistoryPanel';
import {
  loadProfiles,
  saveProfile as saveProfileToStorage,
  renameProfile as renameProfileInStorage,
  deleteProfile as deleteProfileFromStorage,
  loadActiveProfileId,
  saveActiveProfileId,
  BUILTIN_PROFILE_IDS,
  loadHistory,
  appendHistory,
  deleteHistoryEntry,
  clearHistory,
} from './lib/storage';

interface IpcRendererLike {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, listener: (...args: unknown[]) => void): void;
  removeListener(channel: string, listener: (...args: unknown[]) => void): void;
}

function getIpcRenderer(): IpcRendererLike | null {
  return window.autoTyperIPC ?? null;
}

function removeLastCodePoint(textValue: string): string {
  if (!textValue) {
    return textValue;
  }
  const codePoints = Array.from(textValue);
  codePoints.pop();
  return codePoints.join('');
}

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return true;
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform
    || navigator.platform
    || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

function App() {
  const initialProfileState = useMemo(() => {
    const loaded = loadProfiles();
    const storedId = loadActiveProfileId();
    const active =
      (storedId && loaded.find(p => p.id === storedId)) ||
      loaded.find(p => p.id === BUILTIN_PROFILE_IDS.casual) ||
      loaded[0];
    return {
      profiles: loaded,
      activeId: active?.id ?? null,
      settings: active ? validateSettings(active.settings) : getDefaultSettings(),
    };
  }, []);

  const [profiles, setProfiles] = useState<TypingProfile[]>(initialProfileState.profiles);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(initialProfileState.activeId);
  const [text, setText] = useState('');
  const [settings, setSettings] = useState<TypingSettings>(initialProfileState.settings);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [isTyping, setIsTyping] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentEvent, setCurrentEvent] = useState<TypingEvent | null>(null);
  const [typedText, setTypedText] = useState('');
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const typingTimeoutRef = useRef<number | null>(null);
  const previewTimeoutsRef = useRef<number[]>([]);
  const eventsRef = useRef<TypingEvent[]>([]);
  const currentIndexRef = useRef(0);
  const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);
  const shouldStopRef = useRef(false);
  const isPausedRef = useRef(false);
  const sessionRecordedRef = useRef(false);
  const activeTextRef = useRef('');
  const activeTargetWpmRef = useRef(0);
  const overlayShownRef = useRef(false);

  const isMac = useMemo(() => isMacPlatform(), []);

  const handleSelectProfile = useCallback((id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (!profile) return;
    setActiveProfileId(id);
    saveActiveProfileId(id);
    setSettings(validateSettings(profile.settings));
  }, [profiles]);

  const handleSaveProfile = useCallback((name: string) => {
    const saved = saveProfileToStorage(name, settings);
    setProfiles(loadProfiles());
    setActiveProfileId(saved.id);
    saveActiveProfileId(saved.id);
  }, [settings]);

  const handleRenameProfile = useCallback((id: string, name: string) => {
    renameProfileInStorage(id, name);
    setProfiles(loadProfiles());
  }, []);

  const handleDeleteProfile = useCallback((id: string) => {
    deleteProfileFromStorage(id);
    const next = loadProfiles();
    setProfiles(next);
    if (activeProfileId === id) {
      const fallback = next.find(p => p.id === BUILTIN_PROFILE_IDS.casual) ?? next[0];
      if (fallback) {
        setActiveProfileId(fallback.id);
        saveActiveProfileId(fallback.id);
        setSettings(validateSettings(fallback.settings));
      }
    }
  }, [activeProfileId]);

  const handleReloadHistory = useCallback((entry: HistoryEntry) => {
    setText(entry.fullText);
  }, []);

  const handleDeleteHistory = useCallback((id: string) => {
    setHistory(deleteHistoryEntry(id));
  }, []);

  const handleClearHistory = useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  const handleStart = useCallback(async () => {
    if (!text.trim()) {
      alert('Please enter some text to type!');
      return;
    }

    const ipcRenderer = getIpcRenderer();

    // Check permissions in Electron
    if (ipcRenderer) {
      try {
        const hasPermissions = await ipcRenderer.invoke('check-permissions');

        if (!hasPermissions) {
          // Request permissions
          await ipcRenderer.invoke('request-permissions');
          // Recheck after user interaction
          const recheckPermissions = await ipcRenderer.invoke('check-permissions');
          if (!recheckPermissions) {
            alert('Accessibility permissions are required to use Auto-Typer.\n\nPlease grant permissions in System Settings, then restart the app.');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    }

    try {
      const validatedSettings = validateSettings(settings);
      const plan = planTyping(text, validatedSettings);

      eventsRef.current = plan.events;
      currentIndexRef.current = 0;
      setEstimatedTime(plan.totalTimeMs);
      setIsTyping(true);
      setIsPaused(false);
      isPausedRef.current = false;
      setProgress(0);
      setTypedText('');
      setElapsedTime(0);
      shouldStopRef.current = false;
      sessionRecordedRef.current = false;
      activeTextRef.current = text;
      activeTargetWpmRef.current = validatedSettings.wpm;
      startTimeRef.current = 0;

      setIsCountingDown(true);
      const abortCountdown = () => {
        // Pause/stop landed before typing actually started. There's nothing to
        // resume — startTimeRef is 0 and no batches have run — so fully reset
        // instead of leaving isTyping=true in a half-initialized state.
        setIsCountingDown(false);
        setCountdown(0);
        setIsTyping(false);
        setIsPaused(false);
        isPausedRef.current = false;
        shouldStopRef.current = false;
        currentIndexRef.current = 0;
        eventsRef.current = [];
      };
      for (let i = 3; i >= 1; i--) {
        if (shouldStopRef.current) {
          abortCountdown();
          return;
        }
        setCountdown(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setIsCountingDown(false);
      setCountdown(0);

      if (shouldStopRef.current) {
        abortCountdown();
        return;
      }

      startTimeRef.current = Date.now();
      processBatch();
    } catch (error) {
      console.error('Error planning typing:', error);
      alert('An error occurred while planning the typing sequence.');
      setIsCountingDown(false);
      setIsTyping(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, settings]);

  const recordSession = useCallback((completed: boolean) => {
    if (sessionRecordedRef.current) return;
    const fullText = activeTextRef.current;
    if (!fullText) return;
    if (!startTimeRef.current) return;

    const totalTime = Date.now() - startTimeRef.current;
    if (totalTime <= 0) return;
    const actualWPM = calculateActualWPM(fullText, totalTime);

    const eventsSoFar = eventsRef.current.slice(0, currentIndexRef.current);
    const deleteCount = eventsSoFar.filter(e => e.type === 'delete').length;
    const acc = eventsSoFar.length > 0
      ? Math.max(0, Math.min(100, ((eventsSoFar.length - deleteCount * 2) / eventsSoFar.length) * 100))
      : 100;

    const entry = appendHistory({
      textPreview: fullText.slice(0, 120).replace(/\s+/g, ' ').trim(),
      fullText,
      textLength: fullText.length,
      targetWpm: activeTargetWpmRef.current,
      actualWpm: Number.isFinite(actualWPM) ? actualWPM : 0,
      durationMs: totalTime,
      accuracy: acc,
      completed,
    });
    setHistory(prev => [entry, ...prev].slice(0, 50));
    sessionRecordedRef.current = true;
  }, []);

  const finishTyping = useCallback(() => {
    const totalTime = Date.now() - startTimeRef.current;
    const fullText = activeTextRef.current;
    const targetWpm = activeTargetWpmRef.current;
    const actualWPM = calculateActualWPM(fullText, totalTime);
    console.log(`Typing complete. Target: ${targetWpm} WPM, Actual: ${actualWPM.toFixed(1)} WPM, Time: ${(totalTime / 1000).toFixed(1)}s`);

    recordSession(true);
    setIsTyping(false);
    setProgress(100);
    setCurrentEvent(null);
  }, [recordSession]);

  const rebuildTypedTextFromCommittedIndex = useCallback(() => {
    let rebuilt = '';
    const committed = currentIndexRef.current;
    const events = eventsRef.current;
    for (let i = 0; i < committed; i++) {
      const ev = events[i];
      if (!ev) continue;
      if (ev.type === 'type' && ev.char) {
        rebuilt += ev.char;
      } else if (ev.type === 'delete') {
        rebuilt = removeLastCodePoint(rebuilt);
      }
    }
    setTypedText(rebuilt);
  }, []);

  const processBatch = useCallback(async () => {
    if (currentIndexRef.current >= eventsRef.current.length) {
      finishTyping();
      return;
    }

    if (isPausedRef.current || shouldStopRef.current) {
      return;
    }

    const BATCH_SIZE = 10;
    const endIndex = Math.min(currentIndexRef.current + BATCH_SIZE, eventsRef.current.length);
    const batchEvents = eventsRef.current.slice(currentIndexRef.current, endIndex);

    let cumulativeDelay = 0;
    for (const event of batchEvents) {
      cumulativeDelay += Math.max(0, event.delayMs);
      const tid = window.setTimeout(() => {
        if (shouldStopRef.current) return;
        setCurrentEvent(event);
        if (event.type === 'type' && event.char) {
          const ch = event.char;
          setTypedText(prev => prev + ch);
        } else if (event.type === 'delete') {
          setTypedText(prev => removeLastCodePoint(prev));
        }
      }, cumulativeDelay);
      previewTimeoutsRef.current.push(tid);
    }

    const ipcRenderer = getIpcRenderer();
    if (ipcRenderer) {
      try {
        const result = (await ipcRenderer.invoke('type-batch', batchEvents)) as
          | { success: true }
          | { success: false; paused: true };

        // Main refused or aborted the batch (pause landed before/during it).
        // Do not advance currentIndexRef, cancel any still-pending preview
        // timers, and roll the preview back to the last committed index so it
        // stays in sync with what was actually typed in the target app.
        if (!result.success) {
          isPausedRef.current = true;
          shouldStopRef.current = true;
          previewTimeoutsRef.current.forEach(clearTimeout);
          previewTimeoutsRef.current = [];
          rebuildTypedTextFromCommittedIndex();
          return;
        }

        if (shouldStopRef.current || isPausedRef.current) {
          return;
        }
      } catch (error) {
        // osascript failure: stop instead of silently marking the batch as
        // typed. Advancing here would desync the preview from the target app.
        console.error('Error executing batch:', error);
        shouldStopRef.current = true;
        return;
      }
    } else {
      for (const event of batchEvents) {
        await new Promise(resolve => setTimeout(resolve, event.delayMs));
      }
    }

    currentIndexRef.current = endIndex;
    const progressPercent = (currentIndexRef.current / eventsRef.current.length) * 100;
    setProgress(progressPercent);

    const elapsed = Date.now() - startTimeRef.current;
    setElapsedTime(elapsed);

    if (!isPausedRef.current && !shouldStopRef.current) {
      typingTimeoutRef.current = window.setTimeout(() => {
        processBatch();
      }, 0);
    }
  }, [finishTyping, rebuildTypedTextFromCommittedIndex]);

  const handlePause = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    previewTimeoutsRef.current.forEach(clearTimeout);
    previewTimeoutsRef.current = [];
    shouldStopRef.current = true;
    isPausedRef.current = true;
    setIsPaused(true);
    pauseTimeRef.current = Date.now();
    // Preview timers may have advanced typedText past the committed index
    // during this batch. Snap it back so resume doesn't re-type those chars
    // into the preview on top of what's already there.
    rebuildTypedTextFromCommittedIndex();
  }, [rebuildTypedTextFromCommittedIndex]);

  const handleResume = useCallback(async () => {
    if (isPausedRef.current) {
      const pauseDuration = Date.now() - pauseTimeRef.current;
      startTimeRef.current += pauseDuration;
      isPausedRef.current = false;
      shouldStopRef.current = false;
      setIsPaused(false);
      // Clear main's pauseRequested flag BEFORE queuing the next type-batch.
      // The [isTyping, isPaused] effect also re-registers the shortcut, but it
      // runs after commit — if we kicked off processBatch first, type-batch
      // would reach main while pauseRequested is still true and get rejected.
      const ipcRenderer = getIpcRenderer();
      if (ipcRenderer) {
        try {
          await ipcRenderer.invoke('register-pause-shortcut');
        } catch (e) {
          console.error('Failed to re-arm pause shortcut on resume:', e);
        }
      }
      if (isPausedRef.current || shouldStopRef.current) return;
      processBatch();
    }
  }, [processBatch]);

  const handleStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    previewTimeoutsRef.current.forEach(clearTimeout);
    previewTimeoutsRef.current = [];
    shouldStopRef.current = true;
    isPausedRef.current = false;

    const ipcRenderer = getIpcRenderer();
    if (ipcRenderer) {
      ipcRenderer.invoke('stop-typing').catch(console.error);
    }

    if (isTyping && !sessionRecordedRef.current) {
      recordSession(false);
    }

    setIsTyping(false);
    setIsPaused(false);
    setIsCountingDown(false);
    setCountdown(0);
    setProgress(0);
    setTypedText('');
    setElapsedTime(0);
    setCurrentEvent(null);
    currentIndexRef.current = 0;
    eventsRef.current = [];
    startTimeRef.current = 0;
  }, [isTyping, recordSession]);

  const handleSettingsChange = useCallback((newSettings: Partial<TypingSettings>) => {
    setSettings(prev => validateSettings({ ...prev, ...newSettings }));
  }, []);

  useEffect(() => {
    const handleToggle = () => {
      if (isTyping) {
        if (isPaused) {
          handleResume();
        } else {
          handlePause();
        }
      } else {
        handleStart();
      }
    };

    const ipcRenderer = getIpcRenderer();
    if (ipcRenderer) {
      ipcRenderer.on('toggle-typing', handleToggle);
      ipcRenderer.on('force-pause', handlePause);

      return () => {
        ipcRenderer.removeListener('toggle-typing', handleToggle);
        ipcRenderer.removeListener('force-pause', handlePause);
      };
    }
  }, [isTyping, isPaused, handleStart, handlePause, handleResume]);

  useEffect(() => {
    const ipcRenderer = getIpcRenderer();
    if (!ipcRenderer) return;
    if (isTyping && !isPaused) {
      ipcRenderer.invoke('register-pause-shortcut').catch(console.error);
      return () => {
        ipcRenderer.invoke('unregister-pause-shortcut').catch(console.error);
      };
    }
  }, [isTyping, isPaused]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      previewTimeoutsRef.current.forEach(clearTimeout);
      previewTimeoutsRef.current = [];
    };
  }, []);

  const charsTypedSoFar = Array.from(typedText).length;
  const actualWPM = elapsedTime > 0 && charsTypedSoFar > 0 ? (charsTypedSoFar / 5) / (elapsedTime / 60000) : 0;

  // Overlay lifecycle: show while typing or counting down when enabled.
  // Fire only on transitions so we don't spam the main process with redundant
  // show/hide IPC on every unrelated re-render.
  useEffect(() => {
    const ipcRenderer = getIpcRenderer();
    if (!ipcRenderer) return;
    const shouldShow = settings.showOverlay && (isTyping || isCountingDown);
    if (shouldShow === overlayShownRef.current) return;
    overlayShownRef.current = shouldShow;
    if (shouldShow) {
      ipcRenderer.invoke('overlay-show').catch(console.error);
    } else {
      ipcRenderer.invoke('overlay-hide').catch(console.error);
    }
  }, [settings.showOverlay, isTyping, isCountingDown]);

  // Overlay live updates
  useEffect(() => {
    if (!settings.showOverlay) return;
    const ipcRenderer = getIpcRenderer();
    if (!ipcRenderer) return;
    ipcRenderer
      .invoke('overlay-update', {
        progress,
        actualWpm: actualWPM,
        elapsedMs: elapsedTime,
        estimatedMs: estimatedTime,
        isPaused,
        isTyping: isTyping || isCountingDown,
      })
      .catch(console.error);
  }, [settings.showOverlay, progress, actualWPM, elapsedTime, estimatedTime, isPaused, isTyping, isCountingDown]);

  useEffect(() => {
    return () => {
      const ipcRenderer = getIpcRenderer();
      if (ipcRenderer) {
        ipcRenderer.invoke('overlay-hide').catch(() => {});
      }
    };
  }, []);

  const eventsSoFar = eventsRef.current.slice(0, currentIndexRef.current);
  const totalKeystrokes = eventsSoFar.length;
  const deleteEvents = eventsSoFar.filter(e => e.type === 'delete').length;
  const accuracy = totalKeystrokes > 0
    ? Math.max(0, Math.min(100, ((totalKeystrokes - (deleteEvents * 2)) / totalKeystrokes) * 100))
    : 100;

  const modKey = isMac ? '⌘' : 'Ctrl';
  const altKey = isMac ? '⌥' : 'Alt';

  const statusLabel = isCountingDown
    ? `Starting in ${countdown}`
    : isTyping
      ? (isPaused ? 'Paused' : 'Typing')
      : progress >= 100 && progress > 0
        ? 'Complete'
        : 'Idle';

  const statusTint = isCountingDown
    ? 'bg-accent-400'
    : isTyping
      ? (isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-soft-pulse')
      : progress >= 100 && progress > 0
        ? 'bg-emerald-400'
        : 'bg-ink-400';

  return (
    <div className="relative min-h-screen overflow-hidden text-ink-50">
      {/* Ambient backdrop */}
      <div className="pointer-events-none fixed inset-0 bg-hero-glow" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 bg-dot-grid opacity-60" aria-hidden="true" />

      {/* Drag strip — sits above the header so the window can be moved from empty space */}
      <div
        className="drag-region fixed top-0 left-0 right-0 h-10 z-20"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-12 sm:pt-14 pb-5 sm:pb-7">
        {/* Header */}
        <header
          className={`flex items-center justify-between gap-4 mb-6 sm:mb-8 ${isMac ? 'pl-[72px]' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-glow-primary">
                <Keyboard className="w-5 h-5" aria-hidden="true" />
              </div>
              {isTyping && !isPaused && (
                <span
                  className="absolute inset-0 rounded-xl ring-2 ring-primary-400/60 animate-pulse-ring"
                  aria-hidden="true"
                />
              )}
            </div>
            <div>
              <h1 className="text-[17px] font-bold tracking-tight leading-tight">
                Auto<span className="text-primary-300">·</span>Typer
              </h1>
              <p className="text-[11px] text-ink-400 leading-tight">
                Human-like typing simulator <span className="text-ink-500">·</span> By Axier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="chip">
              <span className={`status-dot ${statusTint}`} />
              <span className="font-medium">{statusLabel}</span>
            </span>
            <span className="hidden sm:inline-flex chip">
              v1.1.1
            </span>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-5">
          {/* Left column */}
          <div className="space-y-5 min-w-0">
            <TextInput
              value={text}
              onChange={setText}
              disabled={isTyping || isCountingDown}
              typedText={typedText}
              isTyping={isTyping}
            />

            {/* Control bar */}
            <section className="surface p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2.5">
                {!isTyping ? (
                  <button
                    onClick={handleStart}
                    disabled={isCountingDown || !text.trim()}
                    className="btn-primary"
                    aria-label="Start typing simulation"
                  >
                    <Play className="w-4 h-4 fill-white" aria-hidden="true" />
                    {isCountingDown ? `Starting in ${countdown}…` : 'Start typing'}
                  </button>
                ) : (
                  <>
                    {!isPaused ? (
                      <button
                        onClick={handlePause}
                        className="btn-secondary"
                        aria-label="Pause typing"
                      >
                        <Pause className="w-4 h-4" aria-hidden="true" />
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={handleResume}
                        className="btn-primary"
                        aria-label="Resume typing"
                      >
                        <Play className="w-4 h-4 fill-white" aria-hidden="true" />
                        Resume
                      </button>
                    )}
                    <button
                      onClick={handleStop}
                      className="btn-danger"
                      aria-label="Stop typing"
                    >
                      <Square className="w-4 h-4 fill-current" aria-hidden="true" />
                      Stop
                    </button>
                  </>
                )}

                <div className="flex-1" />

                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`btn-secondary ${showSettings ? 'ring-2 ring-primary-500/40' : ''}`}
                  aria-expanded={showSettings}
                  aria-controls="settings-panel"
                >
                  <SettingsIcon className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{showSettings ? 'Hide settings' : 'Settings'}</span>
                  <span className="sm:hidden">Settings</span>
                </button>
              </div>

              {/* Progress */}
              {(isTyping || progress > 0) && (
                <div className="mt-5" aria-live="polite">
                  <div className="flex justify-between text-[11px] uppercase tracking-wider font-medium text-ink-300 mb-2">
                    <span>Progress</span>
                    <span className="num-tabular font-mono text-ink-100">{progress.toFixed(1)}%</span>
                  </div>
                  <div
                    className="relative h-2 w-full rounded-full bg-ink-800 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out"
                      style={{
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #8257fe 0%, #b59bff 60%, #fbbf24 120%)',
                        boxShadow: '0 0 18px rgba(130, 87, 254, 0.6)',
                      }}
                    />
                    {isTyping && !isPaused && (
                      <div
                        className="absolute inset-y-0 left-0 progress-stripe rounded-full"
                        style={{ width: `${progress}%` }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Shortcuts */}
              <div className="hairline mt-5 pt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink-300">
                <div className="flex items-center gap-2">
                  <Command className="w-3 h-3 text-ink-400" aria-hidden="true" />
                  <span className="text-ink-400">Start / resume</span>
                  <span className="flex items-center gap-1">
                    <kbd className="key">{modKey}</kbd>
                    <span className="text-ink-500">+</span>
                    <kbd className="key">{altKey}</kbd>
                    <span className="text-ink-500">+</span>
                    <kbd className="key">\</kbd>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-ink-400">Pause</span>
                  <kbd className="key">Tab</kbd>
                </div>
                <div className="flex-1" />
                <span className="text-ink-500 text-[10px] uppercase tracking-wider">
                  Avoid mouse movement while active
                </span>
              </div>
            </section>

            <StatsDisplay
              isTyping={isTyping}
              progress={progress}
              estimatedTime={estimatedTime}
              elapsedTime={elapsedTime}
              currentEvent={currentEvent}
              settings={settings}
              actualWPM={actualWPM}
              typedLength={charsTypedSoFar}
              totalLength={text.length}
              accuracy={accuracy}
            />

            <HistoryPanel
              entries={history}
              onReload={handleReloadHistory}
              onDelete={handleDeleteHistory}
              onClear={handleClearHistory}
              disabled={isTyping || isCountingDown}
            />
          </div>

          {/* Right column — settings */}
          <div id="settings-panel" className="min-w-0">
            <SettingsPanel
              settings={settings}
              onChange={handleSettingsChange}
              disabled={isTyping}
              isVisible={showSettings}
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSelectProfile={handleSelectProfile}
              onSaveProfile={handleSaveProfile}
              onRenameProfile={handleRenameProfile}
              onDeleteProfile={handleDeleteProfile}
            />
          </div>
        </main>

        <footer className="mt-8 sm:mt-10 flex items-center justify-between gap-4 text-[11px] text-ink-400">
          <p>
            Crafted for realistic typing simulation.
          </p>
          <a
            href="https://axier.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-ink-300 hover:text-primary-300 transition-colors"
          >
            axier.dev
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </footer>
      </div>
    </div>
  );
}

export default App;
