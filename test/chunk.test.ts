import { describe, expect, it } from "vitest";
import { chunkMarkdown } from "../src/core/chunk.ts";

const DOC = `---
title: Projects
url: https://example.com/#projects
---

## Planets

GPU planets.

## Deck

Slides.
`;

describe("chunkMarkdown", () => {
  it("makes one chunk per section with front matter fields", () => {
    expect(chunkMarkdown(DOC, "projects.md")).toEqual([
      { id: "projects#planets", title: "Projects", section: "Planets", url: "https://example.com/#projects", text: "GPU planets." },
      { id: "projects#deck", title: "Projects", section: "Deck", url: "https://example.com/#projects", text: "Slides." },
    ]);
  });

  it("splits long sections and numbers the parts", () => {
    const items = Array.from({ length: 30 }, (_, i) => `- Item ${i} ${"x".repeat(50)}`).join("\n");
    const chunks = chunkMarkdown(`## Long\n\n${items}`, "doc.md");
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]!.id).toBe("doc#long-1");
    expect(chunks.every((c) => c.text.length <= 900)).toBe(true);
    expect(chunks.map((c) => c.text).join("\n")).toBe(items);
  });

  it("handles CRLF line endings", () => {
    const [c] = chunkMarkdown(DOC.replace(/\n/g, "\r\n"), "projects.md");
    expect(c).toMatchObject({ title: "Projects", section: "Planets", text: "GPU planets." });
  });

  it("works without front matter", () => {
    const [c] = chunkMarkdown("Plain text.", "a.md");
    expect(c).toMatchObject({ id: "a#intro", title: "a.md", section: "Intro", url: "" });
  });
});
