/**
 * Acoustic Modulator & Resonance Engine - Rhythm Coaster
 * 
 * Dynamically influences the song playback when notes are struck:
 * - Dynamic DSP modulation on the music itself (volume surge, sub-kick, resonant filter sweep).
 * - Direction-specific organic acoustic strike timbres (warm, musical, never intrusive):
 *   - Left (0, Vermilion): Taiko Wood Strike (warm, deep organic membrane thump).
 *   - Up (1, Jade Green): Bamboo Wind Chime / Hyōshigi (airy, resonant bamboo strike).
 *   - Down (2, Solar Gold): Bronze Singing Bowl / Kin Bell (sacred metallic warmth).
 *   - Right (3, Bone White): Suikinkutsu Water Droplet (pristine crystal droplet ping).
 * - Master strike volume control: 'BALANCED' (default), 'SOFT', 'CRISP', 'MUTED'.
 */

export type IntensityMode = 'ULTRA' | 'VIVID' | 'SUBTLE';
export type StrikeVolumeMode = 'BALANCED' | 'SOFT' | 'CRISP' | 'MUTED';
export type JudgmentType = 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';

const sourceCache = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
let globalAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    globalAudioCtx = new AudioContextClass();
  }
  return globalAudioCtx;
}

export class AcousticModulator {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private lowShelf: BiquadFilterNode | null = null;
  private sweepFilter: BiquadFilterNode | null = null;
  private highShelf: BiquadFilterNode | null = null;
  private lowPassMuffle: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freqDataArray: Uint8Array<ArrayBuffer> | null = null;
  private isAttached = false;
  private resonanceLevel = 0; // 0 to 1 for visual feedback

  public intensity: IntensityMode = 'VIVID';
  public strikeVolume: StrikeVolumeMode = 'BALANCED';
  private BASE_GAIN = 0.82; // Balanced headroom for dynamic swells

  public init(audioEl: HTMLAudioElement) {
    try {
      this.ctx = getAudioContext();

      // Reuse or create MediaElementAudioSourceNode safely
      let sourceNode = sourceCache.get(audioEl);
      if (!sourceNode) {
        sourceNode = this.ctx.createMediaElementSource(audioEl);
        sourceCache.set(audioEl, sourceNode);
      }
      this.source = sourceNode;

      // 1. Low-shelf filter for dynamic bass punch (90Hz)
      this.lowShelf = this.ctx.createBiquadFilter();
      this.lowShelf.type = 'lowshelf';
      this.lowShelf.frequency.setValueAtTime(90, this.ctx.currentTime);
      this.lowShelf.gain.setValueAtTime(0, this.ctx.currentTime);

      // 2. Resonant sweep filter for punch & presence
      this.sweepFilter = this.ctx.createBiquadFilter();
      this.sweepFilter.type = 'peaking';
      this.sweepFilter.frequency.setValueAtTime(1600, this.ctx.currentTime);
      this.sweepFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);
      this.sweepFilter.gain.setValueAtTime(0, this.ctx.currentTime);

      // 3. High-shelf filter for harmonic air & shimmer (4800Hz)
      this.highShelf = this.ctx.createBiquadFilter();
      this.highShelf.type = 'highshelf';
      this.highShelf.frequency.setValueAtTime(4800, this.ctx.currentTime);
      this.highShelf.gain.setValueAtTime(0, this.ctx.currentTime);

      // 4. Low-pass filter for Miss muffling effect
      this.lowPassMuffle = this.ctx.createBiquadFilter();
      this.lowPassMuffle.type = 'lowpass';
      this.lowPassMuffle.frequency.setValueAtTime(20000, this.ctx.currentTime);
      this.lowPassMuffle.Q.setValueAtTime(0.7, this.ctx.currentTime);

      // 5. Dynamic Gain node for music volume swell
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.BASE_GAIN, this.ctx.currentTime);

