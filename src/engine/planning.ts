import { TypingSettings, TypingEvent, TypingPlan } from '../types/typing';
import {
  getBaseDelayForChar,
  addRandomNoiseToDelay,
  getContextExtraDelay,
  getBurstTypingMultiplier,
} from './timing';
import { shouldStartMistake, createMistakeSequence, createTranspositionMistake } from './mistakes';
import {
  shouldInsertMicroPause,
  getMicroPauseDelay,
  shouldInsertThinkingPause,
  getThinkingPauseDelay,
  estimateTotalTime,
  adjustSpeedOverTime,
  isStartOfWord,
} from './humanBehavior';

/**
 * Main planning function: Create the full script of typing actions before anything starts
 */
export function planTyping(text: string, settings: TypingSettings): TypingPlan {
  const events: TypingEvent[] = [];
  let index = 0;
  let burstCounter = 0;
  let burstMultiplier = 1.0;
  
  while (index < text.length) {
    const progress = index / text.length;
    
    // Check for thinking pause before typing this character
    if (shouldInsertThinkingPause(text, index, settings)) {
      if (events.length > 0) {
        events[events.length - 1].delayMs += getThinkingPauseDelay();
      }
    }
    
    // Check for transposition mistake (5% chance at word start)
    if (
      isStartOfWord(text, index) &&
      Math.random() < 0.05 &&
      settings.mistakeProbability > 0
    ) {
      const transposition = createTranspositionMistake(text, index, settings);
      if (transposition) {
        events.push(...transposition.events);
        index = transposition.newIndex + 1;
        continue;
      }
    }
    
    // Check for regular mistake
    if (shouldStartMistake(text, index, settings, progress)) {
      const mistakeSequence = createMistakeSequence(text, index, settings);
      events.push(...mistakeSequence.events);
      index = mistakeSequence.newIndex + 1;
      continue;
    }
    
    // Normal typing
    const event = createNormalTypeEvent(text, index, settings, progress);
    
    // Apply burst multiplier
    if (burstCounter > 0) {
      event.delayMs *= burstMultiplier;
      burstCounter--;
      
      // After burst, add a slightly longer pause
      if (burstCounter === 0) {
        event.delayMs += 100;
      }
    } else {
      // Check if starting new burst
      burstMultiplier = getBurstTypingMultiplier(settings);
      if (burstMultiplier < 1.0) {
        burstCounter = Math.floor(Math.random() * 3) + 3; // 3-5 chars
      }
    }
    
    // Apply speed adjustment over time
    if (settings.adjustSpeedOverTime) {
      const speedMultiplier = adjustSpeedOverTime(index, text.length);
      event.delayMs *= speedMultiplier;
    }
    
    // Check for micro-pause at word boundaries
    if (isStartOfWord(text, index) && shouldInsertMicroPause(settings)) {
      event.delayMs += getMicroPauseDelay();
    }
    
    events.push(event);
    index++;
  }
  
  const totalTimeMs = estimateTotalTime(events);
  
  return {
    events,
    totalTimeMs,
  };
}

/**
 * Create a single normal typing event for one character
 */
export function createNormalTypeEvent(
  text: string,
  index: number,
  settings: TypingSettings,
  _progress?: number
): TypingEvent {
  const char = text[index];
  
  // Get base delay
  let baseDelay = getBaseDelayForChar(char, settings);
  
  // Add context-based extra delay
  const contextDelay = getContextExtraDelay(text, index, settings);
  baseDelay += contextDelay;
  
  // Add randomness
  const finalDelay = addRandomNoiseToDelay(baseDelay, settings);
  
  return {
    type: 'type',
    char,
    delayMs: Math.max(finalDelay, 20), // Ensure minimum delay
  };
}

/**
 * Get default typing settings
 */
export function getDefaultSettings(): TypingSettings {
  return {
    wpm: 80,
    mistakeProbability: 0.02,
    maxExtraLettersAfterMistake: 2,
    speedRandomness: 1,
    usePunctuationPauses: true,
    useLongWordPauses: true,
    useBursts: true,
    useMicroPauses: true,
    useThinkingPauses: true,
    adjustSpeedOverTime: true,
    adjustMistakesOverTime: true,
  };
}

/**
 * Validate typing settings
 */
export function validateSettings(settings: Partial<TypingSettings>): TypingSettings {
  const defaults = getDefaultSettings();
  
  return {
    wpm: Math.max(10, Math.min(settings.wpm ?? defaults.wpm, 200)),
    mistakeProbability: Math.max(0, Math.min(settings.mistakeProbability ?? defaults.mistakeProbability, 0.5)),
    maxExtraLettersAfterMistake: Math.max(0, Math.min(settings.maxExtraLettersAfterMistake ?? defaults.maxExtraLettersAfterMistake, 10)),
    speedRandomness: Math.max(0, Math.min(settings.speedRandomness ?? defaults.speedRandomness, 2)),
    usePunctuationPauses: settings.usePunctuationPauses ?? defaults.usePunctuationPauses,
    useLongWordPauses: settings.useLongWordPauses ?? defaults.useLongWordPauses,
    useBursts: settings.useBursts ?? defaults.useBursts,
    useMicroPauses: settings.useMicroPauses ?? defaults.useMicroPauses,
    useThinkingPauses: settings.useThinkingPauses ?? defaults.useThinkingPauses,
    adjustSpeedOverTime: settings.adjustSpeedOverTime ?? defaults.adjustSpeedOverTime,
    adjustMistakesOverTime: settings.adjustMistakesOverTime ?? defaults.adjustMistakesOverTime,
  };
}

/**
 * Format time in human-readable format
 */
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Calculate actual WPM from events
 */
export function calculateActualWPM(text: string, totalTimeMs: number): number {
  const words = text.length / 5; // Approximate words
  const minutes = totalTimeMs / 60000;
  return Math.round(words / minutes);
}
