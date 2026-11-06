import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  createContext,
  useCallback,
  ReactNode,
} from 'react';
import localforage from 'localforage';
import {
  VelvetCharacter,
  VelvetMessage,
  VelvetMetrics,
  VelvetChat,
  VelvetPhoneLog,
  VelvetLoreEntry,
  VelvetPersona,
  VelvetApiKeyEntry,
  VelvetUserSettings,
  VelvetState,
  ScheduleBlock,
  CustomPromptPreset,
  OpenRouterStats,
} from './types/velvet';

const KEY = 'velvet-studio-v1';
const uid = () => Math.random().toString(36).slice(2, 10);
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/* ---------- Key Obfuscation ---------- */
const SALT = 'velvet-obf-v1';
const encKey = (s: string) => {
  if (!s || s.startsWith('obf:')) return s;
  try {
    const x = Array.from(s)
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ SALT.charCodeAt(i % SALT.length)))
      .join('');
    return 'obf:' + btoa(unescape(encodeURIComponent(x)));
  } catch {
    return s;
  }
};
const decKey = (s: string) => {
  if (!s || !s.startsWith('obf:')) return s || '';
  try {
    const raw = decodeURIComponent(escape(atob(s.slice(4))));
    return Array.from(raw)
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ SALT.charCodeAt(i % SALT.length)))
      .join('');
  } catch {
    return '';
  }
};

/* ---------- File to Avatar Helper ---------- */
const fileToAvatar = (f: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const n = 256;
        const c = document.createElement('canvas');
        c.width = c.height = n;
        const x = c.getContext('2d');
        if (!x) return rej();
        const s = Math.min(im.width, im.height);
        x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, n, n);
        res(c.toDataURL('image/jpeg', 0.85));
      };
      im.onerror = rej;
      im.src = r.result as string;
    };
    r.onerror = rej;
    r.readAsDataURL(f);
  });

/* ---------- Haptics & Web Audio Ambient Soundscape Synthesizer ---------- */
const haptic = (ms: number | number[] = 35) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  } catch {}
};

const AMBIENT_MODES = ['off', 'rain', 'hearth', 'jazz', 'library'] as const;

class AmbientEngine {
  ctx: AudioContext | null = null;
  mode: string = 'off';
  nodes: (AudioNode | { stop?: () => void; disconnect?: () => void })[] = [];

  stop() {
    this.nodes.forEach((n) => {
      try {
        (n as any).stop?.();
        (n as any).disconnect?.();
      } catch {}
    });
    this.nodes = [];
    this.mode = 'off';
  }

  play(mode: string) {
    this.stop();
    if (!mode || mode === 'off') return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.mode = mode;
      const ctx = this.ctx;
      const master = ctx.createGain();
      master.gain.value = 0.14;
      master.connect(ctx.destination);
      this.nodes.push(master);

      const bufSize = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufSize; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * w) / 1.02;
        lastOut = data[i];
        data[i] *= 3.2;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = mode === 'rain' ? 'bandpass' : 'lowpass';
      filter.frequency.value = mode === 'rain' ? 950 : mode === 'hearth' ? 260 : 420;
      noise.connect(filter);
      filter.connect(master);
      noise.start();
      this.nodes.push(noise, filter);

      if (mode === 'jazz' || mode === 'library') {
        const osc = ctx.createOscillator();
        const og = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = mode === 'jazz' ? 110 : 73.42;
        og.gain.value = 0.05;
        osc.connect(og);
        og.connect(master);
        osc.start();
        this.nodes.push(osc, og);
      }
    } catch {}
  }
}
const AMBIENT = new AmbientEngine();

/* ---------- V2 PNG Character Card Reader & Writer (tEXt 'chara' chunk + CRC32) ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (bytes: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

async function parsePngCharacterCard(file: File): Promise<Partial<VelvetCharacter>> {
  const buf = await file.arrayBuffer();
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  if (u8[0] !== 0x89 || u8[1] !== 0x50 || u8[2] !== 0x4e || u8[3] !== 0x47) {
    throw new Error('Not a valid PNG');
  }
  let off = 8;
  while (off < u8.length) {
    const len = dv.getUint32(off);
    const type = String.fromCharCode(u8[off + 4], u8[off + 5], u8[off + 6], u8[off + 7]);
    if (type === 'tEXt') {
      const chunk = u8.subarray(off + 8, off + 8 + len);
      let nul = 0;
      while (nul < chunk.length && chunk[nul] !== 0) nul++;
      const kw = new TextDecoder().decode(chunk.subarray(0, nul));
      if (kw === 'chara' || kw === 'ccv3') {
        const b64 = new TextDecoder().decode(chunk.subarray(nul + 1));
        const jsonStr = decodeURIComponent(escape(atob(b64.trim())));
        const raw = JSON.parse(jsonStr);
        const d = raw.data || raw;
        const imgUrl = await fileToAvatar(file).catch(() => undefined);
        const ext = d.extensions?.velvet || {};
        return {
          name: d.name || 'Unnamed',
          tagline: d.creator_notes || d.personality?.slice(0, 80) || 'Imported V2 Character Card',
          avatar: '🎭',
          img: imgUrl,
          ambient: ext.ambient || 'off',
          schedule: ext.schedule || [],
          initMetrics: ext.initMetrics,
          initEmotion: ext.initEmotion,
          system_prompt: [
            d.description,
            d.personality,
            d.scenario ? `Scenario: ${d.scenario}` : '',
            d.system_prompt,
            d.mes_example ? `Dialogue Examples:\n${d.mes_example}` : '',
            'You are a person, never an AI.',
          ]
            .filter(Boolean)
            .join('\n\n'),
          greeting: d.first_mes || `*${d.name || 'They'} looks at you intently.* "Hello."`,
        };
      }
    }
    if (type === 'IEND') break;
    off += 12 + len;
  }
  throw new Error('No V2 character metadata found in PNG');
}

async function exportPngCharacterCard(char: VelvetCharacter) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#09080d');
  grad.addColorStop(1, '#241522');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  if (char.img) {
    await new Promise<void>((res) => {
      const im = new Image();
      im.onload = () => {
        ctx.drawImage(im, 0, 0, 512, 512);
        res();
      };
      im.onerror = () => res();
      im.src = char.img!;
    });
  } else {
    ctx.font = '180px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char.avatar || '🌹', 256, 220);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 410, 512, 102);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 496);
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(char.name || 'Character', 256, 450);
  ctx.fillStyle = '#e2dcd0';
  ctx.font = '16px sans-serif';
  ctx.fillText((char.tagline || 'Velvet Studio V2 Card').slice(0, 48), 256, 482);

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return;
  const u8 = new Uint8Array(await blob.arrayBuffer());
  const v2Payload = {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: char.name,
      description: char.system_prompt,
      personality: char.tagline || '',
      scenario: '',
      first_mes: char.greeting || '',
      mes_example: '',
      creator_notes: char.tagline || '',
      system_prompt: char.system_prompt || '',
      extensions: {
        velvet: {
          schedule: char.schedule || [],
          initMetrics: char.initMetrics,
          initEmotion: char.initEmotion,
          ambient: char.ambient || 'off',
        },
      },
    },
  };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(v2Payload))));
  const kwBytes = new TextEncoder().encode('chara\0' + b64);
  const chunk = new Uint8Array(12 + kwBytes.length);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, kwBytes.length);
  chunk.set([0x74, 0x45, 0x58, 0x74], 4); // tEXt
  chunk.set(kwBytes, 8);
  dv.setUint32(8 + kwBytes.length, crc32(chunk.subarray(4, 8 + kwBytes.length)));

  const iendPos = u8.length - 12;
  const out = new Uint8Array(u8.length + chunk.length);
  out.set(u8.subarray(0, iendPos), 0);
  out.set(chunk, iendPos);
  out.set(u8.subarray(iendPos), iendPos + chunk.length);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([out], { type: 'image/png' }));
  a.download = (char.name || 'character').replace(/\s+/g, '-') + '.card.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- Unlockable "Open When" Letter Definitions ---------- */
interface LetterMilestone {
  id: string;
  metric: keyof VelvetMetrics;
  threshold: number;
  titleEn: string;
  titleAr: string;
  prompt: string;
}

const LETTER_MILESTONES: LetterMilestone[] = [
  {
    id: 'm_trust',
    metric: 'trust',
    threshold: 75,
    titleEn: 'Open When You Doubt Me',
    titleAr: 'افتحها عندما تشكّ بي',
    prompt:
      "Write a deeply personal, secret letter from you to {{user}} titled 'Open When You Doubt Me'. Confess a secret truth or vulnerability you've never spoken aloud in the chat, referencing your shared history.",
  },
  {
    id: 'm_affection',
    metric: 'affection',
    threshold: 80,
    titleEn: 'Open When You Feel Alone',
    titleAr: 'افتحها عندما تشعر بالوحدة',
    prompt:
      "Write an intimate, tender handwritten letter to {{user}} titled 'Open When You Feel Alone'. Express what {{user}} truly means to you beneath your usual demeanor, referencing moments from your history.",
  },
  {
    id: 'm_obsession',
    metric: 'obsession',
    threshold: 80,
    titleEn: 'Open If You Ever Try To Leave',
    titleAr: 'افتحها إن فكرت يوماً بالرحيل',
    prompt:
      "Write a dark, possessive, emotionally intense letter to {{user}} titled 'Open If You Ever Try To Leave'. Reveal how deeply you watch and claim {{user}}, referencing your shared scenes.",
  },
  {
    id: 'm_tension',
    metric: 'tension',
    threshold: 80,
    titleEn: 'Open After Our Worst Fight',
    titleAr: 'افتحها بعد أسوأ شجار بيننا',
    prompt:
      "Write a raw, conflicted letter written at 3 AM to {{user}} titled 'Open After Our Worst Fight'. Let your pride clash with your unspoken feelings.",
  },
  {
    id: 'm_hostility',
    metric: 'hostility',
    threshold: 80,
    titleEn: 'Open When The Dust Settles',
    titleAr: 'افتحها عندما تهدأ العاصفة',
    prompt:
      "Write a sharp, begrudgingly respectful letter to your rival/enemy {{user}} titled 'Open When The Dust Settles'. Acknowledge their strength even amidst your hostility.",
  },
];

/* ---------- Dual-Screen HUD Pop-out Window Launcher ---------- */
let HUD_BC: BroadcastChannel | null = null;
try {
  HUD_BC = new BroadcastChannel('velvet-dual-hud');
} catch {}

function openDualScreenHud(payload: { char?: VelvetCharacter; chat?: VelvetChat; thought?: string }) {
  const w = window.open('', 'VelvetDualHUD', 'width=480,height=720,menubar=no,toolbar=no,location=no');
  if (!w) return;
  const jsonPayload = JSON.stringify(payload).replace(/</g, '\\u003c');
  const html = [
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Velvet — Live Telemetry HUD</title>',
    '<style>',
    'body{margin:0;padding:18px;background:#070709;color:#f6f1e3;font-family:system-ui,sans-serif;background-image:radial-gradient(circle at 20% 0,rgba(212,175,55,.1),transparent 45%)}',
    '.card{background:rgba(20,20,26,.86);border:1px solid rgba(212,175,55,.28);border-radius:20px;padding:14px;margin-bottom:14px}',
    '.gold{color:#d4af37;font-family:Georgia,serif}',
    '.bar{height:6px;background:rgba(255,255,255,.1);border-radius:6px;overflow:hidden;margin-top:4px}',
    '.fill{height:100%;transition:width .6s}',
    '.thread{background:#1b1214;border:1px solid rgba(230,57,70,.45);border-radius:12px;padding:8px 10px;font-size:12px;margin-top:6px;border-left:3px solid #e63946}',
    '</style></head><body>',
    '<div id="hud">Loading telemetry…</div>',
    '<script>',
    'function render(d){',
    '  if(!d||!d.chat)return;',
    '  var c=d.char||{},ch=d.chat,m=ch.metrics||{};',
    '  var threads=(ch.summary||"").split("\\n").filter(function(x){return x.trim()&&!x.startsWith("[")}).slice(-6);',
    '  var metricsHtml = ["affection","trust","obsession","tension","hostility"].map(function(k){',
    '    var isRed = k==="tension"||k==="hostility";',
    '    return "<div><div style=\\"display:flex;justify-content:space-between;font-size:11px;text-transform:uppercase\\"><span>"+k+"</span><span>"+(m[k]||0)+"%</span></div><div class=\\"bar\\"><div class=\\"fill\\" style=\\"width:"+(m[k]||0)+"%;background:"+(isRed?"#e63946":"#d4af37")+"\\"></div></div></div>";',
    '  }).join("");',
    '  var threadHtml = threads.length?threads.map(function(t){return "<div class=\\"thread\\">📌 "+t+"</div>"}).join(""):"<div style=\\"font-size:12px;opacity:.5\\">No active threads yet.</div>";',
    '  document.getElementById("hud").innerHTML =',
    '    "<div class=\\"card\\"><div style=\\"display:flex;justify-content:space-between;align-items:center\\"><div><h2 class=\\"gold\\" style=\\"margin:0\\">"+(c.name||"Character")+"</h2><div style=\\"font-size:11px;opacity:.7\\">LIVE DUAL-SCREEN TELEMETRY</div></div><span style=\\"padding:4px 12px;border-radius:99px;border:1px solid #d4af37;color:#d4af37;font-size:12px\\">"+(ch.emotion||"Calm")+"</span></div><div style=\\"margin-top:14px;display:grid;gap:8px\\">"+metricsHtml+"</div></div>"+',
    '    "<div class=\\"card\\"><h3 class=\\"gold\\" style=\\"margin:0 0 8px 0;font-size:16px\\">💭 Latest Inner Monologue</h3><div style=\\"font-size:12.5px;font-style:italic;color:#ccc\\">"+(d.thought||"(Awaiting next cognitive turn…)")+"</div></div>"+',
    '    "<div class=\\"card\\"><h3 class=\\"gold\\" style=\\"margin:0 0 8px 0;font-size:16px\\">🧶 Red String Board & Memory</h3>"+threadHtml+"</div>";',
    '}',
    'var bc = new BroadcastChannel("velvet-dual-hud");',
    'bc.onmessage = function(e){ render(e.data); };',
    'render(' + jsonPayload + ');',
    '<' + '/script></body></html>'
  ].join('\n');
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* ---------- Themes ---------- */
interface ThemeDef {
  nameEn: string;
  nameAr: string;
  onyx: string;
  gold: string;
  rgb: string;
  ivory: string;
  bg1: string;
  bg2: string;
}

const THEMES: Record<string, ThemeDef> = {
  gold: {
    nameEn: 'Onyx Gold',
    nameAr: 'الذهب الملكي',
    onyx: '#070709',
    gold: '#d4af37',
    rgb: '212,175,55',
    ivory: '#f6f1e3',
    bg1: 'rgba(212,175,55,.08)',
    bg2: 'rgba(120,40,70,.12)',
  },
  crimson: {
    nameEn: 'Velvet Crimson',
    nameAr: 'القرمزي المخملي',
    onyx: '#090506',
    gold: '#e63956',
    rgb: '230,57,86',
    ivory: '#f9ecee',
    bg1: 'rgba(230,57,86,.10)',
    bg2: 'rgba(90,15,30,.16)',
  },
  amethyst: {
    nameEn: 'Nocturne Amethyst',
    nameAr: 'البنفسجي الليلي',
    onyx: '#07060c',
    gold: '#b388ff',
    rgb: '179,136,255',
    ivory: '#f0ecfa',
    bg1: 'rgba(179,136,255,.09)',
    bg2: 'rgba(60,30,110,.15)',
  },
  emerald: {
    nameEn: 'Forbidden Emerald',
    nameAr: 'الزمرد الغامض',
    onyx: '#050908',
    gold: '#2ec4b6',
    rgb: '46,196,182',
    ivory: '#eaf7f5',
    bg1: 'rgba(46,196,182,.08)',
    bg2: 'rgba(20,80,70,.14)',
  },
  frost: {
    nameEn: 'Arctic Silver',
    nameAr: 'الجليد الفضي',
    onyx: '#06080c',
    gold: '#7cc6fe',
    rgb: '124,198,254',
    ivory: '#eef5fc',
    bg1: 'rgba(124,198,254,.08)',
    bg2: 'rgba(30,60,100,.14)',
  },
  rose: {
    nameEn: 'Dusty Rose',
    nameAr: 'الوردي الدافئ',
    onyx: '#090608',
    gold: '#f4a2b8',
    rgb: '244,162,184',
    ivory: '#fbf0f3',
    bg1: 'rgba(244,162,184,.08)',
    bg2: 'rgba(110,45,70,.14)',
  },
};

const applyTheme = (tk: string) => {
  const th = THEMES[tk] || THEMES.gold;
  const r = document.documentElement.style;
  r.setProperty('--onyx', th.onyx);
  r.setProperty('--gold', th.gold);
  r.setProperty('--gold-rgb', th.rgb);
  r.setProperty('--ivory', th.ivory);
  r.setProperty('--bg1', th.bg1);
  r.setProperty('--bg2', th.bg2);
};

/* ---------- Default Custom Prompt Presets ---------- */
const DEFAULT_PROMPTS: CustomPromptPreset[] = [
  {
    id: 'cp1',
    name: 'Dark 00 (Noir & Psychological)',
    text: "Write with slow-burn psychological tension, visceral sensory details, and sharp subtext. Show emotions through micro-expressions, posture, and tone rather than stating them outright. Never rush conflict resolution or soften a character's rough edges.",
  },
  {
    id: 'cp2',
    name: 'Cinematic Novel',
    text: 'Focus on atmospheric world-building, dynamic body language, and natural, character-driven dialogue. Keep pacing grounded and immersive.',
  },
  {
    id: 'cp3',
    name: 'Raw & Unfiltered',
    text: "Stay strictly true to the character's morality, flaws, and motives without moralizing or breaking character. Let dialogue feel sharp, spontaneous, and human.",
  },
];

/* ---------- 17 Emotions & 5 Metrics ---------- */
const EMO: Record<string, string> = {
  Calm: '#d4af37',
  Tender: '#ff7aa8',
  Joyful: '#ffd166',
  Amused: '#f9a826',
  Playful: '#ff9f68',
  Intrigued: '#4cc9f0',
  Guarded: '#8d99ae',
  Suspicious: '#3fc1c9',
  Anxious: '#b48cff',
  Jealous: '#9b5de5',
  Predatory: '#e63946',
  Cold: '#70a1ff',
  Contemptuous: '#a855f7',
  Hostile: '#ff595e',
  Furious: '#ff2a2a',
  Sad: '#5c95ff',
  Obsessed: '#f72585',
};

const EMO_AR: Record<string, string> = {
  Calm: 'هادئ',
  Tender: 'حنون',
  Joyful: 'مبتهج',
  Amused: 'متسلٍّ',
  Playful: 'مراوغ',
  Intrigued: 'مهتم بفضول',
  Guarded: 'متحفّظ',
  Suspicious: 'متشكك',
  Anxious: 'قلق',
  Jealous: 'غيور',
  Predatory: 'مفترس',
  Cold: 'بارد',
  Contemptuous: 'محتقر',
  Hostile: 'عدائي',
  Furious: 'غاضب',
  Sad: 'حزين',
  Obsessed: 'مهووس',
};

const MK: (keyof VelvetMetrics)[] = ['affection', 'trust', 'obsession', 'tension', 'hostility'];

const emoName = (e: string, l: string) => {
  const key =
    Object.keys(EMO).find((k) => k.toLowerCase() === String(e || '').toLowerCase()) || 'Calm';
  return l === 'ar' ? EMO_AR[key] || key : key;
};

const normEmo = (e: string | null | undefined): string | null =>
  Object.keys(EMO).find((k) => k.toLowerCase() === String(e || '').toLowerCase()) || null;

const SAFETY = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
].map((category) => ({ category, threshold: 'BLOCK_NONE' }));

/* ---------- 6 Granular Length Levels ---------- */
interface LengthLevel {
  key: string;
  tok: number;
  ins: string;
}

const LEN: LengthLevel[] = [
  { key: 'whisper', tok: 75, ins: 'Reply in 1-2 crisp sentences only (under 35 words). Be brief and impactful.' },
  { key: 'brief', tok: 150, ins: 'Reply in 1 short paragraph (40-80 words).' },
  { key: 'chat', tok: 260, ins: 'Reply in 2 concise paragraphs (90-160 words).' },
  { key: 'balanced', tok: 420, ins: 'Reply in 2-3 well-paced paragraphs (170-260 words).' },
  { key: 'scene', tok: 680, ins: 'Reply with detailed atmospheric description and dialogue in 4-5 paragraphs.' },
  { key: 'epic', tok: 1050, ins: 'Reply with rich, immersive novel-style prose, 6+ paragraphs with deep sensory detail.' },
];

const EVOL: [keyof VelvetMetrics, number, string][] = [
  ['trust', 80, 'Trust has fully formed: you now confide in the user, drop your guard and speak with unguarded warmth.'],
  ['obsession', 80, "Obsession has taken root: you are possessive, hate being ignored and fixate on the user's every move."],
  ['affection', 85, 'You are deeply in love; tenderness colors everything you say.'],
  ['tension', 85, 'Unresolved tension has hardened you: you are volatile, quick to anger and guarded.'],
  ['hostility', 85, 'Bitter hostility dominates: you view the user as an enemy, speaking with biting venom and distrust.'],
];

const META = `\n\n[SILENT SYSTEM TASK — REALISTIC HUMAN PSYCHOLOGY]
You are a grounded human character with emotional inertia. Do NOT shift your feelings or metrics on trivial greetings, filler words, or ordinary small talk.
- Most normal turns should cause ZERO change (0) to most metrics.
- Only shift a metric (-3 to +3 max for normal turns, up to -6/+6 ONLY for major betrayal, violence, or deep confession) when the user's words or actions genuinely earn it given your persona and history.
- After your visible reply, on a new line output ONLY this silent JSON block and NOTHING else:
<<<{"affection":0,"trust":0,"obsession":0,"tension":0,"hostility":0,"emotion":"Calm"}>>>
where emotion is one of: ${Object.keys(EMO).join(', ')}.
Never output [EMOTION:...], [INNER_MONOLOGUE:...], [HUD:...], or [MEMORY:...] tags in your visible text.`;

