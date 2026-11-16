export type RNG = () => number;

export const defaultRng: RNG = Math.random;

export function randInt(rng: RNG, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pickOne<T>(rng: RNG, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function shuffle<T>(rng: RNG, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Lặp lại một hàm sinh cho tới khi thoả điều kiện (dùng cho ràng buộc số đẹp). */
export function retry<T>(tries: number, fn: () => T, accept: (value: T) => boolean): T {
  let last = fn();
  for (let i = 0; i < tries && !accept(last); i++) last = fn();
  return last;
}
