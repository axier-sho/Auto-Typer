export interface TypingSettings {
  wpm: number;
  mistakeProbability: number;
  maxExtraLettersAfterMistake: number;
  speedRandomness: number;
  usePunctuationPauses: boolean;
  useLongWordPauses: boolean;
  useBursts: boolean;
  useMicroPauses: boolean;
  useThinkingPauses: boolean;
  adjustSpeedOverTime: boolean;
  adjustMistakesOverTime: boolean;
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
