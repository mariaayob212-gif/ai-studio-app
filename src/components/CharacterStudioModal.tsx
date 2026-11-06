import React, { useState } from 'react';
import {
  X,
  Users,
  Plus,
  Check,
  Edit3,
  Trash2,
  Download,
  Upload,
  UserPlus,
  Sparkles,
  MessageSquare,
  Shield,
  Layers,
} from 'lucide-react';
import { Character, CharacterAvatars } from '../types/roleplay';

interface CharacterStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  activeCharacterId: string;
  onSelectCharacter: (id: string) => void;
  onSaveCharacter: (char: Character) => void;
  onDeleteCharacter: (id: string) => void;
  isGroupScene: boolean;
  onToggleGroupScene: (enabled: boolean) => void;
  activeGroupCharacterIds: string[];
  onToggleCharacterInGroup: (id: string) => void;
}

export const CharacterStudioModal: React.FC<CharacterStudioModalProps> = ({
  isOpen,
  onClose,
  characters,
  activeCharacterId,
  onSelectCharacter,
  onSaveCharacter,
  onDeleteCharacter,
  isGroupScene,
  onToggleGroupScene,
  activeGroupCharacterIds,
  onToggleCharacterInGroup,
}) => {
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [activeAvatarTab, setActiveAvatarTab] = useState<keyof CharacterAvatars>('calm');

  if (!isOpen) return null;

  const handleCreateNew = () => {
    const newChar: Character = {
      id: 'char-' + Date.now(),
      name: 'New Character',
      title: 'The Enigma',
      tagline: 'A calculating presence with unknown intentions.',
      voiceName: 'Puck',
      themeColor: '#7f1d1d',
      accentColor: '#991b1b',
      composureState: 'The Impeccable Mask',
      avatars: {
        calm: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
        calculating: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop',
        smirking: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
        predatory: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop',
        intimate: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600&auto=format&fit=crop',
      },
      psychologicalCore: '',
      speechPatterns: '',
      scenario: '',
      openingGreetings: ['*He stands in the dim shadows, watching your every breath.* "Welcome."'],
      exampleDialogue: '',
      hiddenAgenda: '',
      phoneContactName: 'New Character',
      phoneStatus: 'Online • In the Shadows',
      textingStyle: 'Cold, cryptic, concise. Never uses emojis.',
      phoneBehavior: 'calculating',
    };
    setEditingChar(newChar);
  };

  const handleExportJSON = (char: Character) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(char, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${char.name.toLowerCase().replace(/\s+/g, '_')}_card.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.name && parsed.psychologicalCore) {
          parsed.id = 'char-' + Date.now();
          onSaveCharacter(parsed);
        }
      } catch (err) {
        alert('Invalid Character JSON format.');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChar) return;
    onSaveCharacter(editingChar);
    setEditingChar(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-[#121216] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272a] bg-[#0c0c0e]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="font-heading font-semibold text-base text-zinc-100">
                CHARACTER STUDIO & GROUP SCENE MODE
              </h2>
              <p className="text-[11px] text-zinc-400">
                15,000-word architecture, dynamic emotion avatars, and multi-character staging
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
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {editingChar ? (
            /* Editing Form */
            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                <h3 className="font-semibold text-sm text-red-400">
                  {editingChar.id.startsWith('char-') ? 'Create Character' : `Edit: ${editingChar.name}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingChar(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase">Name</label>
                  <input
                    type="text"
                    value={editingChar.name}
                    onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })}
                    className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase">Title</label>
                  <input
                    type="text"
                    value={editingChar.title}
                    onChange={(e) => setEditingChar({ ...editingChar, title: e.target.value })}
                    className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-white"
                    placeholder="e.g. The Cracking Calm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase">TTS Voice</label>
                  <select
                    value={editingChar.voiceName}
                    onChange={(e) => setEditingChar({ ...editingChar, voiceName: e.target.value })}
                    className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-white"
                  >
                    <option value="Puck">Puck (Deep, Restrained Baritone)</option>
                    <option value="Charon">Charon (Dark, Resonant Bass)</option>
                    <option value="Fenrir">Fenrir (Predatory, Razor-sharp)</option>
                    <option value="Kore">Kore (Velvety, Aristocratic)</option>
                    <option value="Zephyr">Zephyr (Soft, Chilling Whisper)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Emotion Avatars */}
              <div className="p-3 rounded-xl bg-[#09090b] border border-[#27272a] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-red-300">
                    DYNAMIC EMOTION AVATARS (Switches automatically based on [EMOTION: tag])
                  </span>
                  <div className="flex gap-1">
                    {(['calm', 'calculating', 'smirking', 'predatory', 'intimate'] as const).map((emo) => (
                      <button
                        key={emo}
                        type="button"
                        onClick={() => setActiveAvatarTab(emo)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize transition-colors ${
                          activeAvatarTab === emo
                            ? 'bg-red-700 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {emo}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={editingChar.avatars[activeAvatarTab]}
                    alt={activeAvatarTab}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-red-700"
                  />
                  <div className="flex-1">
                    <label className="text-[10px] uppercase font-mono text-zinc-400">
                      {activeAvatarTab} Avatar Image URL:
                    </label>
                    <input
                      type="text"
                      value={editingChar.avatars[activeAvatarTab]}
                      onChange={(e) =>
                        setEditingChar({
                          ...editingChar,
                          avatars: {
                            ...editingChar.avatars,
                            [activeAvatarTab]: e.target.value,
                          },
                        })
                      }
                      className="w-full mt-1 p-2 bg-[#121216] border border-zinc-700 rounded text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Psychological Core & Speech Patterns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase">
                    Psychological Core (Fixations, Ego, Morals)
                  </label>
                  <textarea
                    rows={4}
                    value={editingChar.psychologicalCore}
                    onChange={(e) => setEditingChar({ ...editingChar, psychologicalCore: e.target.value })}
                    className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-200"
                    placeholder="Deep psychological constitution..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase">
                    Speech Patterns, Cadence & Dialect
                  </label>
                  <textarea
                    rows={4}
                    value={editingChar.speechPatterns}
                    onChange={(e) => setEditingChar({ ...editingChar, speechPatterns: e.target.value })}
                    className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-200"
                    placeholder="Rhythm, tone, physical proximity habits..."
                  />
                </div>
              </div>

              {/* Hidden Agenda & Scenario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase">
                    Hidden Agenda & True Nature (Concealed from Lian)
                  </label>
                  <textarea
                    rows={3}
                    value={editingChar.hiddenAgenda}
                    onChange={(e) => setEditingChar({ ...editingChar, hiddenAgenda: e.target.value })}
                    className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-200"
                    placeholder="What the character secretly plots behind the calm facade..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase">Current Scenario & Setting</label>
                  <textarea
                    rows={3}
                    value={editingChar.scenario}
                    onChange={(e) => setEditingChar({ ...editingChar, scenario: e.target.value })}
                    className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-200"
                    placeholder="Location, initial tension, weather, locked room..."
                  />
                </div>
              </div>

              {/* Opening Greeting */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase">
                  Opening Greeting (Swipeable First Message)
                </label>
                <textarea
                  rows={4}
                  value={editingChar.openingGreetings[0] || ''}
                  onChange={(e) =>
                    setEditingChar({
                      ...editingChar,
                      openingGreetings: [e.target.value],
                    })
                  }
                  className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-200 font-serif"
                  placeholder="*Cassio shuts the door...* &quot;You test my patience.&quot;"
                />
              </div>

              {/* In-World Smartphone & Cellular Communications Configuration */}
              <div className="p-3.5 rounded-xl bg-[#09090b] border-[0.5px] border-[#d4af37]/30 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-serif font-semibold text-[#d4af37]">
                  <span>📱 IN-WORLD SMARTPHONE & COMMUNICATIONS INTEGRATION</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-zinc-400">
                      Contact Display Name
                    </label>
                    <input
                      type="text"
                      value={editingChar.phoneContactName || ''}
                      onChange={(e) => setEditingChar({ ...editingChar, phoneContactName: e.target.value })}
                      placeholder="e.g. Cassio Blackwood"
                      className="w-full mt-1 p-2 bg-[#121216] border border-zinc-700 rounded text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-zinc-400">
                      Phone Behavior & Presence Mode
                    </label>
                    <select
                      value={editingChar.phoneBehavior || 'calculating'}
                      onChange={(e) => setEditingChar({ ...editingChar, phoneBehavior: e.target.value as any })}
                      className="w-full mt-1 p-2 bg-[#121216] border border-zinc-700 rounded text-xs text-white"
                    >
                      <option value="calculating">Calculating (Deliberate, precise delays)</option>
                      <option value="obsessive">Obsessive (Frequent unsolicited texts, rapid checks)</option>
                      <option value="playful-menacing">Playful Menacing (Mocking, witty inquiries)</option>
                      <option value="cold-demanding">Cold Demanding (Short orders, brief calls)</option>
                      <option value="whispering">Whispering (Late night voice dispatches)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400">
                    Texting Cadence & SMS Tone Prompt
                  </label>
                  <textarea
                    rows={2}
                    value={editingChar.textingStyle || ''}
                    onChange={(e) => setEditingChar({ ...editingChar, textingStyle: e.target.value })}
                    placeholder="e.g. Low, commanding, aristocratic, zero emojis, precise punctuation. Texts read like surgical verdicts."
                    className="w-full mt-1 p-2 bg-[#121216] border border-zinc-700 rounded text-xs text-zinc-200 font-serif"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingChar(null)}
                  className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-red-700 text-white text-xs font-semibold hover:bg-red-600"
                >
                  Save Character
                </button>
              </div>
            </form>
          ) : (
            /* Characters List & Group Staging */
            <div className="space-y-5">
              {/* Group Scene Mode Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#18181b] to-[#251014] border border-[#7f1d1d]/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold text-sm text-zinc-100">
                      MULTI-CHARACTER GROUP SCENE MODE
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                      CROWD COGNITION
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Stage Cassio and Julian Vance in the same room interacting with Lian and each other!
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-300">
                    {isGroupScene ? 'Group Active' : 'Solo Mode'}
                  </span>
                  <button
                    onClick={() => onToggleGroupScene(!isGroupScene)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      isGroupScene ? 'bg-red-700 justify-end' : 'bg-zinc-800 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-400">
                  AVAILABLE CHARACTERS ({characters.length})
                </span>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-2.5 py-1 text-xs rounded bg-[#18181b] border border-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import JSON</span>
                    <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                  </label>
                  <button
                    onClick={handleCreateNew}
                    className="px-2.5 py-1 text-xs rounded bg-red-700 hover:bg-red-600 text-white flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Character</span>
                  </button>
                </div>
              </div>

              {/* Characters Cards */}
              <div className="space-y-3.5">
                {characters.map((char) => {
                  const isPrimary = char.id === activeCharacterId;
                  const isInGroup = activeGroupCharacterIds.includes(char.id);

                  return (
                    <div
                      key={char.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isPrimary
                          ? 'bg-[#181416] border-[#7f1d1d] shadow-[0_0_15px_rgba(127,29,29,0.3)]'
                          : 'bg-[#18181b] border-[#27272a]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={char.avatars.calm}
                            alt={char.name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-red-700"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-heading font-semibold text-base text-zinc-100">
                                {char.name}
                              </h4>
                              <span className="text-xs text-red-400 font-serif italic">
                                "{char.title}"
                              </span>
                              {isPrimary && (
                                <span className="text-[10px] bg-red-700 text-white font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Check className="w-3 h-3" /> ACTIVE SPEAKER
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                              {char.tagline}
                            </p>
                          </div>
                        </div>

                        {/* Control buttons */}
                        <div className="flex items-center gap-2">
                          {isGroupScene && (
                            <button
                              onClick={() => onToggleCharacterInGroup(char.id)}
                              className={`px-2.5 py-1 text-xs rounded border transition-colors flex items-center gap-1 ${
                                isInGroup
                                  ? 'bg-purple-950/80 border-purple-700 text-purple-200'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                              }`}
                              title="Include in Group Scene"
                            >
                              <Users className="w-3 h-3" />
                              <span>{isInGroup ? 'In Group Room' : 'Add to Room'}</span>
                            </button>
                          )}

                          {!isPrimary && (
                            <button
                              onClick={() => onSelectCharacter(char.id)}
                              className="px-3 py-1 text-xs rounded bg-zinc-800 hover:bg-red-700 text-zinc-200 hover:text-white transition-colors"
                            >
                              Switch to {char.name}
                            </button>
                          )}

                          <button
                            onClick={() => handleExportJSON(char)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800"
                            title="Export Character Card"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingChar(char)}
                            className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
                            title="Edit Character"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {characters.length > 1 && (
                            <button
                              onClick={() => onDeleteCharacter(char.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-800"
                              title="Delete Character"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Avatars Preview Row */}
                      <div className="mt-3 pt-2.5 border-t border-[#27272a] flex items-center justify-between text-xs">
                        <span className="text-[10px] uppercase font-mono text-zinc-500">
                          Avatars:
                        </span>
                        <div className="flex items-center gap-2">
                          {(['calm', 'calculating', 'smirking', 'predatory', 'intimate'] as const).map(
                            (emo) => (
                              <img
                                key={emo}
                                src={char.avatars[emo]}
                                alt={emo}
                                title={`${emo.toUpperCase()} avatar`}
                                className="w-7 h-7 rounded-full object-cover border border-zinc-700 hover:border-red-500 transition-colors"
                              />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
