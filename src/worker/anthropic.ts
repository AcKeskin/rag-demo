import type { Prompt } from "../core/prompt.ts";

const API_URL = "https://api.anthropic.com/v1/messages";

export class UpstreamError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface CompleteOptions {
  apiKey: string;
  model: string;
  maxTokens: number;
  fetch?: typeof fetch;
}

/** Calls the Claude Messages API and returns the text of the reply. */
export async function complete(prompt: Prompt, opts: CompleteOptions): Promise<string> {
  const res = await (opts.fetch ?? fetch)(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
    }),
  });

  if (!res.ok) throw new UpstreamError(res.status, await res.text());

  const body = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (body.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
}
