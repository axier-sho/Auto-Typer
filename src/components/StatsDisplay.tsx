import { BarChart3, Clock, Zap, Activity, Type, Target, Delete, CheckCircle2 } from 'lucide-react';
import { TypingSettings, TypingEvent } from '../types/typing';
import { formatTime } from '../engine/planning';

interface StatsDisplayProps {
  isTyping: boolean;
  progress: number;
  estimatedTime: number;
  elapsedTime: number;
  currentEvent: TypingEvent | null;
  settings: TypingSettings;
  actualWPM: number;
  typedLength: number;
  totalLength: number;
  accuracy: number;
}

export default function StatsDisplay({
  isTyping,
  progress,
  estimatedTime,
  elapsedTime,
  currentEvent,
  settings,
  actualWPM,
  typedLength,
  totalLength,
  accuracy,
}: StatsDisplayProps) {
  if (!isTyping && progress === 0) {
    return null;
  }

  const remainingTime = estimatedTime - elapsedTime;
  const isComplete = !isTyping && progress >= 100;

  return (
    <section className="surface p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-inset ring-primary-500/25">
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Telemetry</p>
            <h2 className="section-title">Live statistics</h2>
          </div>
        </div>
        {isComplete && (
          <span className="chip border-emerald-400/30 bg-emerald-400/10 text-emerald-300" role="status">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            Complete
          </span>
        )}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        <StatCard
          icon={<Zap className="w-4 h-4" />}
          label="Target WPM"
          value={settings.wpm.toString()}
          tint="primary"
        />
        <StatCard
          icon={<Activity className="w-4 h-4" />}
          label="Actual WPM"
          value={actualWPM > 0 ? actualWPM.toFixed(1) : '—'}
          tint="emerald"
        />
        <StatCard
          icon={<Target className="w-4 h-4" />}
          label="Accuracy"
          value={`${accuracy.toFixed(1)}%`}
          tint="amber"
        />
        <StatCard
          icon={<Type className="w-4 h-4" />}
          label="Characters"
          value={`${typedLength} / ${totalLength}`}
          tint="violet"
        />
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label={isComplete ? 'Total time' : 'Elapsed / remaining'}
          value={
            isComplete
              ? formatTime(elapsedTime)
              : `${formatTime(elapsedTime)} / ${remainingTime > 0 ? formatTime(remainingTime) : '0s'}`
          }
          tint="sky"
        />
        <StatCard
          icon={currentEvent?.type === 'delete' ? <Delete className="w-4 h-4" /> : <Type className="w-4 h-4" />}
          label="Current"
          value={
            isComplete
              ? 'Done'
              : currentEvent?.type === 'type'
              ? `Type '${currentEvent.char === '\n' ? '⏎' : currentEvent.char === ' ' ? '␣' : currentEvent.char}'`
              : currentEvent?.type === 'delete'
              ? 'Backspace'
              : 'Idle'
          }
          tint={currentEvent?.type === 'delete' ? 'rose' : 'primary'}
        />
      </div>

      {isTyping && (
        <div className="hairline mt-6 pt-5">
          <p className="eyebrow mb-3">Runtime profile</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <MiniStat label="Mistake rate" value={`${(settings.mistakeProbability * 100).toFixed(1)}%`} />
            <MiniStat label="Randomness" value={['Smooth', 'Normal', 'High'][settings.speedRandomness]} />
            <MiniStat label="Punctuation" value={settings.usePunctuationPauses ? 'On' : 'Off'} />
            <MiniStat label="Bursts" value={settings.useBursts ? 'On' : 'Off'} />
          </div>
        </div>
      )}
    </section>
  );
}

type Tint = 'primary' | 'emerald' | 'amber' | 'violet' | 'sky' | 'rose';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: Tint;
}

const tintMap: Record<Tint, { ring: string; text: string; glow: string }> = {
  primary: { ring: 'ring-primary-500/25', text: 'text-primary-300', glow: 'bg-primary-500/15' },
  emerald: { ring: 'ring-emerald-500/25', text: 'text-emerald-300', glow: 'bg-emerald-500/15' },
  amber:   { ring: 'ring-amber-400/25',   text: 'text-amber-300',   glow: 'bg-amber-400/15' },
  violet:  { ring: 'ring-violet-500/25',  text: 'text-violet-300',  glow: 'bg-violet-500/15' },
  sky:     { ring: 'ring-sky-500/25',     text: 'text-sky-300',     glow: 'bg-sky-500/15' },
  rose:    { ring: 'ring-rose-500/25',    text: 'text-rose-300',    glow: 'bg-rose-500/15' },
};

function StatCard({ icon, label, value, tint }: StatCardProps) {
  const t = tintMap[tint];
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.05] bg-ink-900/70 p-3.5 transition-colors hover:border-white/[0.1]">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="eyebrow text-ink-300">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-md ring-1 ring-inset ${t.ring} ${t.glow} ${t.text}`} aria-hidden="true">
          {icon}
        </div>
      </div>
      <div
        className="text-[1.375rem] font-semibold tracking-tight text-ink-50 num-tabular truncate font-mono"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.04] bg-ink-900/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-ink-400">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-ink-100 font-mono num-tabular">{value}</div>
    </div>
  );
}
