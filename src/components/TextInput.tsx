import { FileText, Eye } from 'lucide-react';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  typedText: string;
  isTyping: boolean;
}

export default function TextInput({ value, onChange, disabled, typedText, isTyping }: TextInputProps) {
  // Count actual words by splitting on whitespace
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-primary-500" />
        <h2 className="text-xl font-semibold">Text to Type</h2>
      </div>
      
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Enter the text you want to simulate typing here..."
        className="textarea min-h-[200px] font-mono"
        spellCheck={false}
      />
      
      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <span>{value.length} characters</span>
        <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
      </div>

      {isTyping && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-semibold">Live Preview</h3>
          </div>
          <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 min-h-[100px] max-h-[200px] overflow-y-auto">
            <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap break-words">
              {typedText}
              <span className="inline-block w-2 h-5 bg-primary-500 animate-pulse-glow ml-0.5" />
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
