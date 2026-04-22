import { TypingSettings, TypingEvent, MistakeSequence } from '../types/typing';
import { getBaseDelayForChar, addRandomNoiseToDelay, getBackspaceDelay, randomBetween } from './timing';

const HOMOPHONE_GROUPS: string[][] = [
  ['their', 'there', "they're"],
  ['your', "you're"],
  ['its', "it's"],
  ['then', 'than'],
  ['to', 'too'],
  ['form', 'from'],
  ['affect', 'effect'],
  ['lose', 'loose'],
  ['whose', "who's"],
  ['accept', 'except'],
  ['weather', 'whether'],
  ['hear', 'here'],
  ['write', 'right'],
  ['piece', 'peace'],
  ['break', 'brake'],
  ['meet', 'meat'],
  ['know', 'no'],
  ['new', 'knew'],
  ['buy', 'by'],
  ['week', 'weak'],
  ['complement', 'compliment'],
  ['principal', 'principle'],
  ['stationary', 'stationery'],
];

const HOMOPHONE_ALTS: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const group of HOMOPHONE_GROUPS) {
    for (const word of group) {
      map.set(word, group.filter(w => w !== word));
    }
  }
  return map;
})();

const WORD_BOUNDARY_RE = /[\s.,;:!?()"'\n\t]/;

function isAsciiWordChar(ch: string): boolean {
  if (!ch) return false;
  const c = ch.charCodeAt(0);
  return (
    (c >= 0x41 && c <= 0x5a) ||
    (c >= 0x61 && c <= 0x7a) ||
    ch === "'"
  );
}

function readWord(text: string, start: number): string {
  let end = start;
  while (end < text.length && isAsciiWordChar(text[end])) {
    end++;
  }
  return text.slice(start, end);
}

function matchCase(target: string, reference: string): string {
  if (!reference) return target;
  if (reference.toUpperCase() === reference && reference.length > 1) {
    return target.toUpperCase();
  }
  const firstIsUpper = reference[0] >= 'A' && reference[0] <= 'Z';
  if (firstIsUpper) {
    return target.charAt(0).toUpperCase() + target.slice(1);
  }
  return target;
}

function pickAlternative(alternatives: string[]): string {
  return alternatives[Math.floor(Math.random() * alternatives.length)];
}

function makeTypeEvent(char: string, settings: TypingSettings): TypingEvent {
  const baseDelay = getBaseDelayForChar(char, settings);
  return {
    type: 'type',
    char,
    delayMs: addRandomNoiseToDelay(baseDelay, settings),
  };
}

/**
 * Attempt to create a homophone swap starting at `index`.
 * The typist writes the wrong word, continues briefly, pauses, then
 * backspaces back and retypes with the correct word.
 *
 * Returns null when the current word has no homophone alternative or
 * the dice roll fails.
 */
export function tryCreateHomophoneSwap(
  text: string,
  index: number,
  settings: TypingSettings
): MistakeSequence | null {
  if (!settings.useHomophoneSwaps) return null;
  if (settings.homophoneSwapProbability <= 0) return null;

  // Only at word start
  if (index > 0 && isAsciiWordChar(text[index - 1])) return null;

  const word = readWord(text, index);
  if (word.length < 2) return null;

  const alternatives = HOMOPHONE_ALTS.get(word.toLowerCase());
  if (!alternatives || alternatives.length === 0) return null;

  if (Math.random() >= settings.homophoneSwapProbability) return null;

  const wrongLower = pickAlternative(alternatives);
  const wrongWord = matchCase(wrongLower, word);

  // Optional discovery delay: chance to type a bit further before noticing.
  // Values: 0 (immediate), or keep typing through the trailing boundary char
  // and into the next short token.
  const discovery = Math.random();
  let extraText = '';
  let extraEnd = index + word.length;

  if (discovery < 0.4 && extraEnd < text.length) {
    // Consume one boundary char (usually a space) + next word-ish token, capped.
    while (
      extraEnd < text.length &&
      WORD_BOUNDARY_RE.test(text[extraEnd]) &&
      text[extraEnd] !== '\n'
    ) {
      extraText += text[extraEnd];
      extraEnd++;
      if (extraText.length >= 1) break;
    }
    let nextWordLen = 0;
    while (
      extraEnd < text.length &&
      isAsciiWordChar(text[extraEnd]) &&
      nextWordLen < 8
    ) {
      extraText += text[extraEnd];
      extraEnd++;
      nextWordLen++;
    }
  }

  const events: TypingEvent[] = [];

  for (const ch of wrongWord) {
    events.push(makeTypeEvent(ch, settings));
  }
  for (const ch of extraText) {
    events.push(makeTypeEvent(ch, settings));
  }

  // Realize pause (longer than a typo pause — homophone noticing takes a beat)
  if (events.length > 0) {
    events[events.length - 1].delayMs += randomBetween(450, 950);
  }

  const wrongLen = Array.from(wrongWord).length;
  const extraLen = Array.from(extraText).length;
  const deleteCount = wrongLen + extraLen;

  for (let i = 0; i < deleteCount; i++) {
    events.push({ type: 'delete', delayMs: getBackspaceDelay(settings) });
  }

  for (const ch of word) {
    events.push(makeTypeEvent(ch, settings));
  }
  for (const ch of extraText) {
    events.push(makeTypeEvent(ch, settings));
  }

  return {
    events,
    newIndex: extraEnd - 1,
  };
}
