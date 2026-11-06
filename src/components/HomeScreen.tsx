import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Smartphone,
  MessageSquare,
  Sparkles,
  Sliders,
  BookOpen,
  UserCheck,
  Compass,
  ArrowRight,
  Shield,
  Layers,
  Heart,
  Activity,
  Flame,
  Volume2,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import {
  Character,
  Persona,
  PsychologicalHUD,
  CharacterCommunications,
  ChatMessage,
  RoleplaySettings,
} from '../types/roleplay';
import { getEmotionStyle } from '../utils/emotionTheme';

interface HomeScreenProps {
  characters: Character[];
  activeCharacterId: string;
  characterHuds: Record<string, PsychologicalHUD>;
  communications: Record<string, CharacterCommunications>;
  messages: ChatMessage[];
  activePersona: Persona;
  settings: RoleplaySettings;
  unreadPhoneCount: number;
  onSelectCharacterAndChat: (characterId: string) => void;
  onStartNewChat: (characterId: string) => void;
  onOpenSmartphone: (characterId?: string) => void;
  onOpenCharacterStudio: () => void;
  onOpenPersonas: () => void;
  onOpenMemory: () => void;
  onOpenSettings: () => void;
  onOpenWallpapers: () => void;
  onOpenSoundscape: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  characters,
  activeCharacterId,
  characterHuds,
  communications,
  messages,
  activePersona,
  settings,
  unreadPhoneCount,
  onSelectCharacterAndChat,
  onStartNewChat,
  onOpenSmartphone,
  onOpenCharacterStudio,
  onOpenPersonas,
  onOpenMemory,
  onOpenSettings,
  onOpenWallpapers,
  onOpenSoundscape,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const tags = [
    { id: 'all', label: 'All Roster' },
    { id: 'dark-romance', label: 'Dark Romance' },
    { id: 'psychological', label: 'Psychological Thriller' },
    { id: 'rivals', label: 'Rivals to Lovers' },
    { id: 'gothic', label: 'Aristocratic Gothic' },
  ];

