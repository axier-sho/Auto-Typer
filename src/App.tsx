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

  const handleStart = useCallback(() => {
    if (!text.trim()) {
      alert('Please enter some text to type!');
      return;
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
      startTimeRef.current = Date.now();
      
      executeNextEvent();
    } catch (error) {
      console.error('Error planning typing:', error);
      alert('An error occurred while planning the typing sequence.');
    }
  }, [text, settings]);

  const executeNextEvent = useCallback(() => {
    if (currentIndexRef.current >= eventsRef.current.length) {
      // Typing complete
      setIsTyping(false);
      setProgress(100);
      setCurrentEvent(null);
      return;
    }

    const event = eventsRef.current[currentIndexRef.current];
    setCurrentEvent(event);

    // Update progress
    const progressPercent = (currentIndexRef.current / eventsRef.current.length) * 100;
    setProgress(progressPercent);

    // Update elapsed time
    const elapsed = Date.now() - startTimeRef.current;
    setElapsedTime(elapsed);

    // Execute event
    if (event.type === 'type' && event.char) {
      setTypedText(prev => prev + event.char);
    } else if (event.type === 'delete') {
      setTypedText(prev => prev.slice(0, -1));
    }

    currentIndexRef.current++;

    // Schedule next event
    typingTimeoutRef.current = window.setTimeout(() => {
      executeNextEvent();
    }, event.delayMs);
  }, []);

  const handlePause = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsPaused(true);
    pauseTimeRef.current = Date.now();
  }, []);

  const handleResume = useCallback(() => {
    if (isPaused) {
      const pauseDuration = Date.now() - pauseTimeRef.current;
      startTimeRef.current += pauseDuration;
      setIsPaused(false);
      executeNextEvent();
    }
  }, [isPaused, executeNextEvent]);

  const handleStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsTyping(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentEvent(null);
    setTypedText('');
    setElapsedTime(0);
    currentIndexRef.current = 0;
    eventsRef.current = [];
  }, []);

  const handleSettingsChange = useCallback((newSettings: Partial<TypingSettings>) => {
    setSettings(prev => validateSettings({ ...prev, ...newSettings }));
  }, []);

  // Listen for global hotkey (Cmd+Shift+X) from Electron
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
      
      return () => {
        ipcRenderer.removeListener('toggle-typing', handleToggle);
      };
    }
  }, [isTyping, isPaused, handleStart, handlePause, handleResume]);

  const actualWPM = elapsedTime > 0 ? calculateActualWPM(typedText, elapsedTime) : 0;

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
                <div className="flex items-start gap-2 text-sm text-slate-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Press <kbd className="px-2 py-0.5 bg-slate-700 rounded text-xs font-mono">⌘ Cmd</kbd> + 
                    <kbd className="px-2 py-0.5 bg-slate-700 rounded text-xs font-mono ml-1">⇧ Shift</kbd> + 
                    <kbd className="px-2 py-0.5 bg-slate-700 rounded text-xs font-mono ml-1">X</kbd> to start/pause typing from <strong>any app</strong> (global)
                  </span>
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
              typedLength={typedText.length}
              totalLength={text.length}
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
