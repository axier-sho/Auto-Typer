import { TypingSettings, TypingEvent, MistakeSequence } from '../types/typing';
import { getBaseDelayForChar, addRandomNoiseToDelay, getBackspaceDelay, randomBetween } from './timing';

/**
 * Keyboard neighbor map for realistic typos
 */
const KEYBOARD_NEIGHBORS: { [key: string]: string[] } = {
  'a': ['q', 'w', 's', 'z'],
  'b': ['v', 'g', 'h', 'n'],
  'c': ['x', 'd', 'f', 'v'],
  'd': ['s', 'e', 'r', 'f', 'c', 'x'],
  'e': ['w', 's', 'd', 'r'],
  'f': ['d', 'r', 't', 'g', 'v', 'c'],
  'g': ['f', 't', 'y', 'h', 'b', 'v'],
  'h': ['g', 'y', 'u', 'j', 'n', 'b'],
  'i': ['u', 'j', 'k', 'o'],
  'j': ['h', 'u', 'i', 'k', 'm', 'n'],
  'k': ['j', 'i', 'o', 'l', 'm'],
  'l': ['k', 'o', 'p'],
  'm': ['n', 'j', 'k'],
  'n': ['b', 'h', 'j', 'm'],
  'o': ['i', 'k', 'l', 'p'],
  'p': ['o', 'l'],
  'q': ['w', 'a'],
  'r': ['e', 'd', 'f', 't'],
  's': ['a', 'w', 'e', 'd', 'x', 'z'],
  't': ['r', 'f', 'g', 'y'],
  'u': ['y', 'h', 'j', 'i'],
  'v': ['c', 'f', 'g', 'b'],
  'w': ['q', 'a', 's', 'e'],
  'x': ['z', 's', 'd', 'c'],
  'y': ['t', 'g', 'h', 'u'],
  'z': ['a', 's', 'x'],
};

/**
 * Decide whether to start a typo at this position
 */
export function shouldStartMistake(
  text: string,
  index: number,
  settings: TypingSettings,
  overallProgress: number
): boolean {
  const char = text[index];
  
  // Don't make mistakes on spaces or newlines
  if (char === ' ' || char === '\n' || char === '\t') {
    return false;
  }
  
  let probability = settings.mistakeProbability;
  
  // Adjust probability based on settings
  if (settings.adjustMistakesOverTime) {
    probability = adjustMistakeProbabilityOverTime(overallProgress, probability);
  }
  
  // More mistakes in the middle of words
  const prevChar = index > 0 ? text[index - 1] : ' ';
  const nextChar = index < text.length - 1 ? text[index + 1] : ' ';
  if (prevChar !== ' ' && nextChar !== ' ') {
    probability *= 1.3; // 30% more likely
  }
  
  return Math.random() < probability;
}

/**
 * Decide how many extra correct letters to type after the wrong letter
 */
export function decideExtraLettersAfterMistake(settings: TypingSettings): number {
  const max = settings.maxExtraLettersAfterMistake;
  if (max === 0) return 0;
  
  // Weighted toward fewer extra letters (40% 0, 30% 1, 20% 2, 10% 3+)
  const rand = Math.random();
  
  if (rand < 0.4) return 0;
  if (rand < 0.7) return 1;
  if (rand < 0.9) return Math.min(2, max);
  return Math.min(randomBetween(3, max), max);
}

/**
 * Choose a wrong character based on keyboard proximity
 */
export function chooseWrongChar(correctChar: string): string {
  const lowerChar = correctChar.toLowerCase();
  
  // Try to get keyboard neighbor
  if (KEYBOARD_NEIGHBORS[lowerChar]) {
    const neighbors = KEYBOARD_NEIGHBORS[lowerChar];
    const wrongChar = neighbors[Math.floor(Math.random() * neighbors.length)];
    
    // Match case of original
    if (correctChar === correctChar.toUpperCase()) {
      return wrongChar.toUpperCase();
    }
    return wrongChar;
  }
  
  // Fallback: random letter
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let wrongChar = letters[Math.floor(Math.random() * letters.length)];
  
  // Match case
  if (correctChar === correctChar.toUpperCase()) {
    return wrongChar.toUpperCase();
  }
  return wrongChar;
}

