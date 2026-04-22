import { TypingSettings } from '../types/typing';
import { randomBetween } from './timing';

const JP_SENTENCE_END = '。．！？';
const JP_OPEN_BRACKETS = '「『（【〈《';

type Script = 'hiragana' | 'katakana' | 'kanji' | 'latin' | 'other';

function getScript(ch: string): Script {
  if (!ch) return 'other';
  const cp = ch.codePointAt(0) ?? 0;
  if (cp >= 0x3040 && cp <= 0x309f) return 'hiragana';
  if ((cp >= 0x30a0 && cp <= 0x30ff) || (cp >= 0x31f0 && cp <= 0x31ff)) return 'katakana';
  if ((cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf)) return 'kanji';
  if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) return 'latin';
  return 'other';
}

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
  
  // Before opening parenthesis or quote (incl. Japanese brackets)
  if (char === '(' || char === '"' || char === "'" || JP_OPEN_BRACKETS.includes(char)) {
    return Math.random() < 0.3; // 30% chance
  }

  // Before starting a new sentence.
  // Japanese has no space after 。！？ — fire directly from prevChar.
  // Guard prevChar: String#includes('') returns true, so the empty-string
  // case at index 0 would otherwise trigger this branch.
  if (prevChar && JP_SENTENCE_END.includes(prevChar)) {
    return Math.random() < 0.2;
  }
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
  if (prevChar === ' ' || prevChar === '\n' || prevChar === '\t') return true;
  // Japanese has no spaces — treat a script transition (e.g. kanji↔hiragana,
  // katakana↔latin) as a word boundary so micro-pauses and burst-starts still
  // fire in Japanese prose.
  const prevScript = getScript(prevChar);
  const currScript = getScript(text[index] ?? '');
  if (prevScript !== currScript && prevScript !== 'other' && currScript !== 'other') {
    return true;
  }
  return false;
}

/**
 * Check if position is at end of word
 */
export function isEndOfWord(text: string, index: number): boolean {
  if (index >= text.length - 1) return true;
  const nextChar = text[index + 1];
  return nextChar === ' ' || nextChar === '\n' || nextChar === '\t';
}
