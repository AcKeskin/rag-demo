export function normalize(v: number[]): number[] {
  const n = Math.hypot(...v);
  return n === 0 ? v : v.map((x) => x / n);
}

/** Dot product. Equals cosine similarity for unit vectors. */
export function dot(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error(`Vector size mismatch: ${a.length} vs ${b.length}`);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}
