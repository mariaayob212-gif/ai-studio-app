/**
 * Built-in Web Audio Soundscape Synthesizer
 * Generates continuous, atmospheric Noir ambient presets:
 * - 'rain': Heavy rain with ambient low-pass noise and occasional deep thunder rumbles
 * - 'fire': Crackling fireplace with warm pops and subtle hiss
 * - 'heartbeat': Rhythmic visceral sub-bass pulse simulating tension
 * - 'cello': Dark, bowed minor string chord with slow noir vibrato
 */

class AmbientSoundscape {
  private ctx: AudioContext | null = null;
  private currentTrack: 'off' | 'rain' | 'fire' | 'heartbeat' | 'cello' = 'off';
  private masterGain: GainNode | null = null;
  private activeNodes: (AudioNode | number)[] = [];
  private volume = 0.5;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public stop() {
    this.currentTrack = 'off';
    this.cleanupActive();
  }

  private cleanupActive() {
    for (const item of this.activeNodes) {
      if (typeof item === 'number') {
        window.clearInterval(item);
      } else {
        try {
          if ('stop' in item && typeof (item as AudioScheduledSourceNode).stop === 'function') {
            (item as AudioScheduledSourceNode).stop();
          }
          item.disconnect();
        } catch {
          // ignore
        }
      }
    }
    this.activeNodes = [];
  }

  public play(track: 'off' | 'rain' | 'fire' | 'heartbeat' | 'cello') {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.cleanupActive();
    this.currentTrack = track;

    if (track === 'off') return;

    switch (track) {
      case 'rain':
        this.startRain();
        break;
      case 'fire':
        this.startFire();
        break;
      case 'heartbeat':
        this.startHeartbeat();
        break;
      case 'cello':
        this.startCello();
        break;
    }
  }

  public getCurrentTrack() {
    return this.currentTrack;
  }

  private createWhiteNoiseBuffer(seconds = 3): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private startRain() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createWhiteNoiseBuffer(5);

    // Continuous Rain noise
    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = buffer;
    rainSource.loop = true;

    // Filter to sound like rain on window pane
    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(850, this.ctx.currentTime);

    const rainGain = this.ctx.createGain();
    rainGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(this.masterGain);
    rainSource.start();

    this.activeNodes.push(rainSource, rainFilter, rainGain);

