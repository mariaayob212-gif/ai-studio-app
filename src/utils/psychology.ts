import { PsychologicalHUD } from '../types/roleplay';

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function computeComposureState(hud: PsychologicalHUD): string {
  const { obsession, danger, suspicion, dominance } = hud;

  if (danger >= 80 && obsession >= 75) {
    return 'Unhinged Possession';
  }
  if (dominance >= 85 && danger < 50) {
    return 'Total Psychological Dominance';
  }
  if (suspicion >= 70 && danger >= 60) {
    return 'Predatory Alert';
  }
  if (obsession >= 70 && dominance < 50) {
    return 'The Cracking Calm';
  }
  if (danger >= 60) {
    return 'Restrained Volatility';
  }
  if (obsession >= 50) {
    return 'Obsessive Vigilance';
  }
  return 'The Impeccable Mask';
}

export function applyHudDelta(
  current: PsychologicalHUD,
  delta: Partial<PsychologicalHUD> | null
): PsychologicalHUD {
  if (!delta) return current;

  const obsession = delta.obsession !== undefined ? clamp(current.obsession + delta.obsession) : current.obsession;
  const trust = delta.trust !== undefined ? clamp(current.trust + delta.trust) : current.trust;
  const suspicion = delta.suspicion !== undefined ? clamp(current.suspicion + delta.suspicion) : current.suspicion;
  const danger = delta.danger !== undefined ? clamp(current.danger + delta.danger) : current.danger;
  const dominance = delta.dominance !== undefined ? clamp(current.dominance + delta.dominance) : current.dominance;

  // Heart rate correlates with danger, obsession, and composure
  let baseBpm = 64 + Math.round((danger * 0.4) + (obsession * 0.25) + (suspicion * 0.15));
  if (delta.heartRate !== undefined) {
    baseBpm = clamp(delta.heartRate, 50, 180);
  }

  const updated: PsychologicalHUD = {
    obsession,
    trust,
    suspicion,
    danger,
    dominance,
    heartRate: clamp(baseBpm, 55, 175),
    composure: delta.composure || computeComposureState({
      obsession,
      trust,
      suspicion,
      danger,
      dominance,
      heartRate: baseBpm,
      composure: '',
    }),
  };

  return updated;
}
