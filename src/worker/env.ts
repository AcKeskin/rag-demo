/** Workers AI binding, reduced to the call we use. */
export interface AiBinding {
  run(model: string, input: { text: string[] }): Promise<{ data: number[][] }>;
}

/** Workers Rate Limiting binding. */
export interface RateLimitBinding {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  /** Secret. Set with `wrangler secret put ANTHROPIC_API_KEY`. */
  ANTHROPIC_API_KEY: string;
  /** Comma-separated list of origins allowed to call the API. */
  ALLOWED_ORIGINS?: string;
  MODEL?: string;
  AI?: AiBinding;
  RATE_LIMITER?: RateLimitBinding;
  /** Same binding type, one shared key: caps all visitors together. */
  GLOBAL_LIMITER?: RateLimitBinding;
}
