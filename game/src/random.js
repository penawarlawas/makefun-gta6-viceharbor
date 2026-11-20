// Mulberry32 seeded PRNG

export function mkRng(seed) {
  let s = seed >>> 0 || 1;

  function next() {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    t = (t ^ (t >>> 14)) >>> 0;
    return t / 0x100000000;
  }

  function nextInt(lo, hi) {
    return lo + Math.floor(next() * (hi - lo + 1));
  }

  function nextFloat(lo, hi) {
    return lo + next() * (hi - lo);
  }

  function pick(arr) {
    return arr[nextInt(0, arr.length - 1)];
  }

  return { next, nextInt, nextFloat, pick };
}
