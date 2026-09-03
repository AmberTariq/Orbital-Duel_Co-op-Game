/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API Procedural Retro Synth Sound Engine & Ambient Synthwave Drone
class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private muteListeners: Set<(muted: boolean) => void> = new Set();

  // Thruster humming node references
  private thrusterOsc: OscillatorNode | null = null;
  private thrusterNoiseNode: AudioBufferSourceNode | null = null;
  private thrusterGain: GainNode | null = null;
  private isThrusterActive: boolean = false;

  // Ambient Synthwave Drone nodes
  private isDronePlaying: boolean = false;
  private droneGain: GainNode | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private droneLfo: OscillatorNode | null = null;
  private droneTimer: number | null = null;

  private initCtx(): boolean {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return !!this.ctx;
  }

  public init(): boolean {
    return this.initCtx();
  }

  public subscribeMute(callback: (muted: boolean) => void): () => void {
    this.muteListeners.add(callback);
    callback(this.isMuted);
    return () => this.muteListeners.delete(callback);
  }

  private notifyMute() {
    this.muteListeners.forEach(cb => cb(this.isMuted));
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.isMuted) {
      if (this.thrusterGain && this.ctx) {
        this.thrusterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      this.pauseDrone();
    } else {
      this.initCtx();
      this.startDrone();
    }
    this.notifyMute();
  }

  public userInteracted() {
    this.initCtx();
    if (!this.isMuted && !this.isDronePlaying) {
      this.startDrone();
    }
  }

  // ==========================================
  // AMBIENT SYNTHWAVE DRONE ENGINE
  // ==========================================
  public startDrone() {
    if (this.isMuted || this.isDronePlaying) return;
    if (!this.initCtx() || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.001, now);
      this.droneGain.gain.linearRampToValueAtTime(0.045, now + 3);
      this.droneGain.connect(this.ctx.destination);

      // Lowpass resonant filter with slow breathing LFO
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      filter.Q.setValueAtTime(3.5, now);
      filter.connect(this.droneGain);

      // LFO for filter cutoff sweep
      this.droneLfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      this.droneLfo.type = 'sine';
      this.droneLfo.frequency.setValueAtTime(0.12, now); // slow breathing sweep (8.3s cycle)
      lfoGain.gain.setValueAtTime(160, now);
      this.droneLfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      this.droneLfo.start(now);

      // Ambient Chord: D2 (73.4Hz), A2 (110Hz), F3 (174.6Hz), C4 (261.6Hz)
      const chordFreqs = [73.42, 110.0, 174.61, 220.0];
      this.droneOscillators = [];

      chordFreqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        // Slight detune for analog richness
        osc.detune.setValueAtTime((idx % 2 === 0 ? 3 : -3) * (idx + 1), now);
        oscGain.gain.setValueAtTime(idx === 0 ? 0.35 : 0.15, now);

        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start(now);
        this.droneOscillators.push(osc);
      });

      // Ambient pulse rhythm (soft analog bass heartbeat every 1.6s)
      this.startAmbientPulse();
      this.isDronePlaying = true;
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  private startAmbientPulse() {
    if (this.droneTimer) clearInterval(this.droneTimer);
    this.droneTimer = window.setInterval(() => {
      if (this.isMuted || !this.isDronePlaying || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();

        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(55, now); // A1 note sub
        subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.35);

        subGain.gain.setValueAtTime(0.04, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);

        subOsc.start(now);
        subOsc.stop(now + 0.36);
      } catch {
        // ignore
      }
    }, 1600);
  }

  public pauseDrone() {
    if (this.droneTimer) {
      clearInterval(this.droneTimer);
      this.droneTimer = null;
    }
    if (this.droneLfo) {
      try { this.droneLfo.stop(); this.droneLfo.disconnect(); } catch {}
      this.droneLfo = null;
    }
    this.droneOscillators.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch {}
    });
    this.droneOscillators = [];
    if (this.droneGain && this.ctx) {
      try {
        this.droneGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        setTimeout(() => {
          try { this.droneGain?.disconnect(); } catch {}
          this.droneGain = null;
        }, 250);
      } catch {}
    }
    this.isDronePlaying = false;
  }

  // ==========================================
  // PROCEDURAL THRUSTER HUMMING
  // ==========================================
  private initThrusterNodes() {
    if (!this.ctx) return;
    if (this.thrusterGain) return;

    this.thrusterGain = this.ctx.createGain();
    this.thrusterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, this.ctx.currentTime);
    filter.Q.setValueAtTime(2, this.ctx.currentTime);

    this.thrusterOsc = this.ctx.createOscillator();
    this.thrusterOsc.type = 'sawtooth';
    this.thrusterOsc.frequency.setValueAtTime(65, this.ctx.currentTime);

    this.thrusterOsc.connect(filter);
    filter.connect(this.thrusterGain);
    this.thrusterGain.connect(this.ctx.destination);

    this.thrusterOsc.start();
  }

  public setThrusterActive(active: boolean) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (!this.thrusterGain) {
      this.initThrusterNodes();
    }

    if (!this.thrusterGain) return;

    const now = this.ctx.currentTime;
    if (active && !this.isThrusterActive) {
      this.isThrusterActive = true;
      this.thrusterGain.gain.cancelScheduledValues(now);
      this.thrusterGain.gain.linearRampToValueAtTime(0.045, now + 0.08);
      if (this.thrusterOsc) {
        this.thrusterOsc.frequency.cancelScheduledValues(now);
        this.thrusterOsc.frequency.linearRampToValueAtTime(85, now + 0.15);
      }
    } else if (!active && this.isThrusterActive) {
      this.isThrusterActive = false;
      this.thrusterGain.gain.cancelScheduledValues(now);
      this.thrusterGain.gain.linearRampToValueAtTime(0.0001, now + 0.12);
      if (this.thrusterOsc) {
        this.thrusterOsc.frequency.cancelScheduledValues(now);
        this.thrusterOsc.frequency.linearRampToValueAtTime(65, now + 0.12);
      }
    }
  }

  // ==========================================
  // PROCEDURAL SOUND EFFECTS
  // ==========================================

  // Player Blaster Blast
  public playShoot(playerId: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = playerId === 1 ? 'sawtooth' : 'triangle';
    const startFreq = playerId === 1 ? 840 : 720;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.11);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Laser Beam Shot
  public playLaser() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1350, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.18);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.19);
  }

  // Enemy Blaster Shot
  public playEnemyShoot() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Shield Deflection (Ricochet)
  public playShieldDeflect() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(1600, now + 0.07);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Shield Absorption (Resonant Forcefield Dome)
  public playShieldAbsorb() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);
    filter.Q.setValueAtTime(6, now);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  // Power-up Pickup Arpeggio
  public playPowerUp(type?: string) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = type === 'repair'
      ? [523.25, 659.25, 783.99, 1046.5] // C Major repair chime
      : [440, 554.37, 659.25, 880, 1108.73]; // A major 9th sparkle

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const startTime = now + idx * 0.045;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.24);
    });
  }

  // Asteroid Explosion (Procedural Noise Burst + Lowpass Rumble)
  public playAsteroidExplosion(type: string = 'normal', size: number = 24) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = Math.min(0.65, 0.22 + (size / 35) * 0.35);

    // Create White Noise Buffer
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const startCutoff = type === 'explosive' ? 1400 : type === 'volatile' ? 950 : 700;
    filter.frequency.setValueAtTime(startCutoff, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + duration);

    const gain = this.ctx.createGain();
    const vol = type === 'explosive' ? 0.32 : 0.22;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration);

    // Add low transient thump
    const thump = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(130, now);
    thump.frequency.exponentialRampToValueAtTime(35, now + 0.18);
    thumpGain.gain.setValueAtTime(0.2, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    thump.connect(thumpGain);
    thumpGain.connect(this.ctx.destination);

    thump.start(now);
    thump.stop(now + 0.19);
  }

  // General Explosion
  public playExplosion(intensity: 'small' | 'medium' | 'huge' = 'medium') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const duration = intensity === 'small' ? 0.2 : intensity === 'medium' ? 0.45 : 1.2;
    const now = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(intensity === 'huge' ? 600 : 900, now);
    filter.frequency.linearRampToValueAtTime(40, now + duration);

    const gain = this.ctx.createGain();
    const vol = intensity === 'small' ? 0.16 : intensity === 'medium' ? 0.26 : 0.48;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration);

    if (intensity === 'huge') {
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(150, now);
      sub.frequency.exponentialRampToValueAtTime(25, now + 0.8);
      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      sub.connect(subGain);
      subGain.connect(this.ctx.destination);
      sub.start(now);
      sub.stop(now + 0.8);
    }
  }

  // Ship Destruction (Sub-Bass Crash + Layered White Noise Shock)
  public playShipDestruction() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Harsh explosion noise
    const duration = 0.9;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
    noise.stop(now + duration);

    // 2. Sub bass shockwave
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, now);
    sub.frequency.exponentialRampToValueAtTime(20, now + 0.7);
    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    sub.connect(subGain);
    subGain.connect(this.ctx.destination);
    sub.start(now);
    sub.stop(now + 0.72);
  }

  // EMP Detonation
  public playEMP() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.9);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.9);
  }

  // Boss Warning Siren
  public playBossAlarm() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const startTime = now + i * 0.35;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, startTime);
      osc.frequency.linearRampToValueAtTime(540, startTime + 0.15);
      osc.frequency.linearRampToValueAtTime(320, startTime + 0.3);

      gain.gain.setValueAtTime(0.24, startTime);
      gain.gain.linearRampToValueAtTime(0.24, startTime + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.32);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.33);
    }
  }

  // Boss Defeat Triumphant Fanfare
  public playBossDefeatFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Ascending brassy synth chords
    const chord1 = [261.63, 329.63, 392.0, 523.25]; // C Major
    const chord2 = [349.23, 440.0, 523.25, 698.46]; // F Major
    const chord3 = [392.0, 493.88, 587.33, 783.99]; // G Major
    const chord4 = [523.25, 659.25, 783.99, 1046.5]; // C Major High

    const chords = [
      { notes: chord1, time: 0, dur: 0.28 },
      { notes: chord2, time: 0.3, dur: 0.28 },
      { notes: chord3, time: 0.6, dur: 0.35 },
      { notes: chord4, time: 1.0, dur: 0.9 },
    ];

    chords.forEach(({ notes, time, dur }) => {
      notes.forEach(freq => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        const start = now + time;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.08, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + dur + 0.05);
      });
    });
  }

  // Level Complete Hyperspace Warp
  public playWarp() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 1.2);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 1.3);
  }
}

export const soundEngine = new SoundEngine();
