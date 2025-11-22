import { BarChart3, Clock, Zap, Activity, Type, Target, Delete } from 'lucide-react';
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

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-primary-500" />
        <h2 className="text-xl font-semibold">Statistics</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Target WPM */}
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Target WPM"
          value={settings.wpm.toString()}
          color="text-blue-400"
        />

        {/* Actual WPM */}
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Actual WPM"
          value={actualWPM > 0 ? actualWPM.toFixed(1) : '-'}
          color="text-green-400"
        />

        {/* Accuracy */}
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Accuracy"
          value={`${accuracy.toFixed(1)}%`}
          color="text-red-400"
        />

        {/* Progress */}
        <StatCard
          icon={<Type className="w-5 h-5" />}
          label="Characters"
          value={`${typedLength} / ${totalLength}`}
          color="text-purple-400"
        />

        {/* Time (Combined) */}
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Elapsed / Remaining"
          value={`${formatTime(elapsedTime)} / ${remainingTime > 0 ? formatTime(remainingTime) : '0s'}`}
          color="text-amber-400"
        />

        {/* Current Action */}
        <StatCard
          icon={currentEvent?.type === 'delete' ? <Delete className="w-5 h-5" /> : <Type className="w-5 h-5" />}
          label="Current"
          value={
            currentEvent?.type === 'type'
              ? `Type '${currentEvent.char === '\n' ? '⏎' : currentEvent.char}'`
              : currentEvent?.type === 'delete'
              ? 'Backspace'
              : 'Idle'
          }
          color={currentEvent?.type === 'delete' ? 'text-red-400' : 'text-primary-400'}
        />
      </div>


      {/* Detailed Stats (visible when typing) */}
      {isTyping && (
        <div className="mt-6 pt-6 border-t border-slate-800">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Current Settings</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Mistake Rate:</span>
              <span className="ml-2 text-slate-300">
                {(settings.mistakeProbability * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-slate-500">Randomness:</span>
              <span className="ml-2 text-slate-300">
                {['Smooth', 'Normal', 'High'][settings.speedRandomness]}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Punctuation Pauses:</span>
              <span className="ml-2 text-slate-300">
                {settings.usePunctuationPauses ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Burst Typing:</span>
              <span className="ml-2 text-slate-300">
                {settings.useBursts ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <div className={`flex items-center gap-2 mb-2 ${color}`}>
        {icon}
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-bold text-slate-100 truncate">{value}</div>
    </div>
  );
}