/**
 * Generate delete events (backspaces)
 */
export function generateDeleteEvents(count: number, settings: TypingSettings): TypingEvent[] {
  const events: TypingEvent[] = [];
  
  for (let i = 0; i < count; i++) {
    events.push({
      type: 'delete',
      delayMs: getBackspaceDelay(settings),
    });
  }
  
  return events;
}

/**
 * Generate retype events for correct characters
 */
export function generateRetypeEvents(
  correctChars: string,
  settings: TypingSettings
): TypingEvent[] {
  const events: TypingEvent[] = [];
  
  for (const char of correctChars) {
    const baseDelay = getBaseDelayForChar(char, settings);
    const finalDelay = addRandomNoiseToDelay(baseDelay, settings);
    
    events.push({
      type: 'type',
      char,
      delayMs: finalDelay,
    });
  }
  
  return events;
}

/**
 * Create a full mistake sequence: wrong char → extra chars → deletes → correct retype
 */
export function createMistakeSequence(
  text: string,
  index: number,
  settings: TypingSettings
): MistakeSequence {
  const events: TypingEvent[] = [];
  const correctChar = text[index];
  
  // 1. Type wrong character
  const wrongChar = chooseWrongChar(correctChar);
  const wrongCharDelay = getBaseDelayForChar(wrongChar, settings);
  events.push({
    type: 'type',
    char: wrongChar,
    delayMs: addRandomNoiseToDelay(wrongCharDelay, settings),
  });
  
  // 2. Decide how many extra letters to type before noticing
  const extraLetters = decideExtraLettersAfterMistake(settings);
  let newIndex = index;
  
  // Type extra letters (if any)
  for (let i = 0; i < extraLetters && index + i + 1 < text.length; i++) {
    const nextChar = text[index + i + 1];
    const nextCharDelay = getBaseDelayForChar(nextChar, settings);
    events.push({
      type: 'type',
      char: nextChar,
      delayMs: addRandomNoiseToDelay(nextCharDelay, settings),
    });
    newIndex++;
  }
  
  // 3. Pause (realize mistake)
  const pauseDelay = randomBetween(100, 300);
  if (events.length > 0) {
    events[events.length - 1].delayMs += pauseDelay;
  }
  
  // 4. Delete wrong chars (wrong char + extra correct chars)
  const deleteCount = extraLetters + 1;
  const deleteEvents = generateDeleteEvents(deleteCount, settings);
  events.push(...deleteEvents);
  
  // 5. Retype correctly
  const charsToRetype = text.substring(index, newIndex + 1);
  const retypeEvents = generateRetypeEvents(charsToRetype, settings);
  events.push(...retypeEvents);
  
  return {
    events,
    newIndex,
  };
}

/**
 * Adjust mistake probability based on position in text
 */
function adjustMistakeProbabilityOverTime(progress: number, baseProbability: number): number {
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
 * Create transposition mistake (swap two letters: "teh" instead of "the")
 */
export function createTranspositionMistake(
  text: string,
  index: number,
  settings: TypingSettings
): MistakeSequence | null {
  if (index + 1 >= text.length) return null;
  
  const char1 = text[index];
  const char2 = text[index + 1];
  
  // Skip if either is space/newline
  if (char1 === ' ' || char2 === ' ' || char1 === '\n' || char2 === '\n') {
    return null;
  }
  
  const events: TypingEvent[] = [];
  
  // Type second char first
  const delay2 = getBaseDelayForChar(char2, settings);
  events.push({
    type: 'type',
    char: char2,
    delayMs: addRandomNoiseToDelay(delay2, settings),
  });
  
  // Type first char
  const delay1 = getBaseDelayForChar(char1, settings);
  events.push({
    type: 'type',
    char: char1,
    delayMs: addRandomNoiseToDelay(delay1, settings),
  });
  
  // Pause (realize)
  events[events.length - 1].delayMs += randomBetween(150, 350);
  
  // Delete both
  const deleteEvents = generateDeleteEvents(2, settings);
  events.push(...deleteEvents);
  
  // Retype correctly
  const retypeEvents = generateRetypeEvents(char1 + char2, settings);
  events.push(...retypeEvents);
  
  return {
    events,
    newIndex: index + 1,
  };
}
