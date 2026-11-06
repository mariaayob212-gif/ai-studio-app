export type EmotionState =
  | 'calm'
  | 'calculating'
  | 'smirking'
  | 'predatory'
  | 'intimate'
  | 'icy'
  | 'defiant'
  | 'vulnerable';

export type UserEmotionState =
  | 'calm'
  | 'defiant'
  | 'cold'
  | 'calculated'
  | 'evade'
  | 'vulnerable';

export interface ChatSession {
  id: string;
  characterId: string;
  title: string;
  createdAt: number;
  lastMessageAt: number;
  lastMessagePreview?: string;
  branchId: string;
}

export interface CharacterAvatars {
  calm: string;
  calculating: string;
  smirking: string;
  predatory: string;
  intimate: string;
  icy?: string;
  defiant?: string;
  vulnerable?: string;
}

export interface Character {
  id: string;
  name: string;
  title: string;
  tagline: string;
  voiceName: string;
  avatars: CharacterAvatars;
  psychologicalCore: string;
  speechPatterns: string;
  scenario: string;
  greeting?: string;
  openingGreetings: string[];
  exampleDialogue: string;
  hiddenAgenda: string;
  composureState: string;
  themeColor: string;
  accentColor: string;
  bannedTopics?: string[];
  textingStyle?: string;
  phoneBehavior?: 'obsessive' | 'calculating' | 'playful-menacing' | 'cold-demanding' | 'whispering';
  phoneContactName?: string;
  phoneStatus?: string;
}

export interface Persona {
  id: string;
  name: string;
  avatar: string;
  appearance: string;
  personality: string;
  backstory: string;
  fearsAndTriggers: string;
  hiddenSecrets: string;
  speakingStyle: string;
  initialRelationship: string;
  isActive: boolean;
}

export interface PsychologicalHUD {
  obsession: number; // 0-100
  trust: number;     // 0-100
  suspicion: number; // 0-100
  danger: number;    // 0-100
  dominance: number; // 0-100
  heartRate: number; // BPM
  composure: string; // e.g. "The Cracking Calm", "Predatory Focus"
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: 'item' | 'injury' | 'clue' | 'secret';
  acquiredAt: string;
  icon?: string;
  hiddenFromAI?: boolean;
}

export interface Swipe {
  text: string;
  emotion: EmotionState;
  userEmotion?: string;
  innerMonologue?: string;
  translations?: Record<string, string>; // 'ar' | 'en' | 'tr'
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'narrator' | 'system';
  characterId?: string;
  characterName?: string;
  swipes: Swipe[];
  currentSwipeIndex: number;
  timestamp: number;
  pinned?: boolean;
  chapterId?: string;
  toneUsed?: string;
  branchId?: string;
}

export interface MemoryLedgerEntry {
  id: string;
  text: string;
  category: 'fact' | 'promise' | 'betrayal' | 'shift';
  timestamp: number;
  importance: 'critical' | 'high' | 'normal';
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  summary: string;
  startMessageId: string;
  createdAt: number;
}

export interface LorebookEntry {
  id: string;
  keys: string[];
  title: string;
  content: string;
  enabled: boolean;
  category?: 'location' | 'faction' | 'artifact' | 'lore';
}

export interface TimelineBranch {
  id: string;
  name: string;
  forkMessageId: string;
  parentBranchId?: string;
  createdAt: number;
}

export interface SavedPhrase {
  id: string;
  text: string;
  meaning: string;
  language: string;
  sourceContext?: string;
  savedAt: number;
}

export interface RoleplaySettings {
  model: string;
  temperature: number;
  topP: number;
  responseLength: 'short' | 'balanced' | 'novel' | 'long' | 'medium';
  pacing: 'slow-burn' | 'fast-dialogue' | 'deep-noir';
  language: 'auto' | 'en' | 'ar' | 'tr';
  pinCode: string;
  pinLocked: boolean;
  bannedPhrases: string[];
  ambientTrack: 'off' | 'rain' | 'fire' | 'heartbeat' | 'cello';
  ambientVolume: number;
  currentWallpaper: string;
  isPanicMode: boolean;
  isGroupScene: boolean;
  activeGroupCharacterIds: string[];
  groupSpeakerTurn: string; // which character speaks next or auto
}

export interface PhoneMessage {
  id: string;
  sender: 'user' | 'character';
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  imageAttachment?: string;
  isProactive?: boolean;
}

export interface PhoneCall {
  id: string;
  characterId: string;
  type: 'incoming' | 'missed' | 'voicemail';
  timestamp: number;
  durationSeconds?: number;
  voicemailAudioText?: string;
  transcript?: string;
  isListened?: boolean;
}

export interface PhoneDiaryNote {
  id: string;
  characterId: string;
  title: string;
  content: string;
  timestamp: number;
  lockedWithPin?: boolean;
  category: 'surveillance' | 'confession' | 'weakness' | 'draft';
}

export interface CharacterCommunications {
  characterId: string;
  messages: PhoneMessage[];
  calls: PhoneCall[];
  diaryNotes: PhoneDiaryNote[];
  unreadCount: number;
  lastInteractionTimestamp: number;
}
