import { TypingSettings } from '../types/typing';

/**
 * Convert words-per-minute to base delay per character in milliseconds
 * Approximation: 1 word ≈ 5 characters
 */
export function wpmToBaseDelayMs(wpm: number): number {
  const charsPerMinute = wpm * 5;
  const charsPerSecond = charsPerMinute / 60;
  const baseDelayMs = 1000 / charsPerSecond;
  return baseDelayMs;
}

/**
 * Get base delay for a specific character before adding randomness
 */
export function getBaseDelayForChar(char: string, settings: TypingSettings): number {
  const baseDelay = wpmToBaseDelayMs(settings.wpm);
  
  // Uppercase letters and special symbols take longer (Shift key)
  if (char >= 'A' && char <= 'Z') {
    return baseDelay + randomBetween(20, 50);
  }
  
  // Special symbols
  if ('!@#$%^&*()_+{}|:"<>?~'.includes(char)) {
    return baseDelay + randomBetween(30, 80);
  }
  
  // Whitespace can be slightly faster (flow)
  if (char === ' ' || char === '\t') {
    return baseDelay * 0.9;
  }
  
  // Newline - slightly longer pause
  if (char === '\n') {
    return baseDelay * 1.2;
  }
  
  return baseDelay;
}

/**
 * Add random noise to delay to simulate human inconsistency
 */
export function addRandomNoiseToDelay(baseDelayMs: number, settings: TypingSettings): number {
  let minOffset: number;
  let maxOffset: number;
  
  switch (settings.speedRandomness) {
    case 0: // Smooth/robot-like
      minOffset = -10;
      maxOffset = 10;
      break;
    case 1: // Normal randomness
      minOffset = -60;
      maxOffset = 80;
      break;
    case 2: // High randomness (very human)
      minOffset = -120;
      maxOffset = 150;
      break;
    default:
      minOffset = -60;
      maxOffset = 80;
  }
  
  const randomOffset = randomBetween(minOffset, maxOffset);
  const finalDelay = baseDelayMs + randomOffset;
  
  // Ensure minimum delay (humans can't type faster than this)
  return Math.max(finalDelay, 30);
}

/**
 * Get extra delay based on context (punctuation, sentence boundaries, etc.)
 */
export function getContextExtraDelay(
  text: string,
  index: number,
  settings: TypingSettings
): number {
  let extraDelay = 0;
  
  if (!settings.usePunctuationPauses && !settings.useLongWordPauses) {
    return 0;
  }
  
  const char = text[index];
  const prevChar = index > 0 ? text[index - 1] : '';
  
  // Punctuation pause (after typing the punctuation)
  if (settings.usePunctuationPauses && '.,;:!?'.includes(prevChar)) {
    extraDelay += randomBetween(200, 500);
  }
  
  // Sentence boundary pause (dot/question mark + space, before next char)
  if (settings.usePunctuationPauses && prevChar === ' ') {
    const prevPrevChar = index > 1 ? text[index - 2] : '';
    if ('.?!'.includes(prevPrevChar) && char !== ' ') {
      extraDelay += randomBetween(300, 800);
    }
  }
  
  // Long word hesitation
  if (settings.useLongWordPauses) {
    const wordLength = getUpcomingWordLength(text, index);
    if (wordLength >= 10) {
      extraDelay += randomBetween(200, 400);
    } else if (wordLength >= 8) {
      extraDelay += randomBetween(100, 250);
    }
  }
  
  // Paragraph break (double newline)
  if (char === '\n' && prevChar === '\n') {
    extraDelay += randomBetween(500, 1000);
  }
  
  return extraDelay;
}

/**
 * Get burst typing multiplier (sometimes humans type fast in bursts)
 */
export function getBurstTypingMultiplier(settings: TypingSettings): number {
  if (!settings.useBursts) {
    return 1.0;
  }
  
  // 15% chance of entering a burst
  if (Math.random() < 0.15) {
    return randomBetween(0.3, 0.5); // Much faster
  }
  
  return 1.0;
}

/**
 * Get delay for backspace key
 */
export function getBackspaceDelay(_settings: TypingSettings): number {
  const baseDelay = randomBetween(60, 120);
  const noise = randomBetween(-20, 30);
  return Math.max(baseDelay + noise, 40);
}

/**
 * Helper: Get length of upcoming word starting at index
 */
function getUpcomingWordLength(text: string, index: number): number {
  let length = 0;
  for (let i = index; i < text.length; i++) {
    const char = text[i];
    if (char === ' ' || char === '\n' || char === '\t') {
      break;
    }
    length++;
  }
  return length;
}

/**
 * Helper: Random number between min and max (inclusive)
 */
export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
