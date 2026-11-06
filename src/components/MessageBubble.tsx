import React, { useState } from 'react';
import {
  Volume2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Edit2,
  Trash2,
  RotateCcw,
  Sparkles,
  BookmarkPlus,
  Check,
  FastForward,
  Layers,
  Copy,
  PenLine,
  GitBranch,
} from 'lucide-react';
import { ChatMessage, Character, EmotionState } from '../types/roleplay';
import { tokenizeLiteraryParagraphs, isArabic, TextToken } from '../utils/textParser';
import { speakDialogue } from '../utils/audioSynthesizer';
import { getEmotionStyle } from '../utils/emotionTheme';

interface MessageBubbleProps {
  message: ChatMessage;
  character?: Character;
  activePersonaName: string;
  onSwipeChange: (messageId: string, newIndex: number) => void;
  onRequestNewSwipe: (messageId: string) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onRewindToMessage: (messageId: string) => void;
  onBranchFromMessage?: (messageId: string) => void;
  onContinueWriting: (messageId: string) => void;
  onSavePhrase: (phrase: string, meaning: string, lang: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  character,
  activePersonaName,
  onSwipeChange,
  onRequestNewSwipe,
  onEditMessage,
  onDeleteMessage,
  onRewindToMessage,
  onBranchFromMessage,
  onContinueWriting,
  onSavePhrase,
}) => {
  const [showInnerMonologue, setShowInnerMonologue] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [activeTranslationLang, setActiveTranslationLang] = useState<'ar' | 'en' | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDualView, setIsDualView] = useState(false);
  const [copied, setCopied] = useState(false);

  // Vocabulary highlight helper
  const [selectedText, setSelectedText] = useState('');
  const [vaultPopupPos, setVaultPopupPos] = useState<{ x: number; y: number } | null>(null);

  const activeSwipe = message.swipes[message.currentSwipeIndex] || message.swipes[0] || { text: '', emotion: 'calm' };
  const rawText = activeSwipe.text || '';
  const currentEmotion: EmotionState = activeSwipe.emotion || 'calm';

  // Dynamic Avatar matching current emotional state
  const avatarUrl =
    message.role === 'user'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop'
      : (character?.avatars as unknown as Record<string, string | undefined>)?.[currentEmotion] || character?.avatars.calm || '';

  const isNarrator = message.role === 'narrator';
  const isUser = message.role === 'user';
  const textIsArabic = isArabic(rawText);

  // Handle translation fetch
  const handleTranslate = async (targetLang: 'ar' | 'en') => {
    if (activeTranslationLang === targetLang && !isDualView) {
      setActiveTranslationLang(null);
      return;
    }

    if (activeSwipe.translations?.[targetLang]) {
      setActiveTranslationLang(targetLang);
      return;
    }

    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText, targetLanguage: targetLang }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translatedText) {
          if (!activeSwipe.translations) activeSwipe.translations = {};
          activeSwipe.translations[targetLang] = data.translatedText;
          setActiveTranslationLang(targetLang);
        }
      }
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSpeak = () => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    speakDialogue(
      rawText,
      () => setIsPlayingAudio(true),
      () => setIsPlayingAudio(false)
    );
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    onEditMessage(message.id, editText);
    setIsEditing(false);
  };

  // Highlighting selection for Vocabulary Vault
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 2) {
      setSelectedText(sel.toString().trim());
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setVaultPopupPos({ x: rect.left, y: rect.top - 36 });
    } else {
      setVaultPopupPos(null);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render tokens cleanly without displaying raw asterisks
  const renderParagraphTokens = (tokens: TextToken[], keyPrefix: string, isRtl: boolean) => {
    return (
      <p
        key={keyPrefix}
        dir={isRtl ? 'rtl' : 'ltr'}
        className={`mb-3.5 last:mb-0 leading-[1.85] tracking-wide ${
          isRtl ? 'font-arabic text-base sm:text-lg text-right' : 'font-prose text-[15px] sm:text-base'
        }`}
      >
        {tokens.map((token, idx) => {
          if (token.type === 'narration') {
            return (
              <span key={`${keyPrefix}-${idx}`} className="italic text-[#c4c4cc] font-serif mr-1">
                {token.content}{' '}
              </span>
            );
          }
          if (token.type === 'dialogue') {
            return (
              <span
                key={`${keyPrefix}-${idx}`}
                className="font-bold text-[#fcfcfd] tracking-normal drop-shadow-sm px-0.5"
              >
                "{token.content}"{' '}
              </span>
            );
          }
          return (
            <span key={`${keyPrefix}-${idx}`} className="text-[#d8d8de]">
              {token.content}{' '}
            </span>
          );
        })}
      </p>
    );
  };

  // Original prose paragraphs
  const originalParagraphs = tokenizeLiteraryParagraphs(rawText);

  // Translated prose paragraphs (if translation exists)
  const translationText =
    activeTranslationLang && activeSwipe.translations?.[activeTranslationLang]
      ? activeSwipe.translations[activeTranslationLang]
      : null;
  const translatedParagraphs = translationText ? tokenizeLiteraryParagraphs(translationText) : [];

  const userEmotionKey = isUser ? (message.toneUsed || activeSwipe.userEmotion || 'calm') : currentEmotion;
  const emotionStyle = getEmotionStyle(userEmotionKey);

  return (
    <div
      onMouseUp={handleMouseUp}
      className={`group relative flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl transition-all duration-300 shadow-2xl ${
        isNarrator
          ? 'bg-[#101014]/80 backdrop-blur-xl border-[0.5px] border-[#d4af37]/25 my-4 max-w-3xl mx-auto shadow-black/70'
          : isUser
          ? 'bg-[#140e13]/80 backdrop-blur-xl border-[0.5px] border-[#d4af37]/30 max-w-3xl ml-auto shadow-[0_8px_30px_rgba(0,0,0,0.6)]'
          : 'bg-[#121216]/80 backdrop-blur-xl border-[0.5px] border-[#d4af37]/22 max-w-3xl mr-auto shadow-[0_8px_32px_rgba(0,0,0,0.7)]'
      }`}
    >
      {/* Dynamic Emotion Avatar with Reactive Glowing Emotion Ring for ANY character AND User */}
      {!isNarrator && (
        <div className="shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
          <div className="relative">
            <img
              src={avatarUrl}
              alt={isUser ? activePersonaName : character?.name}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl object-cover transition-all duration-500 ${emotionStyle.ringClass}`}
            />
            <span
              className={`absolute -bottom-1 -right-1 text-[8px] font-serif tracking-wider px-1.5 py-0.2 rounded-full uppercase border shadow-sm ${emotionStyle.badgeClass}`}
            >
              {emotionStyle.label}
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Header line: Speaker Name & Reactive Emotion Tag */}
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#d4af37]/15">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-heading text-sm sm:text-base font-semibold tracking-wider ${
                isUser
                  ? 'text-[#f5d0a9]'
                  : isNarrator
                  ? 'text-[#e5c07b] italic'
                  : 'text-[#d4af37]'
              }`}
            >
              {isNarrator
                ? 'Scene Director'
                : isUser
                ? activePersonaName
                : message.characterName || character?.name}
            </span>

            {/* Glowing Emotion Tag with Bilingual Descriptor */}
            {!isNarrator && (
              <span className={`text-[9px] px-2 py-0.5 rounded-full border font-serif tracking-wider ${emotionStyle.badgeClass}`}>
                ✦ {emotionStyle.label} / {emotionStyle.arabicLabel} ✦
              </span>
            )}

            {message.toneUsed && (
              <span className="text-[10px] uppercase font-serif tracking-wider px-2 py-0.5 rounded-full bg-[#18181f]/80 text-[#c5a059] border-[0.5px] border-[#d4af37]/30">
                {message.toneUsed}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <button
              onClick={handleCopyText}
              className="p-1 rounded hover:text-[#d4af37] transition-colors"
              title="Copy message prose"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#d4af37]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {onBranchFromMessage && (
              <button
                onClick={() => onBranchFromMessage(message.id)}
                className="p-1 rounded hover:text-[#d4af37] transition-colors"
                title="Branch Timeline from this message"
              >
                <GitBranch className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onRewindToMessage(message.id)}
              className="p-1 rounded hover:text-[#d4af37] transition-colors"
              title="Rewind to this point"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteMessage(message.id)}
              className="p-1 rounded hover:text-[#e05263] transition-colors"
              title="Delete message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Editing Area */}
        {isEditing ? (
          <div className="space-y-2.5 py-1">
            <textarea
              rows={4}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-3 bg-[#0a0a0e] border-[0.5px] border-[#d4af37]/60 rounded-xl text-sm text-[#f4f4f6] font-serif leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50 shadow-inner"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-xs rounded-lg bg-zinc-900 border-[0.5px] border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3.5 py-1 text-xs rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b38f2a] text-[#070709] font-medium shadow-sm hover:brightness-105 transition-all"
              >
                Save Edit
              </button>
            </div>
          </div>
        ) : (
          /* Rendered Prose Content */
          <div className="space-y-3">
            {/* Primary View (or Top View in Dual Mode) */}
            {!isDualView && activeTranslationLang && translationText ? (
              <div>
                {translatedParagraphs.map((pTokens, pIdx) =>
                  renderParagraphTokens(pTokens, `trans-${pIdx}`, isArabic(translationText))
                )}
              </div>
            ) : (
              <div>
                {originalParagraphs.map((pTokens, pIdx) =>
                  renderParagraphTokens(pTokens, `orig-${pIdx}`, textIsArabic)
                )}
              </div>
            )}

            {/* Dual View Stacked Mode */}
            {isDualView && translationText && (
              <div className="pt-3 border-t border-[#d4af37]/20 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-serif uppercase text-[#d4af37] tracking-[0.15em]">
                  <Globe className="w-3 h-3 text-[#d4af37]" />
                  <span>
                    Literary {activeTranslationLang === 'ar' ? 'Classical Arabic' : 'English'} Translation:
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0a0a0e]/80 border-[0.5px] border-[#d4af37]/25">
                  {translatedParagraphs.map((pTokens, pIdx) =>
                    renderParagraphTokens(pTokens, `dual-${pIdx}`, isArabic(translationText))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ELEGANT "✦ INNER THOUGHTS ✦" WHISPER BAR */}
        {!isUser && activeSwipe.innerMonologue && (
          <div className="pt-2">
            <button
              onClick={() => setShowInnerMonologue(!showInnerMonologue)}
              className="w-full flex items-center justify-center gap-3 py-1 group select-none transition-all duration-300"
            >
              <span className="h-[0.5px] flex-1 bg-gradient-to-r from-transparent via-[#d4af37]/35 to-[#d4af37]/10" />
              <span className="text-[11px] font-serif tracking-[0.22em] uppercase text-[#d4af37]/80 group-hover:text-[#f4e4a6] transition-colors flex items-center gap-1.5">
                ✦ {showInnerMonologue ? 'Conceal Inner Thoughts' : 'Inner Thoughts'} ✦
              </span>
              <span className="h-[0.5px] flex-1 bg-gradient-to-l from-transparent via-[#d4af37]/35 to-[#d4af37]/10" />
            </button>

            {showInnerMonologue && (
              <div className="mt-2.5 p-3.5 rounded-xl bg-[#0d090c]/90 backdrop-blur-md border-[0.5px] border-[#d4af37]/35 text-xs sm:text-sm font-serif italic text-[#edd5b5] leading-relaxed shadow-lg shadow-black/60 animate-in fade-in duration-300">
                <div className="flex items-center gap-1.5 mb-1.5 not-italic">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
                  <span className="font-serif text-[10px] uppercase tracking-[0.18em] text-[#d4af37]/90 font-medium">
                    Secret Psychological Agenda
                  </span>
                </div>
                <p className="pl-3 border-l-[1.5px] border-[#d4af37]/40">
                  "{activeSwipe.innerMonologue}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* COMPLETE WHISPER-QUIET ACTION ROW (Muted Gold & Silver) */}
        <div className="pt-2 mt-1 border-t border-[#d4af37]/15 flex items-center justify-between gap-2 flex-wrap text-xs select-none">
          {/* Left Group: Multi-Swipe Carousel (‹ 1/N ›) */}
          <div className="flex items-center gap-1 bg-[#121217]/90 border-[0.5px] border-[#d4af37]/25 rounded-full px-2.5 py-0.5 text-[11px] font-serif text-[#d8d8de] shadow-sm">
            <button
              disabled={message.currentSwipeIndex === 0}
              onClick={() => onSwipeChange(message.id, message.currentSwipeIndex - 1)}
              className="hover:text-[#d4af37] disabled:opacity-25 p-0.5 transition-colors"
              title="Previous Swipe Variation"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-medium text-[#f4f4f6] px-1 tracking-wider text-[11px]">
              {message.currentSwipeIndex + 1}/{message.swipes.length}
            </span>
            <button
              onClick={() => {
                if (message.currentSwipeIndex < message.swipes.length - 1) {
                  onSwipeChange(message.id, message.currentSwipeIndex + 1);
                } else if (!isUser) {
                  onRequestNewSwipe(message.id);
                }
              }}
              className="hover:text-[#d4af37] p-0.5 transition-colors"
              title={
                message.currentSwipeIndex < message.swipes.length - 1
                  ? 'Next Swipe Variation'
                  : 'Generate Fresh Swipe Variation'
              }
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {!isUser && (
              <button
                onClick={() => onRequestNewSwipe(message.id)}
                className="ml-1 pl-1 border-l border-[#d4af37]/30 text-[#d4af37]/70 hover:text-[#d4af37] transition-colors"
                title="Generate another response variation"
              >
                <Sparkles className="w-3 h-3 text-[#d4af37]" />
              </button>
            )}
          </div>

          {/* Right Group: Action Bar Buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {/* Literary Translate Toggle (🌐) with Dual View Option */}
            <div className="flex items-center bg-[#121217]/90 border-[0.5px] border-[#d4af37]/25 rounded-full p-0.5 text-[11px] font-serif">
              <button
                onClick={() => handleTranslate(textIsArabic ? 'en' : 'ar')}
                disabled={isTranslating}
                className={`px-2.5 py-0.5 rounded-full transition-all flex items-center gap-1 ${
                  activeTranslationLang
                    ? 'bg-gradient-to-r from-[#d4af37] to-[#b38f2a] text-[#070709] font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-[#d4af37]'
                }`}
                title={`Translate to ${textIsArabic ? 'English' : 'Literary Arabic'}`}
              >
                <Globe className="w-3 h-3" />
                <span className="font-serif">
                  {isTranslating
                    ? '...'
                    : textIsArabic
                    ? 'EN'
                    : 'عربي'}
                </span>
              </button>

              {/* Dual View Toggle */}
              {activeSwipe.translations && Object.keys(activeSwipe.translations).length > 0 && (
                <button
                  onClick={() => setIsDualView(!isDualView)}
                  className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ml-0.5 border-l border-[#d4af37]/25 ${
                    isDualView
                      ? 'bg-[#4a0e17] text-[#f4d7b5] font-medium'
                      : 'text-zinc-400 hover:text-[#d4af37]'
                  }`}
                  title="Toggle Dual View (Stacked Original & Translation)"
                >
                  <Layers className="w-3 h-3 inline mr-0.5" />
                  Dual
                </button>
              )}
            </div>

            {/* Edit Button (✎) */}
            <button
              onClick={() => {
                setEditText(rawText);
                setIsEditing(true);
              }}
              className="px-2.5 py-1 rounded-full bg-[#121217]/90 border-[0.5px] border-[#d4af37]/25 text-zinc-400 hover:text-[#d4af37] hover:border-[#d4af37]/50 transition-colors flex items-center gap-1 font-serif"
              title="Edit message content"
            >
              <Edit2 className="w-3 h-3" />
              <span className="hidden sm:inline">Edit</span>
            </button>

            {/* Continue Button (» ) - AI turns only */}
            {!isUser && (
              <button
                onClick={() => onContinueWriting(message.id)}
                className="px-2.5 py-1 rounded-full bg-[#161014]/90 border-[0.5px] border-[#d4af37]/35 text-[#e5c07b] hover:text-[#fbf2d4] hover:border-[#d4af37] hover:bg-[#d4af37]/15 transition-all flex items-center gap-1 font-serif"
                title="Force character to write the next paragraph seamlessly continuing from this sentence"
              >
                <FastForward className="w-3 h-3 text-[#d4af37]" />
                <span>Continue</span>
              </button>
            )}

            {/* Audio Voice Button (🔊) */}
            <button
              onClick={handleSpeak}
              disabled={isPlayingAudio}
              className={`px-2.5 py-1 rounded-full border-[0.5px] transition-all flex items-center gap-1 font-serif ${
                isPlayingAudio
                  ? 'bg-gradient-to-r from-[#d4af37] to-[#b38f2a] border-[#d4af37] text-[#070709] font-medium animate-pulse shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                  : 'bg-[#121217]/90 border-[#d4af37]/25 text-zinc-400 hover:text-[#d4af37] hover:border-[#d4af37]/50'
              }`}
              title="Listen to dialogue spoken aloud"
            >
              <Volume2 className="w-3 h-3" />
              <span className="hidden sm:inline">Voice</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vocabulary Vault Highlight Popover */}
      {vaultPopupPos && selectedText && (
        <div
          style={{ top: `${vaultPopupPos.y}px`, left: `${vaultPopupPos.x}px` }}
          className="fixed z-50 transform -translate-y-full flex items-center gap-1.5 bg-[#121217]/95 backdrop-blur-md border-[0.5px] border-[#d4af37]/70 shadow-2xl rounded-full px-3 py-1 text-xs animate-in zoom-in-95"
        >
          <span className="font-serif italic text-[#edd5b5] truncate max-w-[120px]">
            "{selectedText}"
          </span>
          <button
            onClick={() => {
              onSavePhrase(
                selectedText,
                'Literary expression saved from roleplay',
                textIsArabic ? 'Arabic' : 'English'
              );
              setVaultPopupPos(null);
            }}
            className="flex items-center gap-1 bg-gradient-to-r from-[#d4af37] to-[#b38f2a] hover:brightness-105 text-[#070709] px-2.5 py-0.5 rounded-full text-[10px] font-medium"
          >
            <BookmarkPlus className="w-3 h-3" />
            <span>Save to Vault</span>
          </button>
        </div>
      )}
    </div>
  );
};
