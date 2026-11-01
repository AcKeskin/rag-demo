import { describe, expect, it } from "vitest";
import { Bm25 } from "../src/core/bm25.ts";

describe("Bm25", () => {
  const bm25 = new Bm25(["webrtc streaming client", "opengl planets", "webrtc webrtc webrtc"]);

  it("scores zero when no term matches", () => {
    expect(bm25.score("unity")).toEqual([0, 0, 0]);
  });

  it("ranks docs with more matching terms higher", () => {
    const [a, b] = bm25.score("webrtc streaming");
    expect(a).toBeGreaterThan(0);
    expect(b).toBe(0);
  });

  it("saturates repeated terms", () => {
    const [once, , thrice] = bm25.score("webrtc");
    expect(thrice).toBeGreaterThan(once!);
    expect(thrice! / once!).toBeLessThan(3);
  });
});
