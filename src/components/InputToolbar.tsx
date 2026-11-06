import React, { useState } from 'react';
import {
  Send,
  Feather,
  Globe,
  Radio,
  Loader2,
} from 'lucide-react';
import { Persona, Character, PsychologicalHUD, InventoryItem } from '../types/roleplay';
import { isArabic } from '../utils/textParser';

interface InputToolbarProps {
  onSendMessage: (text: string, tone?: string, ooc?: string) => void;
  isLoading: boolean;
  activePersona: Persona;
  activeCharacter: Character;
  hud: PsychologicalHUD;
  inventory: InventoryItem[];
  lastCharacterMessage?: string;
  activeLanguage?: string;
  responseLength?: 'short' | 'balanced' | 'novel' | 'long' | 'medium';
  onUpdateResponseLength?: (len: 'short' | 'balanced' | 'novel') => void;
}

export const InputToolbar: React.FC<InputToolbarProps> = ({
  onSendMessage,
  isLoading,
  activePersona,
  activeCharacter,
  hud,
  inventory,
  lastCharacterMessage,
  activeLanguage = 'auto',
  responseLength = 'balanced',
  onUpdateResponseLength,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedTone, setSelectedTone] = useState<string>('auto');
  const [showOocBar, setShowOocBar] = useState(false);
  const [oocText, setOocText] = useState('');
  const [isQuillLoading, setIsQuillLoading] = useState(false);
  const [isLiveTranslating, setIsLiveTranslating] = useState(false);

  const toneChips = [
    { id: 'auto', labelEn: 'Auto', labelAr: 'تلقائي' },
    { id: 'defiant', labelEn: 'Defiant', labelAr: 'متحدية' },
    { id: 'cold', labelEn: 'Cold', labelAr: 'باردة' },
    { id: 'calculated', labelEn: 'Calculated', labelAr: 'حذرة' },
    { id: 'evade', labelEn: 'Evade', labelAr: 'مراوغة' },
    { id: 'vulnerable', labelEn: 'Vulnerable', labelAr: 'متأثرة' },
  ];

  const handleSend = () => {
    if ((!inputText.trim() && !oocText.trim()) || isLoading) return;
    onSendMessage(inputText.trim(), selectedTone !== 'auto' ? selectedTone : undefined, oocText.trim() || undefined);
    setInputText('');
    setOocText('');
    setShowOocBar(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Determine current script language of input
  const inputIsArabic = isArabic(inputText);
  const targetTranslateLang = inputIsArabic ? 'en' : 'ar';

  // Magic Quill "Reply for Me" / "الرد نيابة عني" Engine
  const handleMagicQuill = async () => {
    if (isQuillLoading) return;
    setIsQuillLoading(true);

    try {
      const targetLang = activeLanguage === 'ar' || inputIsArabic ? 'ar' : 'en';

      const res = await fetch('/api/reply-for-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedText: inputText.trim(),
          tone: selectedTone,
          lastCharacterMessage: lastCharacterMessage || '',
          activePersona,
          character: activeCharacter,
          hud,
          inventory,
          language: targetLang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setInputText(data.text);
        }
      }
    } catch (err) {
      console.error('Magic Quill failed:', err);
    } finally {
      setIsQuillLoading(false);
    }
  };

  // Live Input Translator: Instant Bidirectional Toggle (Arabic ⇄ English)
  const handleToggleTranslateInput = async () => {
    if (!inputText.trim() || isLiveTranslating) return;
    setIsLiveTranslating(true);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText.trim(),
          targetLanguage: targetTranslateLang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.translatedText) {
          setInputText(data.translatedText);
        }
      }
    } catch (err) {
      console.error('Live translator failed:', err);
    } finally {
      setIsLiveTranslating(false);
    }
  };

  return (
    <div className="relative z-20 px-3 sm:px-6 pb-3 pt-1 space-y-2 select-none">
      {/* GLOBAL RESPONSE LENGTH CONTROLLER (Short / Balanced / Novel-Length) */}
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#100e16]/90 border border-[#d4af37]/30 shadow-sm backdrop-blur-md">
          <span className="text-[10px] uppercase font-serif tracking-[0.16em] text-[#c5a059] px-2 font-semibold hidden sm:inline">
            Length:
          </span>
          {[
            { id: 'short', label: 'Short', desc: '1-2 paras' },
            { id: 'balanced', label: 'Balanced', desc: '3-4 paras' },
            { id: 'novel', label: 'Novel-Length', desc: '5+ paras' },
          ].map((item) => {
            const currentLen = (responseLength === 'long' ? 'novel' : responseLength === 'medium' ? 'balanced' : responseLength) || 'balanced';
            const isSelected = currentLen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onUpdateResponseLength?.(item.id as any)}
                className={`px-3 py-1 rounded-full font-serif text-xs transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#d4af37] to-[#c5a059] text-[#070709] font-bold shadow-[0_0_12px_rgba(212,175,55,0.4)] scale-[1.02]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
                title={`Generate ${item.desc} prose`}
              >
                <span>{item.label}</span>
                <span className={`text-[9px] ${isSelected ? 'text-[#070709]/75 font-semibold' : 'text-zinc-500'}`}>
                  ({item.desc})
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] font-serif text-[#c5a059]/90 italic hidden sm:flex items-center gap-1">
          <span>Pacing:</span>
          <span className="text-[#f4e4a6] not-italic font-medium">Uncensored Slow-Burn</span>
        </div>
      </div>

      {/* Sleek Borderless Frosted-Glass Tone Chips with Soft Champagne-Gold Glow */}
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1.5 flex-nowrap">
          <span className="text-[10px] uppercase font-serif tracking-[0.18em] text-[#c5a059]/70 mr-1 hidden sm:inline">
            Tone:
          </span>
          {toneChips.map((chip) => {
            const isSelected = selectedTone === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setSelectedTone(chip.id)}
                className={`px-3 py-1 rounded-full text-xs font-serif transition-all whitespace-nowrap ${
                  isSelected
                    ? 'border-[0.5px] border-[#d4af37]/80 bg-[#d4af37]/15 text-[#f4e4a6] shadow-[0_0_12px_rgba(212,175,55,0.25)] font-medium scale-[1.02]'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 border-[0.5px] border-transparent hover:border-[#d4af37]/20 backdrop-blur-md'
                }`}
              >
                <span>{chip.labelEn}</span>
                <span className="text-[10px] opacity-60 ml-1 font-arabic">({chip.labelAr})</span>
              </button>
            );
          })}
        </div>

        {/* OOC Button */}
        <button
          onClick={() => setShowOocBar(!showOocBar)}
          className={`px-2.5 py-1 rounded-full text-xs font-serif transition-all flex items-center gap-1 shrink-0 ${
            showOocBar
              ? 'border-[0.5px] border-[#d4af37]/70 bg-[#4a0e17]/80 text-[#f4e4a6] shadow-[0_0_10px_rgba(212,175,55,0.25)]'
              : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 border-[0.5px] border-transparent hover:border-[#d4af37]/20'
          }`}
          title="Out-of-Character stage direction to steer AI"
        >
          <Radio className="w-3 h-3 text-[#d4af37]" />
          <span className="font-serif">[OOC]</span>
        </button>
      </div>

      {/* OOC Stage Direction Input Bar */}
      {showOocBar && (
        <div className="max-w-4xl mx-auto p-2.5 rounded-2xl bg-[#0e0c12]/90 backdrop-blur-md border-[0.5px] border-[#d4af37]/35 flex items-center gap-2 animate-in fade-in">
          <span className="text-[10px] font-serif tracking-wider text-[#d4af37] uppercase shrink-0 font-medium">
            Stage Direction [OOC]:
          </span>
          <input
            type="text"
            placeholder="e.g. Have Cassio notice the key slipping from Lian's sleeve..."
            value={oocText}
            onChange={(e) => setOocText(e.target.value)}
            className="flex-1 bg-transparent border-none text-xs text-[#f4f4f6] placeholder:text-zinc-600 focus:outline-none font-serif"
          />
        </div>
      )}

      {/* FLOATING GLASSMORPHIC PILL DOCK */}
      <div className="max-w-4xl mx-auto flex items-center gap-2 p-1.5 sm:p-2 bg-[#0e0c12]/85 backdrop-blur-2xl border-[0.5px] border-[#d4af37]/25 rounded-[30px] shadow-[0_12px_44px_rgba(0,0,0,0.85)]">
        {/* Left Side: Artistic Golden Feather/Quill ("Reply for Me") */}
        <button
          onClick={handleMagicQuill}
          disabled={isQuillLoading || isLoading}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#d4af37]/10 hover:bg-[#d4af37]/20 border-[0.5px] border-[#d4af37]/35 text-[#d4af37] hover:text-[#f4e4a6] shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0 group"
          title="Magic Quill: Reads selected Tone Chip + Cassio's last move + Lian's Persona to write an immersive reply directly into input"
        >
          {isQuillLoading ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-[#d4af37]" />
          ) : (
            <Feather className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" />
          )}
        </button>

        {/* Left Side: Subtle Instant Translate Toggle */}
        <button
          onClick={handleToggleTranslateInput}
          disabled={!inputText.trim() || isLiveTranslating}
          className={`h-9 sm:h-10 px-2 sm:px-2.5 rounded-full transition-all flex items-center gap-1 border-[0.5px] shrink-0 text-xs font-serif ${
            inputText.trim()
              ? 'border-[#d4af37]/35 bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/20 hover:text-[#f4e4a6]'
              : 'border-transparent text-zinc-600 opacity-40 cursor-not-allowed'
          }`}
          title="Translate draft between Arabic and English before sending"
        >
          {isLiveTranslating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d4af37]" />
          ) : (
            <Globe className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline text-[11px]">
            {isLiveTranslating
              ? '...'
              : inputIsArabic
              ? 'EN'
              : 'عربي'}
          </span>
        </button>

        {/* Center: Clean Pristine Textarea (No Clutter) */}
        <div className="flex-1 min-w-0 px-2 py-1">
          <textarea
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            dir={inputIsArabic ? 'rtl' : 'ltr'}
            placeholder={`Reply as ${activePersona.name}... (*action*, "dialogue")`}
            className={`w-full bg-transparent border-none text-[15px] sm:text-base text-[#f4f4f6] placeholder:text-zinc-500/80 placeholder:italic focus:outline-none resize-none leading-relaxed max-h-32 overflow-y-auto ${
              inputIsArabic ? 'font-arabic' : 'font-serif'
            }`}
          />
        </div>

        {/* Right Side: Refined Circular Champagne-Gold & Burgundy Send Button */}
        <button
          onClick={handleSend}
          disabled={(!inputText.trim() && !oocText.trim()) || isLoading}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-[#d4af37] via-[#851e2f] to-[#4a0e17] text-[#070709] hover:brightness-110 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed shadow-[0_0_16px_rgba(212,175,55,0.35)] flex items-center justify-center shrink-0 transition-all group"
          title="Send Roleplay Turn"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-[#070709]" />
          ) : (
            <Send className="w-4 h-4 sm:w-5 sm:h-5 text-[#070709] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          )}
        </button>
      </div>
    </div>
  );
};
