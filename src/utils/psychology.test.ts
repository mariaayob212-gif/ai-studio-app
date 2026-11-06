import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, computeComposureState, applyHudDelta } from './psychology';
import { parseAITurn, tokenizeParagraph, tokenizeLiteraryParagraphs, isArabic } from './textParser';
import { PsychologicalHUD } from '../types/roleplay';

test('clamp keeps values within 0 and 100', () => {
  assert.equal(clamp(115), 100);
  assert.equal(clamp(-20), 0);
  assert.equal(clamp(45), 45);
});

test('computeComposureState identifies psychological shifts', () => {
  const calmHud: PsychologicalHUD = {
    obsession: 20,
    trust: 30,
    suspicion: 10,
    danger: 15,
    dominance: 40,
    heartRate: 65,
    composure: '',
  };
  assert.equal(computeComposureState(calmHud), 'The Impeccable Mask');

  const dangerousHud: PsychologicalHUD = {
    obsession: 85,
    trust: 10,
    suspicion: 75,
    danger: 85,
    dominance: 60,
    heartRate: 120,
    composure: '',
  };
  assert.equal(computeComposureState(dangerousHud), 'Unhinged Possession');
});

test('applyHudDelta updates meters and clamps bounds', () => {
  const current: PsychologicalHUD = {
    obsession: 50,
    trust: 20,
    suspicion: 40,
    danger: 30,
    dominance: 60,
    heartRate: 72,
    composure: 'The Impeccable Mask',
  };

  const updated = applyHudDelta(current, {
    obsession: 25,
    danger: 40,
    trust: -10,
  });

  assert.equal(updated.obsession, 75);
  assert.equal(updated.danger, 70);
  assert.equal(updated.trust, 10);
  assert.ok(updated.heartRate > 72);
});

test('parseAITurn extracts emotion, inner monologue and HUD delta', () => {
  const raw = `
    *Cassio closes the mahogany door behind you with an ominous click.*
    "You thought you could leave without my permission?"
    [EMOTION: predatory]
    [INNER_MONOLOGUE: She is trembling, exactly where I want her.]
    [HUD: obsession=+5, danger=+10, suspicion=+2, composure="Predatory Alert"]
    [MEMORY: Cassio caught Lian trying to unlock the conservatory door.]
  `;

  const parsed = parseAITurn(raw);

  assert.equal(parsed.emotion, 'predatory');
  assert.equal(parsed.innerMonologue, 'She is trembling, exactly where I want her.');
  assert.equal(parsed.hudDelta?.obsession, 5);
  assert.equal(parsed.hudDelta?.danger, 10);
  assert.equal(parsed.hudDelta?.composure, 'Predatory Alert');
  assert.equal(parsed.memoryNote, 'Cassio caught Lian trying to unlock the conservatory door.');
  assert.ok(!parsed.cleanText.includes('[EMOTION:'));
  assert.ok(!parsed.cleanText.includes('[INNER_MONOLOGUE:'));
  assert.ok(!parsed.cleanText.includes('[MEMORY:'));
  assert.ok(parsed.cleanText.includes('mahogany door'));
});

test('tokenizeParagraph strips raw asterisks from narration content and preserves dialogue', () => {
  const text = `*He steps forward.* "Do not test me." *His gaze pierces.*`;
  const tokens = tokenizeParagraph(text);

  assert.equal(tokens.length, 3);
  assert.equal(tokens[0].type, 'narration');
  assert.equal(tokens[0].content, 'He steps forward.');
  assert.ok(!tokens[0].content.includes('*')); // NO RAW ASTERISKS!

  assert.equal(tokens[1].type, 'dialogue');
  assert.equal(tokens[1].content, 'Do not test me.');

  assert.equal(tokens[2].type, 'narration');
  assert.equal(tokens[2].content, 'His gaze pierces.');
  assert.ok(!tokens[2].content.includes('*')); // NO RAW ASTERISKS!
});

test('tokenizeLiteraryParagraphs separates multiline paragraphs cleanly', () => {
  const prose = `*Cassio stands in the rain.* "Enter."\n\n*He locks the latch behind her.* "Do not run."`;
  const paragraphs = tokenizeLiteraryParagraphs(prose);

  assert.equal(paragraphs.length, 2);
  assert.equal(paragraphs[0][0].content, 'Cassio stands in the rain.');
  assert.equal(paragraphs[0][1].content, 'Enter.');
  assert.equal(paragraphs[1][0].content, 'He locks the latch behind her.');
  assert.equal(paragraphs[1][1].content, 'Do not run.');
});

test('isArabic accurately detects Arabic script', () => {
  assert.equal(isArabic('مرحباً بك في عالم الظلال'), true);
  assert.equal(isArabic('Hello Lian, you cannot escape.'), false);
  assert.equal(isArabic('Gecenin karanlığında kayboldun.'), false);
});