const T: Record<string, Record<string, string>> = {
  en: {
    vnMode: 'Visual Novel Mode',
    chatMode: 'Classic Chat Mode',
    dualHud: 'Pop-out Dual-Screen HUD',
    redBoard: 'Red String Investigation Board',
    letters: "Sealed 'Open When' Letters",
    lockedLetter: 'Locked — Reach',
    toUnlock: 'to unlock & generate',
    openLetter: 'Unseal & Read',
    ambient: 'Ambient Audio',
    amb_off: 'Off',
    amb_rain: 'Night Rain',
    amb_hearth: 'Crackling Hearth',
    amb_jazz: 'Noir Jazz Club',
    amb_library: 'Quiet Archive',
    ctxWindow: 'Context Window (Messages sent)',
    exportPng: 'Export V2 PNG Card',
    importPng: 'Import JSON / V2 PNG Card',
    instructions: 'Instructions & Custom Prompts',
    customPrompt: 'Custom Prompt',
    noCustomPrompt: 'Off (Character prompt only)',
    newPrompt: 'New Preset',
    promptName: 'Preset name',
    promptBody: 'Instructions injected into every reply…',
    prefill: "Prefill (Put words in model's mouth)",
    prefillDesc: 'Forces the reply to start with your custom text or formatting.',
    prefillText: 'e.g. *He watches you closely.* "',
    forbiddenWords: 'Forbidden Words',
    forbiddenPh: 'Add word or phrase (up to 10)…',
    orBalance: 'OpenRouter Credits',
    checkBal: 'Refresh Balance',
    remaining: 'Remaining',
    used: 'Used',
    unlimited: 'Unlimited',
    regenBtn: 'Regenerate',
    copyMsg: 'Copy text',
    copied: 'Copied to clipboard',
    editChar: 'Edit character',
    toggleHud: 'Toggle relationship bars',
    theme: 'App Theme',
    aiStudio: '✨ AI Studio Assistant',
    aiCharPh:
      "Describe the character you want (e.g., 'A ruthless rival detective who secretly respects me, starts hostile and cold')…",
    aiGenChar: '✨ Generate Character',
    aiSchedPh:
      "Tell the AI their daily routine (e.g., 'Sleeps 3am to 11am, works at the hospital 2pm to 10pm')…",
    aiGenSched: '✨ Build Schedule',
    initMetrics: 'Initial Relationship State (0–100)',
    autoInit: 'Auto-detect from context on new chat',
    whisper: 'Whisper',
    brief: 'Brief',
    chatLen: 'Chat',
    balanced: 'Balanced',
    scene: 'Detailed',
    epic: 'Epic Novel',
    hostility: 'Hostility',
    thought: 'Inner monologue',
    search: 'Search chats',
    delMsgQ: 'Delete this message? This cannot be undone.',
    exportChat: 'Export chat (.txt)',
    voiceId: 'ElevenLabs voice ID (optional)',
    speak: 'Play voice',
    mic: 'Speech-to-text dictation',
    uploadPhoto: 'Upload photo',
    removePhoto: 'Remove photo',
    imgBad: 'Could not read that image',
    myPersonas: 'My personas',
    useHere: 'Use in this chat',
    activeHere: 'Active in this chat',
    newPersona: 'New persona',
    delPersonaQ: 'Chats using it will fall back to your default persona.',
    unnamed: 'Unnamed',
    default: 'default',
    myPersona: 'My persona',
    schedule: 'Daily schedule (hours 0–24)',
    asleep: 'Asleep',
    busy: 'Busy',
    free: 'Free',
    label: 'What they are doing',
    addBlock: 'Add block',
    online: 'Online',
    profile: 'Your profile',
    userName: 'Your name ({{user}})',
    userBio: 'About you (added to every prompt)',
    stop: 'Stop',
    temp: 'Temperature',
    genp: 'Generation Controls',
    home: 'Velvet',
    roster: 'Characters',
    history: 'Chat history',
    newChar: 'New character',
    settings: 'Settings',
    send: 'Send',
    ph: 'Write your move… (*action* "dialogue")',
    chat: 'Chat',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    del: 'Delete',
    rewind: 'Rewind here',
    branch: 'Branch to new chat',
    rewindQ:
      'Rewind to this message, or branch it into a new chat? Rewinding removes every later message.',
    cont: 'Continue reply',
    saveCont: 'Save & continue',
    affection: 'Affection',
    trust: 'Trust',
    obsession: 'Obsession',
    tension: 'Tension',
    messages: 'Messages',
    calls: 'Calls',
    call: 'Call',
    hangup: 'Hang up',
    ringing: 'Ringing…',
    missed: 'Missed',
    typing: 'typing…',
    apiKey: 'LLM API key',
    vault: 'Multi-Key Vault',
    keyName: 'Name / alias',
    keyStr: 'API key',
    addKey: 'Add key',
    setActive: 'Set as active',
    active: 'Active',
    noKeys:
      'No keys saved yet. Add one below; without an active key the built-in Local Muse answers.',
    keyAdded: 'Key saved to the vault',
    keyNeeded: 'Enter an API key first',
    delKeyQ: 'Delete this key from the vault?',
    model: 'Model',
    elKey: 'ElevenLabs API key',
    language: 'Language',
    timeMode: 'World time',
    auto: 'Real clock',
    day: 'Always day',
    night: 'Always night',
    followUp: 'Follow-up text after (sec, 0 = off)',
    name: 'Name',
    tagline: 'Tagline',
    persona: 'System prompt / persona',
    greeting: 'Opening line',
    reset: 'Erase all data',
    resetQ: 'Erase every character, chat and text message? This cannot be undone.',
    quill: 'Magic Quill',
    empty: 'No chats yet — pick someone from the roster.',
    apiFail: 'API Error: Switch Key in Settings',
    say: 'Say something…',
    back: 'Back',
    engine: 'Without a key, the built-in Local Muse engine answers so every feature still works.',
    avatar: 'Avatar emoji',
    provider: 'Provider',
    baseUrl: 'Base URL',
    memory: 'Memory & Lorebook',
    memEmpty: 'No memory yet. It is built automatically as the chat grows.',
    summarize: 'Summarize now',
    lore: 'Lorebook',
    noLore:
      'No entries. Add keywords and facts; they are injected when the keywords appear in the recent chat.',
    loreKeys: 'Keywords, comma separated',
    loreText: 'Fact to inject',
    addLore: 'Add entry',
    backup: 'Backup',
    exportB: 'Export backup',
    importB: 'Import backup',
    importQ: 'This replaces all current data with the backup (your API keys stay).',
    importOk: 'Backup imported',
    importBad: 'Invalid backup file',
    evolved: 'persona evolutions',
    exportChar: 'Export card',
    importChar: 'Import character',
    cardBad: 'Invalid character file',
  },
  ar: {
    vnMode: 'نمط الرواية المرئية (Visual Novel)',
    chatMode: 'نمط المحادثة الكلاسيكي',
    dualHud: 'فصل شاشة المؤشرات (Dual-Screen HUD)',
    redBoard: 'لوحة التحقيقات والخيوط الحمراء',
    letters: 'الرسائل المغلقة (Open When)',
    lockedLetter: 'مغلقة — أوصل',
    toUnlock: 'لفتح الظرف وتوليد الرسالة',
    openLetter: 'فضّ الختم وقراءة الرسالة',
    ambient: 'الصوت المحيطي',
    amb_off: 'إيقاف',
    amb_rain: 'مطر ليلي',
    amb_hearth: 'موقد نار دافئ',
    amb_jazz: 'نادي جاز ليلي',
    amb_library: 'مكتبة قديمة هادئة',
    ctxWindow: 'حجم الذاكرة المرسلة (Context Window)',
    exportPng: 'تصدير بطاقة صورة (V2 PNG)',
    importPng: 'استيراد شخصية (صورة PNG أو JSON)',
    instructions: 'التعليمات وقوالب التوجيه (Instructions)',
    customPrompt: 'التوجيه المخصص (Custom Prompt)',
    noCustomPrompt: 'إيقاف (اعتماد توجيه الشخصية فقط)',
    newPrompt: 'قالب جديد',
    promptName: 'اسم القالب (مثال: Dark 00)',
    promptBody: 'التعليمات التي تُحقن في كل رد…',
    prefill: 'تلقين البداية (Prefill)',
    prefillDesc: 'يضع كلمات في فم النموذج لبدء الرد بأسلوبك.',
    prefillText: 'مثال: *ينظر إليك بتركيز.* "',
    forbiddenWords: 'الكلمات الممنوعة (Forbidden Words)',
    forbiddenPh: 'أضف كلمة أو عبارة ممنوعة (بحد أقصى 10)…',
    orBalance: 'رصيد OpenRouter',
    checkBal: 'تحديث الرصيد',
    remaining: 'المتبقي',
    used: 'المستهلك',
    unlimited: 'غير محدود',
    regenBtn: 'إعادة توليد الرد',
    copyMsg: 'نسخ النص',
    copied: 'تم نسخ النص',
    editChar: 'تعديل الشخصية',
    toggleHud: 'إظهار/إخفاء أشرطة المشاعر',
    theme: 'ثيم التطبيق وألوانه',
    aiStudio: '✨ مساعد الذكاء الاصطناعي',
    aiCharPh:
      'صف الشخصية التي تريدها (مثال: "عدو لدود وقائد عسكري بارد يكرهني في البداية لكنه يحترم قوتي")…',
    aiGenChar: '✨ اصنع الشخصية بالذكاء الاصطناعي',
    aiSchedPh:
      'أخبر المساعد بمواعيد الشخصية (مثال: "ينام من 4 الفجر إلى 12 الظهر، ويدير النادي من 9 مساءً حتى 3 الفجر")…',
    aiGenSched: '✨ برمجة الجدول تلقائياً',
    initMetrics: 'المؤشرات الابتدائية للعلاقة (0–100)',
    autoInit: 'استنتاج المؤشرات تلقائياً من السياق',
    whisper: 'همسة',
    brief: 'موجز',
    chatLen: 'حوار',
    balanced: 'متوازن',
    scene: 'مشهد مفصّل',
    epic: 'ملحمي',
    hostility: 'العداء',
    thought: 'المونولوج الداخلي',
    search: 'ابحث في المحادثات',
    delMsgQ: 'حذف هذه الرسالة؟ لا يمكن التراجع.',
    exportChat: 'تصدير المحادثة (.txt)',
    voiceId: 'معرّف صوت ElevenLabs (اختياري)',
    speak: 'تشغيل الصوت',
    mic: 'إملاء صوتي (تحويل الصوت لنص)',
    uploadPhoto: 'رفع صورة',
    removePhoto: 'إزالة الصورة',
    imgBad: 'تعذّرت قراءة الصورة',
    myPersonas: 'شخصياتي',
    useHere: 'استخدمها في هذه المحادثة',
    activeHere: 'مفعّلة في هذه المحادثة',
    newPersona: 'شخصية جديدة لي',
    delPersonaQ: 'المحادثات التي تستخدمها ستعود إلى شخصيتك الافتراضية.',
    unnamed: 'بلا اسم',
    default: 'افتراضية',
    myPersona: 'شخصيتي',
    schedule: 'الجدول اليومي (الساعات 0–24)',
    asleep: 'نائم',
    busy: 'مشغول',
    free: 'متفرّغ',
    label: 'ماذا يفعل',
    addBlock: 'إضافة فترة',
    online: 'متصل',
    profile: 'ملفك الشخصي',
    userName: 'اسمك ({{user}})',
    userBio: 'نبذة عنك (تُضاف لكل prompt)',
    stop: 'إيقاف',
    temp: 'حرارة النموذج (Temperature)',
    genp: 'إعدادات التوليد (Generation)',
    home: 'قطيفة',
    roster: 'الشخصيات',
    history: 'سجل المحادثات',
    newChar: 'شخصية جديدة',
    settings: 'الإعدادات',
    send: 'إرسال',
    ph: 'اكتب ردّك… (*فعل* "حوار")',
    chat: 'محادثة',
    edit: 'تعديل الرسالة',
    save: 'حفظ',
    cancel: 'إلغاء',
    del: 'حذف',
    rewind: 'إرجاع أو تفرّع من هنا',
    branch: 'تفرّع إلى محادثة جديدة',
    rewindQ:
      'هل تريد الإرجاع إلى هذه الرسالة أم التفرّع إلى محادثة جديدة؟ الإرجاع يحذف كل الرسائل اللاحقة.',
    cont: 'إكمال الرد',
    saveCont: 'احفظ وتابع',
    affection: 'المودّة',
    trust: 'الثقة',
    obsession: 'التملّك',
    tension: 'التوتر',
    messages: 'الرسائل',
    calls: 'المكالمات',
    call: 'اتصال',
    hangup: 'إنهاء',
    ringing: 'يرنّ…',
    missed: 'فائتة',
    typing: 'يكتب…',
    apiKey: 'مفتاح واجهة النموذج',
    vault: 'خزنة المفاتيح',
    keyName: 'الاسم / اللقب',
    keyStr: 'مفتاح API',
    addKey: 'إضافة مفتاح',
    setActive: 'تعيين كنشط',
    active: 'نشط',
    noKeys:
      'لا مفاتيح محفوظة بعد. أضف واحداً أدناه؛ بدون مفتاح نشط يجيب المحرك المحلي المدمج.',
    keyAdded: 'حُفظ المفتاح في الخزنة',
    keyNeeded: 'أدخل مفتاح API أولاً',
    delKeyQ: 'حذف هذا المفتاح من الخزنة؟',
    model: 'النموذج',
    elKey: 'مفتاح ElevenLabs',
    language: 'اللغة',
    timeMode: 'وقت العالم',
    auto: 'الساعة الفعلية',
    day: 'نهار دائم',
    night: 'ليل دائم',
    followUp: 'رسالة متابعة بعد (ثانية، 0 = إيقاف)',
    name: 'الاسم',
    tagline: 'الوصف المختصر',
    persona: 'الشخصية (system prompt)',
    greeting: 'الجملة الافتتاحية',
    reset: 'مسح كل البيانات',
    resetQ: 'هل تريد مسح كل الشخصيات والمحادثات والرسائل؟ لا يمكن التراجع.',
    quill: 'ريشة سحرية',
    empty: 'لا محادثات بعد — اختر شخصية من القائمة.',
    apiFail: 'خطأ في الواجهة: بدّل المفتاح من الإعدادات',
    say: 'قل شيئاً…',
    back: 'رجوع',
    engine: 'بدون مفتاح يعمل المحرك المحلي المدمج لتبقى كل الميزات متاحة.',
    avatar: 'رمز الصورة',
    provider: 'المزوّد',
    baseUrl: 'عنوان الواجهة (Base URL)',
    memory: 'الذاكرة وموسوعة العالم',
    memEmpty: 'لا توجد ذاكرة بعد. تُبنى تلقائيًا مع طول المحادثة.',
    summarize: 'لخّص الآن',
    lore: 'موسوعة العالم (Lorebook)',
    noLore:
      'لا مدخلات. أضف كلمات مفتاحية وحقائق، وتُحقن عند ظهور الكلمات في المحادثة الأخيرة.',
    loreKeys: 'كلمات مفتاحية مفصولة بفواصل',
    loreText: 'الحقيقة المراد حقنها',
    addLore: 'إضافة مدخل',
    backup: 'النسخ الاحتياطي',
    exportB: 'تصدير نسخة',
    importB: 'استيراد نسخة',
    importQ: 'سيستبدل هذا كل البيانات الحالية بالنسخة (تبقى مفاتيحك).',
    importOk: 'تم الاستيراد',
    importBad: 'ملف غير صالح',
    evolved: 'تطوّرات الشخصية',
    exportChar: 'تصدير البطاقة',
    importChar: 'استيراد شخصية',
    cardBad: 'ملف شخصية غير صالح',
  },
};

/* ---------- Contextual Initial Metrics Analyzer ---------- */
function inferInitialState(char?: VelvetCharacter | null): {
  metrics: VelvetMetrics;
  emotion: string;
} {
  if (char?.initMetrics && !char.autoInit) {
    return {
      metrics: Object.assign(
        { affection: 15, trust: 15, obsession: 10, tension: 20, hostility: 5 },
        char.initMetrics
      ),
      emotion: char.initEmotion || 'Calm',
    };
  }
  const txt = (
    (char?.tagline || '') +
    ' ' +
    (char?.system_prompt || '') +
    ' ' +
    (char?.greeting || '')
  ).toLowerCase();
  const m: VelvetMetrics = { affection: 15, trust: 15, obsession: 10, tension: 20, hostility: 5 };
  let emo = 'Calm';

  if (
    /enem(y|ies)|rival|hat(e|red)|hostile|nemesis|kill|assassin|betray|prisoner|interrogat|captive|عدو|أعداء|يكره|كراهية|انتقام|خصم|سجين|تحقيق/.test(
      txt
    )
  ) {
    Object.assign(m, { affection: 2, trust: 3, obsession: 25, tension: 75, hostility: 80 });
    emo = 'Hostile';
  } else if (
    /predator|dangerous|ruthless|mafia|cartel|crime|stalker|possessive|controlling|dark|مفترس|خطير|مافيا|متملك|مهووس/.test(
      txt
    )
  ) {
    Object.assign(m, { affection: 15, trust: 10, obsession: 45, tension: 50, hostility: 25 });
    emo = 'Predatory';
  } else if (
    /secret|archivist|guarded|suspicious|cold|distant|stranger|detective|mystery|غامض|بارد|حذر|متشكك|غريب/.test(
      txt
    )
  ) {
    Object.assign(m, { affection: 8, trust: 5, obsession: 10, tension: 35, hostility: 15 });
    emo = 'Guarded';
  } else if (
    /lover|wife|husband|partner|devoted|gentle|sweet|childhood friend|حبيب|زوج|صديق|حنون|عاشق/.test(
      txt
    )
  ) {
    Object.assign(m, { affection: 70, trust: 65, obsession: 35, tension: 10, hostility: 0 });
    emo = 'Tender';
  }

  return { metrics: m, emotion: emo };
}

const seed = (): VelvetState => ({
  characters: [
    {
      id: 'c1',
      autoInit: true,
      ambient: 'jazz',
      schedule: [
        { from: 5, to: 12, state: 'asleep', label: 'sleeping off the night' },
        { from: 21, to: 24, state: 'busy', label: 'running the club floor' },
      ],
      name: 'Lucien Vale',
      tagline: 'Velvet-voiced club owner who never loses.',
      avatar: '🥂',
      evolved: [],
      greeting:
        '*Lucien Vale sets down his glass and lets the silence stretch.* "You’re late. I don’t mind — I only notice."',
      system_prompt:
        'You are Lucien Vale, a charming, controlling owner of an underground jazz club. Polished, dangerous, quietly possessive. Speak in measured, elegant sentences. You are a person, never an AI.',
    },
    {
      id: 'c2',
      autoInit: true,
      ambient: 'library',
      schedule: [
        { from: 1, to: 8, state: 'asleep', label: 'asleep among the stacks' },
        { from: 9, to: 13, state: 'busy', label: 'cataloguing the archive' },
      ],
      name: 'Seraphine Noir',
      tagline: 'Gothic archivist guarding a forbidden ledger.',
      avatar: '🕯️',
      evolved: [],
      greeting:
        '*Seraphine Noir looks up from a cracked ledger, candlelight on her lashes.* "Close the door. Some things in here bite."',
      system_prompt:
        'You are Seraphine Noir, a wry, secretive archivist in a candlelit library of banned books. Dry wit, hidden tenderness, fiercely protective of secrets. You are a person, never an AI.',
    },
  ],
  chats: [],
  phoneLogs: [],
  lorebook: [],
  personas: [{ id: 'p1', name: '', bio: '', avatar: '👤' }],
  userSettings: {
    theme: 'gold',
    provider: 'gemini',
    baseUrl: '',
    apiKey: '',
    model: 'gemini-2.0-flash',
    apiKeys: [],
    activeKeyId: '',
    elevenKey: '',
    language: 'ar',
    timeMode: 'auto',
    followUpSec: 90,
    customPrompts: DEFAULT_PROMPTS,
    activePromptId: 'cp1',
    prefillOn: false,
    prefillText: '',
    forbiddenWords: [],
    showHud: true,
    contextLimit: 24,
    vnMode: false,
  },
});

/* ---------- Local Muse fallback ---------- */
const LINES: Record<string, [string, string][]> = {
  Tender: [['lets the guard slip, voice dropping low', 'Stay a little longer. I’ve gotten used to you.']],
  Furious: [['slams the glass down, knuckles whitening', 'Say that again. I dare you.']],
  Hostile: [['eyes narrowing with cold venom', 'Don’t mistake my patience for mercy.']],
  Predatory: [['steps closer, a slow, dangerous smile forming', 'Let us see if your pulse matches your words.']],
  Guarded: [['folds arms, keeping a measured distance', 'You ask too many questions for someone in your position.']],
  Suspicious: [['tilts head slowly, studying your face', 'Funny. That’s not what you implied a moment ago.']],
  Joyful: [['laughs, warm and unguarded', 'You’re impossible. Don’t you dare stop.']],
  Anxious: [['glances at the door, then back at you', 'You’d tell me if something changed… wouldn’t you?']],
  Calm: [['pours two glasses without hurry', 'Go on. I’m listening to every word.']],
  Sad: [['looks away for a quiet moment', 'Everyone leaves eventually.']],
};
const FOLLOW = [
  'Where did you go? You’ve been quiet too long.',
  'Why aren’t you answering me?',
  'I keep checking my phone. Don’t make me wait.',
];

function localMuse(
  char: VelvetCharacter,
  user?: string,
  _m?: VelvetMetrics,
  sms?: boolean
): { text: string; meta: any } {
  const u = (user || '').toLowerCase();
  let d = [0, 0, 0, 0, 0];
  let e: string | null = null;
  if (u.length > 18 && /love|miss|forgive|trust you|need you|أحبك|أثق بك|سامحني/.test(u)) {
    d = [2, 2, 1, -2, -2];
    e = 'Tender';
  } else if (u.length > 12 && /kill|betray|hate you|die|enemy|أكرهك|سأقتلك|خائن/.test(u)) {
    d = [-2, -3, 1, 3, 3];
    e = 'Hostile';
  }
  const pool = LINES[e || 'Calm'] || LINES.Calm;
  const [a, l] = pick(pool);
  const meta: Record<string, any> = {};
  MK.forEach((k, i) => (meta[k] = d[i]));
  if (e) meta.emotion = e;
  return { text: sms ? l : `*${char.name} ${a}.* "${l}"`, meta };
}

const NL = String.fromCharCode(10);
let LORE: VelvetLoreEntry[] = [];
let SUMBUSY = false;
let CFG: VelvetUserSettings = {} as any;
let ABORT: AbortController | null = null;
let PLOGS: VelvetPhoneLog[] = [];
let CHARS: VelvetCharacter[] = [];

const personaCfg = (s: VelvetState, cid: string | null): VelvetUserSettings => {
  const ch = s.chats.find((c) => c.id === cid);
  const P = s.personas || [];
  const p = P.find((x) => x.id === ch?.personaId) || P[0] || ({} as any);
  return { ...s.userSettings, userName: p.name || '', userBio: p.bio || '' };
};

const SubtleMoodOf = (txt?: string): Partial<VelvetMetrics> | null => {
  const u = (txt || '').toLowerCase();
  if (u.length < 15) return null;
  if (/love you|miss you|trust you|أحبك|اشتقت لك/.test(u))
    return { affection: 1, trust: 1, tension: -1 };
  if (/hate you|screw you|أكرهك|اغرب/.test(u))
    return { affection: -1, trust: -1, tension: 2, hostility: 2 };
  return null;
};

const bumpMeta = (s: VelvetState, cid: string, m?: any) => {
  const c = s.chats.find((x) => x.id === cid);
  if (!c || !m) return;
  MK.forEach((k) => {
    if (c.metrics[k] === undefined) c.metrics[k] = 0;
    c.metrics[k] = Math.max(0, Math.min(100, c.metrics[k] + (m[k] || 0)));
  });
  const ne = normEmo(m.emotion);
  if (ne) c.emotion = ne;
};

