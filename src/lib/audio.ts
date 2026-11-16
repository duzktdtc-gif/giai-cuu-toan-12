import { loadSettings, saveSettings } from "./storage";

type SoundName = "click" | "correct" | "wrong" | "hit" | "defeat" | "victory" | "gameover";

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    if (typeof window !== "undefined") this.muted = loadSettings().muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    saveSettings({ muted });
  }

  /** Gọi trong một sự kiện người dùng để mở khoá AudioContext trên iOS. */
  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor = window.AudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  play(name: SoundName): void {
    if (this.muted) return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    switch (name) {
      case "click":
        this.tone(ctx, 520, 0.06, "square", 0.05, now);
        break;
      case "correct":
        this.tone(ctx, 660, 0.09, "triangle", 0.12, now);
        this.tone(ctx, 880, 0.12, "triangle", 0.12, now + 0.09);
        this.tone(ctx, 1100, 0.18, "triangle", 0.1, now + 0.2);
        break;
      case "wrong":
        this.tone(ctx, 220, 0.18, "sawtooth", 0.08, now);
        this.tone(ctx, 165, 0.25, "sawtooth", 0.08, now + 0.16);
        break;
      case "hit":
        this.noise(ctx, 0.16, 0.16, now);
        this.tone(ctx, 130, 0.16, "square", 0.12, now);
        break;
      case "defeat":
        this.tone(ctx, 330, 0.12, "square", 0.1, now);
        this.tone(ctx, 247, 0.14, "square", 0.1, now + 0.1);
        this.tone(ctx, 165, 0.3, "square", 0.1, now + 0.22);
        break;
      case "victory": {
        const notes = [523, 659, 784, 1047, 1319];
        notes.forEach((freq, index) => this.tone(ctx, freq, 0.24, "triangle", 0.12, now + index * 0.13));
        break;
      }
      case "gameover": {
        const notes = [392, 330, 262, 196];
        notes.forEach((freq, index) => this.tone(ctx, freq, 0.35, "triangle", 0.1, now + index * 0.18));
        break;
      }
    }
  }

  private tone(
    ctx: AudioContext,
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    start: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private noise(ctx: AudioContext, duration: number, volume: number, start: number): void {
    const size = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size) ** 2;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    source.start(start);
  }
}

export const sound = new SoundManager();
