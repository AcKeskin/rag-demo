// Builds src/generated/index.json from corpus/*.md.
// With CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN set, also embeds every
// chunk with Workers AI so the Worker can run vector search.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chunkMarkdown } from "../src/core/chunk.ts";
import type { SearchIndex } from "../src/core/types.ts";
import { normalize } from "../src/core/vector.ts";

const CORPUS = "corpus";
const OUT = "src/generated/index.json";
export const EMBEDDING_MODEL = "@cf/baai/bge-small-en-v1.5";

const files = (await readdir(CORPUS)).filter((f) => f.endsWith(".md")).sort();
const chunks = (
  await Promise.all(files.map(async (f) => chunkMarkdown(await readFile(join(CORPUS, f), "utf8"), f)))
).flat();

const index: SearchIndex = { version: 1, chunks };

const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token } = process.env;
if (account && token) {
  index.embeddingModel = EMBEDDING_MODEL;
  index.vectors = (await embed(chunks.map((c) => `${c.section}. ${c.text}`), account, token)).map(normalize);
}

await mkdir("src/generated", { recursive: true });
await writeFile(OUT, JSON.stringify(index));
console.log(`${OUT}: ${chunks.length} chunks, ${index.vectors ? "with" : "no"} vectors`);

async function embed(text: string[], account: string, token: string): Promise<number[][]> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${EMBEDDING_MODEL}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { result: { data: number[][] } };
  return body.result.data;
}
