import { describe, expect, it, vi } from "vitest";
import type { Env } from "../src/worker/env.ts";
import { createHandler } from "../src/worker/handler.ts";
import { INDEX } from "./fixtures.ts";

const ORIGIN = "https://ackeskin.github.io";
const ENV: Env = { ANTHROPIC_API_KEY: "test-key", ALLOWED_ORIGINS: ORIGIN };

function claudeReply(text: string, status = 200) {
  return vi.fn<typeof fetch>(async () =>
    new Response(JSON.stringify({ content: [{ type: "text", text }] }), { status }),
  );
}

function ask(body: unknown, headers: Record<string, string> = { origin: ORIGIN }) {
  return new Request("https://worker.test/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("worker handler", () => {
  it("answers with sources and CORS headers", async () => {
    const fetchMock = claudeReply("He built the WebRTC layer [1].");
    const res = await createHandler({ index: INDEX, fetch: fetchMock })(ask({ question: "webrtc?" }), ENV);

    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(await res.json()).toEqual({
      answer: "He built the WebRTC layer [1].",
      sources: [{ n: 1, title: "Doc", section: "webrtc", url: "https://example.com/#webrtc" }],
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect((init!.headers as Record<string, string>)["x-api-key"]).toBe("test-key");
    const sent = JSON.parse(init!.body as string);
    expect(sent.model).toBe("claude-haiku-5-5");
    expect(sent.max_tokens).toBe(400);
    expect(sent.messages[0].content).toContain("Designed the WebRTC");
  });

  it("rejects requests without an Origin header", async () => {
    const res = await createHandler({ index: INDEX, fetch: claudeReply("x") })(ask({ question: "webrtc" }, {}), ENV);
    expect(res.status).toBe(403);
  });

  it("adds the bge query prefix when embedding with Workers AI", async () => {
    const run = vi.fn(async () => ({ data: [[1, 0]] }));
    const index = { ...INDEX, embeddingModel: "@cf/baai/bge-small-en-v1.5", vectors: [[1, 0], [0, 1], [0, 1]] };
    await createHandler({ index, fetch: claudeReply("x") })(ask({ question: "webrtc" }), { ...ENV, AI: { run } });
    expect(run).toHaveBeenCalledWith("@cf/baai/bge-small-en-v1.5", {
      text: ["Represent this sentence for searching relevant passages: webrtc"],
    });
  });

  it("rejects other origins before doing any work", async () => {
    const fetchMock = claudeReply("x");
    const res = await createHandler({ index: INDEX, fetch: fetchMock })(ask({ question: "webrtc" }, { origin: "https://evil.test" }), ENV);
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["missing question", {}],
    ["empty question", { question: "  " }],
    ["too long", { question: "x".repeat(301) }],
    ["not JSON", "nope"],
  ])("returns 400 for %s", async (_, body) => {
    const res = await createHandler({ index: INDEX, fetch: claudeReply("x") })(ask(body), ENV);
    expect(res.status).toBe(400);
  });

  it("skips the model when nothing matches", async () => {
    const fetchMock = claudeReply("x");
    const res = await createHandler({ index: INDEX, fetch: fetchMock })(ask({ question: "pizza" }), ENV);
    expect(res.status).toBe(200);
    expect((await res.json()).sources).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the rate limiter says no", async () => {
    const env: Env = { ...ENV, RATE_LIMITER: { limit: async () => ({ success: false }) } };
    const res = await createHandler({ index: INDEX, fetch: claudeReply("x") })(ask({ question: "webrtc" }), env);
    expect(res.status).toBe(429);
  });

  it("returns 429 when the global limit is hit", async () => {
    const keys: string[] = [];
    const env: Env = { ...ENV, GLOBAL_LIMITER: { limit: async ({ key }) => (keys.push(key), { success: false }) } };
    const res = await createHandler({ index: INDEX, fetch: claudeReply("x") })(ask({ question: "webrtc" }), env);
    expect(res.status).toBe(429);
    expect(keys).toEqual(["all"]);
  });

  it("sets a timeout on the Claude call", async () => {
    let signal: AbortSignal | null | undefined;
    const fetchFn = (async (_: unknown, init?: RequestInit) => {
      signal = init?.signal;
      return new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }] }));
    }) as unknown as typeof fetch;
    await createHandler({ index: INDEX, fetch: fetchFn })(ask({ question: "webrtc" }), ENV);
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("returns 502 with sources when Claude fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await createHandler({ index: INDEX, fetch: claudeReply("overloaded", 529) })(ask({ question: "webrtc" }), ENV);
    expect(res.status).toBe(502);
    expect((await res.json()).sources).toHaveLength(1);
  });

  it("answers preflight and health checks", async () => {
    const handle = createHandler({ index: INDEX });
    const pre = await handle(new Request("https://worker.test/api/ask", { method: "OPTIONS", headers: { origin: ORIGIN } }), ENV);
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-methods")).toContain("POST");
    const health = await handle(new Request("https://worker.test/api/health"), ENV);
    expect(await health.json()).toEqual({ ok: true });
  });

  it("returns 404 and 405 for other routes and methods", async () => {
    const handle = createHandler({ index: INDEX });
    expect((await handle(new Request("https://worker.test/nope"), ENV)).status).toBe(404);
    const get = new Request("https://worker.test/api/ask", { headers: { origin: ORIGIN } });
    expect((await handle(get, ENV)).status).toBe(405);
  });
});