  // Filtered characters
  const filteredCharacters = useMemo(() => {
    return characters.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q) ||
        c.psychologicalCore.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (selectedTag === 'all') return true;
      if (selectedTag === 'dark-romance') return c.psychologicalCore.toLowerCase().includes('obsession') || c.id === 'cassio';
      if (selectedTag === 'psychological') return c.psychologicalCore.toLowerCase().includes('calm') || c.psychologicalCore.toLowerCase().includes('sociopath') || c.id === 'cassio';
      if (selectedTag === 'rivals') return c.psychologicalCore.toLowerCase().includes('rival') || c.id === 'julian';
      if (selectedTag === 'gothic') return c.scenario.toLowerCase().includes('gothic') || c.scenario.toLowerCase().includes('estate') || true;
      return true;
    });
  }, [characters, searchQuery, selectedTag]);

  // Recent chats summary grouped by character
  const recentChats = useMemo(() => {
    return characters.map((c) => {
      const charMessages = messages.filter((m) => m.characterId === c.id || (!m.characterId && c.id === 'cassio'));
      const lastMsg = charMessages[charMessages.length - 1];
      const unreadSms = communications[c.id]?.unreadCount || 0;
      const hud = characterHuds[c.id];
      const previewText = lastMsg?.swipes?.[0]?.text?.replace(/[*"]/g, '') || c.tagline;

      return {
        character: c,
        messageCount: charMessages.length,
        lastMessagePreview: previewText,
        lastTimestamp: lastMsg?.timestamp || Date.now(),
        unreadSms,
        composure: hud?.composure || c.composureState,
      };
    });
  }, [characters, messages, communications, characterHuds]);

  return (
    <div className="min-h-screen bg-[#070709] text-[#f4f4f6] flex flex-col md:flex-row relative overflow-x-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 z-0 bg-radial-gradient from-[#4a0e17]/15 via-transparent to-transparent pointer-events-none" />

      {/* GLOBAL SIDEBAR (Desktop permanent / Mobile toggleable) */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-40 w-72 bg-[#0a0a0e]/95 backdrop-blur-2xl border-r border-[#d4af37]/20 flex flex-col transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-5 border-b border-[#d4af37]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#4a0e17] flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.35)] border border-[#d4af37]/60">
              <Sparkles className="w-5 h-5 text-[#070709]" />
            </div>
            <div>
              <h1 className="font-heading text-base font-bold tracking-wider text-[#f4f4f6]">
                OBSIDIAN NOIR
              </h1>
              <p className="text-[10px] font-serif uppercase tracking-[0.2em] text-[#d4af37]">
                Flagship Studio
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-zinc-400 hover:text-zinc-100 p-1"
          >
            ✕
          </button>
        </div>

        {/* Global Navigation Links */}
        <div className="px-3 py-4 space-y-1 border-b border-[#d4af37]/15">
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#f4e4a6] text-xs font-serif font-medium tracking-wide shadow-[0_0_12px_rgba(212,175,55,0.2)]"
          >
            <Compass className="w-4 h-4 text-[#d4af37]" />
            <span>Explore Roster</span>
          </button>

          <button
            onClick={() => onSelectCharacterAndChat(activeCharacterId)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] text-zinc-300 hover:text-[#f4f4f6] text-xs font-serif transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-[#c5a059]" />
              <span>Active Roleplay</span>
            </div>
            {messages.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37]">
                {messages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onOpenSmartphone()}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] text-zinc-300 hover:text-[#f4f4f6] text-xs font-serif transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-[#d4af37] group-hover:scale-110 transition-transform" />
              <span>In-World Phone Hub</span>
            </div>
            {unreadPhoneCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#dc2626] text-white animate-pulse">
                {unreadPhoneCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenPersonas}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] text-zinc-300 hover:text-[#f4f4f6] text-xs font-serif transition-colors"
          >
            <UserCheck className="w-4 h-4 text-zinc-400" />
            <span>My Personas ({activePersona.name})</span>
          </button>

          <button
            onClick={onOpenMemory}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] text-zinc-300 hover:text-[#f4f4f6] text-xs font-serif transition-colors"
          >
            <BookOpen className="w-4 h-4 text-zinc-400" />
            <span>Memory & Lorebook</span>
          </button>

          <button
            onClick={onOpenCharacterStudio}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] text-zinc-300 hover:text-[#f4f4f6] text-xs font-serif transition-colors"
          >
            <Layers className="w-4 h-4 text-zinc-400" />
            <span>Character Studio</span>
          </button>
        </div>

        {/* Recent Active Conversations List (C.AI-Style History) */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          <div className="flex items-center justify-between px-2 pt-1 pb-1">
            <span className="text-[10px] uppercase font-serif tracking-[0.2em] text-[#c5a059]/80 font-semibold">
              Recent Chats
            </span>
            <button
              onClick={onOpenCharacterStudio}
              className="text-[#d4af37] hover:text-[#f4e4a6] text-xs flex items-center gap-1 font-serif"
              title="Add New Character"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentChats.map((item) => {
            const isCurrentlyActive = item.character.id === activeCharacterId;
            const emotionStyle = getEmotionStyle('calm');

            return (
              <div
                key={item.character.id}
                className={`p-2.5 rounded-2xl transition-all border ${
                  isCurrentlyActive
                    ? 'bg-[#14121a] border-[#d4af37]/40 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                    : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <img
                      src={item.character.avatars.calm}
                      alt={item.character.name}
                      className="w-9 h-9 rounded-xl object-cover border border-[#d4af37]/50"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0a0a0e]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-heading font-semibold text-xs text-[#f4f4f6] truncate">
                        {item.character.name}
                      </h4>
                      {item.unreadSms > 0 && (
                        <span className="text-[9px] bg-[#dc2626] text-white px-1.5 py-0.2 rounded-full font-bold">
                          {item.unreadSms} SMS
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#a1a1aa] truncate italic font-serif mt-0.5">
                      {item.lastMessagePreview}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => onSelectCharacterAndChat(item.character.id)}
                    className="flex-1 py-1 px-2 rounded-lg bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#f4e4a6] text-[11px] font-serif font-medium transition-colors text-center"
                  >
                    Continue Chat
                  </button>
                  <button
                    onClick={() => onStartNewChat(item.character.id)}
                    className="py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 text-[11px] font-serif transition-colors"
                    title="Start New Clean Slate Chat"
                  >
                    New Chat
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-[#d4af37]/20 flex items-center justify-between text-xs text-zinc-400">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 hover:text-[#f4e4a6] p-1.5 rounded-lg transition-colors font-serif"
          >
            <Sliders className="w-4 h-4 text-[#d4af37]" />
            <span>Settings & Backup</span>
          </button>
          <button
            onClick={onOpenSoundscape}
            className="p-1.5 hover:text-[#f4e4a6] rounded-lg transition-colors"
            title="Audio Soundscape"
          >
            <Volume2 className="w-4 h-4 text-[#c5a059]" />
          </button>
        </div>
      </aside>

      {/* MAIN EXPLORE CONTENT */}
      <div className="flex-1 flex flex-col min-h-screen relative z-10">
        {/* Top Sticky Bar */}
        <header className="sticky top-0 z-30 px-4 sm:px-8 py-3 bg-[#070709]/90 backdrop-blur-xl border-b border-[#d4af37]/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-[#d4af37] p-2 rounded-xl bg-white/5 border border-white/10"
            >
              ☰
            </button>
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#c5a059]/70" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search characters, traits, secrets..."
                className="w-full bg-[#121217]/80 border border-[#d4af37]/25 rounded-full pl-9 pr-4 py-1.5 text-xs text-[#f4f4f6] placeholder:text-zinc-500 focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenSmartphone()}
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#14121a] hover:bg-[#1f1b29] border border-[#d4af37]/40 text-[#f4e4a6] text-xs font-serif transition-all shadow-[0_0_12px_rgba(212,175,55,0.2)]"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#d4af37]" />
              <span className="hidden sm:inline">Phone Hub</span>
              {unreadPhoneCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#dc2626] text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadPhoneCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenCharacterStudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#d4af37] to-[#c5a059] text-[#070709] text-xs font-serif font-bold hover:opacity-95 shadow-[0_0_15px_rgba(212,175,55,0.35)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Character</span>
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="px-4 sm:px-8 pt-8 pb-6 max-w-6xl w-full mx-auto">
          <div className="text-center sm:text-left space-y-2">
            <span className="text-[10px] uppercase font-serif tracking-[0.3em] text-[#d4af37] block font-semibold">
              — CHARACTER.AI INSPIRED FLAGSHIP ROLEPLAY STUDIO —
            </span>
            <h2 className="font-heading text-2xl sm:text-4xl font-bold tracking-wide text-[#f4f4f6]">
              The Obsidian Roster
            </h2>
            <p className="text-xs sm:text-sm text-[#a1a1aa] font-serif max-w-2xl leading-relaxed">
              Step into uninhibited, slow-burn psychological fiction with fully sentient, uncensored AI characters.
              Each character maintains independent memory, real-time emotion simulation, and an in-world smartphone.
            </p>
          </div>

          {/* Archetype Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-6 pb-2">
            {tags.map((tag) => {
              const isSelected = selectedTag === tag.id;
              return (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTag(tag.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-serif transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#d4af37]/20 border border-[#d4af37] text-[#f4e4a6] shadow-[0_0_12px_rgba(212,175,55,0.25)] font-semibold'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 border border-white/5'
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Character Cards Grid */}
        <main className="px-4 sm:px-8 pb-16 max-w-6xl w-full mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCharacters.map((char) => {
              const hud = characterHuds[char.id];
              const comms = communications[char.id];
              const emotionStyle = getEmotionStyle('calm');

              return (
                <div
                  key={char.id}
                  className="group relative rounded-3xl bg-[#121217]/90 border border-[#d4af37]/25 p-5 shadow-2xl hover:border-[#d4af37]/60 hover:shadow-[0_12px_40px_rgba(212,175,55,0.15)] transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Character Meta Header */}
                    <div className="flex items-start gap-4">
                      {/* Reactive Emotion Ring surrounding the Avatar */}
                      <div className="relative shrink-0">
                        <img
                          src={char.avatars.calm}
                          alt={char.name}
                          className={`w-16 h-16 rounded-2xl object-cover transition-all duration-500 ${emotionStyle.ringClass}`}
                        />
                        <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#070709]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-heading text-lg font-bold text-[#f4f4f6] group-hover:text-[#d4af37] transition-colors">
                            {char.name}
                          </h3>
                        </div>
                        <p className="text-xs text-[#c5a059] font-serif italic truncate mt-0.5">
                          {char.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-400 font-serif">
                            {char.phoneStatus || 'Online • Encrypted Line'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tagline & Psychological Core */}
                    <p className="text-xs text-[#d8d8de] font-serif leading-relaxed line-clamp-3 mt-3.5 bg-black/20 p-2.5 rounded-xl border border-white/5">
                      "{char.tagline}"
                    </p>

                    {/* Live Psychological State Pills */}
                    <div className="mt-3.5 flex items-center gap-2 flex-wrap text-[10px] font-serif">
                      <div className="px-2 py-0.5 rounded-lg bg-[#4a0e17]/40 border border-[#4a0e17] text-[#fca5a5] flex items-center gap-1">
                        <Activity className="w-3 h-3 text-[#ef4444]" />
                        <span>Danger {hud?.danger || 50}%</span>
                      </div>
                      <div className="px-2 py-0.5 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#f4e4a6] flex items-center gap-1">
                        <Flame className="w-3 h-3 text-[#d4af37]" />
                        <span>Obsession {hud?.obsession || 50}%</span>
                      </div>
                      <div className="px-2 py-0.5 rounded-lg bg-white/5 text-zinc-400 italic">
                        {hud?.composure || char.composureState}
                      </div>
                    </div>
                  </div>

                  {/* Actions Dock */}
                  <div className="mt-5 pt-3.5 border-t border-white/5 flex items-center gap-2">
                    <button
                      onClick={() => onSelectCharacterAndChat(char.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c5a059] hover:from-[#c5a059] hover:to-[#d4af37] text-[#070709] font-serif font-bold text-xs shadow-[0_4px_16px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2 transition-all"
                    >
                      <span>Enter Chat</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onOpenSmartphone(char.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-[#d4af37]/20 border border-white/10 hover:border-[#d4af37]/40 text-[#d4af37] transition-all relative"
                      title="Open In-World Smartphone for this Character"
                    >
                      <Smartphone className="w-4 h-4" />
                      {comms && comms.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#dc2626] text-[9px] font-bold text-white flex items-center justify-center">
                          {comms.unreadCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => onStartNewChat(char.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-[#f4f4f6] text-xs font-serif transition-all"
                      title="Start Fresh Conversation"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* "Summon New AI Character" Card */}
            <div
              onClick={onOpenCharacterStudio}
              className="cursor-pointer rounded-3xl border-2 border-dashed border-[#d4af37]/35 hover:border-[#d4af37] bg-white/[0.01] hover:bg-[#d4af37]/5 p-6 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[280px] group"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] group-hover:scale-110 shadow-[0_0_15px_rgba(212,175,55,0.25)] transition-transform">
                <Plus className="w-7 h-7" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[#f4f4f6] group-hover:text-[#d4af37] transition-colors mt-4">
                Summon New AI Character
              </h3>
              <p className="text-xs text-zinc-400 font-serif max-w-xs mt-1.5 leading-relaxed">
                Build a tailored persona with custom psychological traits, texting cadence, emotion avatars, and secrets.
              </p>
              <span className="mt-4 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 text-[#f4e4a6] text-[11px] font-serif font-medium">
                Open Studio Creator →
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
