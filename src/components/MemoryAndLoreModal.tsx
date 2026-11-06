import React, { useState } from 'react';
import {
  X,
  BookOpen,
  GitBranch,
  Bookmark,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Pin,
  Check,
  Sparkles,
  Search,
} from 'lucide-react';
import {
  MemoryLedgerEntry,
  Chapter,
  LorebookEntry,
  TimelineBranch,
} from '../types/roleplay';

interface MemoryAndLoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  memoryLedger: MemoryLedgerEntry[];
  onAddMemory: (text: string, category: 'fact' | 'promise' | 'betrayal' | 'shift') => void;
  onDeleteMemory: (id: string) => void;
  chapters: Chapter[];
  onAddChapter: (title: string, summary: string) => void;
  lorebook: LorebookEntry[];
  onAddLorebookEntry: (entry: Omit<LorebookEntry, 'id'>) => void;
  onToggleLorebook: (id: string) => void;
  onDeleteLorebook: (id: string) => void;
  branches: TimelineBranch[];
  activeBranchId: string;
  onSwitchBranch: (branchId: string) => void;
  onCreateBranch: (name: string) => void;
}

export const MemoryAndLoreModal: React.FC<MemoryAndLoreModalProps> = ({
  isOpen,
  onClose,
  memoryLedger,
  onAddMemory,
  onDeleteMemory,
  chapters,
  onAddChapter,
  lorebook,
  onAddLorebookEntry,
  onToggleLorebook,
  onDeleteLorebook,
  branches,
  activeBranchId,
  onSwitchBranch,
  onCreateBranch,
}) => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'chapters' | 'lorebook' | 'timeline'>('ledger');

  // Ledger form state
  const [newMemText, setNewMemText] = useState('');
  const [newMemCat, setNewMemCat] = useState<'fact' | 'promise' | 'betrayal' | 'shift'>('fact');

  // Lorebook form state
  const [newLoreTitle, setNewLoreTitle] = useState('');
  const [newLoreKeys, setNewLoreKeys] = useState('');
  const [newLoreContent, setNewLoreContent] = useState('');
  const [isAddingLore, setIsAddingLore] = useState(false);

  // Chapter form state
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterSummary, setNewChapterSummary] = useState('');
  const [isAddingChapter, setIsAddingChapter] = useState(false);

  // Timeline form state
  const [newBranchName, setNewBranchName] = useState('');

  if (!isOpen) return null;

  const handleAddMem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemText.trim()) return;
    onAddMemory(newMemText.trim(), newMemCat);
    setNewMemText('');
  };

  const handleAddLore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoreTitle.trim() || !newLoreContent.trim()) return;
    onAddLorebookEntry({
      title: newLoreTitle.trim(),
      keys: newLoreKeys.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean),
      content: newLoreContent.trim(),
      enabled: true,
      category: 'lore',
    });
    setNewLoreTitle('');
    setNewLoreKeys('');
    setNewLoreContent('');
    setIsAddingLore(false);
  };

  const handleAddChap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim()) return;
    onAddChapter(newChapterTitle.trim(), newChapterSummary.trim());
    setNewChapterTitle('');
    setNewChapterSummary('');
    setIsAddingChapter(false);
  };

  const handleCreateNewBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    onCreateBranch(newBranchName.trim());
    setNewBranchName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-[#121216] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272a] bg-[#0c0c0e]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="font-heading font-semibold text-base text-zinc-100">
                4-TIER INFINITE MEMORY & TIMELINE
              </h2>
              <p className="text-[11px] text-zinc-400">
                Permanent memory ledger, auto-chapters, keyword lorebook & What-If timeline forks
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

        {/* Tab Navigation */}
        <div className="flex border-b border-[#27272a] bg-[#0c0c0e] overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2.5 font-semibold tracking-wider whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'ledger'
                ? 'border-red-600 text-red-400 bg-[#18181b]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            1. AUTO-MEMORY LEDGER ({memoryLedger.length})
          </button>
          <button
            onClick={() => setActiveTab('chapters')}
            className={`px-4 py-2.5 font-semibold tracking-wider whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'chapters'
                ? 'border-red-600 text-red-400 bg-[#18181b]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            2. CHAPTER SUMMARIES ({chapters.length})
          </button>
          <button
            onClick={() => setActiveTab('lorebook')}
            className={`px-4 py-2.5 font-semibold tracking-wider whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'lorebook'
                ? 'border-red-600 text-red-400 bg-[#18181b]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            3. LOREBOOK ({lorebook.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2.5 font-semibold tracking-wider whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'timeline'
                ? 'border-red-600 text-red-400 bg-[#18181b]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            4. TIMELINE BRANCHES ({branches.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[#18181b]/60 border border-[#27272a] text-xs text-zinc-400 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  The Auto-Memory Ledger automatically pins key narrative commitments, secrets, promises, and betrayals into every prompt turn so characters never suffer amnesia.
                </span>
              </div>

              {/* Add Memory Form */}
              <form onSubmit={handleAddMem} className="flex gap-2">
                <select
                  value={newMemCat}
                  onChange={(e) => setNewMemCat(e.target.value as any)}
                  className="p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-200"
                >
                  <option value="fact">Fact</option>
                  <option value="promise">Promise</option>
                  <option value="betrayal">Betrayal</option>
                  <option value="shift">Shift</option>
                </select>
                <input
                  type="text"
                  placeholder="Record a key event (e.g. Cassio promised Lian she would leave unharmed if...)"
                  value={newMemText}
                  onChange={(e) => setNewMemText(e.target.value)}
                  className="flex-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-white"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-semibold rounded"
                >
                  Pin
                </button>
              </form>

              {/* Memory List */}
              <div className="space-y-2">
                {memoryLedger.map((mem) => {
                  const catColor = {
                    fact: 'bg-zinc-800 text-zinc-300 border-zinc-700',
                    promise: 'bg-emerald-950 text-emerald-300 border-emerald-800',
                    betrayal: 'bg-red-950 text-red-300 border-red-800',
                    shift: 'bg-purple-950 text-purple-300 border-purple-800',
                  }[mem.category];

                  return (
                    <div
                      key={mem.id}
                      className="p-3 rounded-lg bg-[#18181b] border border-[#27272a] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono border ${catColor}`}>
                            {mem.category}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(mem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-zinc-200 font-serif text-sm">{mem.text}</p>
                      </div>
                      <button
                        onClick={() => onDeleteMemory(mem.id)}
                        className="text-zinc-500 hover:text-red-400 p-1"
                        title="Remove Fact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'chapters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  Organizes extended chats into narrative chapters with condensed memory summaries.
                </span>
                <button
                  onClick={() => setIsAddingChapter(!isAddingChapter)}
                  className="px-2.5 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Chapter</span>
                </button>
              </div>

              {isAddingChapter && (
                <form onSubmit={handleAddChap} className="p-3 rounded-lg bg-[#18181b] border border-red-800 space-y-2">
                  <input
                    type="text"
                    placeholder="Chapter Title (e.g. Chapter I: The Guillotine Latch)"
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    className="w-full p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-white"
                    required
                  />
                  <textarea
                    placeholder="Condensed Chapter Summary (acts as high-level memory context)..."
                    rows={3}
                    value={newChapterSummary}
                    onChange={(e) => setNewChapterSummary(e.target.value)}
                    className="w-full p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-300"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingChapter(false)}
                      className="px-3 py-1 bg-zinc-800 text-xs rounded"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-3 py-1 bg-red-700 text-xs text-white rounded">
                      Create Chapter
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {chapters.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[#18181b] text-xs text-zinc-400 space-y-2">
                    <div className="font-semibold text-zinc-200">Chapter 1: The Midnight Intrusion</div>
                    <p className="font-serif italic text-zinc-300">
                      Lian was caught in the Blackwood library after dark attempting to inspect the archives. Cassio closed the door and poured wine, beginning their psychological duel.
                    </p>
                  </div>
                ) : (
                  chapters.map((chap) => (
                    <div key={chap.id} className="p-3.5 rounded-lg bg-[#18181b] border border-[#27272a] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-semibold text-sm text-red-400">
                          {chap.title}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(chap.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 font-serif">{chap.summary}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'lorebook' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  Keyword-activated lore entries automatically injected when mentioned in dialogue.
                </span>
                <button
                  onClick={() => setIsAddingLore(!isAddingLore)}
                  className="px-2.5 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Lore</span>
                </button>
              </div>

              {isAddingLore && (
                <form onSubmit={handleAddLore} className="p-3 rounded-lg bg-[#18181b] border border-red-800 space-y-2">
                  <input
                    type="text"
                    placeholder="Entry Title (e.g. The Glass Conservatory)"
                    value={newLoreTitle}
                    onChange={(e) => setNewLoreTitle(e.target.value)}
                    className="w-full p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Trigger Keywords, comma separated (e.g. conservatory, greenhouse, orchids)"
                    value={newLoreKeys}
                    onChange={(e) => setNewLoreKeys(e.target.value)}
                    className="w-full p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-white"
                    required
                  />
                  <textarea
                    placeholder="Lorebook Entry content..."
                    rows={3}
                    value={newLoreContent}
                    onChange={(e) => setNewLoreContent(e.target.value)}
                    className="w-full p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-300"
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingLore(false)}
                      className="px-3 py-1 bg-zinc-800 text-xs rounded"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-3 py-1 bg-red-700 text-xs text-white rounded">
                      Save Entry
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {lorebook.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3.5 rounded-lg border transition-colors ${
                      entry.enabled
                        ? 'bg-[#18181b] border-[#27272a]'
                        : 'bg-[#121215] border-zinc-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-semibold text-sm text-zinc-100">
                          {entry.title}
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {entry.keys.map((k) => (
                            <span
                              key={k}
                              className="text-[9px] bg-red-950/80 text-red-300 border border-red-900/60 font-mono px-1 py-0.5 rounded"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onToggleLorebook(entry.id)}
                          className={`text-xs px-2 py-0.5 rounded font-mono ${
                            entry.enabled ? 'bg-emerald-950 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {entry.enabled ? 'ACTIVE' : 'OFF'}
                        </button>
                        <button
                          onClick={() => onDeleteLorebook(entry.id)}
                          className="text-zinc-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2 font-serif leading-relaxed">
                      {entry.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[#18181b]/60 border border-[#27272a] text-xs text-zinc-400 flex items-start gap-2">
                <GitBranch className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  Visual Timeline Branching lets you fork the roleplay at crucial decision points into parallel "What-If" storylines without deleting the main canon timeline.
                </span>
              </div>

              {/* Create new timeline branch */}
              <form onSubmit={handleCreateNewBranch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Branch Name (e.g. Timeline B: Lian surrendered the key)"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="flex-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-white"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-semibold rounded"
                >
                  Fork Timeline
                </button>
              </form>

              {/* Branches list */}
              <div className="space-y-2.5">
                <div
                  onClick={() => onSwitchBranch('main')}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    activeBranchId === 'main'
                      ? 'bg-[#1a1215] border-[#7f1d1d] text-white shadow-md'
                      : 'bg-[#18181b] border-[#27272a] text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-semibold text-sm">Main Timeline (Prime Canon)</span>
                    {activeBranchId === 'main' && (
                      <span className="text-[10px] bg-red-700 text-white font-mono px-1.5 py-0.5 rounded">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">The primary roleplay narrative path.</p>
                </div>

                {branches.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => onSwitchBranch(b.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      activeBranchId === b.id
                        ? 'bg-[#1a1215] border-[#7f1d1d] text-white shadow-md'
                        : 'bg-[#18181b] border-[#27272a] text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-semibold text-sm">{b.name}</span>
                      {activeBranchId === b.id && (
                        <span className="text-[10px] bg-red-700 text-white font-mono px-1.5 py-0.5 rounded">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">
                      Forked on: {new Date(b.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
