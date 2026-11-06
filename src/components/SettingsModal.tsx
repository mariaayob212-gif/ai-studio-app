import React, { useState } from 'react';
import {
  X,
  Sliders,
  ShieldCheck,
  Download,
  Upload,
  Lock,
  Plus,
  Trash2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { RoleplaySettings } from '../types/roleplay';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RoleplaySettings;
  onUpdateSettings: (settings: Partial<RoleplaySettings>) => void;
  onExportFullBackup: () => void;
  onImportFullBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onExportFullBackup,
  onImportFullBackup,
}) => {
  const [newBannedPhrase, setNewBannedPhrase] = useState('');
  const [newPin, setNewPin] = useState(settings.pinCode);

  if (!isOpen) return null;

  const handleAddBanned = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannedPhrase.trim()) return;
    const current = settings.bannedPhrases || [];
    if (!current.includes(newBannedPhrase.trim())) {
      onUpdateSettings({ bannedPhrases: [...current, newBannedPhrase.trim()] });
    }
    setNewBannedPhrase('');
  };

  const handleRemoveBanned = (phrase: string) => {
    const current = settings.bannedPhrases || [];
    onUpdateSettings({ bannedPhrases: current.filter((p) => p !== phrase) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#121216] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272a] bg-[#0c0c0e]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="font-heading font-semibold text-base text-zinc-100">
                STUDIO SETTINGS & UNCENSORED ENGINE
              </h2>
              <p className="text-[11px] text-zinc-400">
                Tuning, anti-repetition filters, security PIN, and full system backup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* Master Uncensored Engine Badge */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#1f0f13] to-[#120a0d] border border-red-900/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-heading font-semibold text-sm text-red-200">
                MASTER UNCENSORED HIGH-INTELLIGENCE DIRECTIVE: ACTIVE
              </span>
              <p className="text-zinc-400 leading-relaxed font-serif">
                All Gemini Safety Filters are configured to <code className="text-red-300 font-mono">BLOCK_NONE</code>. Zero lecturing, moralizing, or breaking character. Elevated fictional literature treating psychological manipulation, obsession, and darkness with total artistic fidelity.
              </p>
            </div>
          </div>

          {/* Model Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#09090b] border border-[#27272a]">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">
                Gemini Model:
              </label>
              <select
                value={settings.model}
                onChange={(e) => onUpdateSettings({ model: e.target.value })}
                className="w-full p-2 bg-[#121216] border border-zinc-700 rounded text-xs text-white"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended Flagship)</option>
                <option value="gemini-4-argon">gemini-4-argon (Maximum Reasoning / Complex)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra Fast)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">
                Narrative Pacing:
              </label>
              <select
                value={settings.pacing}
                onChange={(e) => onUpdateSettings({ pacing: e.target.value as any })}
                className="w-full p-2 bg-[#121216] border border-zinc-700 rounded text-xs text-white"
              >
                <option value="slow-burn">Slow-Burn Psychological Suspense</option>
                <option value="fast-dialogue">Fast-Paced Razor Dialogue</option>
                <option value="deep-noir">Deep Poetic Noir & Sensory Immersion</option>
              </select>
            </div>
          </div>

          {/* Response Length & Language Tuning */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#09090b] border border-[#27272a]">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">
                Response Target Length:
              </label>
              <select
                value={settings.responseLength}
                onChange={(e) => onUpdateSettings({ responseLength: e.target.value as any })}
                className="w-full p-2 bg-[#121216] border border-zinc-700 rounded text-xs text-white"
              >
                <option value="short">Short (1-2 sharp paragraphs)</option>
                <option value="medium">Medium (2-3 immersive paragraphs)</option>
                <option value="long">Long (3-5 rich literary paragraphs)</option>
                <option value="novel">Visual Novel Novelist (Full chapter scene)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">
                Language Auto-Detection & Prose Mode:
              </label>
              <select
                value={settings.language}
                onChange={(e) => onUpdateSettings({ language: e.target.value as any })}
                className="w-full p-2 bg-[#121216] border border-zinc-700 rounded text-xs text-white"
              >
                <option value="auto">Auto-Detect (Arabic / English / Turkish)</option>
                <option value="en">Atmospheric English Noir</option>
                <option value="ar">Literary Arabic (فصحى بليغة)</option>
                <option value="tr">Literary Turkish (Edebi)</option>
              </select>
            </div>
          </div>

          {/* Anti-Slop & Anti-Repetition Banned Phrases */}
          <div className="space-y-2 p-3 rounded-xl bg-[#09090b] border border-[#27272a]">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-zinc-200">
                  ANTI-SLOP & ANTI-REPETITION FILTER
                </span>
                <p className="text-[10px] text-zinc-400">
                  Banned clichés and repetitive phrases purged from AI outputs
                </p>
              </div>
            </div>

            <form onSubmit={handleAddBanned} className="flex gap-2">
              <input
                type="text"
                placeholder="Add cliché to ban (e.g. 'a dangerous dance', 'can't help but')..."
                value={newBannedPhrase}
                onChange={(e) => setNewBannedPhrase(e.target.value)}
                className="flex-1 p-2 bg-[#121216] border border-zinc-700 rounded text-xs text-white"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded font-medium"
              >
                Ban
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5 pt-1 max-h-32 overflow-y-auto">
              {(settings.bannedPhrases || []).map((phrase) => (
                <span
                  key={phrase}
                  className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] flex items-center gap-1.5"
                >
                  <span>"{phrase}"</span>
                  <button
                    onClick={() => handleRemoveBanned(phrase)}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Privacy Security 4-Digit PIN */}
          <div className="p-3 rounded-xl bg-[#09090b] border border-[#27272a] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-400" />
              <div>
                <span className="font-semibold text-zinc-200 block">4-Digit Security PIN</span>
                <span className="text-[10px] text-zinc-400">Used to lock the screen when stepping away</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={4}
                value={newPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setNewPin(val);
                  if (val.length === 4) onUpdateSettings({ pinCode: val });
                }}
                className="w-16 p-1.5 bg-[#121216] border border-zinc-700 rounded text-center font-mono font-bold text-white text-sm"
              />
            </div>
          </div>

          {/* Full Backup Export / Import */}
          <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-2">
            <span className="font-semibold text-zinc-200 block">
              1-CLICK FULL STUDIO BACKUP & PORTABILITY
            </span>
            <p className="text-[11px] text-zinc-400">
              Export complete story state, all characters, personas, memory ledgers, chapters, and inventory into a single JSON file.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={onExportFullBackup}
                className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Full Backup JSON</span>
              </button>
              <label className="cursor-pointer px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium flex items-center gap-1.5 transition-colors">
                <Upload className="w-4 h-4" />
                <span>Import Backup</span>
                <input type="file" accept=".json" onChange={onImportFullBackup} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
