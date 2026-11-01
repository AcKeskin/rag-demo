import { tokenize } from "./text.ts";

const K1 = 1.2;
const B = 0.75;

/** Okapi BM25 over a fixed set of documents. */
export class Bm25 {
  private readonly tfs: Map<string, number>[];
  private readonly lens: number[];
  private readonly df = new Map<string, number>();
  private readonly avgLen: number;

  constructor(docs: string[]) {
    this.tfs = docs.map((d) => {
      const tf = new Map<string, number>();
      for (const t of tokenize(d)) tf.set(t, (tf.get(t) ?? 0) + 1);
      return tf;
    });
    this.lens = this.tfs.map((tf) => [...tf.values()].reduce((a, b) => a + b, 0));
    this.avgLen = this.lens.reduce((a, b) => a + b, 0) / Math.max(docs.length, 1);
    for (const tf of this.tfs) for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
  }

  /** One score per document, same order as the constructor input. */
  score(query: string): number[] {
    const terms = [...new Set(tokenize(query))];
    const n = this.tfs.length;
    return this.tfs.map((tf, i) => {
      let s = 0;
      for (const t of terms) {
        const f = tf.get(t);
        if (!f) continue;
        const df = this.df.get(t) ?? 0;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        s += (idf * f * (K1 + 1)) / (f + K1 * (1 - B + (B * this.lens[i]!) / this.avgLen));
      }
      return s;
    });
  }
}
