import { describe, expect, it } from "vitest";
import { renderAnswer } from "../src/web/render.ts";

describe("renderAnswer", () => {
  it("escapes HTML", () => {
    expect(renderAnswer("<img onerror=x>", 0)).toBe("&lt;img onerror=x&gt;");
  });

  it("turns known citations into chips and leaves others", () => {
    expect(renderAnswer("A [1] B [5]", 2)).toBe('A <sup class="cite" data-n="1">1</sup> B [5]');
  });
});
