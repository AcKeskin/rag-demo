import { describe, expect, it } from "vitest";
import { slug, tokenize } from "../src/core/text.ts";

describe("tokenize", () => {
  it("lowercases, drops stopwords and short tokens", () => {
    expect(tokenize("What is the WebRTC layer?")).toEqual(["webrtc", "layer"]);
  });

  it("keeps C++ and C# apart", () => {
    expect(tokenize("C++ and C#")).toEqual(["cpp", "csharp"]);
  });

  it("strips simple plurals and -ied", () => {
    expect(tokenize("platforms libraries class studied")).toEqual(["platform", "library", "class", "study"]);
  });
});

describe("slug", () => {
  it("makes url-safe ids", () => {
    expect(slug("MIT (edX) 2020")).toBe("mit-edx-2020");
  });
});
