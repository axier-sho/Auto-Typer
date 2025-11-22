import { TypingSettings } from '../types/typing';
import { randomBetween } from './timing';

/**
 * Detect word difficulty score (0-10)
 */
export function detectWordDifficulty(word: string): number {
  let difficulty = 0;
  
  // Base difficulty on length
  if (word.length > 12) difficulty += 4;
  else if (word.length > 8) difficulty += 2;
  else if (word.length > 5) difficulty += 1;
  
  // Rare letters increase difficulty
  const rareLetters = 'qxzQXZ';
  for (const char of word) {
    if (rareLetters.includes(char)) {
      difficulty += 1;
    }
  }
  
  // Mixed case increases difficulty
  let hasUpper = false;
  let hasLower = false;
  for (const char of word) {
    if (char >= 'A' && char <= 'Z') hasUpper = true;
    if (char >= 'a' && char <= 'z') hasLower = true;
  }
  if (hasUpper && hasLower) difficulty += 2;
  
  // Special characters increase difficulty
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
  for (const char of word) {
    if (specialChars.includes(char)) {
      difficulty += 1;
    }
  }
  
  return Math.min(difficulty, 10);
}

/**
 * Adjust mistake probability based on position in text
 */
export function adjustMistakeProbabilityOverTime(
  position: number,
  totalLength: number,
  baseProbability: number
): number {
  const progress = position / totalLength;
  
  // Start: careful (80% of base)
  if (progress < 0.1) {
    return baseProbability * 0.8;
  }
  
  // Middle: more mistakes (120% of base)
  if (progress > 0.3 && progress < 0.7) {
    return baseProbability * 1.2;
  }
  
  // End: back to careful (90% of base)
  if (progress > 0.9) {
    return baseProbability * 0.9;
  }
  
  return baseProbability;
}

/**
 * Adjust typing speed based on position in text
 */
export function adjustSpeedOverTime(
  position: number,
  totalLength: number
): number {
  const progress = position / totalLength;
  
  // Start: slightly slower (warmer up)
  if (progress < 0.05) {
    return 1.15; // 15% slower
  }
  
  // Middle: slightly faster (warmed up)
  if (progress > 0.2 && progress < 0.8) {
    return 0.95; // 5% faster
  }
  
  // Near end: back to normal or slightly slower
  if (progress > 0.95) {
    return 1.05; // 5% slower
  }
  
  return 1.0;
}

/**
 * Decide if should insert a micro-pause (small thinking pause)
 */
export function shouldInsertMicroPause(settings: TypingSettings): boolean {
  if (!settings.useMicroPauses) {
    return false;
  }
  
  // 5% chance of micro pause at word boundaries
  return Math.random() < 0.05;
}

/**
 * Get micro-pause duration
 */
export function getMicroPauseDelay(): number {
  return randomBetween(100, 300);
}

/**
 * Decide if should insert a thinking pause (longer pause)
 */
export function shouldInsertThinkingPause(
  text: string,
  index: number,
  settings: TypingSettings
): boolean {
  if (!settings.useThinkingPauses) {
    return false;
  }
  
  const char = text[index];
  const prevChar = index > 0 ? text[index - 1] : '';
  
  // Before opening parenthesis or quote
  if (char === '(' || char === '"' || char === "'") {
    return Math.random() < 0.3; // 30% chance
  }
  
  // Before starting a new sentence
  if (prevChar === ' ' && index > 1) {
    const prevPrevChar = text[index - 2];
    if ('.?!'.includes(prevPrevChar)) {
      return Math.random() < 0.2; // 20% chance
    }
  }
  
  // Before a long word
  const upcomingWord = getUpcomingWord(text, index);
  if (upcomingWord.length > 10) {
    return Math.random() < 0.15; // 15% chance
  }
  
  return false;
}

/**
 * Get thinking pause duration
 */
export function getThinkingPauseDelay(): number {
  return randomBetween(500, 1500);
}

/**
 * Estimate total time from events
 */
export function estimateTotalTime(events: { delayMs: number }[]): number {
  return events.reduce((total, event) => total + event.delayMs, 0);
}

/**
 * Get the upcoming word starting at index
 */
function getUpcomingWord(text: string, index: number): string {
  let word = '';
  for (let i = index; i < text.length; i++) {
    const char = text[i];
    if (char === ' ' || char === '\n' || char === '\t') {
      break;
    }
    word += char;
  }
  return word;
}

/**
 * Extract word from text at position
 */
export function getWordAtPosition(text: string, index: number): string {
  // Find start of word
  let start = index;
  while (start > 0 && text[start - 1] !== ' ' && text[start - 1] !== '\n') {
    start--;
  }
  
  // Find end of word
  let end = index;
  while (end < text.length && text[end] !== ' ' && text[end] !== '\n') {
    end++;
  }
  
  return text.substring(start, end);
}

/**
 * Check if position is at start of word
 */
export function isStartOfWord(text: string, index: number): boolean {
  if (index === 0) return true;
  const prevChar = text[index - 1];
  return prevChar === ' ' || prevChar === '\n' || prevChar === '\t';
}

/**
 * Check if position is at end of word
 */
export function isEndOfWord(text: string, index: number): boolean {
  if (index >= text.length - 1) return true;
  const nextChar = text[index + 1];
  return nextChar === ' ' || nextChar === '\n' || nextChar === '\t';
}
