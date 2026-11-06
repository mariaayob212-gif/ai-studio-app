import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  MessageSquare,
  BookOpen,
  Send,
  Sparkles,
  Volume2,
  Lock,
  Plus,
  Trash2,
  FileText,
  Key,
  Wifi,
  Battery,
  Signal,
  Check,
  CheckCheck,
  Clock,
  Mic,
  ChevronLeft,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import {
  Character,
  Persona,
  PsychologicalHUD,
  CharacterCommunications,
  PhoneMessage,
  PhoneCall as PhoneCallType,
  PhoneDiaryNote,
} from '../types/roleplay';
import { speakDialogue } from '../utils/audioSynthesizer';

interface SmartphoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCharacter: Character;
  activePersona: Persona;
  hud: PsychologicalHUD;
  communications: CharacterCommunications;
  onSendMessage: (characterId: string, text: string) => void;
  onAddDiaryNote: (characterId: string, note: Omit<PhoneDiaryNote, 'id' | 'timestamp'>) => void;
  onDeleteDiaryNote: (characterId: string, noteId: string) => void;
  onTriggerProactiveSMS: (characterId: string) => Promise<void>;
  onTriggerIncomingCall: (characterId: string) => void;
}

export const SmartphoneModal: React.FC<SmartphoneModalProps> = ({
  isOpen,
  onClose,
  activeCharacter,
  activePersona,
  hud,
  communications,
  onSendMessage,
  onAddDiaryNote,
  onDeleteDiaryNote,
  onTriggerProactiveSMS,
  onTriggerIncomingCall,
}) => {
  const [activeApp, setActiveApp] = useState<'messages' | 'calls' | 'diary' | 'clues'>('messages');
  const [smsInput, setSmsInput] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isProactiveLoading, setIsProactiveLoading] = useState(false);

  // Incoming Call Simulator State
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [playingVoicemailId, setPlayingVoicemailId] = useState<string | null>(null);

  // New Diary Note Form
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<'surveillance' | 'confession' | 'weakness' | 'draft'>('surveillance');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callActive) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callActive]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [communications?.messages, activeApp]);

  if (!isOpen) return null;

  const contactName = activeCharacter.phoneContactName || activeCharacter.name;
  const contactStatus = activeCharacter.phoneStatus || 'Online • Encrypted Line';
  const avatarUrl = activeCharacter.avatars.calm;

  const handleSendSms = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!smsInput.trim() || isSendingSms) return;

    const userText = smsInput.trim();
    setSmsInput('');
    setIsSendingSms(true);
    onSendMessage(activeCharacter.id, userText);

    // After 1.5s - 3s, trigger character reply via backend
    setTimeout(async () => {
      try {
        await onTriggerProactiveSMS(activeCharacter.id);
      } catch (err) {
        console.error('Auto SMS reply failed:', err);
      } finally {
        setIsSendingSms(false);
      }
    }, 1800);
  };

  const handleTriggerProactiveText = async () => {
    if (isProactiveLoading) return;
    setIsProactiveLoading(true);
    try {
      await onTriggerProactiveSMS(activeCharacter.id);
    } finally {
      setIsProactiveLoading(false);
    }
  };

  const handleSimulateCall = () => {
    setIsReceivingCall(true);
    setCallDuration(0);
  };

  const handleAnswerCall = () => {
    setIsReceivingCall(false);
    setCallActive(true);
    setCallDuration(0);

    // Speak character voice greeting
    const greeting = `"${activePersona.name}. I wondered how long you would stare at the screen before pressing answer."`;
    speakDialogue(greeting);
  };

  const handleEndCall = () => {
    setIsReceivingCall(false);
    setCallActive(false);
    setCallDuration(0);
  };

  const handlePlayVoicemail = (call: PhoneCallType) => {
    if (playingVoicemailId === call.id) {
      setPlayingVoicemailId(null);
      return;
    }
    setPlayingVoicemailId(call.id);
    speakDialogue(
      call.voicemailAudioText || call.transcript || 'No audio transcript.',
      () => setPlayingVoicemailId(call.id),
      () => setPlayingVoicemailId(null)
    );
  };

  const handleSaveDiary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    onAddDiaryNote(activeCharacter.id, {
      characterId: activeCharacter.id,
      title: noteTitle.trim(),
      content: noteContent.trim(),
      category: noteCategory,
    });
    setNoteTitle('');
    setNoteContent('');
    setIsAddingNote(false);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      {/* Smartphone Outer Chassis with Champagne Gold Rim */}
      <div className="relative w-full max-w-[395px] h-[780px] max-h-[92vh] bg-[#070709] border-[2px] border-[#d4af37]/40 rounded-[44px] shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden text-zinc-100 ring-1 ring-black">
        {/* Dynamic Island / Top Sensor Notch & Status Bar */}
        <div className="relative z-30 pt-3 px-6 pb-2 bg-[#09090c]/90 backdrop-blur-xl flex items-center justify-between border-b-[0.5px] border-[#d4af37]/20">
          <span className="text-[11px] font-serif font-medium text-[#e5c07b]">
            11:42 PM
          </span>

          {/* Dynamic Island Pill */}
          <div className="w-24 h-4 bg-black border-[0.5px] border-[#d4af37]/20 rounded-full flex items-center justify-center gap-1.5 px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]/60 animate-pulse" />
            <span className="text-[8px] font-mono text-[#c5a059] uppercase tracking-wider">
              {activeCharacter.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-400">
            <Signal className="w-3 h-3 text-[#d4af37]" />
            <Wifi className="w-3 h-3 text-[#d4af37]" />
            <div className="flex items-center gap-0.5 text-[9px] font-mono text-zinc-400">
              <span>84%</span>
              <Battery className="w-3.5 h-3.5 text-[#d4af37]" />
            </div>
          </div>
        </div>

        {/* INCOMING CALL FULLSCREEN OVERLAY */}
        {isReceivingCall && (
          <div className="absolute inset-0 z-40 bg-[#070709]/95 backdrop-blur-2xl flex flex-col items-center justify-between p-8 text-center animate-in zoom-in-95">
            <div className="pt-8 space-y-2">
              <span className="text-xs uppercase font-serif tracking-[0.2em] text-[#d4af37] animate-pulse">
                ✦ Incoming Encrypted Call ✦
              </span>
              <h3 className="font-heading text-2xl font-bold text-[#f4f4f6]">
                {contactName}
              </h3>
              <p className="text-xs font-serif italic text-zinc-400">
                {activeCharacter.title}
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#d4af37]/20 animate-ping" />
              <img
                src={avatarUrl}
                alt={contactName}
                className="relative w-28 h-28 rounded-full object-cover border-2 border-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.4)]"
              />
            </div>

            <div className="w-full flex items-center justify-around pb-6">
              {/* Decline Button */}
              <button
                onClick={handleEndCall}
                className="flex flex-col items-center gap-1.5 text-zinc-400 hover:text-white"
              >
                <div className="w-16 h-16 rounded-full bg-[#4a0e17] border border-[#9e2a3b] flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform">
                  <PhoneOff className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-serif">Decline</span>
              </button>

              {/* Answer Button */}
              <button
                onClick={handleAnswerCall}
                className="flex flex-col items-center gap-1.5 text-zinc-400 hover:text-white"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#d4af37] to-[#15803d] border border-[#d4af37] flex items-center justify-center text-[#070709] shadow-[0_0_20px_rgba(212,175,55,0.4)] animate-bounce active:scale-90 transition-transform">
                  <Phone className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-serif font-medium text-[#d4af37]">Answer</span>
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE CALL CONNECTED OVERLAY */}
        {callActive && (
          <div className="absolute inset-0 z-40 bg-[#070709]/95 backdrop-blur-2xl flex flex-col items-center justify-between p-8 text-center animate-in fade-in">
            <div className="pt-8 space-y-2">
              <span className="text-xs uppercase font-serif tracking-[0.2em] text-[#d4af37]">
                Connected • Encrypted Line
              </span>
              <h3 className="font-heading text-2xl font-bold text-[#f4f4f6]">
                {contactName}
              </h3>
              <p className="text-sm font-mono text-zinc-400">
                {formatSeconds(callDuration)}
              </p>
            </div>

            <div className="relative">
              <img
                src={avatarUrl}
                alt={contactName}
                className="w-28 h-28 rounded-full object-cover border-2 border-[#d4af37] shadow-[0_0_24px_rgba(212,175,55,0.3)] animate-pulse"
              />
            </div>

            <div className="w-full flex justify-center pb-6">
              <button
                onClick={handleEndCall}
                className="flex flex-col items-center gap-1.5 text-zinc-400 hover:text-white"
              >
                <div className="w-16 h-16 rounded-full bg-[#4a0e17] border border-[#9e2a3b] flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform">
                  <PhoneOff className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-serif">End Call</span>
              </button>
            </div>
          </div>
        )}

        {/* MAIN BODY APP VIEW */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#0b0a0f]/80 backdrop-blur-xl">
          {/* Header of Active App */}
          <div className="px-4 py-2.5 bg-[#0e0c14]/90 border-b-[0.5px] border-[#d4af37]/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={avatarUrl}
                alt={contactName}
                className="w-8 h-8 rounded-full object-cover border-[1px] border-[#d4af37]"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-semibold text-xs sm:text-sm text-[#f4f4f6] truncate">
                    {contactName}
                  </span>
                  <span className="text-[8px] px-1 py-0.2 rounded-full bg-[#d4af37]/15 text-[#d4af37] font-serif border-[0.5px] border-[#d4af37]/30 uppercase">
                    {activeCharacter.id}
                  </span>
                </div>
                <p className="text-[10px] text-[#c5a059]/80 font-serif italic truncate">
                  {contactStatus}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Trigger autonomous SMS/call actions for testing */}
              <button
                onClick={handleSimulateCall}
                className="p-1.5 rounded-full text-zinc-400 hover:text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors"
                title="Simulate Incoming Phone Call from this Character"
              >
                <PhoneCall className="w-4 h-4" />
              </button>
              <button
                onClick={handleTriggerProactiveText}
                disabled={isProactiveLoading}
                className="p-1.5 rounded-full text-zinc-400 hover:text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors"
                title="Trigger Autonomous Proactive Text from this Character"
              >
                {isProactiveLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#d4af37]" />
                ) : (
                  <Sparkles className="w-4 h-4 text-[#d4af37]" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1"
                title="Lock / Close Phone"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 1. APP: MESSAGES (SMS) */}
          {activeApp === 'messages' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages Thread Container */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 font-serif">
                <div className="text-center py-2">
                  <span className="text-[9px] uppercase tracking-[0.2em] font-serif text-[#c5a059]/70 bg-[#070709]/80 px-3 py-1 rounded-full border-[0.5px] border-[#d4af37]/20">
                    Encrypted Cellular Session with {activeCharacter.name}
                  </span>
                </div>

                {communications?.messages?.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[82%] p-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-md ${
                          isUser
                            ? 'bg-[#4a0e17]/85 border-[0.5px] border-[#d4af37]/35 text-[#f4f4f6] rounded-br-sm'
                            : 'bg-[#16141d]/90 border-[0.5px] border-[#d4af37]/25 text-[#edd8bf] rounded-bl-sm'
                        }`}
                      >
                        {msg.isProactive && (
                          <div className="flex items-center gap-1 text-[9px] font-mono text-[#d4af37] mb-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>AUTONOMOUS DISPATCH</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[9px] font-mono ${
                            isUser ? 'text-rose-200/70' : 'text-zinc-500'
                          }`}
                        >
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isUser && <CheckCheck className="w-3 h-3 text-[#d4af37]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isSendingSms && (
                  <div className="flex items-center gap-1.5 text-zinc-500 text-xs italic pl-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-bounce delay-200" />
                    <span>{activeCharacter.name} is typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* SMS Input Dock */}
              <form
                onSubmit={handleSendSms}
                className="p-2 border-t-[0.5px] border-[#d4af37]/20 bg-[#0e0c14]/95 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={`iMessage to ${contactName}...`}
                  value={smsInput}
                  onChange={(e) => setSmsInput(e.target.value)}
                  className="flex-1 bg-[#16141d] border-[0.5px] border-[#d4af37]/30 rounded-full px-3.5 py-2 text-xs text-[#f4f4f6] placeholder:text-zinc-500 focus:outline-none focus:border-[#d4af37] font-serif"
                />
                <button
                  type="submit"
                  disabled={!smsInput.trim() || isSendingSms}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4af37] to-[#851e2f] text-[#070709] flex items-center justify-center disabled:opacity-30 hover:scale-105 active:scale-95 transition-all shadow-sm shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* 2. APP: CALLS & VOICEMAIL */}
          {activeApp === 'calls' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-serif">
              <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
                  Call History & Voicemails ({contactName})
                </h4>
                <button
                  onClick={handleSimulateCall}
                  className="text-[10px] font-serif text-[#d4af37] px-2.5 py-0.5 rounded-full bg-[#d4af37]/10 border-[0.5px] border-[#d4af37]/40 hover:bg-[#d4af37]/20"
                >
                  Simulate Call
                </button>
              </div>

              <div className="space-y-2.5">
                {communications?.calls?.length === 0 ? (
                  <div className="text-center py-12 text-xs text-zinc-500 italic">
                    No recorded calls with {contactName}.
                  </div>
                ) : (
                  communications?.calls?.map((call) => (
                    <div
                      key={call.id}
                      className="p-3.5 rounded-2xl bg-[#14121a]/90 border-[0.5px] border-[#d4af37]/25 space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {call.type === 'missed' ? (
                            <PhoneMissed className="w-4 h-4 text-[#e05263]" />
                          ) : (
                            <PhoneIncoming className="w-4 h-4 text-[#d4af37]" />
                          )}
                          <div>
                            <div className="text-xs font-semibold text-[#f4f4f6]">
                              {call.type === 'voicemail' ? 'Encrypted Voicemail' : 'Missed Audio Call'}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {call.durationSeconds ? `${call.durationSeconds}s` : 'Unanswered'}
                            </div>
                          </div>
                        </div>

                        {call.type === 'voicemail' && (
                          <button
                            onClick={() => handlePlayVoicemail(call)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-serif flex items-center gap-1 border-[0.5px] transition-all ${
                              playingVoicemailId === call.id
                                ? 'bg-gradient-to-r from-[#d4af37] to-[#b38f2a] text-[#070709] border-[#d4af37] font-semibold animate-pulse'
                                : 'bg-[#18181f] text-[#d4af37] border-[#d4af37]/40 hover:bg-[#d4af37]/20'
                            }`}
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>{playingVoicemailId === call.id ? 'Playing...' : 'Listen'}</span>
                          </button>
                        )}
                      </div>

                      {call.transcript && (
                        <p className="text-xs text-[#edd5b5] italic pl-6 border-l-[1.5px] border-[#d4af37]/40 leading-relaxed">
                          "{call.transcript}"
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 3. APP: DIARY & SURVEILLANCE NOTES */}
          {activeApp === 'diary' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-serif">
              <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-2">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
                    Lian’s Surveillance Dossier
                  </h4>
                  <p className="text-[10px] text-zinc-500">
                    Private observations recorded on {contactName}
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingNote(!isAddingNote)}
                  className="px-2.5 py-1 rounded-full bg-[#d4af37]/15 border-[0.5px] border-[#d4af37]/40 text-[#f4e4a6] text-xs flex items-center gap-1 hover:bg-[#d4af37]/25"
                >
                  <Plus className="w-3 h-3" />
                  <span>Note</span>
                </button>
              </div>

              {isAddingNote && (
                <form
                  onSubmit={handleSaveDiary}
                  className="p-3 rounded-2xl bg-[#14121a] border-[0.5px] border-[#d4af37]/40 space-y-2 animate-in fade-in"
                >
                  <input
                    type="text"
                    placeholder="Note Title (e.g. Weakness, Key location...)"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="w-full p-2 bg-[#070709] border-[0.5px] border-[#d4af37]/30 rounded-xl text-xs text-[#f4f4f6] focus:outline-none focus:border-[#d4af37]"
                    required
                  />
                  <textarea
                    rows={2}
                    placeholder="Observation details..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="w-full p-2 bg-[#070709] border-[0.5px] border-[#d4af37]/30 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-[#d4af37]"
                    required
                  />
                  <div className="flex justify-between items-center">
                    <select
                      value={noteCategory}
                      onChange={(e) => setNoteCategory(e.target.value as any)}
                      className="p-1.5 bg-[#070709] border-[0.5px] border-[#d4af37]/30 rounded-lg text-xs text-zinc-300"
                    >
                      <option value="surveillance">Surveillance</option>
                      <option value="weakness">Psychological Weakness</option>
                      <option value="confession">Overheard Confession</option>
                      <option value="draft">Unsent Draft</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3.5 py-1 bg-gradient-to-r from-[#d4af37] to-[#b38f2a] text-[#070709] rounded-lg text-xs font-semibold"
                    >
                      Save Note
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2.5">
                {communications?.diaryNotes?.length === 0 ? (
                  <div className="text-center py-12 text-xs text-zinc-500 italic">
                    No surveillance notes recorded for {contactName}.
                  </div>
                ) : (
                  communications?.diaryNotes?.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-2xl bg-[#14121a]/85 border-[0.5px] border-[#d4af37]/20 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[#f4f4f6]">
                          {note.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] uppercase tracking-wider px-2 py-0.2 rounded-full bg-[#d4af37]/10 text-[#d4af37] border-[0.5px] border-[#d4af37]/30">
                            {note.category}
                          </span>
                          <button
                            onClick={() => onDeleteDiaryNote(activeCharacter.id, note.id)}
                            className="text-zinc-500 hover:text-red-400 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed italic">
                        {note.content}
                      </p>
                      <div className="text-[9px] text-zinc-500 font-mono">
                        {new Date(note.timestamp).toLocaleDateString()} • {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 4. APP: CLUES & EVIDENCE */}
          {activeApp === 'clues' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-serif">
              <div className="border-b border-[#d4af37]/20 pb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
                  Evidence & Intercepts ({contactName})
                </h4>
                <p className="text-[10px] text-zinc-500">
                  Physical artifacts and documents linked to {contactName}
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#14121a]/90 border-[0.5px] border-[#d4af37]/25 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#f4f4f6]">
                    <FileText className="w-4 h-4 text-[#d4af37]" />
                    <span>Intercepted Ledger Slip</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed italic">
                    "Transfers marked to the subterranean vault are dated during the full moon. He never uses bank wires."
                  </p>
                  <span className="text-[9px] text-[#c5a059] font-mono block">Status: Verified Artifact</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#14121a]/90 border-[0.5px] border-[#d4af37]/25 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#f4f4f6]">
                    <Key className="w-4 h-4 text-[#d4af37]" />
                    <span>Obsidian Signet Impression</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed italic">
                    Wax imprint taken from the drawing room fireplace mantle. Matches the crest on his private desk cylinder.
                  </p>
                  <span className="text-[9px] text-[#c5a059] font-mono block">Status: High Value Key</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM SMARTPHONE DOCK / NAVIGATION BAR */}
        <div className="relative z-30 px-6 py-2.5 bg-[#0a080e]/95 backdrop-blur-2xl border-t-[0.5px] border-[#d4af37]/25 flex items-center justify-around">
          <button
            onClick={() => setActiveApp('messages')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeApp === 'messages' ? 'text-[#d4af37] scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              {communications?.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#d4af37] border-2 border-black" />
              )}
            </div>
            <span className="text-[9px] font-serif">SMS</span>
          </button>

          <button
            onClick={() => setActiveApp('calls')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeApp === 'calls' ? 'text-[#d4af37] scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Phone className="w-5 h-5" />
            <span className="text-[9px] font-serif">Calls</span>
          </button>

          <button
            onClick={() => setActiveApp('diary')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeApp === 'diary' ? 'text-[#d4af37] scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[9px] font-serif">Diary</span>
          </button>

          <button
            onClick={() => setActiveApp('clues')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeApp === 'clues' ? 'text-[#d4af37] scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Key className="w-5 h-5" />
            <span className="text-[9px] font-serif">Clues</span>
          </button>
        </div>

        {/* Home Bar Pill */}
        <div className="pb-1.5 pt-0.5 flex justify-center bg-[#0a080e]/95">
          <div className="w-28 h-1 bg-[#d4af37]/40 rounded-full" />
        </div>
      </div>
    </div>
  );
};
