import { describe, expect, it } from "vitest";
import { Retriever } from "../src/core/retrieve.ts";
import type { Embedder } from "../src/core/types.ts";
import { INDEX } from "./fixtures.ts";

const withVectors = { ...INDEX, embeddingModel: "fake", vectors: [[1, 0], [0, 1], [0.6, 0.8]] };
const fixed = (v: number[]): Embedder => ({ embed: async () => [v] });

describe("Retriever", () => {
  it("finds keyword matches", async () => {
    const hits = await new Retriever(INDEX).search("webrtc streaming");
    expect(hits.map((h) => h.chunk.id)).toEqual(["webrtc"]);
  });

  it("returns nothing for unrelated questions", async () => {
    expect(await new Retriever(INDEX).search("favourite pizza")).toEqual([]);
  });

  it("adds vector matches that share no keywords", async () => {
    const hits = await new Retriever(withVectors).search("graphics", { embedder: fixed([0, 1]) });
    expect(hits[0]!.chunk.id).toBe("planets");
  });

  it("ranks docs found by both methods first", async () => {
    const hits = await new Retriever(withVectors).search("java firebase", { embedder: fixed([0.6, 0.8]) });
    expect(hits[0]!.chunk.id).toBe("android");
  });

  it("falls back to keywords when embedding fails", async () => {
    const broken: Embedder = { embed: async () => Promise.reject(new Error("down")) };
    const hits = await new Retriever(withVectors).search("webrtc", { embedder: broken });
    expect(hits.map((h) => h.chunk.id)).toEqual(["webrtc"]);
  });

  it("respects k", async () => {
    const hits = await new Retriever(withVectors).search("x", { k: 2, embedder: fixed([0.6, 0.8]) });
    expect(hits).toHaveLength(2);
  });
});
