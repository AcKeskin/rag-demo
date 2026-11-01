import type { Chunk } from "./types.ts";
import { slug } from "./text.ts";

const MAX_CHARS = 900;

/**
 * Splits a markdown file into one chunk per `## ` section.
 * Long sections are split again on blank lines or list items.
 * Expects front matter with `title` and `url`.
 */
export function chunkMarkdown(source: string, file: string): Chunk[] {
  const { meta, body } = parseFrontMatter(source);
  const title = meta.title ?? file;
  const url = meta.url ?? "";
  const docId = slug(file.replace(/\.md$/, ""));

  return splitSections(body).flatMap(({ section, text }) =>
    splitLong(text).map((part, i, all) => ({
      id: `${docId}#${slug(section)}${all.length > 1 ? `-${i + 1}` : ""}`,
      title,
      section,
      url,
      text: part,
    })),
  );
}

function parseFrontMatter(source: string): { meta: Record<string, string>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(source);
  if (!m) return { meta: {}, body: source };
  const meta: Record<string, string> = {};
  for (const line of m[1]!.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: source.slice(m[0].length) };
}

function splitSections(body: string): { section: string; text: string }[] {
  const out: { section: string; text: string }[] = [];
  let section = "Intro";
  let lines: string[] = [];
  const flush = () => {
    const text = lines.join("\n").trim();
    if (text) out.push({ section, text });
    lines = [];
  };
  for (const line of body.split("\n")) {
    const h = /^##\s+(.+)$/.exec(line);
    if (h) {
      flush();
      section = h[1]!.trim();
    } else {
      lines.push(line);
    }
  }
  flush();
  return out;
}

function splitLong(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];
  const blocks = text.split(/\n\s*\n|\n(?=- )/);
  const parts: string[] = [];
  let cur = "";
  for (const b of blocks) {
    if (cur && cur.length + b.length + 1 > MAX_CHARS) {
      parts.push(cur.trim());
      cur = "";
    }
    cur += (cur ? "\n" : "") + b;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}
