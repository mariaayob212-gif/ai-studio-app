import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Sliders,
  UserCheck,
  BookOpen,
  Sparkles,
  Lock,
  EyeOff,
  Image as ImageIcon,
  Compass,
  Bookmark,
  Activity,
  Smartphone,
  ArrowLeft,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { Character, PsychologicalHUD, RoleplaySettings } from '../types/roleplay';
import { soundscape } from '../utils/audioSynthesizer';
import { INITIAL_WALLPAPERS } from '../data/initialData';
import { getEmotionStyle } from '../utils/emotionTheme';

interface HeaderProps {
  activeCharacter: Character;
  hud: PsychologicalHUD;
  settings: RoleplaySettings;
  unreadPhoneCount?: number;
  activeEmotion?: string;
  onUpdateSettings: (settings: Partial<RoleplaySettings>) => void;
  onOpenHud: () => void;
  onOpenPersonas: () => void;
  onOpenCharacters: () => void;
  onOpenMemory: () => void;
  onOpenSmartphone: () => void;
  onOpenDirector: () => void;
  onOpenImageStudio: () => void;
  onOpenVocabulary: () => void;
  onOpenSettings: () => void;
  onTriggerPanic: () => void;
  onLockScreen: () => void;
  onBackToExplore?: () => void;
  onStartNewChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeCharacter,
  hud,
  settings,
  unreadPhoneCount = 0,
  activeEmotion = 'calm',
  onUpdateSettings,
  onOpenHud,
  onOpenPersonas,
  onOpenCharacters,
  onOpenMemory,
  onOpenSmartphone,
  onOpenDirector,
  onOpenImageStudio,
  onOpenVocabulary,
  onOpenSettings,
  onTriggerPanic,
  onLockScreen,
  onBackToExplore,
  onStartNewChat,
}) => {
  const [showAudioDropdown, setShowAudioDropdown] = useState(false);
  const [showWallpaperDropdown, setShowWallpaperDropdown] = useState(false);

  const emotionStyle = getEmotionStyle(activeEmotion);

  const handleTrackChange = (track: 'off' | 'rain' | 'fire' | 'heartbeat' | 'cello') => {
    soundscape.play(track);
    onUpdateSettings({ ambientTrack: track });
  };

  const handleVolumeChange = (vol: number) => {
    soundscape.setVolume(vol);
    onUpdateSettings({ ambientVolume: vol });
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-3 sm:px-6 py-2 bg-[#0a0a0e]/92 backdrop-blur-2xl border-b-[0.5px] border-[#d4af37]/25 shadow-xl shadow-black/60 select-none">
      {/* Left: Back to Explore + Character profile with Reactive Emotion Ring */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onBackToExplore && (
          <button
            onClick={onBackToExplore}
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-white/[0.04] hover:bg-[#d4af37]/15 border border-[#d4af37]/25 text-[#d4af37] text-xs font-serif transition-all hover:scale-105"
            title="Return to C.AI Explore Roster & Character Home"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-medium">Explore</span>
          </button>
        )}

        <button
          onClick={onOpenCharacters}
          className="flex items-center gap-2 sm:gap-2.5 text-left group hover:opacity-95 transition-opacity"
          title="Switch or Edit Characters"
        >
          {/* Active Character Avatar with Glowing Reactive Emotion Ring */}
          <div className="relative">
            <img
              src={activeCharacter.avatars.calm}
              alt={activeCharacter.name}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover transition-all duration-500 ${emotionStyle.ringClass}`}
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#070709]" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-heading font-semibold text-xs sm:text-sm tracking-wider text-[#f4f4f6] group-hover:text-[#d4af37] transition-colors">
                {activeCharacter.name}
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full border font-serif tracking-wider ${emotionStyle.badgeClass}`}>
                ✦ {emotionStyle.label} / {emotionStyle.arabicLabel} ✦
              </span>
            </div>
            <div className="text-[10px] text-[#c5a059]/80 font-serif italic truncate max-w-[120px] sm:max-w-[180px]">
              {hud.composure || activeCharacter.composureState}
            </div>
          </div>
        </button>

        {/* PERMANENTLY FIXED SMARTPHONE (📱) BUTTON DIRECTLY NEXT TO CHARACTER */}
        <button
          onClick={onOpenSmartphone}
          className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#14121a] hover:bg-[#1f1b29] border border-[#d4af37]/60 hover:border-[#d4af37] text-[#f4e4a6] text-xs font-serif font-semibold transition-all shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:scale-105 shrink-0"
          title={`In-World Smartphone (📱) & Communications with ${activeCharacter.name}`}
        >
          <Smartphone className="w-4 h-4 text-[#d4af37]" />
          <span className="hidden xs:inline">Phone 📱</span>
          {unreadPhoneCount > 0 && (
            <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#dc2626] text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
              {unreadPhoneCount}
            </span>
          )}
        </button>

        {/* Live Heart Rate & Psychological Quick HUD Button */}
        <button
          onClick={onOpenHud}
          className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#121217]/80 border-[0.5px] border-[#d4af37]/25 hover:border-[#d4af37]/60 text-xs transition-colors shadow-sm"
          title="Open Live Psychological HUD & Inventory"
        >
          <div className="flex items-center gap-1 text-[#d4af37]">
            <Activity className="w-3.5 h-3.5 animate-heart-pulse text-[#d4af37]" />
            <span className="font-mono font-medium">{hud.heartRate}</span>
            <span className="text-[10px] text-zinc-500 font-serif">BPM</span>
          </div>
          <div className="h-3 w-[0.5px] bg-[#d4af37]/30" />
          <div className="flex items-center gap-2 text-[11px] font-serif text-zinc-300">
            <span>Obs: <b className="text-[#f4f4f6]">{hud.obsession}%</b></span>
            <span>Dan: <b className="text-[#e5c07b]">{hud.danger}%</b></span>
          </div>
        </button>
      </div>

      {/* Right Controls: New Chat, Phone Hub (📱), Audio, Wallpaper, Tools */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-[65%] sm:max-w-none shrink-0 justify-end">
        {/* Start New Chat Button */}
        {onStartNewChat && (
          <button
            onClick={onStartNewChat}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-[#d4af37]/30 text-zinc-300 hover:text-[#f4e4a6] text-xs font-serif transition-colors"
            title="Start New Clean Slate Chat with this Character"
          >
            <Plus className="w-3.5 h-3.5 text-[#d4af37]" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        )}

        {/* In-World Smartphone (📱) Quick Hub Button */}
        <button
          onClick={onOpenSmartphone}
          className="relative p-2 rounded-full bg-[#121217]/80 border-[0.5px] border-[#d4af37]/30 hover:border-[#d4af37] text-[#d4af37] hover:text-[#f4e4a6] transition-all hover:scale-105 shadow-[0_0_12px_rgba(212,175,55,0.15)]"
          title={`In-World Smartphone (📱) & Communications with ${activeCharacter.name}`}
        >
          <Smartphone className="w-4 h-4" />
          {unreadPhoneCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#dc2626] border border-[#070709] text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadPhoneCount}
            </span>
          )}
        </button>

        {/* Mobile quick HUD toggle */}
        <button
          onClick={onOpenHud}
          className="md:hidden p-2 rounded-full bg-[#121217]/80 border-[0.5px] border-[#d4af37]/25 text-[#d4af37] hover:text-[#f4e4a6]"
          title="Psychological HUD"
        >
          <Activity className="w-4 h-4 animate-heart-pulse" />
        </button>

        {/* Audio Soundscape Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAudioDropdown(!showAudioDropdown)}
            className={`p-2 rounded-full border-[0.5px] transition-colors ${
              settings.ambientTrack !== 'off'
                ? 'bg-[#d4af37]/15 border-[#d4af37] text-[#f4e4a6] shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                : 'bg-[#121217]/80 border-[#d4af37]/20 text-zinc-400 hover:text-[#d4af37]'
            }`}
            title="Atmospheric Soundscape (Heavy Rain, Fireplace, Heartbeat, Dark Cello)"
          >
            {settings.ambientTrack !== 'off' ? (
              <Volume2 className="w-4 h-4 text-[#d4af37]" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {showAudioDropdown && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0e0c12]/95 border-[0.5px] border-[#d4af37]/35 shadow-2xl backdrop-blur-2xl p-3 z-50 space-y-2.5 animate-in fade-in">
              <div className="text-[10px] font-serif uppercase tracking-widest text-[#d4af37] border-b border-[#d4af37]/20 pb-1 font-semibold">
                Atmospheric Soundscape
              </div>
              <div className="space-y-1">
                {[
                  { id: 'off', label: 'Silence' },
                  { id: 'rain', label: 'Heavy Gothic Rain' },
                  { id: 'fire', label: 'Crackling Fireplace' },
                  { id: 'heartbeat', label: 'Tense Heartbeat' },
                  { id: 'cello', label: 'Dark Noir Cello' },
                ].map((track) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      handleTrackChange(track.id as any);
                      setShowAudioDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-serif transition-colors flex items-center justify-between ${
                      settings.ambientTrack === track.id
                        ? 'bg-[#d4af37]/20 text-[#f4e4a6] font-medium'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                    }`}
                  >
                    <span>{track.label}</span>
                    {settings.ambientTrack === track.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
                    )}
                  </button>
                ))}
              </div>

              {settings.ambientTrack !== 'off' && (
                <div className="pt-2 border-t border-[#d4af37]/15 space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-serif">
                    <span>Volume</span>
                    <span>{Math.round(settings.ambientVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.ambientVolume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Wallpaper Scene Location Selector */}
        <div className="relative">
          <button
            onClick={() => setShowWallpaperDropdown(!showWallpaperDropdown)}
            className="p-2 rounded-full bg-[#121217]/80 border-[0.5px] border-[#d4af37]/20 text-zinc-400 hover:text-[#d4af37] hover:border-[#d4af37]/50 transition-colors"
            title="Scene Location Wallpapers"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {showWallpaperDropdown && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0e0c12]/95 border-[0.5px] border-[#d4af37]/35 shadow-2xl backdrop-blur-2xl p-3 z-50 space-y-2 animate-in fade-in">
              <div className="text-[10px] font-serif uppercase tracking-widest text-[#d4af37] border-b border-[#d4af37]/20 pb-1 font-semibold">
                Scene Location & Backdrop
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {INITIAL_WALLPAPERS.map((wp) => (
                  <button
                    key={wp.id}
                    onClick={() => {
                      onUpdateSettings({ currentWallpaper: wp.id });
                      setShowWallpaperDropdown(false);
                    }}
                    className={`w-full text-left p-1.5 rounded-xl border transition-all flex items-center gap-2 ${
                      settings.currentWallpaper === wp.id
                        ? 'border-[#d4af37] bg-[#d4af37]/10'
                        : 'border-transparent hover:bg-white/5'
                    }`}
                  >
                    <img
                      src={wp.url}
                      alt={wp.name}
                      className="w-10 h-10 rounded-lg object-cover border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-serif font-medium text-[#f4f4f6] truncate">
                        {wp.name}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate italic">
                        {wp.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Personas Modal Trigger */}
        <button
          onClick={onOpenPersonas}
          className="p-2 rounded-full bg-[#121217]/80 border-[0.5px] border-[#d4af37]/20 text-zinc-400 hover:text-[#d4af37] hover:border-[#d4af37]/50 transition-colors"
          title="My Personas (Lian Pre-Chat Knowledge)"
        >
          <UserCheck className="w-4 h-4" />
        </button>

        {/* Memory Ledger & Lorebook */}
        <button
          onClick={onOpenMemory}
          className="p-2 rounded-full bg-[#121217]/80 border-[0.5px] border-[#d4af37]/20 text-zinc-400 hover:text-[#d4af37] hover:border-[#d4af37]/50 transition-colors"
          title="Infinite Memory Ledger & Lorebook"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        {/* Studio Settings */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full bg-[#121217]/80 border-[0.5px] border-[#d4af37]/20 text-zinc-400 hover:text-[#d4af37] hover:border-[#d4af37]/50 transition-colors"
          title="Studio & Safety Settings"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
