import React, { useState } from 'react';
import { X, Bookmark, Plus, Trash2, Copy, Check, Search, BookOpen } from 'lucide-react';
import { SavedPhrase } from '../types/roleplay';

interface VocabularyVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedPhrases: SavedPhrase[];
  onAddPhrase: (text: string, meaning: string, language: string) => void;
  onDeletePhrase: (id: string) => void;
}

export const VocabularyVaultModal: React.FC<VocabularyVaultModalProps> = ({
  isOpen,
  onClose,
  savedPhrases,
  onAddPhrase,
  onDeletePhrase,
}) => {
  const [filter, setFilter] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newLang, setNewLang] = useState('English');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    onAddPhrase(newText.trim(), newMeaning.trim() || 'Eloquent literary expression', newLang);
    setNewText('');
    setNewMeaning('');
    setIsAdding(false);
  };

  const handleCopy = (phrase: SavedPhrase) => {
    navigator.clipboard.writeText(phrase.text);
    setCopiedId(phrase.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = savedPhrases.filter(
    (p) =>
      p.text.toLowerCase().includes(filter.toLowerCase()) ||
      p.meaning.toLowerCase().includes(filter.toLowerCase()) ||
      p.language.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[85vh] bg-[#121216] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272a] bg-[#0c0c0e]">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="font-heading font-semibold text-base text-zinc-100">
                LITERARY EXPRESSION & VOCABULARY VAULT
              </h2>
              <p className="text-[11px] text-zinc-400">
                Preserve evocative metaphors and phrases in Arabic, English, and Turkish
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

        {/* Toolbar */}
        <div className="p-3 border-b border-[#27272a] flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search saved expressions..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#09090b] border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-2.5 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white text-xs font-medium flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Phrase</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isAdding && (
            <form onSubmit={handleAdd} className="p-3 rounded-xl bg-[#18181b] border border-red-800 space-y-2.5 animate-in fade-in">
              <input
                type="text"
                placeholder="Expression (e.g. 'صمتٌ يشبه سكينًا مغلفة بالمخمل' or 'A quiet that cut like wrapped silk')"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="w-full p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-white"
                required
              />
              <input
                type="text"
                placeholder="Contextual Meaning / Resonance"
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                className="w-full p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-300"
              />
              <div className="flex gap-2">
                <select
                  value={newLang}
                  onChange={(e) => setNewLang(e.target.value)}
                  className="p-1.5 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-300"
                >
                  <option value="English">English</option>
                  <option value="Arabic">Arabic (فصحى)</option>
                  <option value="Turkish">Turkish</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-1 bg-red-700 text-white text-xs rounded font-medium ml-auto"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs italic">
              No expressions saved in vault yet. Highlight any phrase in chat to save it!
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-serif italic text-sm text-zinc-100 font-medium">
                    "{item.text}"
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(item)}
                      className="p-1 rounded text-zinc-400 hover:text-white"
                      title="Copy to clipboard"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => onDeletePhrase(item.id)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>{item.meaning}</span>
                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {item.language}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
