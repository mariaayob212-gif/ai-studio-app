export interface ScheduleBlock {
  from: number;
  to: number;
  state: 'asleep' | 'busy' | 'free';
  label?: string;
}

export interface VelvetCharacter {
  id: string;
  name: string;
  tagline: string;
  avatar: string;
  img?: string;
  autoInit?: boolean;
  initMetrics?: VelvetMetrics;
  initEmotion?: string;
  schedule: ScheduleBlock[];
  evolved: string[];
  system_prompt: string;
  prev_prompt?: string;
  greeting: string;
  voiceId?: string;
  ambient?: 'off' | 'rain' | 'hearth' | 'jazz' | 'library' | string;
}

export interface VelvetMessage {
  id: string;
  role: 'user' | 'assistant';
  variants: string[];
  idx: number;
  ts: number;
}

export interface VelvetMetrics {
  affection: number;
  trust: number;
  obsession: number;
  tension: number;
  hostility: number;
}

export interface VelvetChat {
  id: string;
  charId: string;
  created: number;
  title?: string;
  metrics: VelvetMetrics;
  emotion: string;
  len: number; // 0: short, 1: balanced, 2: novel
  personaId: string | null;
  lastUserTs: number;
  followUps: number;
  unread: number;
  messages: VelvetMessage[];
  summary?: string;
  sumUpTo?: number;
  ragAt?: number;
  ragGap?: number;
  letters?: Record<string, string>;
}

export interface VelvetPhoneLog {
  id: string;
  chatId: string;
  type: 'sms' | 'call';
  from: 'user' | 'char';
  text: string;
  dur?: number;
  tr?: string;
  ts: number;
}

export interface VelvetLoreEntry {
  id: string;
  keys: string;
  content: string;
  on: boolean;
  auto?: boolean;
}

export interface VelvetPersona {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  img?: string;
}

export interface VelvetApiKeyEntry {
  id: string;
  name: string;
  key: string;
  provider: 'gemini' | 'openrouter' | 'deepseek' | 'ollama' | 'custom' | string;
  model?: string;
  baseUrl?: string;
}

export interface CustomPromptPreset {
  id: string;
  name: string;
  text: string;
}

export interface OpenRouterStats {
  remaining: number | null;
  usage: number | null;
  limit: number | null;
  ts: number;
}

export interface VelvetUserSettings {
  theme?: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  apiKeys: VelvetApiKeyEntry[];
  activeKeyId: string;
  elevenKey: string;
  language: 'en' | 'ar';
  timeMode: 'auto' | 'day' | 'night';
  followUpSec: number;
  temp?: number;
  topP?: number;
  userName?: string;
  userBio?: string;
  customPrompts?: CustomPromptPreset[];
  activePromptId?: string;
  prefillOn?: boolean;
  prefillText?: string;
  forbiddenWords?: string[];
  showHud?: boolean;
  contextLimit?: number;
  vnMode?: boolean;
}

export interface VelvetState {
  characters: VelvetCharacter[];
  chats: VelvetChat[];
  phoneLogs: VelvetPhoneLog[];
  lorebook: VelvetLoreEntry[];
  personas: VelvetPersona[];
  userSettings: VelvetUserSettings;
}