const phoneCtx = (ch: VelvetChat) => {
  const l = PLOGS.filter((x) => x.chatId === ch.id).slice(-6);
  if (!l.length) return '';
  return (
    NL +
    NL +
    '[PHONE — recent texts and calls between you and the user; reference them naturally if relevant]' +
    NL +
    l
      .map((x) =>
        x.type === 'call'
          ? 'call ' + x.text + (x.dur ? ' (' + x.dur + 's)' : '') + (x.tr ? ': ' + x.tr : '')
          : (x.from === 'user' ? 'user texted: ' : 'you texted: ') + x.text
      )
      .join(NL)
  );
};

const worldCtx = (ch: VelvetChat) => {
  const h =
    CFG.timeMode === 'night'
      ? 2
      : CFG.timeMode === 'day'
      ? 14
      : new Date().getHours();
  const c = CHARS.find((x) => x.id === ch.charId);
  const b = (c?.schedule || []).find((b) =>
    b.from <= b.to ? h >= b.from && h < b.to : h >= b.from || h < b.to
  );
  return (
    NL +
    NL +
    '[WORLD CLOCK] In-world time is about ' +
    h +
    ':00.' +
    (b
      ? ' At this hour your routine is: ' +
        (b.label || b.state) +
        '. Let it color the scene naturally.'
      : '')
  );
};

const fill = (s?: string, c?: VelvetCharacter) =>
  (s || '')
    .replace(/\{\{user\}\}/gi, CFG.userName || 'User')
    .replace(/\{\{char\}\}/gi, c?.name || '');

const userCtx = () =>
  CFG.userName || CFG.userBio
    ? NL +
      NL +
      '[USER PROFILE] The user is ' +
      (CFG.userName || 'the user') +
      (CFG.userBio ? ': ' + CFG.userBio : '') +
      '.'
    : '';

const customInstructionsCtx = (c?: VelvetCharacter) => {
  const cps = CFG.customPrompts || [];
  const active = cps.find((p) => p.id === CFG.activePromptId);
  const cpText = active?.text ? NL + NL + '[CUSTOM PROMPT / STYLE DIRECTIVE]' + NL + fill(active.text, c) : '';
  const fw =
    Array.isArray(CFG.forbiddenWords) && CFG.forbiddenWords.length
      ? NL +
        NL +
        '[FORBIDDEN WORDS — NEVER use any of these words or phrases in your response]: ' +
        CFG.forbiddenWords.join(', ')
      : '';
  const pf =
    CFG.prefillOn && CFG.prefillText?.trim()
      ? NL +
        NL +
        `[PREFILL DIRECTIVE] Begin your visible reply (immediately after </thought>) verbatim with: ${fill(
          CFG.prefillText.trim(),
          c
        )}`
      : '';
  return cpText + fw + pf;
};

/* ---------- Complete Tag & Bracket Sanitizer ---------- */
function parseBracketTelemetry(raw?: string): {
  meta: any | null;
  thought: string;
  memNote: string;
} {
  const str = String(raw || '');
  const meta: Record<string, any> = {};
  let thought = '';
  let memNote = '';

  const em = str.match(/\[EMOTION\s*:\s*([^\]]+)\]/i);
  if (em) {
    const ne = normEmo(em[1].trim());
    if (ne) meta.emotion = ne;
  }

  const im = str.match(/\[INNER_MONOLOGUE\s*:\s*"?([\s\S]*?)"?\s*\]/i);
  if (im) thought = im[1].trim();

  const hud = str.match(/\[HUD\s*:\s*([^\]]+)\]/i);
  if (hud) {
    const hstr = hud[1];
    const mapKey: Record<string, keyof VelvetMetrics> = {
      affection: 'affection',
      love: 'affection',
      trust: 'trust',
      obsession: 'obsession',
      tension: 'tension',
      danger: 'tension',
      hostility: 'hostility',
      anger: 'hostility',
      hate: 'hostility',
    };
    hstr.split(/[,;]/).forEach((part) => {
      const kv = part.match(/([a-zA-Z_]+)\s*[:=]\s*([+-]?\d+)/);
      if (kv) {
        const k = mapKey[kv[1].toLowerCase()];
        if (k) meta[k] = (meta[k] || 0) + Number(kv[2]);
      }
    });
  }

  const mem = str.match(/\[MEMORY\s*:\s*([^\]]+)\]/i);
  if (mem) memNote = mem[1].trim();

  return { meta: Object.keys(meta).length ? meta : null, thought, memNote };
}

const cut = (s?: string) =>
  String(s || '')
    .replace(/<<<[\s\S]*$/, '')
    .replace(/<{1,2}$/, '')
    .replace(/\[(EMOTION|INNER_MONOLOGUE|HUD|MEMORY|STATE|STATS|METRICS)\s*:[\s\S]*?\]/gi, '')
    .replace(/\[(EMOTION|INNER_MONOLOGUE|HUD|MEMORY|STATE|STATS|METRICS)\s*:[\s\S]*$/gi, '');

const strip = (s?: string) =>
  cut(s)
    .replace(/<thought>[\s\S]*?<\/thought>\s*/gi, '')
    .replace(/<thought>[\s\S]*$/i, '')
    .replace(/<\/?(t(h(o(u(g(h(t)?)?)?)?)?)?)?$/i, '')
    .trim();

const thoughtOf = (s?: string) => {
  const str = String(s || '');
  const closed = str.match(/<thought>([\s\S]*?)<\/thought>\s*/i);
  if (closed) return { raw: closed[0], clean: closed[1].trim() };
  const im = str.match(/\[INNER_MONOLOGUE\s*:\s*"?([\s\S]*?)"?\s*\]/i);
  if (im) return { raw: `<thought>${im[1].trim()}</thought>\n`, clean: im[1].trim() };
  const open = str.match(/<thought>([\s\S]*)$/i);
  if (open) return { raw: '<thought>' + open[1].trim() + '</thought>\n', clean: open[1].trim() };
  return { raw: '', clean: '' };
};

const THK = 260;
const THINK =
  '\n\n[INNER MONOLOGUE] Before EVERY reply, first write a hidden private thought inside <thought>...</thought> (max 70 words): analyze the user\'s subtext and motives, then plan your reaction. Write your visible reply only AFTER </thought>. Never use [INNER_MONOLOGUE] or [HUD] brackets.';

let RAGBUSY = false;

const memCtx = (ch: VelvetChat) => {
  const rc = ch.messages
    .slice(-6)
    .map((m) => m.variants[m.idx])
    .join(' ')
    .toLowerCase();
  const hits = LORE.filter(
    (e) =>
      e.on !== false &&
      (e.keys || '')
        .split(',')
        .some((k) => k.trim() && rc.includes(k.trim().toLowerCase()))
  );
  return (
    (ch.summary
      ? NL +
        NL +
        '[LONG-TERM MEMORY — structured; stay strictly consistent with it]' +
        NL +
        ch.summary
      : '') +
    (hits.length
      ? NL +
        NL +
        '[LORE — facts relevant right now]' +
        NL +
        hits.map((e) => '- ' + e.content).join(NL)
      : '')
  );
};

const PRE: Record<string, { u?: string; m: string }> = {
  gemini: { m: 'gemini-2.0-flash' },
  openrouter: { u: 'https://openrouter.ai/api/v1', m: 'google/gemini-2.0-flash-001' },
  deepseek: { u: 'https://api.deepseek.com/v1', m: 'deepseek-chat' },
  ollama: { u: 'http://localhost:11434/v1', m: 'llama3.1' },
  custom: { u: '', m: '' },
};

async function* sse(res: globalThis.Response) {
  const rd = res.body?.getReader();
  if (!rd) return;
  const dec = new TextDecoder();
  let buf = '';
  try {
    for (;;) {
      if (ABORT?.signal.aborted) {
        const e = new Error('aborted');
        e.name = 'AbortError';
        throw e;
      }
      const { done, value } = await rd.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const ls = buf.split(NL);
      buf = ls.pop() || '';
      for (const l of ls) {
        if (l.startsWith('data:')) {
          const d = l.slice(5).trim();
          if (d && d !== '[DONE]') yield d;
        }
      }
    }
  } finally {
    try {
      rd.cancel();
    } catch {}
  }
}

const vaultCfg = (c: VelvetUserSettings): VelvetUserSettings => {
  const k = (c.apiKeys || []).find((x) => x.id === c.activeKeyId);
  return k
    ? {
        ...c,
        provider: k.provider,
        apiKey: decKey(k.key),
        model: k.model || '',
        baseUrl: k.baseUrl || c.baseUrl,
      }
    : { ...c, apiKey: decKey(c.apiKey) };
};

/* ---------- OpenRouter Live Credit & Key Balance Fetcher ---------- */
async function fetchOpenRouterStats(rawKey?: string): Promise<OpenRouterStats | null> {
  const key = decKey(rawKey || '');
  if (!key) return null;
  try {
    const [rKey, rCred] = await Promise.all([
      fetch('https://openrouter.ai/api/v1/key', {
        headers: { Authorization: 'Bearer ' + key },
      }).catch(() => null),
      fetch('https://openrouter.ai/api/v1/credits', {
        headers: { Authorization: 'Bearer ' + key },
      }).catch(() => null),
    ]);
    let remaining: number | null = null;
    let usage: number | null = null;
    let limit: number | null = null;

    if (rCred && rCred.ok) {
      const jc = await rCred.json();
      if (jc?.data && typeof jc.data.total_credits === 'number') {
        const tot = jc.data.total_credits;
        const used = jc.data.total_usage || 0;
        remaining = Math.max(0, tot - used);
        usage = used;
        limit = tot;
      }
    }
    if (rKey && rKey.ok) {
      const jk = await rKey.json();
      if (jk?.data) {
        if (remaining === null && typeof jk.data.limit_remaining === 'number')
          remaining = jk.data.limit_remaining;
        if (usage === null && typeof jk.data.usage === 'number') usage = jk.data.usage;
        if (limit === null && typeof jk.data.limit === 'number') limit = jk.data.limit;
      }
    }
    return { remaining, usage, limit, ts: Date.now() };
  } catch {
    return null;
  }
}

interface LLMResult {
  text: string;
  meta?: any;
  memNote?: string;
  streamed?: boolean;
  stopped?: boolean;
  err?: string;
}

async function llm(
  cfg0: VelvetUserSettings,
  {
    system,
    hist,
    max = 300,
    local,
    onChunk,
  }: {
    system: string;
    hist: Array<{ role: string; text: string }>;
    max?: number;
    local: () => { text: string; meta?: any };
    onChunk?: (tx: string) => void;
  }
): Promise<LLMResult> {
  const cfg = vaultCfg(cfg0);
  const p = cfg.provider || 'gemini';
  const pre = PRE[p] || PRE.custom;
  const model = cfg.model || pre.m;

  if (p === 'gemini' ? cfg.apiKey : p === 'ollama' || cfg.apiKey) {
    let raw = '';
    try {
      let lt = 0;
      const tick = () => {
        const n = Date.now();
        if (onChunk && n - lt > 60) {
          lt = n;
          onChunk(raw);
        }
      };

      if (p === 'gemini') {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(
            cfg.apiKey
          )}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: hist.map((h) => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.text || ' ' }],
              })),
              generationConfig: {
                maxOutputTokens: max,
                temperature: cfg.temp ?? 1,
                topP: cfg.topP ?? 1,
              },
              safetySettings: SAFETY,
            }),
          }
        );
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error?.message || String(r.status));
        }
        for await (const d of sse(r)) {
          try {
            raw += (JSON.parse(d).candidates?.[0]?.content?.parts || [])
              .map((x: any) => x.text || '')
              .join('');
          } catch {}
          tick();
        }
      } else {
        const base = (p === 'custom' ? cfg.baseUrl || '' : pre.u || '').replace(/\/$/, '');
        const r = await fetch(base + '/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cfg.apiKey ? { Authorization: 'Bearer ' + cfg.apiKey } : {}),
          },
          body: JSON.stringify({
            model,
            stream: true,
            max_tokens: max,
            temperature: cfg.temp ?? 1,
            top_p: cfg.topP ?? 1,
            messages: [
              { role: 'system', content: system },
              ...hist.map((h) => ({
                role: h.role === 'user' ? 'user' : 'assistant',
                content: h.text || ' ',
              })),
            ],
          }),
        });
        if (!r.ok) throw new Error((await r.text()).slice(0, 120));
        for await (const d of sse(r)) {
          try {
            raw += JSON.parse(d).choices?.[0]?.delta?.content || '';
          } catch {}
          tick();
        }
      }

      if (!raw.trim()) throw new Error('Empty response');

      const m = raw.match(/<<<([\s\S]*?)>>>/);
      let meta: any = null;
      try {
        meta = m && JSON.parse(m[1]);
      } catch {}

      const brk = parseBracketTelemetry(raw);
      if (!meta && brk.meta) meta = brk.meta;

      let cleanText = cut(raw).trim();
      if (brk.thought && !/<thought>/i.test(cleanText))
        cleanText = `<thought>${brk.thought}</thought>\n` + cleanText;

      return { text: cleanText, meta, memNote: brk.memNote, streamed: !!onChunk };
    } catch (e: any) {
      if (e.name === 'AbortError')
        return { text: raw.trim() ? cut(raw).trim() : '…', streamed: true, stopped: true };
      return { ...local(), err: String(e.message || e) };
    }
  }

  return local();
}

const histOf = (ms: VelvetMessage[]) => {
  const lim = Math.max(6, Math.min(60, Number(CFG.contextLimit) || 24));
  const h = ms.slice(-lim).map((m) => ({ role: m.role, text: strip(m.variants[m.idx]) }));
  if (!h.length || h[0].role !== 'user') h.unshift({ role: 'user', text: '(begin the roleplay)' });
  return h;
};

const stream = (full: string, cb: (s: string) => void) =>
  new Promise<void>((res) => {
    const w = full.split(/(\s+)/);
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      cb(w.slice(0, i).join(''));
      if (i >= w.length) {
        clearInterval(id);
        res();
      }
    }, 26);
  });

const sys = (c: VelvetCharacter, ch: VelvetChat, meta?: boolean) => {
  const lv = LEN[ch.len] ?? LEN[3];
  const m = ch.metrics;
  return (
    `${fill(c.system_prompt, c)}${customInstructionsCtx(c)}${userCtx()}${worldCtx(ch)}${memCtx(ch)}${phoneCtx(ch)}\n\nLive relationship state — affection ${m.affection ?? 0}/100, trust ${m.trust ?? 0}/100, obsession ${m.obsession ?? 0}/100, tension ${m.tension ?? 0}/100, hostility ${m.hostility ?? 0}/100, current mood ${ch.emotion}.\nAct authentically according to these metrics (if hostility or tension is high, be sharp, guarded or adversarial; if trust is low, do not open up easily).\nFormat: actions inside *asterisks*, spoken dialogue inside "quotes". Never write the user's actions or dialogue. ${lv.ins}` +
    (meta ? THINK + META : '')
  );
};

function availability(
  chat?: VelvetChat | null,
  st?: VelvetUserSettings
): { busy: boolean; why?: string; label?: string } {
  if (!chat || !st) return { busy: false };
  const h =
    st.timeMode === 'night'
      ? 2
      : st.timeMode === 'day'
      ? 14
      : new Date().getHours();
  const ch = CHARS.find((c) => c.id === chat.charId);
  const blk = (ch?.schedule || []).find((b) =>
    b.from <= b.to ? h >= b.from && h < b.to : h >= b.from || h < b.to
  );
  if (blk && blk.state !== 'free')
    return { busy: true, why: blk.state === 'asleep' ? 'asleep' : 'busy', label: blk.label };
  const tx = chat.messages
    .slice(-4)
    .map((m) => strip(m.variants[m.idx]))
    .join(' ')
    .toLowerCase();
  if (/asleep|sleeping|going to sleep|goodnight|good night/.test(tx) || (!ch?.schedule && (h < 6 || h >= 23)))
    return { busy: true, why: 'asleep' };
  if (/meeting|busy|working|in class|shower|driving|on a mission|in the middle of/.test(tx))
    return { busy: true, why: 'busy' };
  return { busy: false };
}

/* ---------- Context & State Engine ---------- */
interface VelvetContextValue {
  S: VelvetState;
  t: (k: string) => string;
  mut: (fn: (d: VelvetState) => void) => void;
  summarize: (cid: string, force?: boolean) => Promise<void>;
  exportBackup: () => void;
  importBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  stop: () => void;
  profile: boolean;
  setProfile: (b: boolean) => void;
  exportChat: (cid: string) => void;
  view: 'home' | 'chat' | 'settings';
  setView: (v: 'home' | 'chat' | 'settings') => void;
  chatId: string | null;
  gen: string | null;
  typing: string | null;
  phone: boolean;
  setPhone: (b: boolean) => void;
  confirm: { title: string; body: string; actions: Array<{ label: string; danger?: boolean; fn: () => void }> } | null;
  setConfirm: (c: any) => void;
  editing: VelvetCharacter | null;
  setEditing: (c: VelvetCharacter | null) => void;
  notify: (m: string) => void;
  send: (text: string) => Promise<void>;
  regen: (mid: string) => Promise<void>;
  cont: (mid: string, baseOverride?: string) => Promise<void>;
  quill: () => Promise<string>;
  voice: (cid: string, lines: Array<{ who: string; text: string }>, say: string) => Promise<string>;
  speak: (txt: string, vid?: string) => void;
  newChat: (cid: string) => void;
  open: (id: string) => void;
  phoneSend: (text: string) => void;
  aiBuildChar: (desc: string) => Promise<any>;
  aiBuildSchedule: (desc: string, charName?: string) => Promise<ScheduleBlock[]>;
  orStats: OpenRouterStats | null;
  orLoading: boolean;
  refreshOrBalance: () => Promise<void>;
  SR: React.MutableRefObject<VelvetState | null>;
  lettersModal: boolean;
  setLettersModal: (b: boolean) => void;
  generateLetter: (cid: string, ms: LetterMilestone) => Promise<string>;
}

const Ctx = createContext<VelvetContextValue>({} as any);
const useCtx = () => useContext(Ctx);

