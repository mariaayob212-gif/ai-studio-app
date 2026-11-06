export interface EmotionStyle {
  label: string;
  arabicLabel: string;
  glowColor: string;
  ringClass: string;
  badgeClass: string;
  textColor: string;
  borderClass: string;
}

export const EMOTION_STYLES: Record<string, EmotionStyle> = {
  calm: {
    label: 'Calm',
    arabicLabel: 'ذهبي هادئ',
    glowColor: '#d4af37',
    ringClass: 'ring-2 ring-[#d4af37] shadow-[0_0_14px_rgba(212,175,55,0.45)]',
    borderClass: 'border-[#d4af37] shadow-[0_0_14px_rgba(212,175,55,0.4)]',
    badgeClass: 'bg-[#d4af37]/15 border-[#d4af37]/45 text-[#f4e4a6]',
    textColor: 'text-[#d4af37]',
  },
  calculating: {
    label: 'Calculating',
    arabicLabel: 'عسلي حذر',
    glowColor: '#c5a059',
    ringClass: 'ring-2 ring-[#c5a059] shadow-[0_0_14px_rgba(197,160,89,0.45)]',
    borderClass: 'border-[#c5a059] shadow-[0_0_14px_rgba(197,160,89,0.4)]',
    badgeClass: 'bg-[#c5a059]/15 border-[#c5a059]/45 text-[#f5d0a9]',
    textColor: 'text-[#c5a059]',
  },
  predatory: {
    label: 'Predatory',
    arabicLabel: 'قرمزي حاد',
    glowColor: '#dc2626',
    ringClass: 'ring-2 ring-[#dc2626] shadow-[0_0_18px_rgba(220,38,38,0.6)]',
    borderClass: 'border-[#dc2626] shadow-[0_0_18px_rgba(220,38,38,0.55)]',
    badgeClass: 'bg-[#dc2626]/15 border-[#dc2626]/45 text-[#fca5a5]',
    textColor: 'text-[#ef4444]',
  },
  smirking: {
    label: 'Smirking',
    arabicLabel: 'عنبري ماكر',
    glowColor: '#f59e0b',
    ringClass: 'ring-2 ring-[#f59e0b] shadow-[0_0_14px_rgba(245,158,11,0.5)]',
    borderClass: 'border-[#f59e0b] shadow-[0_0_14px_rgba(245,158,11,0.45)]',
    badgeClass: 'bg-[#f59e0b]/15 border-[#f59e0b]/45 text-[#fde68a]',
    textColor: 'text-[#f59e0b]',
  },
  intimate: {
    label: 'Intimate',
    arabicLabel: 'نبيذي دافئ',
    glowColor: '#be185d',
    ringClass: 'ring-2 ring-[#be185d] shadow-[0_0_14px_rgba(190,24,93,0.55)]',
    borderClass: 'border-[#be185d] shadow-[0_0_14px_rgba(190,24,93,0.5)]',
    badgeClass: 'bg-[#be185d]/15 border-[#be185d]/45 text-[#fbcfe8]',
    textColor: 'text-[#f472b6]',
  },
  icy: {
    label: 'Icy',
    arabicLabel: 'فضي بارد',
    glowColor: '#94a3b8',
    ringClass: 'ring-2 ring-[#94a3b8] shadow-[0_0_14px_rgba(148,163,184,0.5)]',
    borderClass: 'border-[#94a3b8] shadow-[0_0_14px_rgba(148,163,184,0.45)]',
    badgeClass: 'bg-[#94a3b8]/15 border-[#94a3b8]/45 text-[#e2e8f0]',
    textColor: 'text-[#cbd5e1]',
  },
  defiant: {
    label: 'Defiant',
    arabicLabel: 'ذهبي ملتهب',
    glowColor: '#eab308',
    ringClass: 'ring-2 ring-[#eab308] shadow-[0_0_18px_rgba(234,179,8,0.55)]',
    borderClass: 'border-[#eab308] shadow-[0_0_18px_rgba(234,179,8,0.5)]',
    badgeClass: 'bg-[#eab308]/15 border-[#eab308]/45 text-[#fef08a]',
    textColor: 'text-[#eab308]',
  },
  vulnerable: {
    label: 'Vulnerable',
    arabicLabel: 'أرجواني رقيق',
    glowColor: '#c084fc',
    ringClass: 'ring-2 ring-[#c084fc] shadow-[0_0_14px_rgba(192,132,252,0.5)]',
    borderClass: 'border-[#c084fc] shadow-[0_0_14px_rgba(192,132,252,0.45)]',
    badgeClass: 'bg-[#c084fc]/15 border-[#c084fc]/45 text-[#e9d5ff]',
    textColor: 'text-[#c084fc]',
  },
};

export function getEmotionStyle(emotion?: string): EmotionStyle {
  if (!emotion) return EMOTION_STYLES.calm;
  const key = emotion.toLowerCase().trim();
  if (key.includes('predat') || key.includes('angr') || key.includes('danger') || key.includes('rage')) {
    return EMOTION_STYLES.predatory;
  }
  if (key.includes('calculat') || key.includes('measure') || key.includes('watch')) {
    return EMOTION_STYLES.calculating;
  }
  if (key.includes('smirk') || key.includes('amuse') || key.includes('mock')) {
    return EMOTION_STYLES.smirking;
  }
  if (key.includes('intimat') || key.includes('warm') || key.includes('wine') || key.includes('whisper')) {
    return EMOTION_STYLES.intimate;
  }
  if (key.includes('icy') || key.includes('cold') || key.includes('frost') || key.includes('steel')) {
    return EMOTION_STYLES.icy;
  }
  if (key.includes('defian') || key.includes('flame') || key.includes('fire') || key.includes('rebel')) {
    return EMOTION_STYLES.defiant;
  }
  if (key.includes('vulnerab') || key.includes('soft') || key.includes('tremor') || key.includes('bleed')) {
    return EMOTION_STYLES.vulnerable;
  }
  return EMOTION_STYLES[key] || EMOTION_STYLES.calm;
}
