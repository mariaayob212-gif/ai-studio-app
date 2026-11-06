import React, { useState } from 'react';
import { X, UserCheck, Plus, Check, Trash2, Edit3, ShieldAlert, Sparkles, Code } from 'lucide-react';
import { Persona } from '../types/roleplay';

interface PersonasModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
  onSelectPersona: (id: string) => void;
  onSavePersona: (persona: Persona) => void;
  onDeletePersona: (id: string) => void;
}

export const PersonasModal: React.FC<PersonasModalProps> = ({
  isOpen,
  onClose,
  personas,
  onSelectPersona,
  onSavePersona,
  onDeletePersona,
}) => {
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  if (!isOpen) return null;

  const activePersona = personas.find((p) => p.isActive) || personas[0];

  const handleStartNew = () => {
    const newPersona: Persona = {
      id: 'persona-' + Date.now(),
      name: 'New Persona',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
      appearance: '',
      personality: '',
      backstory: '',
      fearsAndTriggers: '',
      hiddenSecrets: '',
      speakingStyle: '',
      initialRelationship: '',
      isActive: false,
    };
    setEditingPersona(newPersona);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPersona) return;
    onSavePersona(editingPersona);
    setEditingPersona(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#121216] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272a] bg-[#0c0c0e]">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="font-heading font-semibold text-base text-zinc-100">
                MY PERSONAS (USER PROFILE & PRE-CHAT INJECTION)
              </h2>
              <p className="text-[11px] text-zinc-400">
                Injected into AI system instructions prior to message #1
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {editingPersona ? (
            /* Edit / Create Form */
            <form onSubmit={handleSaveForm} className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                <h3 className="font-semibold text-sm text-red-400">
                  {editingPersona.id.startsWith('persona-') ? 'Create New Persona' : `Edit: ${editingPersona.name}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingPersona(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase">Persona Name</label>
                  <input
                    type="text"
                    value={editingPersona.name}
                    onChange={(e) => setEditingPersona({ ...editingPersona, name: e.target.value })}
                    className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-white focus:border-red-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase">Avatar URL</label>
                  <input
                    type="text"
                    value={editingPersona.avatar}
                    onChange={(e) => setEditingPersona({ ...editingPersona, avatar: e.target.value })}
                    className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase">Appearance & Attire</label>
                <textarea
                  rows={2}
                  value={editingPersona.appearance}
                  onChange={(e) => setEditingPersona({ ...editingPersona, appearance: e.target.value })}
                  placeholder="e.g. Slender, dark hair, graphite eyes, high-collared dark wool dress, bruised left wrist..."
                  className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase">Personality & Defiance Style</label>
                  <textarea
                    rows={2}
                    value={editingPersona.personality}
                    onChange={(e) => setEditingPersona({ ...editingPersona, personality: e.target.value })}
                    placeholder="e.g. Intellectually formidable, masks terror with composure and sharp irony..."
                    className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase">Backstory & Bloodline</label>
                  <textarea
                    rows={2}
                    value={editingPersona.backstory}
                    onChange={(e) => setEditingPersona({ ...editingPersona, backstory: e.target.value })}
                    placeholder="e.g. Heir to an archivist family ruined by Cassio's machinations..."
                    className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase">Fears & Triggers</label>
                  <textarea
                    rows={2}
                    value={editingPersona.fearsAndTriggers}
                    onChange={(e) => setEditingPersona({ ...editingPersona, fearsAndTriggers: e.target.value })}
                    placeholder="e.g. Small locked rooms, loss of mental autonomy, gaslighting..."
                    className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase">Hidden Secrets & Concealed Items</label>
                  <textarea
                    rows={2}
                    value={editingPersona.hiddenSecrets}
                    onChange={(e) => setEditingPersona({ ...editingPersona, hiddenSecrets: e.target.value })}
                    placeholder="e.g. Stolen brass key sewn in sleeve lining, father's cipher..."
                    className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase">Speaking Style & Prose Cadence</label>
                  <input
                    type="text"
                    value={editingPersona.speakingStyle}
                    onChange={(e) => setEditingPersona({ ...editingPersona, speakingStyle: e.target.value })}
                    placeholder="e.g. Poetic, razor-sharp, quiet defiance, never grovels..."
                    className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase">Initial Relationship to Character</label>
                  <input
                    type="text"
                    value={editingPersona.initialRelationship}
                    onChange={(e) => setEditingPersona({ ...editingPersona, initialRelationship: e.target.value })}
                    placeholder="e.g. Hostage under velvet constraints; mutual hatred and fixation..."
                    className="w-full mt-1 p-2 bg-[#09090b] border border-zinc-700 rounded text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPersona(null)}
                  className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-red-700 text-white text-xs font-semibold hover:bg-red-600 shadow-md"
                >
                  Save Persona
                </button>
              </div>
            </form>
          ) : (
            /* Personas Card List */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-400">
                  Select the active persona to drive the roleplay perspective:
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPromptPreview(!showPromptPreview)}
                    className="px-2.5 py-1 text-xs rounded bg-[#18181b] border border-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1.5"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{showPromptPreview ? 'Hide Prompt' : 'View Injected Prompt'}</span>
                  </button>
                  <button
                    onClick={handleStartNew}
                    className="px-2.5 py-1 text-xs rounded bg-[#7f1d1d] hover:bg-[#991b1b] text-white flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Persona</span>
                  </button>
                </div>
              </div>

              {/* Prompt Preview Accordion */}
              {showPromptPreview && (
                <div className="p-3 rounded-xl bg-[#09090b] border border-[#7f1d1d]/40 text-xs font-mono text-zinc-300 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-red-400 font-semibold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>SYSTEM PROMPT INJECTION PREVIEW (ACTIVE: {activePersona.name}):</span>
                  </div>
                  <pre className="text-[10px] leading-relaxed whitespace-pre-wrap text-zinc-400 bg-[#121216] p-2.5 rounded border border-zinc-800">
{`ACTIVE USER PERSONA:
- Name: ${activePersona.name}
- Appearance: ${activePersona.appearance}
- Personality: ${activePersona.personality}
- Backstory: ${activePersona.backstory}
- Fears & Triggers: ${activePersona.fearsAndTriggers}
- Hidden Secrets: ${activePersona.hiddenSecrets}
- Speaking Style: ${activePersona.speakingStyle}
- Initial Relationship: ${activePersona.initialRelationship}
(Characters will actively smell her perfume, notice her bruised wrist, and recognize her family ties.)`}
                  </pre>
                </div>
              )}

              {/* Persona Cards */}
              <div className="space-y-3">
                {personas.map((persona) => {
                  const isActive = persona.isActive;
                  return (
                    <div
                      key={persona.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-[#1a1215] border-[#7f1d1d] shadow-[0_0_15px_rgba(127,29,29,0.3)]'
                          : 'bg-[#18181b] border-[#27272a] hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={persona.avatar}
                            alt={persona.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-red-900/60"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-heading font-semibold text-sm text-zinc-100">
                                {persona.name}
                              </span>
                              {isActive && (
                                <span className="text-[10px] bg-red-700 text-white font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Check className="w-3 h-3" /> ACTIVE
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400 font-serif italic mt-0.5 line-clamp-1">
                              {persona.initialRelationship || 'Roleplay protagonist'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {!isActive && (
                            <button
                              onClick={() => onSelectPersona(persona.id)}
                              className="px-2.5 py-1 text-xs rounded bg-zinc-800 hover:bg-red-700 text-zinc-200 hover:text-white transition-colors"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => setEditingPersona(persona)}
                            className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
                            title="Edit Persona"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {personas.length > 1 && (
                            <button
                              onClick={() => onDeletePersona(persona.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-800"
                              title="Delete Persona"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-[#27272a] text-xs text-zinc-300 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-mono text-zinc-500 block">Attire:</span>
                          <p className="text-zinc-400 line-clamp-2">{persona.appearance}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-mono text-zinc-500 block">Concealed:</span>
                          <p className="text-zinc-400 line-clamp-2">{persona.hiddenSecrets}</p>
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