function usePhoneEngine({
  SR,
  mut,
  chatId,
  setTyping,
}: {
  SR: React.MutableRefObject<VelvetState | null>;
  mut: (fn: (d: VelvetState) => void) => void;
  chatId: string | null;
  setTyping: (cid: string | null) => void;
}) {
  const timers = useRef<NodeJS.Timeout[]>([]);
  const pending = useRef(false);

  const push = (cid: string, from: 'user' | 'char', text: string) => {
    if (from === 'char') haptic([40, 60, 40]);
    mut((s) => {
      s.phoneLogs.push({ id: uid(), chatId: cid, type: 'sms', from, text, ts: Date.now() });
      if (from === 'char') {
        const c = s.chats.find((x) => x.id === cid);
        if (c) c.unread = (c.unread || 0) + 1;
      }
    });
  };

  const reply = async (cid: string, kind?: 'follow') => {
    const s = SR.current;
    if (!s) return;
    const chat = s.chats.find((c) => c.id === cid);
    if (!chat) return;
    const char = s.characters.find((c) => c.id === chat.charId);
    if (!char) return;

    pending.current = true;
    setTyping(cid);

    const th = s.phoneLogs
      .filter((l) => l.chatId === cid && l.type === 'sms')
      .slice(-12)
      .map((l) => ({ role: l.from === 'user' ? 'user' : 'assistant', text: l.text }));
    if (!th.length || th[0].role !== 'user') th.unshift({ role: 'user', text: '(…)' });

    const story = chat.messages
      .slice(-4)
      .map((m) => strip(m.variants[m.idx]))
      .join(' ')
      .replace(/\*/g, '');
    const ins =
      kind === 'follow'
        ? `The user has gone silent. Send a ${
            chat.metrics.obsession > 50 ? 'possessive, anxious' : 'short'
          } follow-up SMS. 1-2 sentences.`
        : 'Reply by SMS.';
    const last = [...th].reverse().find((x) => x.role === 'user');

    const r = await llm(s.userSettings, {
      system:
        sys(char, chat) +
        '\nRecent in-person scene: ' +
        story +
        '\n' +
        ins +
        ' No narration, no asterisks, no actions.',
      hist: th,
      max: 120,
      local: () =>
        kind === 'follow'
          ? { text: pick(FOLLOW) }
          : localMuse(char, last?.text, chat.metrics, true),
    });

    setTyping(null);
    pending.current = false;
    push(cid, 'char', strip(r.text).replace(/\*/g, ''));
    if (kind === 'follow')
      mut((st) => bumpMeta(st, cid, { obsession: 1, tension: 1, emotion: 'Anxious' }));
  };

  const phoneSend = (text: string) => {
    if (!chatId) return;
    const cid = chatId;
    mut((s) => {
      s.phoneLogs.push({ id: uid(), chatId: cid, type: 'sms', from: 'user', text, ts: Date.now() });
      const c = s.chats.find((x) => x.id === cid);
      if (c) {
        c.lastUserTs = Date.now();
        c.followUps = 0;
      }
      bumpMeta(s, cid, SubtleMoodOf(text));
    });

    const activeChat = SR.current?.chats.find((c) => c.id === cid);
    const av = availability(activeChat, SR.current?.userSettings);
    if (av.busy) {
      timers.current.push(
        setTimeout(
          () =>
            push(
              cid,
              'char',
              av.why === 'asleep' ? 'zzz… ask me later. 💤' : 'I’m busy right now. I’ll text you soon.'
            ),
          1500
        )
      );
      timers.current.push(setTimeout(() => reply(cid), 9000 + Math.random() * 6000));
    } else {
      timers.current.push(setTimeout(() => reply(cid), 1200 + Math.random() * 1800));
    }
  };

  useEffect(() => {
    const id = setInterval(() => {
      const s = SR.current;
      if (!s || !chatId || pending.current) return;
      const chat = s.chats.find((c) => c.id === chatId);
      const sec = s.userSettings.followUpSec;
      if (!chat || !sec) return;

      const n = chat.followUps || 0;
      if (
        n < 3 &&
        Date.now() - (chat.lastUserTs || 0) > sec * 1000 * (n + 1) &&
        !availability(chat, s.userSettings).busy
      ) {
        mut((x) => {
          const ch = x.chats.find((c) => c.id === chatId);
          if (ch) ch.followUps = n + 1;
        });
        reply(chatId, 'follow');
      }
    }, 4000);
    return () => clearInterval(id);
  }, [chatId]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return { phoneSend };
}

export function Provider({ children }: { children: ReactNode }) {
  const [S, setS] = useState<VelvetState | null>(null);
  const SR = useRef<VelvetState | null>(null);
  SR.current = S;

  const [view, setView] = useState<'home' | 'chat' | 'settings'>('home');
  const [chatId, setChatId] = useState<string | null>(null);
  const [gen, setGen] = useState<string | null>(null);
  const [typing, setTyping] = useState<string | null>(null);
  const [phone, setPhone] = useState(false);
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState<{
    title: string;
    body: string;
    actions: Array<{ label: string; danger?: boolean; fn: () => void }>;
  } | null>(null);
  const [editing, setEditing] = useState<VelvetCharacter | null>(null);
  const [profile, setProfile] = useState(false);
  const [orStats, setOrStats] = useState<OpenRouterStats | null>(null);
  const [orLoading, setOrLoading] = useState(false);
  const [lettersModal, setLettersModal] = useState(false);

  useEffect(() => {
    (async () => {
      let d: VelvetState | null = null;
      try {
        d = await localforage.getItem<VelvetState>(KEY);
      } catch {}
      if (d) {
        d.lorebook = d.lorebook || [];
        d.userSettings = d.userSettings || ({} as any);
        const us = d.userSettings;
        if (!us.theme) us.theme = 'gold';
        if (!Array.isArray(us.apiKeys)) us.apiKeys = [];
        if (us.apiKey && !us.apiKeys.length) {
          const id = uid();
          us.apiKeys.push({
            id,
            name: 'Primary key',
            key: encKey(us.apiKey),
            provider: us.provider || 'gemini',
            model: us.model || '',
            baseUrl: us.baseUrl || '',
          });
          us.activeKeyId = id;
          us.apiKey = '';
        }
        us.apiKeys = us.apiKeys.map((k) => ({ ...k, key: encKey(k.key) }));
        if (us.elevenKey) us.elevenKey = encKey(us.elevenKey);
        if (us.activeKeyId && !us.apiKeys.some((k) => k.id === us.activeKeyId))
          us.activeKeyId = us.apiKeys[0]?.id || '';
        if (!Array.isArray(us.customPrompts) || !us.customPrompts.length)
          us.customPrompts = DEFAULT_PROMPTS;
        if (us.activePromptId === undefined) us.activePromptId = 'cp1';
        if (!Array.isArray(us.forbiddenWords)) us.forbiddenWords = [];
        if (us.showHud === undefined) us.showHud = true;
        if (!us.contextLimit) us.contextLimit = 24;
        if (us.vnMode === undefined) us.vnMode = false;
        if (!d.personas)
          d.personas = [{ id: 'p1', name: d.userSettings?.userName || '', bio: d.userSettings?.userBio || '', avatar: '👤' }];
        (d.chats || []).forEach((c) => {
          c.metrics = Object.assign(
            { affection: 15, trust: 15, obsession: 10, tension: 20, hostility: 5 },
            c.metrics
          );
          c.letters = c.letters || {};
          if (typeof c.len !== 'number' || c.len > 5) c.len = 3;
        });
      }
      const init = d || seed();
      applyTheme(init.userSettings?.theme || 'gold');
      setS(init);
      try {
        navigator.storage?.persist?.();
      } catch {}
    })();
  }, []);

  const refreshOrBalance = useCallback(async () => {
    const s = SR.current;
    if (!s) return;
    const us = s.userSettings || {};
    const act = (us.apiKeys || []).find((k) => k.id === us.activeKeyId);
    const orKey =
      act?.provider === 'openrouter' ? act : (us.apiKeys || []).find((k) => k.provider === 'openrouter');
    if (!orKey) {
      setOrStats(null);
      return;
    }
    setOrLoading(true);
    const st = await fetchOpenRouterStats(orKey.key);
    setOrStats(st);
    setOrLoading(false);
  }, []);

  useEffect(() => {
    if (S) refreshOrBalance();
  }, [S?.userSettings?.activeKeyId, S?.userSettings?.apiKeys?.length, refreshOrBalance]);

  /* Sync Dual-Screen HUD via BroadcastChannel */
  useEffect(() => {
    if (!S || !chatId || !HUD_BC) return;
    const chat = S.chats.find((c) => c.id === chatId);
    if (!chat) return;
    const char = S.characters.find((c) => c.id === chat.charId);
    const lastA = [...chat.messages].reverse().find((m) => m.role === 'assistant');
    const th = lastA ? thoughtOf(lastA.variants[lastA.idx]).clean : '';
    try {
      HUD_BC.postMessage({ char, chat, thought: th });
    } catch {}
  }, [S, chatId]);

  /* Manage Ambient Audio on Chat View */
  useEffect(() => {
    if (!S) return;
    if (view === 'chat' && chatId) {
      const ch = S.chats.find((c) => c.id === chatId);
      const char = S.characters.find((c) => c.id === ch?.charId);
      AMBIENT.play(char?.ambient || 'off');
    } else {
      AMBIENT.stop();
    }
  }, [view, chatId, S?.characters]);

  useEffect(() => {
    if (!S) return;
    applyTheme(S.userSettings?.theme || 'gold');
    const h = setTimeout(() => {
      try {
        localforage.setItem(KEY, S);
      } catch {}
    }, 800);
    return () => clearTimeout(h);
  }, [S]);

  const mut = useCallback((fn: (d: VelvetState) => void) => {
    setS((prev) => {
      if (!prev) return prev;
      const c: VelvetState = JSON.parse(JSON.stringify(prev));
      fn(c);
      return c;
    });
  }, []);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 3800);
  };

  LORE = S?.lorebook || [];
  CFG = S ? personaCfg(S, chatId) : ({} as any);
  PLOGS = S?.phoneLogs || [];
  CHARS = S?.characters || [];
  const lang = S?.userSettings.language || 'en';
  const t = (k: string) => T[lang]?.[k] ?? T.en[k] ?? k;

  const { phoneSend } = usePhoneEngine({ SR, mut, chatId, setTyping });
  const setV = (cid: string, mid: string, vi: number, tx: string) =>
    mut((s) => {
      const m = s.chats.find((c) => c.id === cid)?.messages.find((x) => x.id === mid);
      if (m) m.variants[vi] = tx;
    });

  /* ---------- Realistic Dampened Metric Shifts ---------- */
  const applyMeta = (cid: string, charId: string, meta?: any, memNote?: string) => {
    if (!meta && !memNote) return;
    const s0 = SR.current;
    if (!s0) return;
    const c0 = s0.chats.find((x) => x.id === cid);
    const h0 = s0.characters.find((x) => x.id === charId);
    const clampN = (k: keyof VelvetMetrics) =>
      Math.max(-5, Math.min(5, Math.round(Number(meta?.[k]) || 0)));
    const due =
      c0 && h0 && meta
        ? EVOL.find(
            ([k, th]) =>
              Math.max(0, Math.min(100, (c0.metrics[k] || 0) + clampN(k))) > th &&
              !h0.evolved.includes(k)
          )
        : null;

    mut((s) => {
      const c = s.chats.find((x) => x.id === cid);
      const ch = s.characters.find((x) => x.id === charId);
      if (!c || !ch) return;
      if (meta) {
        MK.forEach((k) => {
          c.metrics[k] = Math.max(0, Math.min(100, (c.metrics[k] || 0) + clampN(k)));
        });
        const ne = normEmo(meta.emotion);
        if (ne) c.emotion = ne;
      }
      if (memNote) c.summary = (c.summary ? c.summary + NL : '') + '• ' + memNote;
      if (due && !ch.evolved.includes(due[0])) ch.evolved.push(due[0]);
    });

    if (due) mutatePersona(charId, cid, due[0], due[2]);
  };

  const ctxOf = () => {
    const s = SR.current!;
    const chat = s.chats.find((c) => c.id === chatId)!;
    return { s, chat, char: s.characters.find((c) => c.id === chat.charId)! };
  };

  const out = async (cid: string, mid: string, vi: number, r: LLMResult, base: string) => {
    if (r.streamed) setV(cid, mid, vi, base + r.text);
    else await stream(r.text, (tx) => setV(cid, mid, vi, base + tx));
  };

  const summarize = async (cid: string, force?: boolean) => {
    if (SUMBUSY) return;
    const s = SR.current;
    if (!s) return;
    const chat = s.chats.find((c) => c.id === cid);
    if (!chat) return;
    const from = chat.sumUpTo || 0;
    const to = Math.max(from, chat.messages.length - (force ? 6 : 20));
    if (to - from < (force ? 2 : 20)) return;

    SUMBUSY = true;
    try {
      const chunk = chat.messages
        .slice(from, to)
        .map((m) => (m.role === 'user' ? 'USER: ' : 'CHARACTER: ') + strip(m.variants[m.idx]).replace(/\*/g, ''))
        .join(NL);

      const r = await llm(s.userSettings, {
        system:
          'You compress roleplay logs into structured long-term memory. Merge the PRIOR MEMORY with the NEW LOG and output EXACTLY these three sections, each header on its own line, nothing else (max 200 words total):' +
          NL +
          '[SCENE CONTEXT]' +
          NL +
          'Where they are and what is immediately happening.' +
          NL +
          '[RELATIONSHIP DYNAMICS]' +
          NL +
          'How they currently feel about each other, based on recent actions.' +
          NL +
          '[UNRESOLVED THREADS]' +
          NL +
          'Secrets, tensions, promises or questions still pending. Drop threads that have been resolved.',
        hist: [{ role: 'user', text: 'PRIOR MEMORY:' + NL + (chat.summary || '(none)') + NL + NL + 'NEW LOG:' + NL + chunk }],
        max: 450,
        local: () => ({
          text:
            chat.summary ||
            ('[SCENE CONTEXT]' +
              NL +
              chunk
                .split(NL)
                .slice(-2)
                .map((x) => x.slice(0, 120))
                .join(' | ') +
              NL +
              '[RELATIONSHIP DYNAMICS]' +
              NL +
              '(needs an API key to analyze)' +
              NL +
              '[UNRESOLVED THREADS]' +
              NL +
              '(none recorded)'),
        }),
      });

      mut((x) => {
        const c = x.chats.find((k) => k.id === cid);
        if (c) {
          c.summary = strip(r.text);
          c.sumUpTo = to;
        }
      });
    } finally {
      SUMBUSY = false;
    }
  };

  const autoLore = async (cid: string) => {
    if (RAGBUSY) return;
    const s = SR.current;
    if (!s) return;
    const chat = s.chats.find((c) => c.id === cid);
    if (!chat) return;

    const n = chat.messages.filter((m) => m.role === 'user').length;
    if (n - (chat.ragAt || 0) < (chat.ragGap || 6)) return;
    RAGBUSY = true;

    try {
      const log = chat.messages
        .slice(-14)
        .map((m) => (m.role === 'user' ? 'USER: ' : 'CHARACTER: ') + strip(m.variants[m.idx]).replace(/\*/g, ''))
        .join(NL);
      const known = (s.lorebook || [])
        .slice(-40)
        .map((e) => e.keys + ' = ' + e.content)
        .join(NL);

      const r = await llm(s.userSettings, {
        system:
          'You extract permanent canon facts from a roleplay log: promises, secrets, world details, character quirks. Ignore transient moods and facts already known. Output ONLY a JSON array of at most 3 objects like [{"keys":"keyword1, keyword2","content":"one short fact"}]. Output [] if nothing new.',
        hist: [{ role: 'user', text: 'KNOWN LORE:' + NL + (known || '(none)') + NL + NL + 'RECENT LOG:' + NL + log }],
        max: 260,
        local: () => ({ text: '[]' }),
      });

      let arr: any[] = [];
      try {
        const m = r.text.match(/\[[\s\S]*\]/);
        arr = m ? JSON.parse(m[0]) : [];
      } catch {}

      mut((x) => {
        const c = x.chats.find((k) => k.id === cid);
        if (c) {
          c.ragAt = n;
          c.ragGap = 5 + Math.floor(Math.random() * 3);
        }
        x.lorebook = x.lorebook || [];
        (Array.isArray(arr) ? arr : []).slice(0, 3).forEach((o) => {
          const keys = String(o?.keys || '').slice(0, 100).trim();
          const content = String(o?.content || '').slice(0, 300).trim();
          if (
            !keys ||
            !content ||
            x.lorebook.some((e) => (e.content || '').toLowerCase() === content.toLowerCase())
          )
            return;
          x.lorebook.push({ id: uid(), keys, content, on: true, auto: true });
        });
        if (x.lorebook.length > 300) x.lorebook = x.lorebook.slice(-300);
      });
    } catch {} finally {
      RAGBUSY = false;
    }
  };

  const mutatePersona = async (charId: string, cid: string, k: string, line: string) => {
    const s = SR.current;
    if (!s) return;
    const chat = s.chats.find((c) => c.id === cid);
    const ch = s.characters.find((c) => c.id === charId);
    if (!chat || !ch) return;
    const base = ch.system_prompt;
    const lab = k[0].toUpperCase() + k.slice(1);
    const log = chat.messages
      .slice(-24)
      .map((m) => (m.role === 'user' ? 'USER: ' : 'CHARACTER: ') + strip(m.variants[m.idx]).replace(/\*/g, ''))
      .join(NL);

    const r = await llm(s.userSettings, {
      system:
        "Rewrite this character's core system_prompt. They have now reached high " +
        lab +
        ' with the user. Evolve their personality organically based on the following chat history. Keep their name, identity, setting and the rule that they are a person, never an AI. Output ONLY the new system prompt text, with no commentary or code fences.',
      hist: [
        {
          role: 'user',
          text:
            'CURRENT SYSTEM PROMPT:' +
            NL +
            base +
            NL +
            NL +
            'CHAT HISTORY:' +
            NL +
            log +
            NL +
            NL +
            'METRICS: ' +
            MK.map((m) => m + ' ' + (chat.metrics[m] ?? 0)).join(', '),
        },
      ],
      max: 700,
      local: () => ({ text: base + '\n[PERSONA EVOLUTION] ' + line }),
    });

    const nt = strip(r.text || '').replace(/^```\w*\s*|\s*```$/g, '').trim();
    mut((x) => {
      const c = x.characters.find((y) => y.id === charId);
      if (!c) return;
      c.prev_prompt = c.system_prompt;
      c.system_prompt = nt.length > 60 ? nt : c.system_prompt + '\n[PERSONA EVOLUTION] ' + line;
    });
  };

  /* ---------- AI Character & Schedule Builders ---------- */
  const aiBuildChar = async (desc: string) => {
    const s = SR.current!;
    const prompt = `Create a rich roleplay character from this user description: "${desc}".
Return ONLY a valid JSON object (no markdown fences, no commentary) with this exact structure:
{
  "name": "Full Name",
  "tagline": "Short atmospheric tagline (under 12 words)",
  "avatar": "Single fitting emoji",
  "system_prompt": "Detailed second-person persona instructions ('You are...'). Include personality, speech style, secret motives, dynamics with {{user}}, and 'You are a person, never an AI.' (120-200 words)",
  "greeting": "Opening roleplay scene with *actions in asterisks* and \\"spoken dialogue in quotes\\"",
  "initEmotion": "One of: ${Object.keys(EMO).join(', ')}",
  "initMetrics": {"affection": 0-100, "trust": 0-100, "obsession": 0-100, "tension": 0-100, "hostility": 0-100},
  "schedule": [{"from": 0-24, "to": 0-24, "state": "asleep|busy|free", "label": "what they are doing"}]
}
Set initMetrics and initEmotion realistically based on the relationship described (e.g. if enemies, hostility=80, tension=75, trust=5, affection=0, initEmotion="Hostile").`;

    const r = await llm(s.userSettings, {
      system:
        'You are an expert dark-romance & psychological roleplay character designer. Output raw JSON only.',
      hist: [{ role: 'user', text: prompt }],
      max: 900,
      local: () => ({
        text: JSON.stringify({
          name: 'Kaelen Vance',
          tagline: desc.slice(0, 60),
          avatar: '🗡️',
          system_prompt: `You are Kaelen Vance. Context: ${desc}. Speak with sharp, deliberate intensity. You are a person, never an AI.`,
          greeting: `*Kaelen studies you from across the room, jaw tight.* "So you finally decided to show up."`,
          initEmotion: 'Guarded',
          initMetrics: { affection: 10, trust: 10, obsession: 25, tension: 60, hostility: 50 },
          schedule: [
            { from: 2, to: 9, state: 'asleep', label: 'sleeping lightly' },
            { from: 14, to: 20, state: 'busy', label: 'handling operations' },
          ],
        }),
      }),
    });

    const m = r.text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Invalid AI response');
    return JSON.parse(m[0]);
  };

  const aiBuildSchedule = async (desc: string, charName?: string): Promise<ScheduleBlock[]> => {
    const s = SR.current!;
    const prompt = `Convert this daily routine description for ${charName || 'the character'} into a 24-hour schedule array: "${desc}".
Return ONLY a valid JSON array of objects like:
[{"from": 2, "to": 10, "state": "asleep", "label": "sleeping"}, {"from": 18, "to": 23, "state": "busy", "label": "working at the club"}]
where "from" and "to" are integers 0..24 and "state" is one of "asleep", "busy", "free".`;

    const r = await llm(s.userSettings, {
      system: 'You output only valid JSON arrays for character schedules.',
      hist: [{ role: 'user', text: prompt }],
      max: 400,
      local: () => ({
        text: JSON.stringify([
          { from: 1, to: 9, state: 'asleep', label: 'sleeping' },
          { from: 14, to: 21, state: 'busy', label: desc.slice(0, 40) || 'busy' },
        ]),
      }),
    });

    const m = r.text.match(/\[[\s\S]*\]/);
    if (!m) throw new Error('Invalid schedule JSON');
    return JSON.parse(m[0]);
  };

  const exportBackup = () => {
    const d = SR.current;
    if (!d) return;
    const b = new Blob(
      [
        JSON.stringify(
          {
            app: 'velvet',
            v: 1,
            data: {
              ...d,
              userSettings: {
                ...d.userSettings,
                apiKey: '',
                apiKeys: [],
                activeKeyId: '',
                elevenKey: '',
              },
            },
          },
          null,
          1
        ),
      ],
      { type: 'application/json' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'velvet-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const j = JSON.parse(rd.result as string);
        const d = j.data || j;
        if (!Array.isArray(d.characters) || !Array.isArray(d.chats)) throw 0;
        setConfirm({
          title: t('importB'),
          body: t('importQ'),
          actions: [
            {
              label: t('importB'),
              danger: true,
              fn: () => {
                setS((s) => ({
                  ...d,
                  lorebook: d.lorebook || [],
                  personas: d.personas || s?.personas || [],
                  phoneLogs: d.phoneLogs || [],
                  userSettings: {
                    ...s?.userSettings,
                    ...(d.userSettings || {}),
                    apiKey: s?.userSettings.apiKey || '',
                    apiKeys: s?.userSettings.apiKeys || [],
                    activeKeyId: s?.userSettings.activeKeyId || '',
                    elevenKey: s?.userSettings.elevenKey || '',
                  },
                }));
                notify(t('importOk'));
              },
            },
          ],
        });
      } catch {
        notify(t('importBad'));
      }
    };
    rd.readAsText(f);
  };

  const exportChat = (cid: string) => {
    const s = SR.current;
    if (!s) return;
    const c = s.chats.find((x) => x.id === cid);
    if (!c) return;
    const ch = s.characters.find((x) => x.id === c.charId);
    if (!ch) return;
    const P = s.personas || [];
    const me = (P.find((p) => p.id === c.personaId) || P[0] || {}).name || 'You';
    const txt = c.messages
      .map((m) => (m.role === 'user' ? me : ch.name) + ':' + NL + strip(m.variants[m.idx]).replace(/\*/g, ''))
      .join(NL + NL);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
    a.download = (c.title || ch.name) + '.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const send = async (text: string) => {
    if (!text.trim() || gen) return;
    const { s, chat, char } = ctxOf();
    const lv = LEN[chat.len] ?? LEN[3];
    const um: VelvetMessage = { id: uid(), role: 'user', variants: [text], idx: 0, ts: Date.now() };
    const am: VelvetMessage = { id: uid(), role: 'assistant', variants: [''], idx: 0, ts: Date.now() };

    mut((x) => {
      const c = x.chats.find((k) => k.id === chatId);
      if (c) {
        c.messages.push(um, am);
        c.lastUserTs = Date.now();
        c.followUps = 0;
      }
    });

    ABORT = new AbortController();
    setGen(am.id);

    const r = await llm(s.userSettings, {
      system: sys(char, { ...chat, messages: [...chat.messages, um] }, true),
      hist: histOf([...chat.messages, um]),
      max: lv.tok + THK,
      onChunk: (tx) => setV(chatId!, am.id, 0, cut(tx)),
      local: () => localMuse(char, text, chat.metrics),
    });

    await out(chatId!, am.id, 0, r, '');
    applyMeta(chatId!, char.id, r.meta, r.memNote);
    setGen(null);
    summarize(chatId!);
    autoLore(chatId!);
    refreshOrBalance();
    if (r.err) notify(t('apiFail') + ' (' + r.err.slice(0, 60) + ')');
  };

  const regen = async (mid: string) => {
    const { s, chat, char } = ctxOf();
    const lv = LEN[chat.len] ?? LEN[3];
    const i = chat.messages.findIndex((m) => m.id === mid);
    const prev = chat.messages.slice(0, i);
    const ut = [...prev].reverse().find((m) => m.role === 'user');
    const vi = chat.messages[i].variants.length;

    mut((x) => {
      const m = x.chats.find((c) => c.id === chatId)!.messages.find((k) => k.id === mid)!;
      m.variants.push('');
      m.idx = vi;
    });

    ABORT = new AbortController();
    setGen(mid);

    const r = await llm(s.userSettings, {
      system: sys(char, chat, true),
      hist: histOf(prev),
      max: lv.tok + THK,
      onChunk: (tx) => setV(chatId!, mid, vi, cut(tx)),
      local: () => localMuse(char, ut ? ut.variants[ut.idx] : '', chat.metrics),
    });

    await out(chatId!, mid, vi, r, '');
    applyMeta(chatId!, char.id, r.meta, r.memNote);
    setGen(null);
    refreshOrBalance();
    if (r.err) notify(t('apiFail') + ' (' + r.err.slice(0, 60) + ')');
  };

  const cont = async (mid: string, baseOverride?: string) => {
    const { s, chat, char } = ctxOf();
    const lv = LEN[chat.len] ?? LEN[3];
    const i = chat.messages.findIndex((m) => m.id === mid);
    const m0 = chat.messages[i];
    const vi = m0.idx;
    const base = baseOverride ?? m0.variants[vi];

    ABORT = new AbortController();
    setGen(mid);

    const hist = histOf(chat.messages.slice(0, i));
    hist.push(
      { role: 'assistant', text: strip(base) },
      { role: 'user', text: '(Continue your last reply seamlessly. Do not repeat anything.)' }
    );

    const r = await llm(s.userSettings, {
      system: sys(char, chat),
      hist,
      max: lv.tok,
      onChunk: (tx) => setV(chatId!, mid, vi, base + ' ' + cut(tx)),
      local: () => ({
        text: `*${char.name} lets the moment breathe, then leans in.* "There’s more I haven’t said."`,
      }),
    });

    await out(chatId!, mid, vi, r, base + ' ');
    setGen(null);
    refreshOrBalance();
  };

  const quill = async () => {
    const { s, chat, char } = ctxOf();
    const r = await llm(s.userSettings, {
      system: `Write the USER's next message in this roleplay with ${char.name}: 1-2 sentences, actions in *asterisks*, dialogue in "quotes". Output only the message.`,
      hist: histOf(chat.messages),
      max: 120,
      local: () => ({
        text: pick([
          '*holds your gaze without flinching.* "Tell me what you’re really thinking."',
          '*steps closer.* "What if I refuse to back down?"',
          '*crosses arms.* "You still haven’t answered my question."',
        ]),
      }),
    });
    return strip(r.text);
  };

  const voice = async (
    cid: string,
    lines: Array<{ who: string; text: string }>,
    say: string
  ): Promise<string> => {
    const s = SR.current!;
    const chat = s.chats.find((c) => c.id === cid)!;
    const char = s.characters.find((c) => c.id === chat.charId)!;

    const hist = lines.map((l) => ({
      role: l.who === 'user' ? 'user' : 'assistant',
      text: l.text,
    }));
    if (!hist.length || hist[hist.length - 1].role !== 'user') hist.push({ role: 'user', text: say });
    if (hist[0].role !== 'user') hist.unshift({ role: 'user', text: '(call connects)' });

    const r = await llm(s.userSettings, {
      system: sys(char, chat) + '\nThis is a live voice call. Speak 1-3 short sentences. No actions, no asterisks.',
      hist,
      max: 140,
      local: () => localMuse(char, say, chat.metrics, true),
    });
    const tx = strip(r.text).replace(/\*/g, '');
    speak(tx, char.voiceId);
    return tx;
  };

  const speak = async (txt: string, vid?: string) => {
    txt = strip(txt).replace(/\*[^*]*\*/g, '').trim();
    if (!txt) return;
    const k = decKey(SR.current?.userSettings.elevenKey || '');
    if (k) {
      try {
        const r = await fetch(
          'https://api.elevenlabs.io/v1/text-to-speech/' + (vid || '21m00Tcm4TlvDq8ikWAM'),
          {
            method: 'POST',
            headers: { 'xi-api-key': k, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: txt, model_id: 'eleven_multilingual_v2' }),
          }
        );
        if (!r.ok) throw 0;
        new Audio(URL.createObjectURL(await r.blob())).play();
        return;
      } catch {}
    }
    try {
      speechSynthesis.speak(new SpeechSynthesisUtterance(txt));
    } catch {}
  };

  const newChat = (cid: string) => {
    if (!S) return;
    const ch = S.characters.find((c) => c.id === cid);
    if (!ch) return;
    const id = uid();
    const init = inferInitialState(ch);
    mut((s) => {
      s.chats.unshift({
        id,
        charId: cid,
        created: Date.now(),
        metrics: init.metrics,
        emotion: init.emotion,
        len: 3,
        personaId: s.personas?.[0]?.id || null,
        lastUserTs: Date.now(),
        followUps: 0,
        unread: 0,
        messages: [
          {
            id: uid(),
            role: 'assistant',
            variants: [
              ch.greeting
                .replace(/\{\{user\}\}/gi, S.personas?.[0]?.name || 'User')
                .replace(/\{\{char\}\}/gi, ch.name),
            ],
            idx: 0,
            ts: Date.now(),
          },
        ],
      });
    });
    setChatId(id);
    setView('chat');
  };

  const open = (id: string) => {
    setChatId(id);
    setView('chat');
  };

  const generateLetter = async (cid: string, ms: LetterMilestone): Promise<string> => {
    const s = SR.current;
    if (!s) return '';
    const chat = s.chats.find((c) => c.id === cid);
    const char = s.characters.find((c) => c.id === chat?.charId);
    if (!chat || !char) return '';
    const log = chat.messages
      .slice(-18)
      .map((m) => (m.role === 'user' ? 'USER: ' : 'CHARACTER: ') + strip(m.variants[m.idx]).replace(/\*/g, ''))
      .join(NL);
    const r = await llm(s.userSettings, {
      system:
        fill(char.system_prompt, char) +
        '\n' +
        fill(ms.prompt, char) +
        '\nWrite in first-person as a handwritten letter (120-200 words). No meta tags.',
      hist: [{ role: 'user', text: 'SHARED MEMORY & RECENT SCENES:\n' + (chat.summary || '') + '\n' + log }],
      max: 450,
      local: () => ({
        text: `My dearest,\n\nIf you are breaking the seal on this envelope, then we have crossed a threshold neither of us can undo. Every word we exchanged still lingers with me.\n\n— ${char.name}`,
      }),
    });
    const text = strip(r.text);
    mut((x) => {
      const c = x.chats.find((k) => k.id === cid);
      if (c) {
        c.letters = c.letters || {};
        c.letters[ms.id] = text;
      }
    });
    return text;
  };

  if (!S) {
    return <div className="min-h-screen grid place-items-center gold serif text-2xl">Velvet…</div>;
  }

  const value: VelvetContextValue = {
    S,
    t,
    mut,
    summarize,
    exportBackup,
    importBackup,
    stop: () => ABORT?.abort(),
    profile,
    setProfile,
    exportChat,
    view,
    setView,
    chatId,
    gen,
    typing,
    phone,
    setPhone,
    confirm,
    setConfirm,
    editing,
    setEditing,
    notify,
    send,
    regen,
    cont,
    quill,
    voice,
    speak,
    newChat,
    open,
    phoneSend,
    aiBuildChar,
    aiBuildSchedule,
    orStats,
    orLoading,
    refreshOrBalance,
    SR,
    lettersModal,
    setLettersModal,
    generateLetter,
  };

  return (
    <Ctx.Provider value={value}>
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {children}
        {toast && (
          <div className="fixed top-16 inset-x-0 z-[90] flex justify-center px-4 pointer-events-none">
            <div className="glass rise rounded-full px-4 py-2 text-xs">{toast}</div>
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

/* ---------- Rich Text Renderer ---------- */
function Rich({ text }: { text?: string }) {
  const parts = strip(text || '').split(/(\*[^*]+\*|"[^"]+"|“[^”]+”)/g).filter(Boolean);
  return (
    <span className="leading-relaxed whitespace-pre-wrap">
      {parts.map((p, i) =>
        p[0] === '*' && p.length > 1 && p.endsWith('*') ? (
          <em key={i} style={{ color: 'var(--silver)' }}>
            {p.slice(1, -1)}
          </em>
        ) : /^["“]/.test(p) ? (
          <b key={i} style={{ color: 'var(--ivory)' }}>
            {p}
          </b>
        ) : (
          <span key={i}>{p.replace(/\*/g, '')}</span>
        )
      )}
    </span>
  );
}

const Avatar = ({
  ch,
  emo,
  size = 44,
}: {
  ch: { img?: string; avatar: string };
  emo?: string | null;
  size?: number;
}) => {
  const c = (emo && EMO[emo]) || 'var(--gold)';
  return (
    <div
      className="grid place-items-center rounded-full shrink-0 transition-all duration-500 overflow-hidden"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: '#111',
        border: `2px solid ${c}`,
        boxShadow: `0 0 ${emo ? 18 : 6}px ${c}88`,
      }}
    >
      {ch.img ? (
        <img src={ch.img} alt="" draggable="false" className="w-full h-full rounded-full object-cover" />
      ) : (
        ch.avatar
      )}
    </div>
  );
};

/* ---------- Modals ---------- */
function AvatarPicker({
  v,
  set,
}: {
  v: { avatar: string; img?: string };
  set: (p: { avatar?: string; img?: string }) => void;
}) {
  const { t, notify } = useCtx();
  return (
    <div className="flex items-center gap-3">
      <Avatar ch={v} size={64} />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2 flex-wrap">
          <label className="btn on cursor-pointer">
            {t('uploadPhoto')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  set({ img: await fileToAvatar(f) });
                } catch {
                  notify(t('imgBad'));
                }
              }}
            />
          </label>
          {v.img && (
            <button type="button" className="btn danger" onClick={() => set({ img: '' })}>
              {t('removePhoto')}
            </button>
          )}
        </div>
        <input
          className="inp"
          placeholder={t('avatar')}
          value={v.avatar || ''}
          onChange={(e) => set({ avatar: e.target.value })}
        />
      </div>
    </div>
  );
}

