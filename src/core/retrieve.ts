import { Bm25 } from "./bm25.ts";
import type { Embedder, Hit, SearchIndex } from "./types.ts";
import { dot, normalize } from "./vector.ts";

/** Reciprocal rank fusion constant. 60 is the usual default. */
const RRF_K = 60;
/**
 * Vector matches below this cosine similarity are treated as noise.
 * bge-small gives unrelated text about 0.4 to 0.6, so this must stay high
 * or every question finds "something" and the model is always called.
 */
const MIN_SIMILARITY = 0.65;

export interface SearchOptions {
  k?: number;
  /** Adds vector search when the index has vectors. */
  embedder?: Embedder;
}

/**
 * Hybrid search: BM25 keywords, plus vector similarity when available,
 * merged with reciprocal rank fusion. Falls back to keywords alone if
 * embedding fails, so search never breaks because of the vector side.
 */
export class Retriever {
  private readonly index: SearchIndex;
  private readonly bm25: Bm25;

  constructor(index: SearchIndex) {
    this.index = index;
    this.bm25 = new Bm25(index.chunks.map((c) => `${c.title} ${c.section}\n${c.text}`));
  }

  async search(query: string, { k = 4, embedder }: SearchOptions = {}): Promise<Hit[]> {
    const rankings = [rank(this.bm25.score(query), 0)];
    const vectors = this.index.vectors;

    if (embedder && vectors?.length) {
      try {
        const [q] = await embedder.embed([query]);
        if (q) {
          const qn = normalize(q);
          rankings.push(rank(vectors.map((v) => dot(qn, v)), MIN_SIMILARITY));
        }
      } catch {
        // Keyword results are still useful on their own.
      }
    }

    const fused = new Map<number, number>();
    for (const ranking of rankings) {
      ranking.forEach((doc, r) => fused.set(doc, (fused.get(doc) ?? 0) + 1 / (RRF_K + r + 1)));
    }

    return [...fused]
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(([i, score]) => ({ chunk: this.index.chunks[i]!, score }));
  }
}

/** Document indices sorted by score, keeping only scores above `min`. */
function rank(scores: number[], min: number): number[] {
  return scores
    .map((s, i) => [s, i] as const)
    .filter(([s]) => s > min)
    .sort((a, b) => b[0] - a[0])
    .map(([, i]) => i);
}
