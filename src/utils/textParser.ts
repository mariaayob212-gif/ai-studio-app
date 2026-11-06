import { EmotionState, PsychologicalHUD } from '../types/roleplay';

export interface ParsedTurn {
  cleanText: string;
  emotion: EmotionState;
  userEmotion: string | null;
  innerMonologue: string | null;
  hudDelta: Partial<PsychologicalHUD> | null;
  inventoryNote: string | null;
  memoryNote: string | null;
}

export function isArabic(text: string): boolean {
  if (!text) return false;
  // Arabic Unicode range
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
}

export function extractEmotion(raw: string, defaultEmotion: EmotionState = 'calm'): EmotionState {
  const match = raw.match(/\[EMOTION:\s*([a-zA-Z_-]+)\]/i) || raw.match(/<emotion>([a-zA-Z_-]+)<\/emotion>/i);
  if (match) {
    const val = match[1].toLowerCase().trim();
    if (val.includes('calculat')) return 'calculating';
    if (val.includes('smirk')) return 'smirking';
    if (val.includes('predat') || val.includes('angr') || val.includes('rage')) return 'predatory';
    if (val.includes('intimat') || val.includes('whisper') || val.includes('soft') || val.includes('touch')) return 'intimate';
    if (val.includes('icy') || val.includes('cold')) return 'icy';
    if (val.includes('defian') || val.includes('flame')) return 'defiant';
    if (val.includes('vulnerab') || val.includes('tremor')) return 'vulnerable';
    if (val.includes('calm')) return 'calm';
  }
  return defaultEmotion;
}

export function extractUserEmotion(raw: string): string | null {
  const match = raw.match(/\[USER_EMOTION:\s*([a-zA-Z_-]+)\]/i);
  if (match) {
    return match[1].toLowerCase().trim();
  }
  return null;
}

export function parseHudDelta(raw: string): Partial<PsychologicalHUD> | null {
  const match = raw.match(/\[HUD:\s*([^\]]+)\]/i);
  if (!match) return null;

  const content = match[1];
  const delta: Partial<PsychologicalHUD> = {};

  const pairs = content.split(/[,;]/);
  for (const pair of pairs) {
    const [key, val] = pair.split('=').map((s) => s.trim());
    if (!key || !val) continue;

    const lowerKey = key.toLowerCase();
    const numVal = parseInt(val.replace(/^[+]/, ''), 10);

    if (lowerKey.includes('obsession') && !isNaN(numVal)) delta.obsession = numVal;
    else if (lowerKey.includes('trust') && !isNaN(numVal)) delta.trust = numVal;
    else if (lowerKey.includes('suspicion') && !isNaN(numVal)) delta.suspicion = numVal;
    else if (lowerKey.includes('danger') || lowerKey.includes('tension')) {
      if (!isNaN(numVal)) delta.danger = numVal;
    } else if (lowerKey.includes('dominance') || lowerKey.includes('control')) {
      if (!isNaN(numVal)) delta.dominance = numVal;
    } else if (lowerKey.includes('heart') && !isNaN(numVal)) {
      delta.heartRate = numVal;
    } else if (lowerKey.includes('composure')) {
      delta.composure = val.replace(/["']/g, '').trim();
    }
  }

  return Object.keys(delta).length > 0 ? delta : null;
}

export function parseAITurn(rawText: string, currentEmotion: EmotionState = 'calm'): ParsedTurn {
  if (!rawText) {
    return {
      cleanText: '',
      emotion: currentEmotion,
      userEmotion: null,
      innerMonologue: null,
      hudDelta: null,
      inventoryNote: null,
      memoryNote: null,
    };
  }

  const emotion = extractEmotion(rawText, currentEmotion);
  const userEmotion = extractUserEmotion(rawText);
  const hudDelta = parseHudDelta(rawText);

  // Extract inner monologue
  let innerMonologue: string | null = null;
  const monologueMatch =
    rawText.match(/\[INNER_MONOLOGUE:\s*([\s\S]*?)\]/i) ||
    rawText.match(/<inner_monologue>([\s\S]*?)<\/inner_monologue>/i);
  if (monologueMatch) {
    innerMonologue = monologueMatch[1].trim();
  }

  // Extract inventory note
  let inventoryNote: string | null = null;
  const invMatch = rawText.match(/\[INVENTORY_NOTE:\s*([\s\S]*?)\]/i);
  if (invMatch) {
    inventoryNote = invMatch[1].trim();
  }

  // Extract memory note
  let memoryNote: string | null = null;
  const memMatch = rawText.match(/\[MEMORY:\s*([\s\S]*?)\]/i);
  if (memMatch) {
    memoryNote = memMatch[1].trim();
  }

  // Clean tags out of visible prose
  let cleanText = rawText
    .replace(/\[EMOTION:\s*[a-zA-Z_-]+\]/gi, '')
    .replace(/<emotion>[a-zA-Z_-]+<\/emotion>/gi, '')
    .replace(/\[USER_EMOTION:\s*[a-zA-Z_-]+\]/gi, '')
    .replace(/\[INNER_MONOLOGUE:\s*[\s\S]*?\]/gi, '')
    .replace(/<inner_monologue>[\s\S]*?<\/inner_monologue>/gi, '')
    .replace(/\[HUD:\s*[^\]]+\]/gi, '')
    .replace(/\[INVENTORY_NOTE:\s*[^\]]+\]/gi, '')
    .replace(/\[MEMORY:\s*[^\]]+\]/gi, '')
    .trim();

  return {
    cleanText,
    emotion,
    userEmotion,
    innerMonologue,
    hudDelta,
    inventoryNote,
    memoryNote,
  };
}

