export interface TypingSettings {
  wpm: number;
  mistakeProbability: number;
  maxExtraLettersAfterMistake: number;
  speedRandomness: number;
  inputMode: 'auto';
  disableMistakesForNonAscii: boolean;
  usePunctuationPauses: boolean;
  useLongWordPauses: boolean;
  useBursts: boolean;
  useMicroPauses: boolean;
  useThinkingPauses: boolean;
  adjustSpeedOverTime: boolean;
  adjustMistakesOverTime: boolean;
  useHomophoneSwaps: boolean;
  homophoneSwapProbability: number;
  showOverlay: boolean;
}

export interface TypingEvent {
  type: 'type' | 'delete';
  char?: string;
  delayMs: number;
}

export interface TypingPlan {
  events: TypingEvent[];
  totalTimeMs: number;
}

export interface MistakeSequence {
  events: TypingEvent[];
  newIndex: number;
}

export interface TypingProfile {
  id: string;
  name: string;
  settings: TypingSettings;
  builtIn?: boolean;
  createdAt: number;
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  textPreview: string;
  fullText: string;
  textLength: number;
  targetWpm: number;
  actualWpm: number;
  durationMs: number;
  accuracy: number;
  completed: boolean;
}
