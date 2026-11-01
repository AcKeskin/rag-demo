/** One searchable passage of the corpus. */
export interface Chunk {
  id: string;
  title: string;
  section: string;
  url: string;
  text: string;
}

/** Built by scripts/build-index.ts. Vectors are optional (keyword-only without them). */
export interface SearchIndex {
  version: 1;
  chunks: Chunk[];
  embeddingModel?: string;
  /** Unit-length vectors, same order as `chunks`. */
  vectors?: number[][];
}

export interface Hit {
  chunk: Chunk;
  score: number;
}

/** Turns text into vectors. Workers AI in production, a fake in tests. */
export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
}