export interface TextToken {
  type: 'narration' | 'dialogue' | 'text';
  content: string;
}

/**
 * Tokenizes a single paragraph of text into narration (actions stripped of *),
 * dialogue (speech stripped of quotes), and intervening text.
 */
export function tokenizeParagraph(paragraphText: string): TextToken[] {
  if (!paragraphText) return [];

  const tokens: TextToken[] = [];
  const regex = /(\*[^*]+\*)|("[^"\n]+"|«[^»\n]+»|“[^”\n]+”)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(paragraphText)) !== null) {
    if (match.index > lastIndex) {
      const plain = paragraphText.substring(lastIndex, match.index);
      if (plain.trim()) {
        tokens.push({ type: 'text', content: plain.trim() });
      }
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      const cleanNarration = matchedStr.slice(1, -1).trim();
      if (cleanNarration) {
        tokens.push({
          type: 'narration',
          content: cleanNarration,
        });
      }
    } else if (
      (matchedStr.startsWith('"') && matchedStr.endsWith('"')) ||
      (matchedStr.startsWith('«') && matchedStr.endsWith('»')) ||
      (matchedStr.startsWith('“') && matchedStr.endsWith('”'))
    ) {
      const cleanDialogue = matchedStr.slice(1, -1).trim();
      if (cleanDialogue) {
        tokens.push({
          type: 'dialogue',
          content: cleanDialogue,
        });
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < paragraphText.length) {
    const trailing = paragraphText.substring(lastIndex);
    if (trailing.trim()) {
      tokens.push({ type: 'text', content: trailing.trim() });
    }
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', content: paragraphText }];
}

/**
 * Splits literary prose into paragraphs, tokenizing each paragraph.
 * Preserves true narrative pacing and prevents giant walls of text.
 */
export function tokenizeLiteraryParagraphs(text: string): TextToken[][] {
  if (!text) return [];
  const rawParagraphs = text.split(/\n\s*\n/);
  return rawParagraphs
    .map((p) => p.trim())
    .filter(Boolean)
    .map(tokenizeParagraph);
}

/**
 * Legacy flat tokenization helper for single-string contexts.
 */
export function tokenizeLiteraryText(text: string): TextToken[] {
  if (!text) return [];
  const paragraphs = tokenizeLiteraryParagraphs(text);
  const flattened: TextToken[] = [];
  paragraphs.forEach((p) => {
    flattened.push(...p);
  });
  return flattened;
}
