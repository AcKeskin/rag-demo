import { MAX_QUESTION_CHARS } from "../core/prompt.ts";
import { Retriever } from "../core/retrieve.ts";
import type { SearchIndex } from "../core/types.ts";
import type { AskResponse } from "../worker/handler.ts";

export type AskResult = AskResponse & { mode: "live" | "offline" };

export interface Asker {
  ask(question: string): Promise<AskResult>;
}

const TIMEOUT_MS = 20_000;

/** Calls the Worker. Falls back to offline search if the Worker fails, times out or is rate limited. */
export function liveAsker(endpoint: string, fallback: Asker): Asker {
  return {
    async ask(question) {
      try {
        const res = await fetch(`${endpoint.replace(/\/$/, "")}/api/ask`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (res.ok) return { ...((await res.json()) as AskResponse), mode: "live" };
      } catch {
        // Network error or timeout: use the fallback below.
      }
      return fallback.ask(question);
    },
  };
}

/** No model: runs the same retrieval in the browser and shows the passages it found. */
export function offlineAsker(index: SearchIndex): Asker {
  const retriever = new Retriever(index);
  return {
    async ask(question) {
      const hits = await retriever.search(question.slice(0, MAX_QUESTION_CHARS), { k: 3 });
      const sources = hits.map((h, i) => ({ n: i + 1, title: h.chunk.title, section: h.chunk.section, url: h.chunk.url }));
      const answer = hits.length
        ? hits.map((h, i) => `[${i + 1}] ${h.chunk.text}`).join("\n\n")
        : "No matching passages. Try asking about work, projects or skills.";
      return { answer, sources, mode: "offline" };
    },
  };
}