    // Occasional subtle distant thunder
    const thunderTimer = window.setInterval(() => {
      if (!this.ctx || !this.masterGain) return;
      if (Math.random() > 0.4) {
        const osc = this.ctx.createOscillator();
        const tGain = this.ctx.createGain();
        const tFilter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(45 + Math.random() * 20, this.ctx.currentTime);
        tFilter.type = 'lowpass';
        tFilter.frequency.setValueAtTime(120, this.ctx.currentTime);

        const now = this.ctx.currentTime;
        tGain.gain.setValueAtTime(0.01, now);
        tGain.gain.exponentialRampToValueAtTime(0.35, now + 0.8);
        tGain.gain.exponentialRampToValueAtTime(0.001, now + 4.0);

        osc.connect(tFilter);
        tFilter.connect(tGain);
        tGain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 4.5);
      }
    }, 7000);

    this.activeNodes.push(thunderTimer);
  }

  private startFire() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createWhiteNoiseBuffer(4);

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    const fireGain = this.ctx.createGain();
    fireGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(fireGain);
    fireGain.connect(this.masterGain);
    noiseSource.start();

    this.activeNodes.push(noiseSource, noiseFilter, fireGain);

    // Crackle pops
    const crackleTimer = window.setInterval(() => {
      if (!this.ctx || !this.masterGain) return;
      const count = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < count; i++) {
        const popOsc = this.ctx.createOscillator();
        const popGain = this.ctx.createGain();
        popOsc.type = 'triangle';
        popOsc.frequency.setValueAtTime(120 + Math.random() * 600, this.ctx.currentTime);

        const now = this.ctx.currentTime + (Math.random() * 0.4);
        popGain.gain.setValueAtTime(0.01, now);
        popGain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        popOsc.connect(popGain);
        popGain.connect(this.masterGain);
        popOsc.start(now);
        popOsc.stop(now + 0.15);
      }
    }, 450);

    this.activeNodes.push(crackleTimer);
  }

  private startHeartbeat() {
    if (!this.ctx || !this.masterGain) return;

    // Dark background drone
    const drone = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();
    drone.type = 'sine';
    drone.frequency.setValueAtTime(55, this.ctx.currentTime); // low A
    droneGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    drone.connect(droneGain);
    droneGain.connect(this.masterGain);
    drone.start();
    this.activeNodes.push(drone, droneGain);

    // Lub-Dub pulse every 880ms (approx 68 BPM)
    const beatTimer = window.setInterval(() => {
      if (!this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;

      // Lub
      const o1 = this.ctx.createOscillator();
      const g1 = this.ctx.createGain();
      o1.type = 'sine';
      o1.frequency.setValueAtTime(68, now);
      o1.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      g1.gain.setValueAtTime(0.01, now);
      g1.gain.exponentialRampToValueAtTime(0.65, now + 0.04);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      o1.connect(g1);
      g1.connect(this.masterGain);
      o1.start(now);
      o1.stop(now + 0.25);

      // Dub (slightly quieter and delayed 140ms)
      const o2 = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(62, now + 0.14);
      o2.frequency.exponentialRampToValueAtTime(36, now + 0.28);
      g2.gain.setValueAtTime(0.01, now + 0.14);
      g2.gain.exponentialRampToValueAtTime(0.5, now + 0.18);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      o2.connect(g2);
      g2.connect(this.masterGain);
      o2.start(now + 0.14);
      o2.stop(now + 0.38);
    }, 880);

    this.activeNodes.push(beatTimer);
  }

  private startCello() {
    if (!this.ctx || !this.masterGain) return;

    // Minor chord: D2 (73.4Hz), A2 (110Hz), F3 (174.6Hz)
    const frequencies = [73.42, 110.0, 174.61];

    frequencies.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Sawtooth gives rich string harmonic overtones
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Warm cello body filter
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380 + idx * 80, this.ctx.currentTime);

      // Slow breathing swell
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.25 + idx * 0.05, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      this.activeNodes.push(osc, gain, filter, lfo, lfoGain);
    });
  }
}

export const soundscape = new AmbientSoundscape();

/**
 * Text-to-Speech speaking function:
 * First attempts to play server-generated Gemini TTS audio if available.
 * Falls back to browser Web Speech API with deep, slow, resonant baritone parameters.
 */
export async function speakDialogue(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
) {
  // Strip out actions in asterisks so character only speaks spoken dialogue!
  let dialogueOnly = text.replace(/\*[^*]+\*/g, '').trim();
  if (!dialogueOnly) dialogueOnly = text;

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: dialogueOnly }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audioUrl) {
        onStart?.();
        const audio = new Audio(data.audioUrl);
        audio.onended = () => onEnd?.();
        audio.onerror = () => fallbackWebSpeech(dialogueOnly, onStart, onEnd);
        await audio.play();
        return;
      }
    }
  } catch (err) {
    console.warn('Gemini TTS server fallback to browser speech:', err);
  }

  // Fallback to Web Speech API
  fallbackWebSpeech(dialogueOnly, onStart, onEnd);
}

function fallbackWebSpeech(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = 0.75; // Deep, commanding, restrained
  utterance.rate = 0.88;  // Deliberate, razor-sharp pacing

  const voices = window.speechSynthesis.getVoices();
  const deepMaleVoice = voices.find(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.toLowerCase().includes('male') ||
        v.name.toLowerCase().includes('david') ||
        v.name.toLowerCase().includes('daniel') ||
        v.name.toLowerCase().includes('george'))
  );
  if (deepMaleVoice) {
    utterance.voice = deepMaleVoice;
  }

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
}
