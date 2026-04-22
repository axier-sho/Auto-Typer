import { useState } from 'react';
import { TypingSettings, TypingProfile } from '../types/typing';
import { Settings, Target, Activity, Gauge, Sparkles, Save, Trash2, PencilLine, BookmarkCheck, Monitor } from 'lucide-react';

interface SettingsPanelProps {
  settings: TypingSettings;
  onChange: (settings: Partial<TypingSettings>) => void;
  disabled: boolean;
  isVisible: boolean;
  profiles: TypingProfile[];
  activeProfileId: string | null;
  onSelectProfile: (id: string) => void;
  onSaveProfile: (name: string) => void;
  onRenameProfile: (id: string, name: string) => void;
  onDeleteProfile: (id: string) => void;
}

const WPM_MIN = 10;
const WPM_MAX = 200;

export default function SettingsPanel({
  settings,
  onChange,
  disabled,
  isVisible,
  profiles,
  activeProfileId,
  onSelectProfile,
  onSaveProfile,
  onRenameProfile,
  onDeleteProfile,
}: SettingsPanelProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  if (!isVisible) {
    return null;
  }

  const clampWpm = (value: number) => {
    if (Number.isNaN(value)) return settings.wpm;
    return Math.max(WPM_MIN, Math.min(WPM_MAX, Math.round(value)));
  };

  const wpmPct = ((settings.wpm - WPM_MIN) / (WPM_MAX - WPM_MIN)) * 100;
  const randPct = (settings.speedRandomness / 2) * 100;
  const mistakePct = (settings.mistakeProbability * 100 / 50) * 100;
  const extraPct = (settings.maxExtraLettersAfterMistake / 10) * 100;
  const homophonePct = (settings.homophoneSwapProbability / 0.2) * 100;

  const activeProfile = profiles.find(p => p.id === activeProfileId) ?? null;
  const canRename = activeProfile && !activeProfile.builtIn;
  const canDelete = activeProfile && !activeProfile.builtIn;

  const handleSave = () => {
    const trimmed = saveName.trim();
    if (!trimmed) return;
    onSaveProfile(trimmed);
    setSaveName('');
    setShowSaveDialog(false);
  };

  const handleRenameSubmit = () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    onRenameProfile(renamingId, trimmed);
    setRenamingId(null);
  };

  return (
    <aside className="surface p-5 sm:p-6 space-y-6 lg:sticky lg:top-4">
      <header className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-inset ring-primary-500/25">
          <Settings className="w-4 h-4" aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">Configuration</p>
          <h2 className="section-title">Settings</h2>
        </div>
      </header>

      {/* Profiles */}
      <section className="space-y-2">
        <SectionHeading icon={<BookmarkCheck className="w-3.5 h-3.5" />} label="Profile" />

        {renamingId ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') setRenamingId(null);
              }}
              className="flex-1 rounded-md border border-white/[0.08] bg-ink-900 px-2.5 py-1.5 text-xs text-ink-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              placeholder="Profile name"
            />
            <button
              type="button"
              onClick={handleRenameSubmit}
              className="btn-secondary !py-1.5 !px-2.5 text-xs"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setRenamingId(null)}
              className="btn-secondary !py-1.5 !px-2.5 text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={activeProfileId ?? ''}
              onChange={(e) => onSelectProfile(e.target.value)}
              disabled={disabled}
              className="flex-1 min-w-0 rounded-md border border-white/[0.08] bg-ink-900 px-2.5 py-1.5 text-xs text-ink-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:opacity-50"
              aria-label="Active profile"
            >
              <option value="" disabled>
                {activeProfile ? activeProfile.name : 'Select profile…'}
              </option>
              <optgroup label="Built-in">
                {profiles.filter(p => p.builtIn).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
              {profiles.some(p => !p.builtIn) && (
                <optgroup label="My profiles">
                  {profiles.filter(p => !p.builtIn).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              type="button"
              onClick={() => {
                setSaveName(activeProfile && !activeProfile.builtIn ? activeProfile.name : '');
                setShowSaveDialog(true);
              }}
              disabled={disabled}
              className="btn-secondary !py-1.5 !px-2 text-xs"
              title="Save current settings as profile"
              aria-label="Save profile"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!canRename || !activeProfile) return;
                setRenameValue(activeProfile.name);
                setRenamingId(activeProfile.id);
              }}
              disabled={disabled || !canRename}
              className="btn-secondary !py-1.5 !px-2 text-xs"
              title={canRename ? 'Rename profile' : 'Built-in profiles cannot be renamed'}
              aria-label="Rename profile"
            >
              <PencilLine className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!canDelete || !activeProfile) return;
                if (confirm(`Delete profile "${activeProfile.name}"?`)) {
                  onDeleteProfile(activeProfile.id);
                }
              }}
              disabled={disabled || !canDelete}
              className="btn-secondary !py-1.5 !px-2 text-xs"
              title={canDelete ? 'Delete profile' : 'Built-in profiles cannot be deleted'}
              aria-label="Delete profile"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {showSaveDialog && (
          <div className="rounded-lg border border-primary-500/25 bg-primary-500/[0.06] p-3 space-y-2">
            <label className="block text-[11px] uppercase tracking-wider text-ink-300 font-medium">
              Profile name
            </label>
            <input
              type="text"
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setShowSaveDialog(false);
              }}
              placeholder="e.g. Chat replies"
              className="w-full rounded-md border border-white/[0.08] bg-ink-900 px-2.5 py-1.5 text-xs text-ink-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveDialog(false)}
                className="btn-secondary !py-1.5 !px-2.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="btn-primary !py-1.5 !px-2.5 text-xs"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="hairline" />

      {/* Speed */}
      <section className="space-y-4">
        <SectionHeading icon={<Gauge className="w-3.5 h-3.5" />} label="Pace" />

        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <label htmlFor="wpm-slider" className="text-xs font-medium text-ink-200">
              Words per minute
            </label>
            <div className="flex items-center rounded-md border border-white/[0.08] bg-ink-900 overflow-hidden">
              <input
                type="number"
                min={WPM_MIN}
                max={WPM_MAX}
                value={settings.wpm}
                onChange={(e) => onChange({ wpm: clampWpm(parseInt(e.target.value, 10)) })}
                disabled={disabled}
                aria-label="Words per minute value"
                className="w-14 px-2 py-1 text-right text-xs font-mono font-semibold bg-transparent text-ink-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:opacity-50"
              />
              <span className="px-2 py-1 text-[10px] uppercase tracking-wider text-ink-400 border-l border-white/[0.06]">wpm</span>
            </div>
          </div>
          <SliderWithFill
            id="wpm-slider"
            min={WPM_MIN}
            max={WPM_MAX}
            value={settings.wpm}
            percent={wpmPct}
            onChange={(v) => onChange({ wpm: v })}
            disabled={disabled}
            ariaLabel="Words per minute"
          />
          <div className="flex justify-between text-[10px] text-ink-400 mt-2 font-medium uppercase tracking-wider">
            <span>{WPM_MIN} slow</span>
            <span>{WPM_MAX} fast</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-ink-200">Randomness</label>
            <span className="text-[11px] font-mono text-primary-300">
              {['Smooth', 'Normal', 'High'][settings.speedRandomness]}
            </span>
          </div>
          <SliderWithFill
            min={0}
            max={2}
            value={settings.speedRandomness}
            percent={randPct}
            onChange={(v) => onChange({ speedRandomness: v })}
            disabled={disabled}
            ariaLabel="Speed randomness"
          />
          <div className="flex justify-between text-[10px] text-ink-400 mt-2 font-medium uppercase tracking-wider">
            <span>Smooth</span>
            <span>Normal</span>
            <span>High</span>
          </div>
        </div>
      </section>

      <div className="hairline" />

      {/* Mistakes */}
      <section className="space-y-4">
        <SectionHeading icon={<Target className="w-3.5 h-3.5" />} label="Imperfection" />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-ink-200">Mistake probability</label>
            <span className="text-[11px] font-mono text-primary-300 num-tabular">
              {(settings.mistakeProbability * 100).toFixed(1)}%
            </span>
          </div>
          <SliderWithFill
            min={0}
            max={50}
            value={settings.mistakeProbability * 100}
            percent={mistakePct}
            onChange={(v) => onChange({ mistakeProbability: v / 100 })}
            disabled={disabled}
            ariaLabel="Mistake probability"
          />
          <div className="flex justify-between text-[10px] text-ink-400 mt-2 font-medium uppercase tracking-wider">
            <span>0%</span>
            <span>50%</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-ink-200">Extra letters after mistake</label>
            <span className="text-[11px] font-mono text-primary-300 num-tabular">
              {settings.maxExtraLettersAfterMistake}
            </span>
          </div>
          <SliderWithFill
            min={0}
            max={10}
            value={settings.maxExtraLettersAfterMistake}
            percent={extraPct}
            onChange={(v) => onChange({ maxExtraLettersAfterMistake: v })}
            disabled={disabled}
            ariaLabel="Max extra letters after mistake"
          />
        </div>

        <ToggleOption
          label="Homophone swaps"
          description="Occasionally type a homophone (their / there, your / you're) and correct it"
          checked={settings.useHomophoneSwaps}
          onChange={(c) => onChange({ useHomophoneSwaps: c })}
          disabled={disabled}
        />

        {settings.useHomophoneSwaps && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-ink-200">Homophone swap rate</label>
              <span className="text-[11px] font-mono text-primary-300 num-tabular">
                {(settings.homophoneSwapProbability * 100).toFixed(1)}%
              </span>
            </div>
            <SliderWithFill
              min={0}
              max={20}
              value={settings.homophoneSwapProbability * 100}
              percent={homophonePct}
              onChange={(v) => onChange({ homophoneSwapProbability: v / 100 })}
              disabled={disabled}
              ariaLabel="Homophone swap probability"
            />
            <div className="flex justify-between text-[10px] text-ink-400 mt-2 font-medium uppercase tracking-wider">
              <span>0%</span>
              <span>20%</span>
            </div>
          </div>
        )}
      </section>

      <div className="hairline" />

      {/* Behavior */}
      <section className="space-y-3">
        <SectionHeading icon={<Activity className="w-3.5 h-3.5" />} label="Human behavior" />

        <div className="grid grid-cols-1 gap-2">
          <ToggleOption
            label="Punctuation pauses"
            description="Pause after punctuation marks"
            checked={settings.usePunctuationPauses}
            onChange={(c) => onChange({ usePunctuationPauses: c })}
            disabled={disabled}
          />
          <ToggleOption
            label="Long word pauses"
            description="Hesitate before long words"
            checked={settings.useLongWordPauses}
            onChange={(c) => onChange({ useLongWordPauses: c })}
            disabled={disabled}
          />
          <ToggleOption
            label="Burst typing"
            description="Random fast typing bursts"
            checked={settings.useBursts}
            onChange={(c) => onChange({ useBursts: c })}
            disabled={disabled}
          />
          <ToggleOption
            label="Micro pauses"
            description="Tiny thinking beats"
            checked={settings.useMicroPauses}
            onChange={(c) => onChange({ useMicroPauses: c })}
            disabled={disabled}
          />
          <ToggleOption
            label="Thinking pauses"
            description="Longer pauses at complex points"
            checked={settings.useThinkingPauses}
            onChange={(c) => onChange({ useThinkingPauses: c })}
            disabled={disabled}
          />
          <ToggleOption
            label="Drift speed over time"
            description="Speed varies while typing"
            checked={settings.adjustSpeedOverTime}
            onChange={(c) => onChange({ adjustSpeedOverTime: c })}
            disabled={disabled}
          />
          <ToggleOption
            label="Drift mistakes over time"
            description="Error rate varies while typing"
            checked={settings.adjustMistakesOverTime}
            onChange={(c) => onChange({ adjustMistakesOverTime: c })}
            disabled={disabled}
          />
        </div>
      </section>

      <div className="hairline" />

      {/* Overlay */}
      <section className="space-y-3">
        <SectionHeading icon={<Monitor className="w-3.5 h-3.5" />} label="Interface" />

        <ToggleOption
          label="Progress overlay"
          description="Show a small always-on-top HUD while typing"
          checked={settings.showOverlay}
          onChange={(c) => onChange({ showOverlay: c })}
          disabled={false}
        />
      </section>

      <div className="flex items-center gap-2 rounded-lg border border-primary-500/15 bg-primary-500/[0.06] px-3 py-2.5">
        <Sparkles className="w-3.5 h-3.5 text-primary-300 flex-shrink-0" aria-hidden="true" />
        <p className="text-[11px] text-ink-200 leading-relaxed">
          Changes apply on the next <span className="text-ink-50 font-semibold">Start</span>.
        </p>
      </div>
    </aside>
  );
}

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-primary-300">
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary-500/10 ring-1 ring-inset ring-primary-500/20">
        {icon}
      </span>
      <span className="eyebrow text-primary-300">{label}</span>
    </div>
  );
}