      // 6. Master Limiter to keep overall mix pristine and smooth
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-1.5, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(3.0, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12.0, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.14, this.ctx.currentTime);

      // Connect DSP chain:
      // source -> lowShelf -> sweepFilter -> highShelf -> lowPassMuffle -> gainNode -> compressor -> destination
      try {
        this.source.disconnect();
      } catch {
        // Safe to ignore if not connected
      }

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64; // 32 frequency bins, lightweight and fast

      this.source.connect(this.lowShelf);
      this.lowShelf.connect(this.sweepFilter);
      this.sweepFilter.connect(this.highShelf);
      this.highShelf.connect(this.lowPassMuffle);
      this.lowPassMuffle.connect(this.gainNode);
      this.gainNode.connect(this.compressor);
      this.compressor.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.isAttached = true;
      console.info("AcousticModulator: Multi-timbre directional acoustic engine initialized with spectrum analyser.");
    } catch (err) {
      console.warn("AcousticModulator: Audio routing fallback active:", err);
    }
  }

  public getAudioFrequencyData(): Uint8Array | null {
    if (!this.analyser) return null;
    if (!this.freqDataArray || this.freqDataArray.length !== this.analyser.frequencyBinCount) {
      this.freqDataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }
    this.analyser.getByteFrequencyData(this.freqDataArray);
    return this.freqDataArray;
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Influences the playing music based on hit precision:
   * - PERFECT: Sizable volume swell (+65%), sub kick punch, resonant laser bloom, and rich harmonic bloom.
   * - GREAT / GOOD: Subtle punch (+35%), gentle sub kick, resonant filter sweep.
   * - MISS: Underwater low-pass drop to 550Hz.
   */
  public triggerImpact(judgment: JudgmentType, column: number) {
    if (!this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const mult = this.intensity === 'ULTRA' ? 1.35 : this.intensity === 'SUBTLE' ? 0.6 : 1.0;

    if (judgment === 'PERFECT') {
      this.resonanceLevel = 1.0;

      // 1. Dynamic Song Modulation
      if (this.gainNode && this.sweepFilter && this.lowShelf && this.highShelf && this.lowPassMuffle) {
        this.gainNode.gain.cancelScheduledValues(now);
        this.lowShelf.gain.cancelScheduledValues(now);
        this.sweepFilter.gain.cancelScheduledValues(now);
        this.sweepFilter.frequency.cancelScheduledValues(now);
        this.highShelf.gain.cancelScheduledValues(now);
        this.lowPassMuffle.frequency.cancelScheduledValues(now);

        this.lowPassMuffle.frequency.setValueAtTime(20000, now);

        // Music volume swell: 0.82 -> 1.35 (~+65%), smooth 340ms decay
        const targetGain = Math.min(1.5, this.BASE_GAIN + 0.52 * mult);
        this.gainNode.gain.setValueAtTime(targetGain, now);
        this.gainNode.gain.exponentialRampToValueAtTime(this.BASE_GAIN, now + 0.34);

        // Sub kick punch (+9dB at 90Hz)
        this.lowShelf.gain.setValueAtTime(9.0 * mult, now);
        this.lowShelf.gain.linearRampToValueAtTime(0, now + 0.30);

        // Resonant filter sweep (800Hz -> 5500Hz with +11dB peak)
        this.sweepFilter.Q.setValueAtTime(3.8, now);
        this.sweepFilter.frequency.setValueAtTime(900, now);
        this.sweepFilter.frequency.exponentialRampToValueAtTime(5500, now + 0.14);
        this.sweepFilter.frequency.exponentialRampToValueAtTime(1600, now + 0.32);
        this.sweepFilter.gain.setValueAtTime(11.0 * mult, now);
        this.sweepFilter.gain.linearRampToValueAtTime(0, now + 0.32);

        // High air shimmer (+7dB at 4800Hz)
        this.highShelf.gain.setValueAtTime(7.0 * mult, now);
        this.highShelf.gain.linearRampToValueAtTime(0, now + 0.30);
      }

      // 2. Play Direction-Specific Organic Acoustic Instrument
      this.playDirectionalStrike(column, true);

    } else if (judgment === 'GREAT' || judgment === 'GOOD') {
      this.resonanceLevel = 0.65;

      // 1. Dynamic Song Modulation
      if (this.gainNode && this.sweepFilter && this.lowShelf && this.highShelf && this.lowPassMuffle) {
        this.gainNode.gain.cancelScheduledValues(now);
        this.lowShelf.gain.cancelScheduledValues(now);
        this.sweepFilter.gain.cancelScheduledValues(now);
        this.sweepFilter.frequency.cancelScheduledValues(now);
        this.highShelf.gain.cancelScheduledValues(now);
        this.lowPassMuffle.frequency.cancelScheduledValues(now);

        this.lowPassMuffle.frequency.setValueAtTime(20000, now);

        // Volume swell: 0.82 -> 1.10 (~+34%), smooth 240ms decay
        const targetGain = Math.min(1.3, this.BASE_GAIN + 0.28 * mult);
        this.gainNode.gain.setValueAtTime(targetGain, now);
        this.gainNode.gain.exponentialRampToValueAtTime(this.BASE_GAIN, now + 0.24);

        // Sub kick (+5.5dB at 90Hz)
        this.lowShelf.gain.setValueAtTime(5.5 * mult, now);
        this.lowShelf.gain.linearRampToValueAtTime(0, now + 0.20);

        // Resonant sweep (+6dB at 2400Hz)
        this.sweepFilter.Q.setValueAtTime(2.6, now);
        this.sweepFilter.frequency.setValueAtTime(1200, now);
        this.sweepFilter.frequency.exponentialRampToValueAtTime(3200, now + 0.10);
        this.sweepFilter.frequency.exponentialRampToValueAtTime(1600, now + 0.24);
        this.sweepFilter.gain.setValueAtTime(6.0 * mult, now);
        this.sweepFilter.gain.linearRampToValueAtTime(0, now + 0.24);

        // High shimmer (+4dB)
        this.highShelf.gain.setValueAtTime(4.0 * mult, now);
        this.highShelf.gain.linearRampToValueAtTime(0, now + 0.22);
      }

      // 2. Play Direction-Specific Organic Acoustic Instrument
      this.playDirectionalStrike(column, false);

    } else if (judgment === 'MISS') {
      this.resonanceLevel = 0;

      // Underwater low-pass drop on miss
      if (this.gainNode && this.lowPassMuffle) {
        this.gainNode.gain.cancelScheduledValues(now);
        this.lowPassMuffle.frequency.cancelScheduledValues(now);

        this.lowPassMuffle.frequency.setValueAtTime(550, now);
        this.lowPassMuffle.frequency.exponentialRampToValueAtTime(20000, now + 0.32);

        this.gainNode.gain.setValueAtTime(0.48, now);
        this.gainNode.gain.exponentialRampToValueAtTime(this.BASE_GAIN, now + 0.32);
      }
    }
  }

  /**
   * Direction-Specific Organic Acoustic Strike Instruments:
   * Col 0 (Left, Vermilion): Taiko Wood Strike (warm, deep organic membrane thump)
   * Col 1 (Up, Jade): Bamboo Wind Chime / Hyōshigi (airy, resonant bamboo strike)
   * Col 2 (Down, Solar Gold): Bronze Singing Bowl / Kin Bell (sacred metallic warmth)
   * Col 3 (Right, Bone White): Suikinkutsu Water Droplet (pristine crystal droplet ping)
   */
  private playDirectionalStrike(column: number, isPerfect: boolean) {
    if (!this.ctx || this.strikeVolume === 'MUTED') return;
    const now = this.ctx.currentTime;

    // Strike volume factor
    const volScale = this.strikeVolume === 'SOFT' ? 0.5 : this.strikeVolume === 'CRISP' ? 1.3 : 1.0;
    const colIndex = ((column % 4) + 4) % 4;

    switch (colIndex) {
      case 0:
        // --- COL 0: LEFT (Vermilion) -> TAIKO WOOD STRIKE ---
        this.playTaikoWood(now, isPerfect, volScale);
        break;

      case 1:
        // --- COL 1: UP (Jade Green) -> BAMBOO WIND CHIME / HYŌSHIGI ---
        this.playBambooChime(now, isPerfect, volScale);
        break;

      case 2:
        // --- COL 2: DOWN (Solar Gold) -> BRONZE TEMPLE KIN BELL ---
        this.playBronzeBowl(now, isPerfect, volScale);
        break;

      case 3:
        // --- COL 3: RIGHT (Bone White) -> SUIKINKUTSU WATER DROPLET ---
        this.playWaterDroplet(now, isPerfect, volScale);
        break;
    }
  }

  /**
   * Col 0: Left - Taiko Wood Strike (Warm, grounding acoustic membrane thump)
   */
  private playTaikoWood(now: number, isPerfect: boolean, volScale: number) {
    if (!this.ctx) return;

    // Body: Low warm sine with fast membrane pitch decay (150Hz -> 65Hz)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isPerfect ? 165 : 145, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.045);

    const baseVol = (isPerfect ? 0.18 : 0.12) * volScale;
    const decay = isPerfect ? 0.20 : 0.13;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(baseVol, now + 0.004); // Soft attack
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    osc.connect(gain);
    gain.connect(this.compressor || this.ctx.destination);

    osc.start(now);
    osc.stop(now + decay + 0.02);

    // Warm wooden rim harmonic (filtered triangle at 290Hz)
    const rim = this.ctx.createOscillator();
    const rimGain = this.ctx.createGain();

    rim.type = 'triangle';
    rim.frequency.setValueAtTime(290, now);

    rimGain.gain.setValueAtTime(baseVol * 0.45, now);
    rimGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    rim.connect(rimGain);
    rimGain.connect(this.compressor || this.ctx.destination);

    rim.start(now);
    rim.stop(now + 0.08);
  }

  /**
   * Col 1: Up - Bamboo Wind Chime / Hyōshigi (Airy, wooden acoustic resonance)
   */
  private playBambooChime(now: number, isPerfect: boolean, volScale: number) {
    if (!this.ctx) return;

    // Fundamental: 659.25Hz (E5)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now);

    const baseVol = (isPerfect ? 0.15 : 0.10) * volScale;
    const decay = isPerfect ? 0.24 : 0.16;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(baseVol, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    osc.connect(gain);
    gain.connect(this.compressor || this.ctx.destination);

    osc.start(now);
    osc.stop(now + decay + 0.02);

    // Soft airy harmonic overtone (1318.5Hz - E6)
    const overtone = this.ctx.createOscillator();
    const overGain = this.ctx.createGain();

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(1318.5, now);

    overGain.gain.setValueAtTime(baseVol * 0.35, now);
    overGain.gain.exponentialRampToValueAtTime(0.0001, now + (decay * 0.7));

    overtone.connect(overGain);
    overGain.connect(this.compressor || this.ctx.destination);

    overtone.start(now);
    overtone.stop(now + decay);
  }

  /**
   * Col 2: Down - Bronze Singing Bowl / Kin Bell (Warm, sacred bronze resonance)
   */
  private playBronzeBowl(now: number, isPerfect: boolean, volScale: number) {
    if (!this.ctx) return;

    // Fundamental bronze tone: 440Hz (A4)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);

    const baseVol = (isPerfect ? 0.16 : 0.11) * volScale;
    const decay = isPerfect ? 0.28 : 0.18;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(baseVol, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    osc.connect(gain);
    gain.connect(this.compressor || this.ctx.destination);

    osc.start(now);
    osc.stop(now + decay + 0.02);

    // Detuned singing resonance (443Hz for sacred acoustic chorus warmth)
    const detune = this.ctx.createOscillator();
    const detuneGain = this.ctx.createGain();

    detune.type = 'sine';
    detune.frequency.setValueAtTime(443, now);

    detuneGain.gain.setValueAtTime(baseVol * 0.40, now);
    detuneGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    detune.connect(detuneGain);
    detuneGain.connect(this.compressor || this.ctx.destination);

    detune.start(now);
    detune.stop(now + decay);

    // If Perfect: Layer warm 5th harmonic (660Hz)
    if (isPerfect) {
      const fifth = this.ctx.createOscillator();
      const fifthGain = this.ctx.createGain();

      fifth.type = 'sine';
      fifth.frequency.setValueAtTime(660, now);

      fifthGain.gain.setValueAtTime(baseVol * 0.25, now);
      fifthGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      fifth.connect(fifthGain);
      fifthGain.connect(this.compressor || this.ctx.destination);

      fifth.start(now);
      fifth.stop(now + 0.25);
    }
  }

  /**
   * Col 3: Right - Suikinkutsu Water Droplet (Delicate, crystalline ceramic ping)
   */
  private playWaterDroplet(now: number, isPerfect: boolean, volScale: number) {
    if (!this.ctx) return;

    // Primary droplet ping: 1046.5Hz (C6)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Tiny subtle water droplet pitch rise (1020 -> 1060Hz)
    osc.frequency.setValueAtTime(1020, now);
    osc.frequency.exponentialRampToValueAtTime(1060, now + 0.03);

    const baseVol = (isPerfect ? 0.14 : 0.09) * volScale;
    const decay = isPerfect ? 0.20 : 0.13;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(baseVol, now + 0.002); // Crisp droplet attack
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    osc.connect(gain);
    gain.connect(this.compressor || this.ctx.destination);

    osc.start(now);
    osc.stop(now + decay + 0.02);

    // If Perfect: Shimmering secondary water drop echo
    if (isPerfect) {
      const drop2 = this.ctx.createOscillator();
      const drop2Gain = this.ctx.createGain();

      drop2.type = 'sine';
      drop2.frequency.setValueAtTime(1567.98, now + 0.035); // G6 harmonic

      drop2Gain.gain.setValueAtTime(0.0001, now);
      drop2Gain.gain.setValueAtTime(baseVol * 0.35, now + 0.035);
      drop2Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      drop2.connect(drop2Gain);
      drop2Gain.connect(this.compressor || this.ctx.destination);

      drop2.start(now + 0.035);
      drop2.stop(now + 0.20);
    }
  }

  public getResonanceLevel(): number {
    return this.resonanceLevel;
  }

  public decayResonance(delta: number) {
    if (this.resonanceLevel > 0) {
      this.resonanceLevel = Math.max(0, this.resonanceLevel - delta * 2.2);
    }
  }

  public cycleIntensity(): IntensityMode {
    if (this.intensity === 'VIVID') this.intensity = 'ULTRA';
    else if (this.intensity === 'ULTRA') this.intensity = 'SUBTLE';
    else this.intensity = 'VIVID';
    return this.intensity;
  }

  public cycleStrikeVolume(): StrikeVolumeMode {
    if (this.strikeVolume === 'BALANCED') this.strikeVolume = 'SOFT';
    else if (this.strikeVolume === 'SOFT') this.strikeVolume = 'MUTED';
    else if (this.strikeVolume === 'MUTED') this.strikeVolume = 'CRISP';
    else this.strikeVolume = 'BALANCED';
    return this.strikeVolume;
  }

  public dispose() {
    try {
      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }
      this.isAttached = false;
    } catch (e) {
      console.warn("AcousticModulator dispose:", e);
    }
  }
}
