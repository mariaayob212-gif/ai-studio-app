import React, { useState } from 'react';
import {
  X,
  Compass,
  Clock,
  MapPin,
  Zap,
  UserPlus,
  Play,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Character, Persona, PsychologicalHUD } from '../types/roleplay';

interface SceneDirectorToolbarProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteDirectorAction: (actionType: string, details: string) => Promise<void>;
  character: Character;
  activePersona: Persona;
  hud: PsychologicalHUD;
}

export const SceneDirectorToolbar: React.FC<SceneDirectorToolbarProps> = ({
  isOpen,
  onClose,
  onExecuteDirectorAction,
  character,
  activePersona,
  hud,
}) => {
  const [selectedAction, setSelectedAction] = useState<string>('twist');
  const [customDetails, setCustomDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const presets = [
    {
      id: 'time_skip',
      icon: Clock,
      label: 'Time Skip',
      description: 'Advance the clock: midnight strikes, thunderstorm intensifies, or early dawn creeps in.',
      defaultNote: 'Advance two hours into the dead of night. The rain has turned torrential and the fire burns low.',
    },
    {
      id: 'location_change',
      icon: MapPin,
      label: 'Scene Change',
      description: 'Move characters to the Subterranean Vault, Glass Conservatory, or Grand Balcony.',
      defaultNote: 'Cassio forces Lian down the stone stairs into the subterranean archives beneath the estate.',
    },
    {
      id: 'plot_twist',
      icon: Zap,
      label: 'Plot Twist',
      description: 'Sudden event: power cuts out, distant gunshot, glass shatters, a secret latch springs open.',
      defaultNote: 'The chandelier violently flickers and dies, plunging the library into pitch-black darkness as thunder roars.',
    },
    {
      id: 'npc_entrance',
      icon: UserPlus,
      label: 'NPC Entrance',
      description: 'Julian Vance walks in unannounced, or an armed courier arrives with urgent blackmail.',
      defaultNote: 'Julian Vance pushes open the rain-swept terrace doors, holding a glass of bourbon and smiling dangerously.',
    },
  ];

  const handleExecute = async () => {
    setIsSubmitting(true);
    try {
      const activePreset = presets.find((p) => p.id === selectedAction);
      const noteToUse = customDetails.trim() || activePreset?.defaultNote || '';
      await onExecuteDirectorAction(activePreset?.label || selectedAction, noteToUse);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-[#121216] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272a] bg-[#0c0c0e]">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="font-heading font-semibold text-base text-zinc-100">
                SCENE DIRECTOR TOOLBAR
              </h2>
              <p className="text-[11px] text-zinc-400">
                Steer dramatic pacing, trigger sudden twists, or stage new character entrances
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

        {/* Action Preset Buttons */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            {presets.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedAction === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedAction(preset.id);
                    setCustomDetails(preset.defaultNote);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-[#1e1014] border-red-700 shadow-[0_0_12px_rgba(127,29,29,0.3)]'
                      : 'bg-[#18181b] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-red-400' : 'text-zinc-400'}`} />
                    <span className="font-semibold text-xs text-zinc-100">{preset.label}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-2">{preset.description}</p>
                </button>
              );
            })}
          </div>

          {/* Custom Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase">
              Director Instructions & Event Details:
            </label>
            <textarea
              rows={3}
              value={customDetails}
              onChange={(e) => setCustomDetails(e.target.value)}
              placeholder="Describe the sudden shift or event in vivid detail..."
              className="w-full p-2.5 bg-[#09090b] border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-red-500 font-serif leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={handleExecute}
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded bg-red-700 text-white text-xs font-semibold hover:bg-red-600 flex items-center gap-1.5 shadow-lg"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Direct Event (Narrator Turn)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