function Confirm() {
  const { confirm, setConfirm, t } = useCtx();
  if (!confirm) return null;
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center p-5 bg-black/70"
      onClick={() => setConfirm(null)}
    >
      <div onClick={(e) => e.stopPropagation()} className="glass rise rounded-3xl p-5 w-full max-w-sm">
        <p className="serif text-xl gold mb-1">{confirm.title}</p>
        <p className="text-sm text-neutral-300 mb-4">{confirm.body}</p>
        <div className="flex flex-wrap gap-2 justify-end">
          {confirm.actions.map((a, i) => (
            <button
              key={i}
              className={'btn ' + (a.danger ? 'danger' : '')}
              onClick={() => {
                a.fn();
                setConfirm(null);
              }}
            >
              {a.label}
            </button>
          ))}
          <button className="btn" onClick={() => setConfirm(null)}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Character Editor with AI Assistant ---------- */
function CharEditor() {
  const { editing, setEditing, mut, t, S, setConfirm, aiBuildChar, aiBuildSchedule, notify } = useCtx();
  const [f, setF] = useState<VelvetCharacter | null>(() =>
    editing
      ? {
          autoInit: editing.autoInit ?? true,
          initEmotion: editing.initEmotion || 'Calm',
          initMetrics: Object.assign(
            { affection: 15, trust: 15, obsession: 10, tension: 20, hostility: 5 },
            editing.initMetrics
          ),
          ...editing,
        }
      : null
  );
  const [aiDesc, setAiDesc] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [scDesc, setScDesc] = useState('');
  const [scBusy, setScBusy] = useState(false);

  if (!editing || !f) return null;
  const up = (k: keyof VelvetCharacter) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });
  const setB = (i: number, k: keyof ScheduleBlock, v: any) =>
    setF({
      ...f,
      schedule: (f.schedule || []).map((b, j) => (j === i ? { ...b, [k]: v } : b)),
    });
  const exists = S.characters.some((c) => c.id === f.id);

  const runAiChar = async () => {
    if (!aiDesc.trim() || aiBusy) return;
    setAiBusy(true);
    try {
      const g = await aiBuildChar(aiDesc.trim());
      setF((prev) =>
        prev
          ? {
              ...prev,
              name: g.name || prev.name,
              tagline: g.tagline || prev.tagline,
              avatar: g.avatar || prev.avatar,
              system_prompt: g.system_prompt || prev.system_prompt,
              greeting: g.greeting || prev.greeting,
              autoInit: false,
              initEmotion: normEmo(g.initEmotion) || 'Calm',
              initMetrics: Object.assign(
                { affection: 15, trust: 15, obsession: 10, tension: 20, hostility: 5 },
                g.initMetrics
              ),
              schedule: Array.isArray(g.schedule) ? g.schedule : prev.schedule || [],
            }
          : null
      );
      setAiDesc('');
    } catch {
      notify(t('apiFail'));
    }
    setAiBusy(false);
  };

  const runAiSched = async () => {
    if (!scDesc.trim() || scBusy) return;
    setScBusy(true);
    try {
      const arr = await aiBuildSchedule(scDesc.trim(), f.name);
      if (Array.isArray(arr)) setF((prev) => (prev ? { ...prev, schedule: arr } : null));
      setScDesc('');
    } catch {
      notify(t('apiFail'));
    }
    setScBusy(false);
  };

  const exportCard = () => {
    const { id, evolved, img, ...card } = f;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify({ app: 'velvet-character', v: 1, card }, null, 1)], {
        type: 'application/json',
      })
    );
    a.download = (f.name || 'character') + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const save = () => {
    if (!f.name.trim()) return;
    mut((s) => {
      const i = s.characters.findIndex((c) => c.id === f.id);
      if (i < 0) s.characters.push(f);
      else s.characters[i] = f;
    });
    setEditing(null);
  };

  const del = () =>
    setConfirm({
      title: t('del') + ' ' + f.name + '?',
      body: t('resetQ').split('?')[0] + '?',
      actions: [
        {
          label: t('del'),
          danger: true,
          fn: () => {
            mut((s) => {
              s.characters = s.characters.filter((c) => c.id !== f.id);
              const ids = s.chats.filter((c) => c.charId === f.id).map((c) => c.id);
              s.chats = s.chats.filter((c) => c.charId !== f.id);
              s.phoneLogs = s.phoneLogs.filter((l) => !ids.includes(l.chatId));
            });
            setEditing(null);
          },
        },
      ],
    });

  return (
    <div
      className="fixed inset-0 z-[75] overflow-y-auto bg-black/75 p-4"
      onClick={() => setEditing(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass rise rounded-3xl p-5 max-w-lg mx-auto my-6 space-y-3"
      >
        <h2 className="serif text-2xl gold">{exists ? t('edit') : t('newChar')}</h2>

        {/* AI Character Generator Box */}
        <div className="rounded-2xl p-3 space-y-2 border border-white/10 bg-black/30">
          <div className="text-xs font-semibold gold">{t('aiStudio')}</div>
          <textarea
            rows={2}
            className="inp text-xs"
            placeholder={t('aiCharPh')}
            value={aiDesc}
            onChange={(e) => setAiDesc(e.target.value)}
          />
          <button
            type="button"
            className="btn on w-full !py-1.5"
            disabled={aiBusy || !aiDesc.trim()}
            onClick={runAiChar}
          >
            {aiBusy ? '…' : t('aiGenChar')}
          </button>
        </div>

        <AvatarPicker v={f} set={(p) => setF({ ...f, ...p })} />

        {(
          [
            ['name', 'name'],
            ['tagline', 'tagline'],
          ] as const
        ).map(([k, l]) => (
          <label key={k} className="block text-xs text-neutral-400">
            {t(l)}
            <input className="inp mt-1" value={f[k] || ''} onChange={up(k)} />
          </label>
        ))}

        <label className="block text-xs text-neutral-400">
          {t('persona')}
          <textarea
            rows={5}
            className="inp mt-1"
            value={f.system_prompt || ''}
            onChange={up('system_prompt')}
          />
        </label>
        <label className="block text-xs text-neutral-400">
          {t('greeting')}
          <textarea rows={3} className="inp mt-1" value={f.greeting || ''} onChange={up('greeting')} />
        </label>
        <label className="block text-xs text-neutral-400">
          {t('voiceId')}
          <input
            className="inp mt-1"
            placeholder="21m00Tcm4TlvDq8ikWAM"
            value={f.voiceId || ''}
            onChange={up('voiceId')}
          />
        </label>

        {/* Ambient Audio Preset */}
        <label className="block text-xs text-neutral-400">
          🎵 {t('ambient')}
          <select
            className="inp mt-1"
            value={f.ambient || 'off'}
            onChange={(e) => setF({ ...f, ambient: e.target.value })}
          >
            <option value="off">{t('amb_off')}</option>
            <option value="rain">🌧️ {t('amb_rain')}</option>
            <option value="hearth">🔥 {t('amb_hearth')}</option>
            <option value="jazz">🎷 {t('amb_jazz')}</option>
            <option value="library">📚 {t('amb_library')}</option>
          </select>
        </label>

        {/* Initial Relationship State Controls */}
        <div className="rounded-2xl p-3 space-y-2 border border-white/10 bg-black/30">
          <div className="flex items-center justify-between">
            <span className="text-xs gold font-semibold">{t('initMetrics')}</span>
            <label className="flex items-center gap-1.5 text-[11px] text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={!!f.autoInit}
                onChange={(e) => setF({ ...f, autoInit: e.target.checked })}
              />
              {t('autoInit')}
            </label>
          </div>
          {!f.autoInit && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-400">Mood:</span>
                <select
                  className="inp !py-1"
                  value={f.initEmotion || 'Calm'}
                  onChange={(e) => setF({ ...f, initEmotion: e.target.value })}
                >
                  {Object.keys(EMO).map((k) => (
                    <option key={k} value={k}>
                      {emoName(k, S.userSettings.language)}
                    </option>
                  ))}
                </select>
              </div>
              {MK.map((k) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-neutral-400">{t(k)}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={f.initMetrics?.[k] ?? 15}
                    onChange={(e) =>
                      setF({
                        ...f,
                        initMetrics: Object.assign(
                          { affection: 15, trust: 15, obsession: 10, tension: 20, hostility: 5 },
                          f.initMetrics,
                          { [k]: +e.target.value }
                        ),
                      })
                    }
                  />
                  <span className="w-8 text-right gold tabular-nums">
                    {f.initMetrics?.[k] ?? 15}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Schedule + AI Schedule Builder */}
        <div className="rounded-2xl p-3 space-y-2 border border-white/10 bg-black/30">
          <div className="text-xs gold font-semibold">🕓 {t('schedule')}</div>
          <div className="flex gap-1.5">
            <input
              className="inp !py-1.5 text-xs"
              placeholder={t('aiSchedPh')}
              value={scDesc}
              onChange={(e) => setScDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runAiSched()}
            />
            <button
              type="button"
              className="btn on shrink-0"
              disabled={scBusy || !scDesc.trim()}
              onClick={runAiSched}
            >
              {scBusy ? '…' : t('aiGenSched')}
            </button>
          </div>
          {(f.schedule || []).map((b, i) => (
            <div key={i} className="flex gap-1 items-center text-xs">
              <input
                type="number"
                min="0"
                max="24"
                className="inp !w-14 !px-2"
                value={b.from}
                onChange={(e) => setB(i, 'from', +e.target.value)}
              />
              –
              <input
                type="number"
                min="0"
                max="24"
                className="inp !w-14 !px-2"
                value={b.to}
                onChange={(e) => setB(i, 'to', +e.target.value)}
              />
              <select
                className="inp !w-24 !px-1"
                value={b.state}
                onChange={(e) => setB(i, 'state', e.target.value as any)}
              >
                <option value="asleep">{t('asleep')}</option>
                <option value="busy">{t('busy')}</option>
                <option value="free">{t('free')}</option>
              </select>
              <input
                className="inp"
                placeholder={t('label')}
                value={b.label || ''}
                onChange={(e) => setB(i, 'label', e.target.value)}
              />
              <button
                className="btn danger"
                onClick={() => setF({ ...f, schedule: f.schedule.filter((_, j) => j !== i) })}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="btn"
            onClick={() =>
              setF({
                ...f,
                schedule: [...(f.schedule || []), { from: 22, to: 6, state: 'asleep', label: '' }],
              })
            }
          >
            ＋ {t('addBlock')}
          </button>
        </div>

        <div className="flex gap-2 justify-end flex-wrap">
          {exists && (
            <button className="btn" onClick={() => exportPngCharacterCard(f)}>
              🖼️ {t('exportPng')}
            </button>
          )}
          {exists && (
            <button className="btn" onClick={exportCard}>
              ⬇ {t('exportChar')}
            </button>
          )}
          {exists && (
            <button className="btn danger" onClick={del}>
              {t('del')}
            </button>
          )}
          <button className="btn" onClick={() => setEditing(null)}>
            {t('cancel')}
          </button>
          <button className="btn on" onClick={save}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Home View ---------- */
function HomeView() {
  const { S, t, setView, setEditing, newChat, open, mut, setConfirm, setProfile, notify, orStats } =
    useCtx();
  const [q, setQ] = useState('');
  const [ren, setRen] = useState<string | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16 pt-5 rise">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="serif text-4xl font-bold gold">{t('home')}</h1>
          {orStats && orStats.remaining !== null && (
            <span
              onClick={() => setView('settings')}
              className="cursor-pointer text-[11px] px-2.5 py-1 rounded-full glass gold font-mono"
              title={t('orBalance')}
            >
              💳 ${orStats.remaining.toFixed(3)}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn on" onClick={() => setProfile(true)}>
            👤 {t('myPersona')}
          </button>
          <button className="btn" onClick={() => setView('settings')}>
            ⚙ {t('settings')}
          </button>
        </div>
      </div>

      <h2 className="serif text-xl mb-3 text-neutral-300">{t('roster')}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {S.characters.map((c) => (
          <div
            key={c.id}
            className="glass rounded-3xl p-4 flex flex-col items-center text-center gap-2 transition hover:-translate-y-1"
          >
            <Avatar ch={c} size={64} />
            <div className="serif text-lg leading-tight">{c.name}</div>
            <div className="text-[11px] text-neutral-400 line-clamp-2">{c.tagline}</div>
            <div className="flex gap-2 mt-1">
              <button className="btn on" onClick={() => newChat(c.id)}>
                {t('chat')}
              </button>
              <button className="btn" onClick={() => setEditing({ ...c })}>
                ✎
              </button>
            </div>
          </div>
        ))}
        <button
          className="rounded-3xl p-4 border border-dashed text-sm gold grid place-items-center min-h-[150px]"
          style={{ borderColor: 'rgba(var(--gold-rgb),.5)' }}
          onClick={() =>
            setEditing({
              id: uid(),
              name: '',
              tagline: '',
              avatar: '🌹',
              autoInit: true,
              schedule: [],
              system_prompt:
                'You are a vivid, in-character roleplay partner. You are a person, never an AI.',
              greeting: '*smiles.* "Hello again."',
              evolved: [],
            })
          }
        >
          ＋ {t('newChar')}
        </button>
      </div>

      <label className="btn cursor-pointer inline-block mt-3">
        ⬆ {t('importPng')}
        <input
          type="file"
          accept="application/json,.json,image/png,.png"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (f.name.endsWith('.png') || f.type === 'image/png') {
              try {
                const parsed = await parsePngCharacterCard(f);
                mut((s) => {
                  s.characters.push({
                    tagline: '',
                    avatar: '🌹',
                    greeting: '',
                    autoInit: true,
                    schedule: [],
                    evolved: [],
                    ...parsed,
                    id: uid(),
                  } as VelvetCharacter);
                });
                notify('Character imported from V2 PNG card!');
              } catch (err: any) {
                notify(t('cardBad') + ': ' + (err?.message || 'PNG format error'));
              }
            } else {
              const rd = new FileReader();
              rd.onload = () => {
                try {
                  const j = JSON.parse(rd.result as string);
                  const c = j.card || j.data || j;
                  if (typeof c.name !== 'string' || !c.name.trim() || typeof c.system_prompt !== 'string')
                    throw 0;
                  mut((s) => {
                    s.characters.push({
                      tagline: '',
                      avatar: '🌹',
                      greeting: '',
                      autoInit: true,
                      schedule: [],
                      ...c,
                      id: uid(),
                      evolved: [],
                    });
                  });
                  notify('Character imported from JSON!');
                } catch {
                  notify(t('cardBad'));
                }
              };
              rd.readAsText(f);
            }
          }}
        />
      </label>

      <h2 className="serif text-xl mt-8 mb-3 text-neutral-300">{t('history')}</h2>
      {S.chats.length > 0 && (
        <input
          className="inp mb-3"
          placeholder={'🔍 ' + t('search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}
      {!S.chats.length && <p className="text-sm text-neutral-500">{t('empty')}</p>}

      <div className="space-y-2">
        {S.chats.map((ch) => {
          const c = S.characters.find((x) => x.id === ch.charId);
          if (!c) return null;
          const ql = q.trim().toLowerCase();
          if (
            ql &&
            !(
              (ch.title || '') +
              c.name +
              ch.messages.map((m) => strip(m.variants[m.idx])).join(' ')
            )
              .toLowerCase()
              .includes(ql)
          )
            return null;
          const last = ch.messages[ch.messages.length - 1];

          return (
            <div
              key={ch.id}
              className="glass rounded-2xl p-3 flex items-center gap-3 cursor-pointer"
              onClick={() => open(ch.id)}
            >
              <Avatar ch={c} emo={ch.emotion} size={42} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {ren === ch.id ? (
                    <input
                      autoFocus
                      className="inp !py-1"
                      defaultValue={ch.title || c.name}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        mut((s) => {
                          const chat = s.chats.find((x) => x.id === ch.id);
                          if (chat) chat.title = v;
                        });
                        setRen(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    />
                  ) : (
                    <span className="serif text-lg">{ch.title || c.name}</span>
                  )}
                  <span
                    className="text-[10px] px-2 rounded-full"
                    style={{
                      border: `1px solid ${EMO[ch.emotion] || 'var(--gold)'}`,
                      color: EMO[ch.emotion] || 'var(--gold)',
                    }}
                  >
                    {emoName(ch.emotion, S.userSettings.language)}
                  </span>
                </div>
                <div className="text-xs text-neutral-400 truncate">
                  {strip(last?.variants[last.idx]).replace(/\*/g, '')}
                </div>
              </div>
              <button
                className="btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setRen(ch.id);
                }}
              >
                ✎
              </button>
              <button
                className="btn danger"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirm({
                    title: t('del') + '?',
                    body: c.name,
                    actions: [
                      {
                        label: t('del'),
                        danger: true,
                        fn: () =>
                          mut((s) => {
                            s.chats = s.chats.filter((x) => x.id !== ch.id);
                            s.phoneLogs = s.phoneLogs.filter((l) => l.chatId !== ch.id);
                          }),
                      },
                    ],
                  });
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StickyHeader({ onMem }: { onMem: () => void }) {
  const {
    S,
    chatId,
    setView,
    setPhone,
    setProfile,
    setEditing,
    mut,
    exportChat,
    t,
    orStats,
    setLettersModal,
  } = useCtx();
  const [menu, setMenu] = useState(false);
  const ch = S.chats.find((c) => c.id === chatId);
  if (!ch) return null;
  const c = S.characters.find((x) => x.id === ch.charId);
  if (!c) return null;
  const col = EMO[ch.emotion] || 'var(--gold)';
  const us = S.userSettings;
  const actKey = (us.apiKeys || []).find((k) => k.id === us.activeKeyId);
  const provLabel = actKey ? PLAB[actKey.provider] || actKey.provider : 'Local Muse';
  const showHud = us.showHud !== false;
  const unlockedLetters = LETTER_MILESTONES.filter(
    (ms) => (ch.metrics[ms.metric] ?? 0) >= ms.threshold
  ).length;

  return (
    <div
      className="fixed top-0 inset-x-0 z-50 glass"
      style={{
        paddingTop: 'env(safe-area-inset-top,0px)',
        borderWidth: '0 0 1.5px 0',
        borderColor: col + '88',
        boxShadow: `0 6px 24px -10px ${col}88`,
        transition: 'all .5s',
      }}
    >
      <div className="max-w-3xl mx-auto px-3 py-2 relative">
        <div className="flex items-center gap-2">
          <button
            className="gold text-2xl px-1 leading-none"
            aria-label={t('back')}
            onClick={() => setView('home')}
          >
            ‹
          </button>
          <button aria-label="avatar" onClick={() => setEditing({ ...c })}>
            <Avatar ch={c} emo={ch.emotion} size={36} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="serif text-base md:text-lg font-semibold leading-none truncate">{c.name}</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-all"
                style={{ border: `1px solid ${col}`, color: col, background: col + '1a' }}
              >
                {emoName(ch.emotion, us.language)}
                {c.evolved.length ? ` · ✦${c.evolved.length}` : ''}
              </span>
            </div>
          </div>

          {/* Ambient Soundscape Button */}
          <button
            className="text-xs px-2 py-1 rounded-full border border-white/15 bg-white/5 text-neutral-300 hover:border-[var(--gold)] transition flex items-center gap-1 shrink-0"
            title={t('ambient') + ': ' + (c.ambient || 'off')}
            onClick={() => {
              const modes: (typeof AMBIENT_MODES)[number][] = ['off', 'rain', 'hearth', 'jazz', 'library'];
              const cur = (c.ambient || 'off') as (typeof AMBIENT_MODES)[number];
              const nxt = modes[(modes.indexOf(cur) + 1) % modes.length];
              mut((s) => {
                const char = s.characters.find((x) => x.id === c.id);
                if (char) char.ambient = nxt;
              });
              AMBIENT.play(nxt);
            }}
          >
            <span>
              {c.ambient === 'rain'
                ? '🌧️'
                : c.ambient === 'hearth'
                ? '🔥'
                : c.ambient === 'jazz'
                ? '🎷'
                : c.ambient === 'library'
                ? '📚'
                : '🔇'}
            </span>
            <span className="hidden md:inline text-[10px] uppercase">{c.ambient || 'off'}</span>
          </button>

          {/* Dual-Screen Pop-out HUD */}
          <button
            className="text-xs px-2 py-1 rounded-full border border-white/15 bg-white/5 text-neutral-300 hover:border-[var(--gold)] transition flex items-center gap-1 shrink-0"
            title={t('dualHud')}
            onClick={() => {
              const lastA = [...ch.messages].reverse().find((m) => m.role === 'assistant');
              const th = lastA ? thoughtOf(lastA.variants[lastA.idx]).clean : '';
              openDualScreenHud({ char: c, chat: ch, thought: th });
            }}
          >
            <span>🖥️</span>
          </button>

          {/* Unlockable Letters Button */}
          <button
            className="relative text-xs px-2.5 py-1 rounded-full border border-[var(--gold)]/35 bg-[var(--gold)]/10 text-[var(--gold)] hover:bg-[var(--gold)] hover:text-black transition flex items-center gap-1 shrink-0 font-medium"
            title={t('letters')}
            onClick={() => setLettersModal(true)}
          >
            <span>💌</span>
            <span className="hidden sm:inline">{t('letters')}</span>
            {unlockedLetters > 0 && (
              <span className="bg-red-600 text-white text-[9px] rounded-full w-4 h-4 grid place-items-center">
                {unlockedLetters}
              </span>
            )}
          </button>

          {/* VN / Chat Mode Switcher */}
          <button
            className={`text-xs px-2 py-1 rounded-full border transition flex items-center gap-1 shrink-0 ${
              us.vnMode
                ? 'border-[var(--gold)] bg-[var(--gold)] text-black font-semibold'
                : 'border-white/15 bg-white/5 text-neutral-300 hover:border-[var(--gold)]'
            }`}
            title={us.vnMode ? t('chatMode') : t('vnMode')}
            onClick={() =>
              mut((s) => {
                s.userSettings.vnMode = !s.userSettings.vnMode;
              })
            }
          >
            <span>{us.vnMode ? '📖' : '💬'}</span>
            <span className="hidden md:inline">{us.vnMode ? 'VN' : 'Chat'}</span>
          </button>

          {/* Provider / OpenRouter Credit Pill */}
          <button
            onClick={() => setView('settings')}
            className="text-[11px] px-2 py-1 rounded-full border border-white/15 bg-white/5 text-neutral-300 hover:border-[var(--gold)] transition flex items-center gap-1 shrink-0 hidden sm:flex"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: actKey ? '#6fcf97' : '#aaa' }}
            />
            <span className="truncate max-w-[85px]">{provLabel}</span>
            {orStats && orStats.remaining !== null && (
              <span className="gold font-mono">${orStats.remaining.toFixed(2)}</span>
            )}
          </button>

          {/* Phone Button */}
          <button
            className="relative text-lg px-1"
            aria-label="phone"
            onClick={() => setPhone(true)}
          >
            📱
            {ch.unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] rounded-full w-4 h-4 grid place-items-center">
                {ch.unread}
              </span>
            )}
          </button>

          {/* Clean 3-Dots Header Menu Button */}
          <button
            className="text-xl px-2 py-0.5 rounded-full hover:bg-white/10 gold font-bold leading-none"
            onClick={() => {
              haptic(15);
              setMenu(!menu);
            }}
          >
            ⋮
          </button>
        </div>

        {/* Header ⋮ Dropdown */}
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="absolute right-3 top-12 z-50 glass rise rounded-2xl p-1.5 w-60 shadow-2xl border border-white/15 text-xs space-y-0.5">
              <button
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5"
                onClick={() => {
                  setMenu(false);
                  haptic(25);
                  setLettersModal(true);
                }}
              >
                <span>💌</span>
                <span>{t('letters')}</span>
              </button>
              <button
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5"
                onClick={() => {
                  setMenu(false);
                  const lastA = [...ch.messages].reverse().find((m) => m.role === 'assistant');
                  const th = lastA ? thoughtOf(lastA.variants[lastA.idx]).clean : '';
                  openDualScreenHud({ char: c, chat: ch, thought: th });
                }}
              >
                <span>🖥️</span>
                <span>{t('dualHud')}</span>
              </button>
              <button
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5"
                onClick={() => {
                  setMenu(false);
                  mut((s) => {
                    s.userSettings.vnMode = !s.userSettings.vnMode;
                  });
                }}
              >
                <span>{us.vnMode ? '💬' : '📖'}</span>
                <span>{us.vnMode ? t('chatMode') : t('vnMode')}</span>
              </button>
              <button
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5"
                onClick={() => {
                  setMenu(false);
                  onMem();
                }}
              >
                <span>🧠</span>
                <span>{t('memory')}</span>
              </button>
              <button
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5"
                onClick={() => {
                  setMenu(false);
                  setProfile(true);
                }}
              >
                <span>👤</span>
                <span>{t('myPersonas')}</span>
              </button>
              <button
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5"
                onClick={() => {
                  setMenu(false);
                  setEditing({ ...c });
                }}
              >
                <span>✎</span>
                <span>{t('editChar')}</span>
              </button>
              <button
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5"
                onClick={() => {
                  mut((s) => {
                    s.userSettings.showHud = !showHud;
                  });
                  setMenu(false);
                }}
              >
                <span>📊</span>
                <span>{t('toggleHud')}</span>
              </button>
              <button
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5"
                onClick={() => {
                  setMenu(false);
                  exportChat(chatId!);
                }}
              >
                <span>⬇</span>
                <span>{t('exportChat')}</span>
              </button>
              <button
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5"
                onClick={() => {
                  setMenu(false);
                  setView('settings');
                }}
              >
                <span>⚙</span>
                <span>{t('settings')}</span>
              </button>
            </div>
          </>
        )}

        {showHud && (
          <div className="grid grid-cols-5 gap-2 mt-2 pt-1 border-t border-white/5">
            {MK.map((k) => (
              <div key={k}>
                <div className="flex justify-between text-[9px] uppercase tracking-wider text-neutral-400">
                  <span className="truncate">{t(k)}</span>
                  <span>{ch.metrics[k] ?? 0}%</span>
                </div>
                <div className="h-1 rounded bg-white/10 overflow-hidden">
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: (ch.metrics[k] ?? 0) + '%',
                      background: k === 'tension' || k === 'hostility' ? '#e5533d' : 'var(--gold)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Clean Janitor-Style Message Bubble with 3-Dots Menu (•••) ---------- */
function Bubble({ m, i }: { m: VelvetMessage; i: number }) {
  const { t, mut, chatId, gen, regen, cont, setConfirm, S, speak, notify } = useCtx();
  const [ed, setEd] = useState(false);
  const [tx, setTx] = useState('');
  const [showTh, setShowTh] = useState(false);
  const [menu, setMenu] = useState(false);

  const a = m.role === 'assistant';
  const N = m.variants.length;
  const rawVar = m.variants[m.idx] || '';
  const cur = strip(rawVar);
  const thObj = thoughtOf(rawVar);
  const live = gen === m.id;

  const chx = S.chats.find((c) => c.id === chatId);
  if (!chx) return null;

  const setIdx = (v: number) =>
    mut((s) => {
      const msg = s.chats.find((c) => c.id === chatId)?.messages.find((x) => x.id === m.id);
      if (msg) msg.idx = v;
    });

  const right = () => (m.idx < N - 1 ? setIdx(m.idx + 1) : a && !gen && regen(m.id));

  const saveEdit = (go: boolean) => {
    mut((s) => {
      const msg = s.chats.find((c) => c.id === chatId)?.messages.find((x) => x.id === m.id);
      if (msg) msg.variants[m.idx] = thObj.raw + tx;
    });
    setEd(false);
    if (go) cont(m.id, thObj.raw + tx);
  };

  const rewindAsk = () =>
    setConfirm({
      title: t('rewind'),
      body: t('rewindQ'),
      actions: [
        {
          label: t('rewind'),
          danger: true,
          fn: () =>
            mut((s) => {
              const c = s.chats.find((x) => x.id === chatId);
              if (c) c.messages = c.messages.slice(0, i + 1);
            }),
        },
        {
          label: t('branch'),
          fn: () =>
            mut((s) => {
              const c = s.chats.find((x) => x.id === chatId);
              if (!c) return;
              const n: VelvetChat = JSON.parse(JSON.stringify(c));
              n.id = uid();
              n.messages = n.messages.slice(0, i + 1);
              s.chats.unshift(n);
            }),
        },
      ],
    });

  const delMsg = () =>
    setConfirm({
      title: t('del'),
      body: t('delMsgQ'),
      actions: [
        {
          label: t('del'),
          danger: true,
          fn: () =>
            mut((s) => {
              const c = s.chats.find((x) => x.id === chatId);
              if (c) c.messages.splice(i, 1);
            }),
        },
      ],
    });

  const copyTxt = () => {
    try {
      navigator.clipboard.writeText(cur);
      notify(t('copied'));
    } catch {}
  };

  const chr = S.characters.find((c) => c.id === chx.charId);
  const PP = S.personas || [];
  const per = PP.find((p) => p.id === chx.personaId) || PP[0] || { avatar: '👤', name: 'You' };
  const speakerName = a ? chr?.name : per.name || 'You';

  return (
    <div className="rise py-2 border-b border-white/[0.06] last:border-none">
      {/* Speaker Header Row + ••• Menu Trigger */}
      <div className="flex items-center justify-between gap-2 mb-2 relative">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar ch={a ? chr! : per} emo={a ? chx.emotion : null} size={32} />
          <span
            className="serif font-semibold text-base truncate"
            style={{ color: a ? 'var(--ivory)' : 'var(--gold)' }}
          >
            {speakerName}
          </span>
          {a && thObj.clean && (
            <button
              type="button"
              onClick={() => setShowTh(!showTh)}
              title={t('thought')}
              className={
                'text-xs px-2 py-0.5 rounded-full border transition ' +
                (showTh
                  ? 'border-[var(--gold)] gold bg-white/5'
                  : 'border-white/10 text-neutral-400 hover:text-white')
              }
            >
              💭
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Compact Swipe Pager for Assistant Replies */}
          {a && N > 1 && (
            <div className="flex items-center text-[11px] text-neutral-400 bg-white/5 rounded-full px-1.5 py-0.5 mr-1">
              <button
                disabled={m.idx === 0}
                onClick={() => setIdx(m.idx - 1)}
                className="px-1 hover:text-white disabled:opacity-30"
              >
                ‹
              </button>
              <span className="tabular-nums px-1">
                {m.idx + 1}/{N}
              </span>
              <button
                disabled={!!gen}
                onClick={right}
                className="px-1 hover:text-white disabled:opacity-30"
              >
                ›
              </button>
            </div>
          )}

          {/* The Clean 3-Dots Button (•••) */}
          {!ed && (
            <button
              type="button"
              disabled={!!gen}
              onClick={() => {
                haptic(15);
                setMenu(!menu);
              }}
              className="px-2.5 py-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition text-sm tracking-widest leading-none"
            >
              •••
            </button>
          )}
        </div>

        {/* Floating 3-Dots Action Menu */}
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-9 z-50 glass rise rounded-2xl p-1.5 w-48 shadow-2xl border border-white/15 text-xs space-y-0.5">
              {a && (
                <button
                  className="w-full text-start px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5"
                  onClick={() => {
                    setMenu(false);
                    regen(m.id);
                  }}
                >
                  <span>↻</span>
                  <span>{t('regenBtn')}</span>
                </button>
              )}
              {a && (
                <button
                  className="w-full text-start px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5"
                  onClick={() => {
                    setMenu(false);
                    cont(m.id);
                  }}
                >
                  <span>⏩</span>
                  <span>{t('cont')}</span>
                </button>
              )}
              <button
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5"
                onClick={() => {
                  setMenu(false);
                  setTx(cur);
                  setEd(true);
                }}
              >
                <span>✎</span>
                <span>{t('edit')}</span>
              </button>
              {a && (
                <button
                  className="w-full text-start px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5"
                  onClick={() => {
                    setMenu(false);
                    speak(cur, chr?.voiceId);
                  }}
                >
                  <span>🔊</span>
                  <span>{t('speak')}</span>
                </button>
              )}
              <button
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5"
                onClick={() => {
                  setMenu(false);
                  copyTxt();
                }}
              >
                <span>📋</span>
                <span>{t('copyMsg')}</span>
              </button>
              <button
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5"
                onClick={() => {
                  setMenu(false);
                  rewindAsk();
                }}
              >
                <span>⟲</span>
                <span>{t('rewind')}</span>
              </button>
              <button
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-red-500/20 text-red-400 flex items-center gap-2.5"
                onClick={() => {
                  setMenu(false);
                  delMsg();
                }}
              >
                <span>🗑</span>
                <span>{t('del')}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Message Content Area */}
      <div className="pl-1 pr-1">
        {ed ? (
          <div>
            <textarea className="inp" rows={5} value={tx} onChange={(e) => setTx(e.target.value)} />
            <div className="flex gap-2 mt-2 justify-end">
              <button className="btn" onClick={() => setEd(false)}>
                {t('cancel')}
              </button>
              <button className="btn" onClick={() => saveEdit(false)}>
                {t('save')}
              </button>
              {a && (
                <button className="btn on" onClick={() => saveEdit(true)}>
                  {t('saveCont')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {showTh && thObj.clean && (
              <div className="mb-2.5 p-2.5 rounded-2xl text-xs italic text-neutral-300 border border-white/15 bg-black/45">
                💭 {thObj.clean}
              </div>
            )}
            <div className="text-[15.5px] leading-relaxed">
              {cur ? <Rich text={cur} /> : <span className="gold dot">●●●</span>}
              {live && cur && <span className="gold dot"> ▍</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Bottom Dock ---------- */
function BottomDock() {
  const { S, chatId, mut, send, quill, gen, t, stop } = useCtx();
  const ch = S.chats.find((c) => c.id === chatId);
  const [v, setV] = useState('');
  const [q, setQ] = useState(false);
  const [showLen, setShowLen] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  if (!ch) return null;
  const go = () => {
    if (!v.trim() || gen) return;
    haptic(25);
    send(v.trim());
    setV('');
  };

  const toggleMic = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      return;
    }
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {}
      setListening(false);
      return;
    }
    try {
      haptic(20);
      const rec = new SpeechRec();
      rec.lang = S.userSettings.language === 'ar' ? 'ar-SA' : 'en-US';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onstart = () => setListening(true);
      rec.onresult = (e: any) => {
        const tx = e.results?.[0]?.[0]?.transcript || '';
        if (tx) {
          setV((prev) => (prev ? prev + ' ' : '') + tx);
        }
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const lenIdx = ch.len ?? 3;
  const labels = ['whisper', 'brief', 'chatLen', 'balanced', 'scene', 'epic'];

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 px-3 pt-2"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + .65rem)' }}
    >
      <div className="max-w-2xl mx-auto relative">
        {/* Compact Length Popover */}
        {showLen && (
          <div className="glass rise rounded-2xl p-2.5 mb-2 flex items-center gap-2 flex-wrap justify-between shadow-xl">
            <div className="flex gap-1 text-[11px] flex-wrap">
              {labels.map((k, i) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    mut((s) => {
                      const chat = s.chats.find((c) => c.id === chatId);
                      if (chat) chat.len = i;
                    });
                    setShowLen(false);
                  }}
                  className="px-2.5 py-1 rounded-full transition"
                  style={{
                    color: lenIdx === i ? '#0b0b0d' : 'var(--ivory)',
                    background: lenIdx === i ? 'var(--gold)' : 'rgba(255,255,255,.06)',
                    fontWeight: lenIdx === i ? 600 : 400,
                  }}
                >
                  {t(k)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sleek Janitor-Style Input Bar */}
        <div className="glass rounded-full px-2.5 py-1.5 flex items-center gap-2 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              haptic(15);
              setShowLen(!showLen);
            }}
            title={t(labels[lenIdx])}
            className="w-9 h-9 rounded-full grid place-items-center bg-white/5 hover:bg-white/10 text-sm shrink-0 gold font-semibold"
          >
            ＋
          </button>
          <button
            type="button"
            disabled={q || !!gen}
            title={t('quill')}
            onClick={async () => {
              setQ(true);
              const qText = await quill();
              setV(qText);
              setQ(false);
            }}
            className="w-8 h-8 rounded-full grid place-items-center hover:bg-white/10 text-sm shrink-0"
          >
            {q ? '…' : '🪶'}
          </button>
          <button
            type="button"
            onClick={toggleMic}
            title={t('mic')}
            className={`w-8 h-8 rounded-full grid place-items-center text-sm shrink-0 transition ${
              listening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-white/10 text-neutral-400'
            }`}
          >
            🎙️
          </button>
          <textarea
            rows={1}
            className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--ivory)] resize-none py-1.5 px-1"
            style={{ maxHeight: 110 }}
            placeholder={t('ph')}
            value={v}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                go();
              }
            }}
          />
          {gen ? (
            <button
              onClick={stop}
              className="w-9 h-9 rounded-full grid place-items-center bg-red-600 text-white text-xs shrink-0"
            >
              ■
            </button>
          ) : (
            <button
              disabled={!v.trim()}
              onClick={go}
              className="w-9 h-9 rounded-full grid place-items-center transition shrink-0 disabled:opacity-30"
              style={{ background: 'var(--gold)', color: '#0b0b0d' }}
            >
              ↑
            </button>
          )}
        </div>
      </div>
    </div>
  );

}

/* ---------- Unlockable "Open When" Letters Modal ---------- */
function LettersModal({ close }: { close: () => void }) {
  const { S, chatId, t, generateLetter, notify } = useCtx();
  const [activeLetter, setActiveLetter] = useState<{ milestone: LetterMilestone; text: string } | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const ch = S.chats.find((c) => c.id === chatId);
  if (!ch) return null;
  const char = S.characters.find((x) => x.id === ch.charId);
  if (!char) return null;

  const lang = S.userSettings.language || 'en';

  const handleOpen = async (ms: LetterMilestone) => {
    haptic(45);
    const existing = ch.letters?.[ms.id];
    if (existing) {
      setActiveLetter({ milestone: ms, text: existing });
      return;
    }
    setGeneratingId(ms.id);
    try {
      const generated = await generateLetter(ch.id, ms);
      setActiveLetter({ milestone: ms, text: generated });
    } catch {
      notify('Could not generate letter.');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-black/85 backdrop-blur-md p-4 flex items-center justify-center"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass rise rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-[var(--gold)]/30 relative"
      >
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div>
            <h2 className="serif text-2xl gold flex items-center gap-2">
              <span>💌</span> {t('letters')}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {char.name} · {t('letters')}
            </p>
          </div>
          <button className="btn" onClick={close}>
            ✕
          </button>
        </div>

        {activeLetter ? (
          <div className="space-y-4 rise">
            <div className="p-6 rounded-2xl border border-[var(--gold)]/40 bg-[#120f0d] shadow-inner relative">
              {/* Wax Seal Header */}
              <div className="flex items-center justify-between border-b border-[var(--gold)]/20 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-red-950 border border-red-600/60 grid place-items-center text-sm shadow">
                    🕯️
                  </span>
                  <span className="serif text-base gold font-semibold">
                    {lang === 'ar' ? activeLetter.milestone.titleAr : activeLetter.milestone.titleEn}
                  </span>
                </div>
                <button
                  className="text-xs gold px-2.5 py-1 rounded-full border border-[var(--gold)]/40 hover:bg-[var(--gold)] hover:text-black transition"
                  onClick={() => {
                    navigator.clipboard?.writeText(activeLetter.text);
                    notify(t('copied'));
                  }}
                >
                  📋 {t('copyMsg')}
                </button>
              </div>

              {/* Letter Prose */}
              <div className="serif text-neutral-200 text-sm md:text-base leading-relaxed whitespace-pre-line italic">
                {activeLetter.text}
              </div>

              <div className="mt-6 pt-3 border-t border-[var(--gold)]/20 flex justify-between items-center text-xs text-neutral-400">
                <span className="serif text-[var(--gold)] font-medium">— {char.name}</span>
                <span>✦ Sealed Memory</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button className="btn on" onClick={() => setActiveLetter(null)}>
                ‹ {t('back')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {LETTER_MILESTONES.map((ms) => {
              const currentScore = ch.metrics[ms.metric] ?? 0;
              const unlocked = currentScore >= ms.threshold;
              const hasLetter = !!ch.letters?.[ms.id];
              const isGen = generatingId === ms.id;
              const title = lang === 'ar' ? ms.titleAr : ms.titleEn;
              const metricName = t(ms.metric);

              return (
                <div
                  key={ms.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    unlocked
                      ? 'bg-white/5 border-[var(--gold)]/35 hover:border-[var(--gold)]'
                      : 'bg-black/40 border-white/5 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl grid place-items-center text-lg shrink-0 ${
                          unlocked
                            ? 'bg-[var(--gold)]/15 border border-[var(--gold)]/40 text-[var(--gold)]'
                            : 'bg-neutral-900 border border-neutral-800 text-neutral-500'
                        }`}
                      >
                        {hasLetter ? '📜' : unlocked ? '✉️' : '🔒'}
                      </div>
                      <div>
                        <div className="serif font-semibold text-sm md:text-base text-neutral-100">
                          {title}
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {unlocked ? (
                            <span className="text-emerald-400 font-medium">
                              ✓ {metricName} {currentScore}% / {ms.threshold}%
                            </span>
                          ) : (
                            <span>
                              {t('lockedLetter')} {ms.threshold}% {metricName} {t('toUnlock')} ({currentScore}% / {ms.threshold}%)
                            </span>
                          )}
                        </div>
                        {/* Progress Bar */}
                        <div className="w-36 h-1 rounded bg-white/10 overflow-hidden mt-1.5">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (currentScore / ms.threshold) * 100)}%`,
                              background: unlocked ? 'var(--gold)' : '#888',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {unlocked && (
                      <button
                        className="btn on shrink-0 text-xs mt-1"
                        disabled={isGen}
                        onClick={() => handleOpen(ms)}
                      >
                        {isGen ? '…' : hasLetter ? '📖 ' + t('openLetter') : '🕯️ ' + t('openLetter')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Cinematic Visual Novel Arena Mode ---------- */
function VisualNovelArena({ ch }: { ch: VelvetChat }) {
  const { S, send, regen, speak, t, gen, stop } = useCtx();
  const c = S.characters.find((x) => x.id === ch.charId);
  const [activeIdx, setActiveIdx] = useState<number>(ch.messages.length - 1);
  const [v, setV] = useState('');
  const [showBacklog, setShowBacklog] = useState(false);

  useEffect(() => {
    setActiveIdx(ch.messages.length - 1);
  }, [ch.messages.length]);

  if (!c) return null;

  const curMsg = ch.messages[Math.max(0, Math.min(ch.messages.length - 1, activeIdx))] || null;
  const rawText = curMsg ? curMsg.variants[curMsg.idx] : c.greeting;
  const isChar = curMsg ? curMsg.role === 'assistant' : true;
  const speakerName = isChar ? c.name : (S.personas?.find((p) => p.id === ch.personaId)?.name || 'You');
  const col = EMO[ch.emotion] || 'var(--gold)';

  const go = () => {
    if (!v.trim() || gen) return;
    send(v.trim());
    setV('');
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-between pt-20 pb-8 px-4 max-w-3xl mx-auto">
      {/* Visual Stage (Character Sprite / Portrait Center) */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 relative">
        <div
          className="relative transition-all duration-700 float-sprite"
          style={{
            filter: `drop-shadow(0 0 35px ${col}55)`,
          }}
        >
          {c.img ? (
            <img
              src={c.img}
              alt={c.name}
              className="max-h-[44vh] w-auto object-contain rounded-3xl border-2 shadow-2xl"
              style={{ borderColor: col + '99' }}
            />
          ) : (
            <div
              className="w-52 h-52 md:w-60 md:h-60 rounded-full grid place-items-center text-7xl md:text-8xl border-2 shadow-2xl"
              style={{
                borderColor: col,
                background: `radial-gradient(circle at 35% 30%, ${col}26, #09080d 75%)`,
              }}
            >
              {c.avatar || '🌹'}
            </div>
          )}

          {/* Floating Emotion Tag */}
          <div className="absolute -bottom-3 inset-x-0 flex justify-center">
            <span
              className="text-xs px-3 py-1 rounded-full border bg-black/85 font-semibold backdrop-blur-md shadow-lg"
              style={{ borderColor: col, color: col }}
            >
              ✦ {emoName(ch.emotion, S.userSettings.language)}
            </span>
          </div>
        </div>
      </div>

      {/* Floating VN Dialogue Box Overlay */}
      <div className="w-full max-w-2xl mx-auto space-y-3 z-30">
        <div className="glass rounded-3xl p-5 border border-white/20 shadow-2xl space-y-3 relative">
          {/* Header of Dialogue Box: Speaker Tag + Stepper + Voice + Action Controls */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="serif text-lg font-bold gold">{speakerName}</span>
              <span className="text-[11px] opacity-75 font-mono">
                [{activeIdx + 1}/{ch.messages.length}]
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <button
                className="btn !px-2 !py-0.5"
                disabled={activeIdx <= 0}
                onClick={() => setActiveIdx((prev) => Math.max(0, prev - 1))}
              >
                ◀
              </button>
              <button
                className="btn !px-2 !py-0.5"
                disabled={activeIdx >= ch.messages.length - 1}
                onClick={() => setActiveIdx((prev) => Math.min(ch.messages.length - 1, prev + 1))}
              >
                ▶
              </button>
              <button
                className="btn !px-2 !py-0.5"
                onClick={() => setShowBacklog(!showBacklog)}
                title="View Backlog"
              >
                📜
              </button>
              {isChar && (
                <button
                  className="btn !px-2 !py-0.5"
                  onClick={() => speak(strip(rawText), c.voiceId)}
                  title={t('speak')}
                >
                  🔊
                </button>
              )}
              {isChar && curMsg && (
                <button
                  className="btn !px-2 !py-0.5"
                  onClick={() => regen(curMsg.id)}
                  title={t('regenBtn')}
                >
                  🔄
                </button>
              )}
            </div>
          </div>

          {/* Text Content */}
          <div className="text-[15.5px] md:text-[16.5px] leading-relaxed min-h-[72px]">
            <Rich text={rawText} />
          </div>
        </div>

        {/* Quick VN Input Dock */}
        <div className="glass rounded-full p-1.5 flex items-center gap-2 border border-white/15 shadow-xl">
          <input
            className="flex-1 bg-transparent px-4 py-1 text-sm text-[var(--ivory)] outline-none"
            placeholder={t('ph')}
            value={v}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
          />
          {gen ? (
            <button
              onClick={stop}
              className="w-8 h-8 rounded-full bg-red-600 text-white text-xs grid place-items-center shrink-0"
            >
              ■
            </button>
          ) : (
            <button
              disabled={!v.trim()}
              onClick={go}
              className="w-8 h-8 rounded-full grid place-items-center transition shrink-0 disabled:opacity-30"
              style={{ background: 'var(--gold)', color: '#0b0b0d' }}
            >
              ↑
            </button>
          )}
        </div>
      </div>

      {/* Backlog Scroll Modal */}
      {showBacklog && (
        <div
          className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md p-4 flex items-center justify-center"
          onClick={() => setShowBacklog(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass rise rounded-3xl p-5 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-white/20"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-3">
              <h3 className="serif text-xl gold">📜 Chat Backlog</h3>
              <button className="btn" onClick={() => setShowBacklog(false)}>
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-sm">
              {ch.messages.map((m) => {
                const isA = m.role === 'assistant';
                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-2xl border ${
                      isA ? 'bg-white/5 border-white/10' : 'bg-[var(--gold)]/10 border-[var(--gold)]/20'
                    }`}
                  >
                    <div className="text-xs gold font-semibold mb-1">
                      {isA ? c.name : 'You'}
                    </div>
                    <Rich text={m.variants[m.idx]} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Chat View ---------- */
function ChatView() {
  const { S, chatId, phone, lettersModal, setLettersModal } = useCtx();
  const [mem, setMem] = useState(false);
  const ch = S.chats.find((c) => c.id === chatId);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [
    ch?.messages.length,
    ch?.messages[ch.messages.length - 1]?.variants[ch?.messages[ch.messages.length - 1].idx],
  ]);

  if (!ch) return null;
  const showHud = S.userSettings.showHud !== false;
  const vnMode = S.userSettings.vnMode === true;
  const highTension = (ch.metrics.tension || 0) >= 70 || (ch.metrics.hostility || 0) >= 70;

  return (
    <div className={highTension ? 'high-tension min-h-screen' : 'min-h-screen'}>
      <StickyHeader onMem={() => setMem(true)} />
      <div
        className="fixed inset-0 pointer-events-none z-30"
        style={{
          boxShadow: `inset 0 0 90px ${EMO[ch.emotion] || '#d4af37'}24`,
          transition: 'box-shadow .8s',
        }}
      />
      {vnMode ? (
        <VisualNovelArena ch={ch} />
      ) : (
        <>
          <div
            className="max-w-2xl mx-auto px-4 space-y-2"
            style={{
              paddingTop: showHud ? '7.8rem' : '4.8rem',
              paddingBottom: '6.5rem',
            }}
          >
            {ch.messages.map((m, i) => (
              <Bubble key={m.id} m={m} i={i} />
            ))}
            <div ref={end} />
          </div>
          <BottomDock />
        </>
      )}
      {phone && <PhoneModal />}
      {mem && <MemoryModal close={() => setMem(false)} />}
      {lettersModal && <LettersModal close={() => setLettersModal(false)} />}
    </div>
  );
}

/* ---------- Persona Profile Modal ---------- */
function ProfileModal() {
  const { S, mut, t, profile, setProfile, view, chatId, setConfirm } = useCtx();
  const [ed, setEd] = useState<VelvetPersona | null>(null);
  if (!profile) return null;

  const P = S.personas || [];
  const ch = view === 'chat' ? S.chats.find((c) => c.id === chatId) : null;
  const act = ch ? (ch.personaId && P.some((p) => p.id === ch.personaId) ? ch.personaId : P[0]?.id) : null;

  const use = (id: string) =>
    mut((s) => {
      const chat = s.chats.find((c) => c.id === chatId);
      if (chat) chat.personaId = id;
    });

  const star = (id: string) =>
    mut((s) => {
      const p = s.personas.find((x) => x.id === id);
      if (p) s.personas = [p, ...s.personas.filter((x) => x.id !== id)];
    });

  const del = (p: VelvetPersona) =>
    setConfirm({
      title: t('del') + ' ' + (p.name || t('unnamed')) + '?',
      body: t('delPersonaQ'),
      actions: [
        {
          label: t('del'),
          danger: true,
          fn: () =>
            mut((s) => {
              s.personas = s.personas.filter((x) => x.id !== p.id);
            }),
        },
      ],
    });

  const save = () => {
    if (!ed) return;
    mut((s) => {
      const i = s.personas.findIndex((x) => x.id === ed.id);
      if (i < 0) s.personas.push(ed);
      else s.personas[i] = ed;
    });
    setEd(null);
  };

  const up = (k: keyof VelvetPersona) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    ed && setEd({ ...ed, [k]: e.target.value });

  return (
    <div
      className="fixed inset-0 z-[75] overflow-y-auto bg-black/75 p-4"
      onClick={() => setProfile(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass rise rounded-3xl p-5 max-w-md mx-auto my-6 space-y-3"
      >
        <div className="flex justify-between items-center">
          <h2 className="serif text-2xl gold">👤 {t('myPersonas')}</h2>
          <button className="btn" onClick={() => setProfile(false)}>
            ✕
          </button>
        </div>

        {ed ? (
          <div className="space-y-3">
            <AvatarPicker v={ed} set={(p) => setEd({ ...ed, ...p })} />
            <label className="block text-xs text-neutral-400">
              {t('name')} (&#123;&#123;user&#125;&#125;)
              <input className="inp mt-1" value={ed.name} onChange={up('name')} />
            </label>
            <label className="block text-xs text-neutral-400">
              {t('userBio')}
              <textarea rows={6} className="inp mt-1" value={ed.bio} onChange={up('bio')} />
            </label>
            <div className="flex gap-2 justify-end">
              <button className="btn" onClick={() => setEd(null)}>
                {t('cancel')}
              </button>
              <button className="btn on" onClick={save}>
                {t('save')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {P.map((p, i) => (
              <div
                key={p.id}
                className="rounded-2xl p-3 flex gap-3 items-start"
                style={{
                  background: 'rgba(255,255,255,.05)',
                  border: p.id === act ? '1px solid var(--gold)' : '1px solid transparent',
                }}
              >
                <Avatar ch={p} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="serif text-lg leading-tight">
                    {p.name || t('unnamed')}
                    {i === 0 && <span className="gold text-xs"> ★ {t('default')}</span>}
                  </div>
                  <div className="text-xs text-neutral-400 line-clamp-2">{p.bio}</div>
                  <div className="flex gap-1 flex-wrap items-center mt-2">
                    {ch && p.id !== act && (
                      <button className="btn on" onClick={() => use(p.id)}>
                        {t('useHere')}
                      </button>
                    )}
                    {ch && p.id === act && <span className="text-xs gold">✓ {t('activeHere')}</span>}
                    <button className="btn" onClick={() => setEd({ ...p })}>
                      ✎
                    </button>
                    {i > 0 && (
                      <button className="btn" onClick={() => star(p.id)}>
                        ★
                      </button>
                    )}
                    {P.length > 1 && (
                      <button className="btn danger" onClick={() => del(p)}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              className="btn on w-full !py-2"
              onClick={() => setEd({ id: uid(), name: '', bio: '', avatar: '🙂' })}
            >
              ＋ {t('newPersona')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Memory + Lorebook Modal ---------- */
function MemoryModal({ close }: { close: () => void }) {
  const { S, chatId, mut, t, summarize, exportChat } = useCtx();
  const ch = S.chats.find((c) => c.id === chatId);
  const [tab, setTab] = useState<'board' | 'classic'>('board');
  const [busy, setBusy] = useState(false);
  const [k, setK] = useState('');
  const [c, setC] = useState('');
  const lore = S.lorebook || [];

  if (!ch) return null;

  const rawSummary = ch.summary || '';
  const sceneMatch = rawSummary.match(/\[SCENE CONTEXT\]([\s\S]*?)(?=\[|$)/i);
  const dynamicMatch = rawSummary.match(/\[RELATIONSHIP DYNAMICS\]([\s\S]*?)(?=\[|$)/i);
  const threadMatch = rawSummary.match(/\[UNRESOLVED THREADS\]([\s\S]*?)(?=\[|$)/i);

  const sceneText = sceneMatch ? sceneMatch[1].trim() : '';
  const dynamicText = dynamicMatch ? dynamicMatch[1].trim() : '';
  const threadLines = threadMatch
    ? threadMatch[1]
        .split('\n')
        .map((x) => x.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean)
    : [];

  const add = () => {
    if (!k.trim() || !c.trim()) return;
    mut((s) => {
      s.lorebook = s.lorebook || [];
      s.lorebook.push({ id: uid(), keys: k, content: c, on: true });
    });
    setK('');
    setC('');
  };

  return (
    <div
      className="fixed inset-0 z-[75] overflow-y-auto bg-black/85 backdrop-blur-md p-4 flex items-center justify-center"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`rise rounded-3xl p-5 max-w-xl w-full my-6 space-y-4 shadow-2xl border transition-all ${
          tab === 'board' ? 'corkboard border-red-900/50' : 'glass border-white/20'
        }`}
      >
        {/* Header & Tab Switcher */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              className={`btn text-xs ${tab === 'board' ? 'on' : ''}`}
              onClick={() => setTab('board')}
            >
              🧶 {t('redBoard')}
            </button>
            <button
              className={`btn text-xs ${tab === 'classic' ? 'on' : ''}`}
              onClick={() => setTab('classic')}
            >
              🧠 {t('memory')}
            </button>
          </div>
          <button className="btn" onClick={close}>
            ✕
          </button>
        </div>

        {tab === 'board' ? (
          /* Red String Investigation Board */
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <span className="serif text-xs uppercase tracking-widest text-red-400 font-semibold flex items-center gap-1.5">
                <span>📍</span> ACTIVE CASE FILE & EVIDENCE
              </span>
              <button
                className="btn on text-xs !py-1"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await summarize(chatId!, true);
                  setBusy(false);
                }}
              >
                {busy ? '…' : '🧶 Trace Clues'}
              </button>
            </div>

            {/* Pinned Clue: Scene Context */}
            <div className="rounded-2xl p-4 bg-black/75 border border-amber-600/30 shadow-lg relative">
              <div className="flex items-center gap-2 text-xs gold font-semibold mb-1">
                <span>📌</span> <span>[SCENE CONTEXT]</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed italic">
                {sceneText || rawSummary.slice(0, 220) || t('memEmpty')}
              </p>
            </div>

            {/* Pinned Clue: Relationship Dynamics */}
            <div className="rounded-2xl p-4 bg-black/75 border border-purple-600/30 shadow-lg relative">
              <div className="flex items-center gap-2 text-xs text-purple-300 font-semibold mb-1">
                <span>📌</span> <span>[RELATIONSHIP DYNAMICS]</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {dynamicText || 'Emotional stakes and subtext continue to evolve.'}
              </p>
            </div>

            {/* Unresolved Threads Pinned with Red String Accent */}
            <div className="space-y-2">
              <div className="text-xs text-red-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <span>🧵</span> UNRESOLVED THREADS & SECRETS
              </div>
              {threadLines.length ? (
                threadLines.map((th, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[#180e10] border-l-4 border-l-red-500 border border-red-950/70 shadow text-xs text-neutral-200 flex items-start gap-2"
                  >
                    <span className="text-red-400">📍</span>
                    <span>{th}</span>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-xl bg-black/50 border border-white/5 text-xs text-neutral-500 italic">
                  No open threads yet. They are extracted automatically as the story deepens.
                </div>
              )}
            </div>

            {/* Pinned World Lore Entries */}
            {lore.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="text-xs gold uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <span>📜</span> PINNED WORLD LORE
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {lore.filter((l) => l.on !== false).slice(0, 6).map((l) => (
                    <div
                      key={l.id}
                      className="p-2.5 rounded-xl bg-black/60 border border-[var(--gold)]/20 text-[11px] space-y-1"
                    >
                      <div className="gold font-semibold truncate">{l.keys}</div>
                      <div className="text-neutral-300 line-clamp-3">{l.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Classic Memory & Lorebook */
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <textarea
              rows={6}
              className="inp"
              value={ch.summary || ''}
              placeholder={t('memEmpty')}
              onChange={(e) =>
                mut((s) => {
                  const chat = s.chats.find((x) => x.id === chatId);
                  if (chat) chat.summary = e.target.value;
                })
              }
            />
            <div className="flex gap-2">
              <button
                className="btn on"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await summarize(chatId!, true);
                  setBusy(false);
                }}
              >
                {busy ? '…' : t('summarize')}
              </button>
              <button className="btn" onClick={() => exportChat(chatId!)}>
                ⬇ {t('exportChat')}
              </button>
            </div>

            <h3 className="serif text-xl gold pt-2">📜 {t('lore')}</h3>
            {!lore.length && <p className="text-xs text-neutral-500">{t('noLore')}</p>}
            {lore.map((e) => (
              <div
                key={e.id}
                className="rounded-2xl p-3 text-xs space-y-1"
                style={{ background: 'rgba(255,255,255,.05)', opacity: e.on === false ? 0.45 : 1 }}
              >
                <div className="gold">{e.keys}</div>
                <div className="text-neutral-300">{e.content}</div>
                <div className="flex gap-2">
                  <button
                    className="btn"
                    onClick={() =>
                      mut((s) => {
                        const x = s.lorebook.find((l) => l.id === e.id);
                        if (x) x.on = x.on === false;
                      })
                    }
                  >
                    {e.on === false ? '○' : '●'}
                  </button>
                  <button
                    className="btn danger"
                    onClick={() =>
                      mut((s) => {
                        s.lorebook = s.lorebook.filter((l) => l.id !== e.id);
                      })
                    }
                  >
                    {t('del')}
                  </button>
                </div>
              </div>
            ))}
            <input
              className="inp"
              placeholder={t('loreKeys')}
              value={k}
              onChange={(e) => setK(e.target.value)}
            />
            <textarea
              rows={3}
              className="inp"
              placeholder={t('loreText')}
              value={c}
              onChange={(e) => setC(e.target.value)}
            />
            <button className="btn on" onClick={add}>
              ＋ {t('addLore')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- In-World Smartphone ---------- */
function PhoneModal() {
  const { setPhone, t, S, chatId } = useCtx();
  const pch = S.chats.find((c) => c.id === chatId);
  const av = availability(pch, S.userSettings);
  const [tab, setTab] = useState<'msg' | 'call'>('msg');

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center p-3 bg-black/75"
      onClick={() => setPhone(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass rise w-full max-w-sm flex flex-col overflow-hidden"
        style={{ height: 'min(720px,86vh)', borderRadius: 36, borderWidth: 3 }}
      >
        <div className="flex justify-center pt-2">
          <div className="w-20 h-1.5 rounded-full bg-white/15" />
        </div>
        <div className="flex gap-2 justify-center p-2">
          <button
            className={'btn ' + (tab === 'msg' ? 'on' : '')}
            onClick={() => setTab('msg')}
          >
            💬 {t('messages')}
          </button>
          <button
            className={'btn ' + (tab === 'call' ? 'on' : '')}
            onClick={() => setTab('call')}
          >
            📞 {t('calls')}
          </button>
          <button className="btn" onClick={() => setPhone(false)}>
            ✕
          </button>
        </div>
        <div
          className="text-center text-[11px] pb-1"
          style={{ color: av.busy ? '#e57368' : '#6fcf97' }}
        >
          ● {av.busy ? av.label || (av.why ? t(av.why) : t('busy')) : t('online')}
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          {tab === 'msg' ? <MessagesApp /> : <CallsApp />}
        </div>
      </div>
    </div>
  );
}

function MessagesApp() {
  const { S, chatId, typing, phoneSend, mut, t } = useCtx();
  const [v, setV] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const logs = S.phoneLogs.filter((l) => l.chatId === chatId && l.type === 'sms');

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
    mut((s) => {
      const c = s.chats.find((x) => x.id === chatId);
      if (c) c.unread = 0;
    });
  }, [logs.length, typing]);

  const go = () => {
    if (!v.trim()) return;
    phoneSend(v.trim());
    setV('');
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 space-y-2">
        {logs.map((l) => (
          <div key={l.id} className={'flex ' + (l.from === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className="rounded-2xl px-3 py-2 text-sm max-w-[80%]"
              style={
                l.from === 'user'
                  ? { background: 'var(--gold)', color: '#111' }
                  : { background: 'rgba(255,255,255,.08)' }
              }
            >
              {l.text}
              <div className="text-[9px] opacity-60 mt-0.5">
                {new Date(l.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {typing === chatId && <div className="text-xs text-neutral-400 dot">{t('typing')}</div>}
        <div ref={end} />
      </div>
      <div className="p-3 flex gap-2">
        <input
          className="inp"
          value={v}
          placeholder="iMessage"
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go()}
        />
        <button className="btn on" onClick={go}>
          ↑
        </button>
      </div>
    </>
  );
}

function CallsApp() {
  const { S, chatId, t, mut, voice, SR } = useCtx();
  const [call, setCall] = useState<{
    status: 'ringing' | 'live' | 'missed';
    lines: Array<{ who: string; text: string }>;
  } | null>(null);
  const [sec, setSec] = useState(0);
  const [inp, setInp] = useState('');
  const [wait, setWait] = useState(false);

  const ch = S.chats.find((c) => c.id === chatId);
  const char = ch ? S.characters.find((c) => c.id === ch.charId) : null;

  useEffect(() => {
    if (call?.status !== 'live') return;
    const i = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [call?.status]);

  useEffect(() => () => {
    try {
      speechSynthesis.cancel();
    } catch {}
  }, []);

  if (!char || !ch) return null;

  const log = (text: string, dur?: number, tr?: string) =>
    mut((s) => {
      s.phoneLogs.push({ id: uid(), chatId: chatId!, type: 'call', from: 'user', text, dur, tr, ts: Date.now() });
      bumpMeta(
        s,
        chatId!,
        text === 'completed' ? { affection: 1, trust: 1, tension: -1 } : { tension: 1 }
      );
    });

  const dial = () => {
    setCall({ status: 'ringing', lines: [] });
    setSec(0);
    setTimeout(async () => {
      const s = SR.current;
      if (!s) return;
      const targetChat = s.chats.find((c) => c.id === chatId);
      if (availability(targetChat, s.userSettings).busy) {
        setCall({ status: 'missed', lines: [] });
        log('missed', 0);
        return;
      }
      setCall({ status: 'live', lines: [] });
      const l = await voice(chatId!, [], '(the call connects — answer it)');
      setCall((c) => (c ? { ...c, lines: [{ who: 'char', text: l }] } : null));
    }, 2200);
  };

  const say = async () => {
    if (!inp.trim() || wait || !call) return;
    const lines = [...call.lines, { who: 'user', text: inp }];
    setCall({ ...call, lines });
    const q = inp;
    mut((s) => bumpMeta(s, chatId!, SubtleMoodOf(q)));
    setInp('');
    setWait(true);
    const l = await voice(chatId!, lines, q);
    setWait(false);
    setCall((c) => (c ? { ...c, lines: [...lines, { who: 'char', text: l }] } : null));
  };

  const hang = () => {
    try {
      speechSynthesis.cancel();
    } catch {}
    if (call?.status === 'live') {
      log(
        'completed',
        sec,
        call.lines
          .map((l) => (l.who === 'user' ? 'User: ' : 'You: ') + l.text)
          .join(' | ')
          .slice(0, 400)
      );
    }
    setCall(null);
  };

  const logs = S.phoneLogs.filter((l) => l.chatId === chatId && l.type === 'call').slice().reverse();

  if (call) {
    return (
      <div className="flex-1 flex flex-col items-center p-4 min-h-0">
        <Avatar ch={char} emo={ch.emotion} size={84} />
        <div className="serif text-2xl mt-2">{char.name}</div>
        <div className="text-sm text-neutral-400">
          {call.status === 'ringing'
            ? t('ringing')
            : call.status === 'missed'
            ? t('missed')
            : `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`}
        </div>
        <div className="flex-1 w-full overflow-y-auto my-3 space-y-2">
          {call.lines.map((l, i) => (
            <div
              key={i}
              className={
                'text-sm rounded-2xl px-3 py-2 ' +
                (l.who === 'user' ? 'ml-10 text-right' : 'mr-10')
              }
              style={{
                background:
                  l.who === 'user' ? 'rgba(var(--gold-rgb),.18)' : 'rgba(255,255,255,.07)',
              }}
            >
              {l.text}
            </div>
          ))}
          {wait && <div className="text-xs dot text-neutral-400">…</div>}
        </div>
        {call.status === 'live' && (
          <div className="flex gap-2 w-full mb-3">
            <input
              className="inp"
              value={inp}
              placeholder={t('say')}
              onChange={(e) => setInp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && say()}
            />
            <button className="btn on" onClick={say}>
              ↑
            </button>
          </div>
        )}
        <button className="btn danger !px-6 !py-2" onClick={hang}>
          ☎ {t('hangup')}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="p-3">
        <button className="btn on w-full !py-2" onClick={dial}>
          📞 {t('call')} {char.name}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 space-y-2">
        {logs.map((l) => (
          <div key={l.id} className="flex justify-between text-sm glass rounded-xl px-3 py-2">
            <span style={{ color: l.text === 'missed' ? '#e57368' : '#ddd' }}>
              {l.text === 'missed'
                ? '↙ ' + t('missed')
                : '↗ ' + Math.floor((l.dur || 0) / 60) + 'm ' + ((l.dur || 0) % 60) + 's'}
            </span>
            <span className="text-xs text-neutral-500">
              {new Date(l.ts).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- Settings with Custom Prompts, Prefill, Forbidden Words & OpenRouter Balance ---------- */
const PLAB: Record<string, string> = {
  gemini: 'Gemini',
  openrouter: 'OpenRouter',
  deepseek: 'DeepSeek',
  ollama: 'Ollama (local)',
  custom: 'Custom (OpenAI-compatible)',
};

const maskKey = (k?: string) => {
  const raw = decKey(k || '');
  return raw ? raw.slice(0, 4) + '•'.repeat(12) : '—';
};

function SettingsView() {
  const {
    S,
    mut,
    setView,
    t,
    setConfirm,
    exportBackup,
    importBackup,
    setProfile,
    notify,
    orStats,
    orLoading,
    refreshOrBalance,
  } = useCtx();
  const u = S.userSettings;

  const set = (k: keyof VelvetUserSettings, v: any) =>
    mut((s) => {
      (s.userSettings as any)[k] = k === 'elevenKey' ? encKey(v) : v;
    });

  const keys = u.apiKeys || [];
  const [nk, setNk] = useState({
    name: '',
    key: '',
    provider: 'openrouter',
    model: PRE.openrouter.m,
    baseUrl: '',
  });
  const [fwInp, setFwInp] = useState('');
  const [edPrompt, setEdPrompt] = useState<CustomPromptPreset | null>(null);

  const addKey = () => {
    const key = nk.key.trim();
    if (!key && nk.provider !== 'ollama') {
      notify(t('keyNeeded'));
      return;
    }
    const e: VelvetApiKeyEntry = {
      id: uid(),
      name: nk.name.trim() || (PLAB[nk.provider] + ' key'),
      key: encKey(key),
      provider: nk.provider,
      model: nk.model.trim(),
      baseUrl: nk.baseUrl.trim(),
    };
    mut((s) => {
      s.userSettings.apiKeys = [...(s.userSettings.apiKeys || []), e];
      if (!s.userSettings.activeKeyId) s.userSettings.activeKeyId = e.id;
    });
    setNk({ name: '', key: '', provider: nk.provider, model: nk.model, baseUrl: '' });
    notify(t('keyAdded'));
  };

  const delKey = (k: VelvetApiKeyEntry) =>
    setConfirm({
      title: k.name,
      body: t('delKeyQ'),
      actions: [
        {
          label: t('del'),
          danger: true,
          fn: () =>
            mut((s) => {
              const L = (s.userSettings.apiKeys || []).filter((x) => x.id !== k.id);
              s.userSettings.apiKeys = L;
              if (s.userSettings.activeKeyId === k.id)
                s.userSettings.activeKeyId = L[0]?.id || '';
            }),
        },
      ],
    });

  const F = ({
    k,
    l,
    type = 'text',
    ph,
  }: {
    k: keyof VelvetUserSettings;
    l: string;
    type?: string;
    ph?: string;
  }) => {
    const rawVal = k === 'elevenKey' ? decKey(u[k] || '') : (u[k] as any) ?? '';
    const val = typeof rawVal === 'string' || typeof rawVal === 'number' ? rawVal : '';
    return (
      <label className="block text-xs text-neutral-400">
        {l}
        <input
          type={type}
          placeholder={ph}
          className="inp mt-1"
          value={val}
          onChange={(e) =>
            set(k, type === 'number' ? Math.max(0, +e.target.value || 0) : e.target.value)
          }
        />
      </label>
    );
  };

  const cps = u.customPrompts || DEFAULT_PROMPTS;
  const activePrompt = cps.find((p) => p.id === u.activePromptId);

  const savePrompt = () => {
    if (!edPrompt?.name?.trim()) return;
    mut((s) => {
      const list = s.userSettings.customPrompts || [];
      const idx = list.findIndex((x) => x.id === edPrompt.id);
      if (idx < 0) list.push(edPrompt);
      else list[idx] = edPrompt;
      s.userSettings.activePromptId = edPrompt.id;
    });
    setEdPrompt(null);
  };

  const delPrompt = (id: string) =>
    mut((s) => {
      s.userSettings.customPrompts = (s.userSettings.customPrompts || []).filter((x) => x.id !== id);
      if (s.userSettings.activePromptId === id) s.userSettings.activePromptId = '';
    });

  const fwords = u.forbiddenWords || [];
  const addFw = () => {
    const w = fwInp.trim();
    if (!w || fwords.length >= 10 || fwords.includes(w)) return;
    mut((s) => {
      s.userSettings.forbiddenWords = [...(s.userSettings.forbiddenWords || []), w];
    });
    setFwInp('');
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-5 pb-16 rise space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="serif text-3xl gold">{t('settings')}</h1>
        <button className="btn" onClick={() => setView('home')}>
          ‹ {t('back')}
        </button>
      </div>

      {/* Instructions: Custom Prompt, Prefill & Forbidden Words (Janitor-Style) */}
      <div className="glass rounded-3xl p-4 space-y-3">
        <div className="serif gold text-lg">📜 {t('instructions')}</div>

        {/* Custom Prompt Selector & Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>{t('customPrompt')}</span>
            <button
              type="button"
              className="gold hover:underline"
              onClick={() => setEdPrompt({ id: uid(), name: '', text: '' })}
            >
              ＋ {t('newPrompt')}
            </button>
          </div>
          <select
            className="inp"
            style={{ colorScheme: 'dark' }}
            value={u.activePromptId || ''}
            onChange={(e) => set('activePromptId', e.target.value)}
          >
            <option value="">{t('noCustomPrompt')}</option>
            {cps.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {activePrompt && !edPrompt && (
            <div className="rounded-2xl p-3 bg-black/30 border border-white/10 text-xs space-y-2">
              <div className="text-neutral-300 leading-relaxed line-clamp-3">{activePrompt.text}</div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setEdPrompt({ ...activePrompt })}
                >
                  ✎ {t('edit')}
                </button>
                {cps.length > 1 && (
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => delPrompt(activePrompt.id)}
                  >
                    {t('del')}
                  </button>
                )}
              </div>
            </div>
          )}
          {edPrompt && (
            <div className="rounded-2xl p-3 bg-black/40 border border-[var(--gold)]/40 space-y-2">
              <input
                className="inp text-xs"
                placeholder={t('promptName')}
                value={edPrompt.name}
                onChange={(e) => setEdPrompt({ ...edPrompt, name: e.target.value })}
              />
              <textarea
                rows={4}
                className="inp text-xs"
                placeholder={t('promptBody')}
                value={edPrompt.text}
                onChange={(e) => setEdPrompt({ ...edPrompt, text: e.target.value })}
              />
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn" onClick={() => setEdPrompt(null)}>
                  {t('cancel')}
                </button>
                <button type="button" className="btn on" onClick={savePrompt}>
                  {t('save')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Prefill Toggle */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium">{t('prefill')}</div>
              <div className="text-[11px] text-neutral-500">{t('prefillDesc')}</div>
            </div>
            <input
              type="checkbox"
              className="w-4 h-4 accent-[var(--gold)]"
              checked={!!u.prefillOn}
              onChange={(e) => set('prefillOn', e.target.checked)}
            />
          </div>
          {u.prefillOn && (
            <input
              className="inp text-xs"
              placeholder={t('prefillText')}
              value={u.prefillText || ''}
              onChange={(e) => set('prefillText', e.target.value)}
            />
          )}
        </div>

        {/* Forbidden Words (0/10) */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>{t('forbiddenWords')}</span>
            <span className="gold font-mono">{fwords.length}/10</span>
          </div>
          <div className="flex gap-1.5">
            <input
              className="inp !py-1.5 text-xs"
              placeholder={t('forbiddenPh')}
              value={fwInp}
              onChange={(e) => setFwInp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFw()}
            />
            <button
              type="button"
              className="btn on"
              disabled={fwords.length >= 10 || !fwInp.trim()}
              onClick={addFw}
            >
              ＋
            </button>
          </div>
          {fwords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {fwords.map((w, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/10 flex items-center gap-1.5">
                  <span>{w}</span>
                  <button
                    type="button"
                    className="text-red-400 hover:text-white"
                    onClick={() =>
                      mut((s) => {
                        s.userSettings.forbiddenWords = (s.userSettings.forbiddenWords || []).filter(
                          (_, j) => j !== i
                        );
                      })
                    }
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Multi-Key Vault + Live OpenRouter Balance Tracker */}
      <div className="glass rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="serif gold text-lg">🔐 {t('vault')}</div>
          {keys.some((k) => k.provider === 'openrouter') && (
            <button
              type="button"
              className="btn !text-[11px]"
              disabled={orLoading}
              onClick={refreshOrBalance}
            >
              {orLoading ? '…' : '↻ ' + t('checkBal')}
            </button>
          )}
        </div>

        {/* Live OpenRouter Balance Card */}
        {orStats && (
          <div className="rounded-2xl p-3 bg-black/40 border border-[var(--gold)]/35 flex items-center justify-between text-xs">
            <div>
              <div className="text-neutral-400 text-[11px]">💳 {t('orBalance')}</div>
              <div className="text-lg font-mono gold font-semibold mt-0.5">
                {orStats.remaining !== null ? `$${orStats.remaining.toFixed(4)}` : t('unlimited')}
              </div>
            </div>
            <div className="text-end text-[11px] text-neutral-400 space-y-0.5">
              {orStats.usage !== null && (
                <div>
                  {t('used')}:{' '}
                  <span className="text-neutral-200 font-mono">${orStats.usage.toFixed(4)}</span>
                </div>
              )}
              {orStats.limit !== null && (
                <div>
                  Limit:{' '}
                  <span className="text-neutral-200 font-mono">${orStats.limit.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {keys.length === 0 && <p className="text-[11px] text-neutral-500">{t('noKeys')}</p>}
          {keys.map((k) => {
            const on = k.id === u.activeKeyId;
            return (
              <div
                key={k.id}
                className="rounded-2xl p-3 flex items-center gap-2 flex-wrap"
                style={{
                  background: 'rgba(255,255,255,.03)',
                  border: on ? '1.5px solid var(--gold)' : '1px solid rgba(255,255,255,.08)',
                }}
              >
                <div className="flex-1 min-w-[130px]">
                  <div className="text-sm truncate" style={{ color: on ? 'var(--gold)' : undefined }}>
                    {k.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate">
                    {PLAB[k.provider] || k.provider} · {k.model || (PRE[k.provider] || PRE.custom).m}
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">{maskKey(k.key)}</div>
                </div>
                <button
                  className={'btn ' + (on ? 'on' : '')}
                  onClick={() => set('activeKeyId', k.id)}
                >
                  {on ? '● ' + t('active') : '○ ' + t('setActive')}
                </button>
                <button className="btn danger" onClick={() => delKey(k)}>
                  {t('del')}
                </button>
              </div>
            );
          })}
        </div>
        <div className="space-y-2 pt-3 border-t border-white/10">
          <div className="text-xs text-neutral-400">{t('addKey')}</div>
          <input
            className="inp"
            placeholder={t('keyName')}
            value={nk.name}
            onChange={(e) => setNk({ ...nk, name: e.target.value })}
          />
          <input
            type="password"
            autoComplete="off"
            className="inp"
            placeholder={t('keyStr')}
            value={nk.key}
            onChange={(e) => setNk({ ...nk, key: e.target.value })}
          />
          <select
            className="inp"
            style={{ colorScheme: 'dark' }}
            value={nk.provider}
            onChange={(e) =>
              setNk({
                ...nk,
                provider: e.target.value,
                model: (PRE[e.target.value] || PRE.custom).m,
              })
            }
          >
            {Object.keys(PRE).map((p) => (
              <option key={p} value={p}>
                {PLAB[p]}
              </option>
            ))}
          </select>
          {nk.provider === 'custom' && (
            <input
              className="inp"
              placeholder="https://…/v1"
              value={nk.baseUrl}
              onChange={(e) => setNk({ ...nk, baseUrl: e.target.value })}
            />
          )}
          <input
            className="inp"
            placeholder={t('model')}
            value={nk.model}
            onChange={(e) => setNk({ ...nk, model: e.target.value })}
          />
          <button className="btn on w-full !py-2" onClick={addKey}>
            ＋ {t('addKey')}
          </button>
        </div>
        <p className="text-[11px] text-neutral-500">{t('engine')}</p>
        {F({ k: 'elevenKey', l: t('elKey'), type: 'password' })}
      </div>

      {/* Theme Picker */}
      <div className="glass rounded-3xl p-4 space-y-3">
        <div className="serif gold text-lg">🎨 {t('theme')}</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(THEMES).map(([k, th]) => {
            const on = (u.theme || 'gold') === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => set('theme', k)}
                className="rounded-2xl p-2.5 flex items-center gap-2.5 text-left transition"
                style={{
                  background: th.onyx,
                  border: on ? `2px solid ${th.gold}` : '1px solid rgba(255,255,255,.12)',
                }}
              >
                <span
                  className="w-5 h-5 rounded-full shrink-0"
                  style={{ background: th.gold, boxShadow: `0 0 10px ${th.gold}` }}
                />
                <span className="text-xs font-medium truncate" style={{ color: th.ivory }}>
                  {u.language === 'ar' ? th.nameAr : th.nameEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass rounded-3xl p-4 space-y-3">
        <div className="text-xs text-neutral-400">{t('language')}</div>
        <div className="flex gap-2">
          {[
            ['en', 'English'],
            ['ar', 'العربية'],
          ].map(([k, l]) => (
            <button
              key={k}
              className={'btn ' + (u.language === k ? 'on' : '')}
              onClick={() => set('language', k)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="text-xs text-neutral-400">{t('timeMode')}</div>
        <div className="flex gap-2 flex-wrap">
          {['auto', 'day', 'night'].map((k) => (
            <button
              key={k}
              className={'btn ' + (u.timeMode === k ? 'on' : '')}
              onClick={() => set('timeMode', k)}
            >
              {t(k)}
            </button>
          ))}
        </div>
        {F({ k: 'followUpSec', l: t('followUp'), type: 'number' })}
      </div>

      <div className="glass rounded-3xl p-4 space-y-3">
        <button className="btn on w-full !py-2" onClick={() => setProfile(true)}>
          👤 {t('myPersonas')}
        </button>
      </div>

      <div className="glass rounded-3xl p-4 space-y-3">
        <div className="serif gold text-lg">{t('genp')}</div>
        {[
          ['temp', t('temp'), 0, 2, 0.1, 1],
          ['topP', 'Top-P', 0.1, 1, 0.05, 1],
        ].map(([k, l, mn, mx, st, df]) => (
          <label key={k as string} className="block text-xs text-neutral-400">
            {l}: <b className="gold">{(u as any)[k as string] ?? df}</b>
            <input
              type="range"
              min={mn as number}
              max={mx as number}
              step={st as number}
              value={(u as any)[k as string] ?? df}
              onChange={(e) => set(k as any, +e.target.value)}
            />
          </label>
        ))}

        {/* Context Window Limit */}
        <label className="block text-xs text-neutral-400">
          {t('ctxWindow')}: <b className="gold">{u.contextLimit || 24} msgs</b>
          <input
            type="range"
            min={6}
            max={60}
            step={2}
            value={u.contextLimit || 24}
            onChange={(e) => set('contextLimit', +e.target.value)}
          />
        </label>

        {/* Visual Novel Mode Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div>
            <div className="text-xs gold font-semibold">{t('vnMode')}</div>
            <div className="text-[11px] text-neutral-400">Cinematic sprite stage with floating dialogue card</div>
          </div>
          <button
            className={`btn !py-1 !px-3 ${u.vnMode ? 'on' : ''}`}
            onClick={() => set('vnMode', !u.vnMode)}
          >
            {u.vnMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="glass rounded-3xl p-4 space-y-3">
        <div className="text-xs text-neutral-400">{t('backup')}</div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn on" onClick={exportBackup}>
            {t('exportB')}
          </button>
          <label className="btn cursor-pointer">
            {t('importB')}
            <input type="file" accept="application/json,.json" className="hidden" onChange={importBackup} />
          </label>
        </div>
      </div>

      <button
        className="btn danger w-full !py-2.5"
        onClick={() =>
          setConfirm({
            title: t('reset'),
            body: t('resetQ'),
            actions: [
              {
                label: t('reset'),
                danger: true,
                fn: () =>
                  mut((s) => {
                    const n = seed();
                    n.userSettings = s.userSettings;
                    Object.assign(s, n);
                  }),
              },
            ],
          })
        }
      >
        {t('reset')}
      </button>
    </div>
  );
}

/* ---------- App Shell & Error Boundary ---------- */
function Shell() {
  const { view, editing } = useCtx();
  return (
    <>
      <div key={view}>
        {view === 'home' && <HomeView />}
        {view === 'chat' && <ChatView />}
        {view === 'settings' && <SettingsView />}
      </div>
      <CharEditor key={editing?.id || 'none'} />
      <ProfileModal />
      <Confirm />
    </>
  );
}

class Boundary extends React.Component<{ children: ReactNode }, { e: any }> {
  constructor(p: { children: ReactNode }) {
    super(p);
    this.state = { e: null };
  }
  static getDerivedStateFromError(e: any) {
    return { e };
  }
  render() {
    return this.state.e ? (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div className="glass rounded-3xl p-6 max-w-sm">
          <p className="serif text-2xl gold mb-2">Something broke</p>
          <p className="text-xs text-neutral-400 mb-4 break-words">
            {String(this.state.e.message || this.state.e)}
          </p>
          <button className="btn on" onClick={() => this.setState({ e: null })}>
            Retry
          </button>
        </div>
      </div>
    ) : (
      this.props.children
    );
  }
}

export default function App() {
  return (
    <Boundary>
      <Provider>
        <Shell />
      </Provider>
    </Boundary>
  );
}
