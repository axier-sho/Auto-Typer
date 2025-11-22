import { TypingSettings } from '../types/typing';
import { Settings, Zap, Target, Activity } from 'lucide-react';

interface SettingsPanelProps {
  settings: TypingSettings;
  onChange: (settings: Partial<TypingSettings>) => void;
  disabled: boolean;
  isVisible: boolean;
}

export default function SettingsPanel({ settings, onChange, disabled, isVisible }: SettingsPanelProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-primary-500" />
        <h2 className="text-xl font-semibold">Settings</h2>
      </div>

      {/* Speed Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary-400">
          <Zap className="w-4 h-4" />
          <h3 className="font-semibold">Speed</h3>
        </div>
        
        <div>
          <label className="label">
            Words Per Minute: {settings.wpm}
          </label>
          <input
            type="range"
            min="10"
            max="200"
            value={settings.wpm}
            onChange={(e) => onChange({ wpm: parseInt(e.target.value) })}
            disabled={disabled}
            className="slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>10 (Very Slow)</span>
            <span>200 (Very Fast)</span>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            💡 Timing is optimized to match your target WPM accounting for system delays
          </p>
        </div>

        <div>
          <label className="label">
            Speed Randomness: {['Smooth', 'Normal', 'High'][settings.speedRandomness]}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            value={settings.speedRandomness}
            onChange={(e) => onChange({ speedRandomness: parseInt(e.target.value) })}
            disabled={disabled}
            className="slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Smooth</span>
            <span>Normal</span>
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Mistake Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary-400">
          <Target className="w-4 h-4" />
          <h3 className="font-semibold">Mistakes</h3>
        </div>
        
        <div>
          <label className="label">
            Mistake Probability: {(settings.mistakeProbability * 100).toFixed(1)}%
          </label>
          <input
            type="range"
            min="0"
            max="50"
            value={settings.mistakeProbability * 100}
            onChange={(e) => onChange({ mistakeProbability: parseInt(e.target.value) / 100 })}
            disabled={disabled}
            className="slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0%</span>
            <span>50%</span>
          </div>
        </div>

        <div>
          <label className="label">
            Extra Letters After Mistake: {settings.maxExtraLettersAfterMistake}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={settings.maxExtraLettersAfterMistake}
            onChange={(e) => onChange({ maxExtraLettersAfterMistake: parseInt(e.target.value) })}
            disabled={disabled}
            className="slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0</span>
            <span>10</span>
          </div>
        </div>
      </div>

      {/* Behavior Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary-400">
          <Activity className="w-4 h-4" />
          <h3 className="font-semibold">Human Behavior</h3>
        </div>
        
        <ToggleOption
          label="Punctuation Pauses"
          description="Pause after punctuation marks"
          checked={settings.usePunctuationPauses}
          onChange={(checked) => onChange({ usePunctuationPauses: checked })}
          disabled={disabled}
        />

        <ToggleOption
          label="Long Word Pauses"
          description="Hesitate before long words"
          checked={settings.useLongWordPauses}
          onChange={(checked) => onChange({ useLongWordPauses: checked })}
          disabled={disabled}
        />

        <ToggleOption
          label="Burst Typing"
          description="Random fast typing bursts"
          checked={settings.useBursts}
          onChange={(checked) => onChange({ useBursts: checked })}
          disabled={disabled}
        />

        <ToggleOption
          label="Micro Pauses"
          description="Small thinking pauses"
          checked={settings.useMicroPauses}
          onChange={(checked) => onChange({ useMicroPauses: checked })}
          disabled={disabled}
        />

        <ToggleOption
          label="Thinking Pauses"
          description="Longer pauses at complex points"
          checked={settings.useThinkingPauses}
          onChange={(checked) => onChange({ useThinkingPauses: checked })}
          disabled={disabled}
        />

        <ToggleOption
          label="Adjust Speed Over Time"
          description="Speed varies throughout typing"
          checked={settings.adjustSpeedOverTime}
          onChange={(checked) => onChange({ adjustSpeedOverTime: checked })}
          disabled={disabled}
        />

        <ToggleOption
          label="Adjust Mistakes Over Time"
          description="Mistake rate varies throughout"
          checked={settings.adjustMistakesOverTime}
          onChange={(checked) => onChange({ adjustMistakesOverTime: checked })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

interface ToggleOptionProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}

function ToggleOption({ label, description, checked, onChange, disabled }: ToggleOptionProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-200">{label}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
      <button
        type="button"
        className={`toggle ${checked ? 'toggle-active' : 'toggle-inactive'}`}
        onClick={() => onChange(!checked)}
        disabled={disabled}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
