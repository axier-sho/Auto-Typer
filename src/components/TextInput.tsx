import { FileText, Eye, Hash, Type } from 'lucide-react';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  typedText: string;
  isTyping: boolean;
}

export default function TextInput({ value, onChange, disabled, typedText, isTyping }: TextInputProps) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = Array.from(value).length;
  const lineCount = value ? value.split('\n').length : 0;

  return (
    <section className="surface p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-inset ring-primary-500/25">
            <FileText className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Source</p>
            <h2 className="section-title">
              <label htmlFor="text-to-type">Text to type</label>
            </h2>
          </div>
        </div>

        {disabled && !isTyping && (
          <span className="chip">
            <span className="status-dot bg-accent-400 animate-soft-pulse" />
            Starting…
          </span>
        )}
      </header>

      <div className="relative">
        <textarea
          id="text-to-type"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Paste or compose the text you want typed. Line breaks, punctuation, and unicode are all supported."
          className="textarea min-h-[180px] sm:min-h-[240px] font-mono text-[13.5px]"
          spellCheck={false}
          aria-label="Text to type"
        />
        {!value && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-3 bottom-3 text-[10px] uppercase tracking-widest text-ink-400"
          >
            ready
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-300 num-tabular">
        <span className="inline-flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-ink-400" aria-hidden="true" />
          <span className="text-ink-100 font-semibold">{charCount.toLocaleString()}</span>
          <span className="text-ink-400">chars</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Hash className="w-3.5 h-3.5 text-ink-400" aria-hidden="true" />
          <span className="text-ink-100 font-semibold">{wordCount.toLocaleString()}</span>
          <span className="text-ink-400">words</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-ink-100 font-semibold">{lineCount.toLocaleString()}</span>
          <span className="text-ink-400">lines</span>
        </span>
      </div>

      {isTyping && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary-300" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-ink-100">Live preview</h3>
            </div>
            <span className="chip">
              <span className="status-dot bg-primary-400 animate-soft-pulse" />
              streaming
            </span>
          </div>
          <div
            className="surface-inset relative p-4 min-h-[108px] max-h-[220px] overflow-y-auto mask-fade-b"
            aria-live="polite"
            aria-atomic="false"
            aria-label="Live preview of typed output"
          >
            <pre className="font-mono text-[13px] leading-relaxed text-ink-100 whitespace-pre-wrap break-words m-0">
              {typedText}
              <span
                className="inline-block w-[7px] h-[15px] bg-primary-400 align-text-bottom animate-caret-blink ml-[2px] rounded-[1px]"
                aria-hidden="true"
              />
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
