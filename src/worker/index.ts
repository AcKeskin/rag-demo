import index from "../generated/index.json";
import type { SearchIndex } from "../core/types.ts";
import type { Env } from "./env.ts";
import { createHandler } from "./handler.ts";

const handle = createHandler({ index: index as SearchIndex });

export default {
  fetch: (req: Request, env: Env) => handle(req, env),
};