interface SliderWithFillProps {
  id?: string;
  min: number;
  max: number;
  value: number;
  percent: number;
  onChange: (v: number) => void;
  disabled: boolean;
  ariaLabel: string;
}

function SliderWithFill({ id, min, max, value, percent, onChange, disabled, ariaLabel }: SliderWithFillProps) {
  const safePct = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative h-6 flex items-center">
      <div className="slider-track absolute left-0 right-0" aria-hidden="true">
        <div className="slider-fill" style={{ width: `${safePct}%` }} />
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        disabled={disabled}
        className="slider relative z-10"
        aria-label={ariaLabel}
      />
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
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`group flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
        checked
          ? 'border-primary-500/25 bg-primary-500/[0.05]'
          : 'border-white/[0.04] bg-ink-900/40 hover:border-white/[0.08] hover:bg-ink-900/70'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-medium ${checked ? 'text-ink-50' : 'text-ink-100'}`}>{label}</span>
        <span className="block text-[11px] text-ink-400 mt-0.5 leading-snug">{description}</span>
      </span>
      <span
        className={`toggle ${checked ? 'toggle-active' : 'toggle-inactive'}`}
        aria-hidden="true"
      >
        <span
          className={`toggle-thumb ${checked ? 'translate-x-[20px]' : 'translate-x-[2px]'}`}
        />
      </span>
    </button>
  );
}
