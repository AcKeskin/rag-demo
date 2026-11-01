import { buildPrompt, MAX_QUESTION_CHARS } from "../core/prompt.ts";
import { Retriever } from "../core/retrieve.ts";
import type { Embedder, SearchIndex } from "../core/types.ts";
import { complete, UpstreamError } from "./anthropic.ts";
import type { Env } from "./env.ts";

const DEFAULT_MODEL = "claude-haiku-5-5";
const MAX_TOKENS = 400;
const TOP_K = 4;

export interface AskResponse {
  answer: string;
  sources: { n: number; title: string; section: string; url: string }[];
}

export interface HandlerDeps {
  index: SearchIndex;
  /** Overrides global fetch for the Claude call. Used by tests. */
  fetch?: typeof fetch;
}

/**
 * Routes:
 *   GET  /api/health  -> { ok: true }
 *   POST /api/ask     -> AskResponse, body { question: string }
 */
export function createHandler({ index, fetch: fetchImpl }: HandlerDeps) {
  const retriever = new Retriever(index);

  return async function handle(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("origin");
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);
    if (origin && !cors) return json({ error: "Origin not allowed" }, 403);

    const reply = (body: unknown, status = 200) => json(body, status, cors ?? {});
    const { pathname } = new URL(req.url);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors ?? {} });
    if (pathname === "/api/health" && req.method === "GET") return reply({ ok: true });
    if (pathname !== "/api/ask") return reply({ error: "Not found" }, 404);
    if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

    const question = await readQuestion(req);
    if (!question) {
      return reply({ error: `Send { "question": string } of 1 to ${MAX_QUESTION_CHARS} characters` }, 400);
    }

    if (env.RATE_LIMITER) {
      const key = req.headers.get("cf-connecting-ip") ?? "unknown";
      const { success } = await env.RATE_LIMITER.limit({ key });
      if (!success) return reply({ error: "Too many questions. Try again in a minute." }, 429);
    }

    const embedder = env.AI && index.embeddingModel ? workersAiEmbedder(env.AI, index.embeddingModel) : undefined;
    const hits = await retriever.search(question, { k: TOP_K, embedder });
    const sources = hits.map((h, i) => ({ n: i + 1, title: h.chunk.title, section: h.chunk.section, url: h.chunk.url }));

    if (hits.length === 0) {
      return reply({ answer: "I couldn't find anything about that. Try asking about Ali's work, projects or skills.", sources } satisfies AskResponse);
    }

    try {
      const answer = await complete(buildPrompt(question, hits), {
        apiKey: env.ANTHROPIC_API_KEY,
        model: env.MODEL ?? DEFAULT_MODEL,
        maxTokens: MAX_TOKENS,
        fetch: fetchImpl,
      });
      return reply({ answer, sources } satisfies AskResponse);
    } catch (err) {
      const status = err instanceof UpstreamError ? err.status : 0;
      console.error("Claude call failed", status, err instanceof Error ? err.message : err);
      return reply({ error: "The model is unavailable right now.", sources }, 502);
    }
  };
}

async function readQuestion(req: Request): Promise<string | null> {
  try {
    const body = (await req.json()) as { question?: unknown };
    const q = typeof body.question === "string" ? body.question.trim() : "";
    return q.length > 0 && q.length <= MAX_QUESTION_CHARS ? q : null;
  } catch {
    return null;
  }
}

function corsHeaders(origin: string | null, allowed = ""): Record<string, string> | null {
  if (!origin) return {};
  const list = allowed.split(",").map((o) => o.trim()).filter(Boolean);
  if (!list.includes(origin)) return null;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function workersAiEmbedder(ai: NonNullable<Env["AI"]>, model: string): Embedder {
  return { embed: async (text) => (await ai.run(model, { text })).data };
}
