/**
 * Auto-Typer - Human-like Typing Simulator
 * Developed by Axier
 * Website: https://axier.dev
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Settings as SettingsIcon, Keyboard, AlertCircle } from 'lucide-react';
import { planTyping, getDefaultSettings, validateSettings, calculateActualWPM } from './engine/planning';
import { TypingSettings, TypingEvent } from './types/typing';
import SettingsPanel from './components/SettingsPanel';
import StatsDisplay from './components/StatsDisplay';
import TextInput from './components/TextInput';

function App() {
  const [text, setText] = useState('');
  const [settings, setSettings] = useState<TypingSettings>(getDefaultSettings());
  const [isTyping, setIsTyping] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentEvent, setCurrentEvent] = useState<TypingEvent | null>(null);
  const [typedText, setTypedText] = useState('');
  
  const typingTimeoutRef = useRef<number | null>(null);
  const eventsRef = useRef<TypingEvent[]>([]);
  const currentIndexRef = useRef(0);
  const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);
  const shouldStopRef = useRef(false);

  const handleStart = useCallback(async () => {
    if (!text.trim()) {
      alert('Please enter some text to type!');
      return;
    }

    // Check permissions in Electron
    // @ts-ignore - Electron IPC
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
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
      // Validate and create typing plan
      const validatedSettings = validateSettings(settings);
      const plan = planTyping(text, validatedSettings);
      
      eventsRef.current = plan.events;
      currentIndexRef.current = 0;
      setEstimatedTime(plan.totalTimeMs);
      setIsTyping(true);
      setIsPaused(false);
      setProgress(0);
      setTypedText('');
      setElapsedTime(0);
      shouldStopRef.current = false;
      
      // Wait 1 second before starting to type (gives time to switch to target app)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      startTimeRef.current = Date.now();
      processBatch();
    } catch (error) {
      console.error('Error planning typing:', error);
      alert('An error occurred while planning the typing sequence.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, settings]);

  const finishTyping = useCallback(() => {
    const totalTime = Date.now() - startTimeRef.current;
    const actualWPM = calculateActualWPM(text, totalTime);
    console.log(`✅ Typing complete! Target: ${settings.wpm} WPM, Actual: ${actualWPM.toFixed(1)} WPM, Time: ${(totalTime/1000).toFixed(1)}s`);
    
    setIsTyping(false);
    setProgress(100);
    setCurrentEvent(null);
  }, [text, settings]);

  const processBatch = useCallback(async () => {
    if (currentIndexRef.current >= eventsRef.current.length) {
      finishTyping();
      return;
    }

    if (isPaused || shouldStopRef.current) {
      return;
    }

    // Create a batch of events (approx 50 events or until end)
    const BATCH_SIZE = 50;
    const endIndex = Math.min(currentIndexRef.current + BATCH_SIZE, eventsRef.current.length);
    const batchEvents = eventsRef.current.slice(currentIndexRef.current, endIndex);
    
    // Update current event for display (using the first event of the batch)
    if (batchEvents.length > 0) {
        setCurrentEvent(batchEvents[0]);
    }

    // Execute batch via IPC
    // @ts-ignore - Electron IPC
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        
        // Send batch to main process
        // This promise resolves when the batch is fully typed by the main process
        await ipcRenderer.invoke('type-batch', batchEvents);
        
        // Check if we should stop before updating state
        if (shouldStopRef.current || isPaused) {
          return;
        }
        
        // Update local state after batch is done
        batchEvents.forEach(event => {
           if (event.type === 'type' && event.char) {
             setTypedText(prev => prev + event.char);
           } else if (event.type === 'delete') {
             setTypedText(prev => prev.slice(0, -1));
           }
        });
        
      } catch (error) {
        console.error('Error executing batch:', error);
      }
    } else {
      // Fallback for browser preview (simulate delay)
      for (const event of batchEvents) {
        if (event.type === 'type' && event.char) {
          setTypedText(prev => prev + event.char);
        } else if (event.type === 'delete') {
          setTypedText(prev => prev.slice(0, -1));
        }
        await new Promise(resolve => setTimeout(resolve, event.delayMs));
      }
    }

    // Update progress
    currentIndexRef.current = endIndex;
    const progressPercent = (currentIndexRef.current / eventsRef.current.length) * 100;
    setProgress(progressPercent);
    
    const elapsed = Date.now() - startTimeRef.current;
    setElapsedTime(elapsed);

    // Schedule next batch immediately (recursion via timeout to allow UI updates)
    if (!isPaused && !shouldStopRef.current) {
        typingTimeoutRef.current = window.setTimeout(() => {
            processBatch();
        }, 0);
    }
  }, [isPaused, finishTyping]);


  // Keep executeNextEvent as a dummy or remove usage if fully replaced
  // But since I'm replacing the logic inside handleStart to call processBatch, I can remove executeNextEvent entirely or repurpose it.
  // I will replace the entire block where executeNextEvent was defined.

  const handlePause = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    shouldStopRef.current = true;
    setIsPaused(true);
    pauseTimeRef.current = Date.now();
  }, []);

  const handleResume = useCallback(() => {
    if (isPaused) {
      const pauseDuration = Date.now() - pauseTimeRef.current;
      startTimeRef.current += pauseDuration;
      shouldStopRef.current = false;
      setIsPaused(false);
      // Resume batch processing
      processBatch();
    }
  }, [isPaused, processBatch]);


  const handleStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    shouldStopRef.current = true;
    setIsTyping(false);
    setIsPaused(false);
    setProgress(0);
    setTypedText('');
    setElapsedTime(0);
    currentIndexRef.current = 0;
    eventsRef.current = [];
  }, []);

  const handleSettingsChange = useCallback((newSettings: Partial<TypingSettings>) => {
    setSettings(prev => validateSettings({ ...prev, ...newSettings }));
  }, []);

  // Listen for global hotkey (Cmd+Shift+Y) from Electron
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

    // @ts-ignore - Electron IPC
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.on('toggle-typing', handleToggle);
      ipcRenderer.on('force-pause', handlePause);
      
      return () => {
        ipcRenderer.removeListener('toggle-typing', handleToggle);
        ipcRenderer.removeListener('force-pause', handlePause);
      };
    }
  }, [isTyping, isPaused, handleStart, handlePause, handleResume]);

  // Manage dynamic "Tab to Pause" shortcut
  useEffect(() => {
    // @ts-ignore - Electron IPC
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      
      if (isTyping && !isPaused) {
        // Active typing: Grab Tab key
        ipcRenderer.invoke('register-pause-shortcut');
      } else {
        // Paused or Stopped: Release Tab key
        ipcRenderer.invoke('unregister-pause-shortcut');
      }
      
      // Cleanup on unmount
      return () => {
        ipcRenderer.invoke('unregister-pause-shortcut');
      };
    }
  }, [isTyping, isPaused]);

  // Calculate WPM based on current index position instead of typedText to avoid stale closure
  const charsTypedSoFar = currentIndexRef.current;
  const actualWPM = elapsedTime > 0 && charsTypedSoFar > 0 ? (charsTypedSoFar / 5) / (elapsedTime / 60000) : 0;
  
  // Calculate accuracy
  const eventsSoFar = eventsRef.current.slice(0, currentIndexRef.current);
  const totalKeystrokes = eventsSoFar.length;
  const deleteEvents = eventsSoFar.filter(e => e.type === 'delete').length;
  const accuracy = totalKeystrokes > 0 
    ? Math.max(0, ((totalKeystrokes - (deleteEvents * 2)) / totalKeystrokes) * 100)
    : 100;
  // Note: multiply deletes by 2 because each delete implies 1 wrong char typed + 1 backspace. 
  // Or more simply: Correct Chars / Total Keystrokes.
  // Correct Chars ~= Total Keystrokes - (Delete Events * 2). 
  // Example: Type 'a' (wrong), Backspace, Type 'b' (correct). Total 3 keys. Correct 1. Accuracy 33%.
  // Example: Type 'b' (correct). Total 1 key. Correct 1. Accuracy 100%.
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Keyboard className="w-8 h-8 text-primary-500" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              Auto-Typer
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            Human-like typing simulator with advanced behavior modeling
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Text Input */}
            <TextInput
              value={text}
              onChange={setText}
              disabled={isTyping}
              typedText={typedText}
              isTyping={isTyping}
            />

            {/* Controls */}
            <div className="card p-6">
              <div className="flex flex-wrap gap-4">
                {!isTyping ? (
                  <button
                    onClick={handleStart}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Start Typing
                  </button>
                ) : (
                  <>
                    {!isPaused ? (
                      <button
                        onClick={handlePause}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <Pause className="w-5 h-5" />
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={handleResume}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Play className="w-5 h-5" />
                        Resume
                      </button>
                    )}
                    <button
                      onClick={handleStop}
                      className="btn-danger flex items-center gap-2"
                    >
                      <Pause className="w-5 h-5" />
                      Stop
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`btn-secondary flex items-center gap-2 ${showSettings ? 'ring-2 ring-primary-500' : ''}`}
                  disabled={isTyping}
                >
                  <SettingsIcon className="w-5 h-5" />
                  Settings
                </button>
              </div>

              {/* Progress Bar */}
              {isTyping && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>Progress</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Keyboard Shortcut Info */}
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex flex-col gap-2 text-sm text-slate-400">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Press <kbd className="px-2 py-0.5 bg-slate-700 rounded text-xs font-mono">⌘ Cmd</kbd> + 
                      <kbd className="px-2 py-0.5 bg-slate-700 rounded text-xs font-mono ml-1">⌥ Alt</kbd> + 
                      <kbd className="px-2 py-0.5 bg-slate-700 rounded text-xs font-mono ml-1">\</kbd> to start/resume
                    </span>
                    <span className="block mt-1 text-slate-500">
                      Press <kbd className="px-2 py-0.5 bg-slate-700 rounded text-xs font-mono">Tab</kbd> to pause
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 ml-6 space-y-1">
                    <div>⚠️ Avoid excessive mouse movement while typing is active</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Display */}
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
          </div>

          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <SettingsPanel
              settings={settings}
              onChange={handleSettingsChange}
              disabled={isTyping}
              isVisible={showSettings}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-slate-500 text-xs">
          <p>
            Made with ❤️ for realistic typing simulation | Developed by{' '}
            <a 
              href="https://axier.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-400 hover:text-primary-300 transition-colors"
            >
              Axier
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
