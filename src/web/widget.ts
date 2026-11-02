// Embeddable chat box. Usage:
//   <div data-rag-demo data-endpoint="https://rag-demo.example.workers.dev"></div>
//   <script type="module" src="widget.js"></script>
// Without data-endpoint it runs offline and shows retrieved passages only.
import index from "../generated/index.json";
import type { SearchIndex } from "../core/types.ts";
import { MAX_QUESTION_CHARS } from "../core/prompt.ts";
import { liveAsker, offlineAsker, type Asker } from "./api.ts";
import { escapeHtml, renderAnswer } from "./render.ts";
import { STYLES } from "./styles.ts";
import { typeOut } from "./typewriter.ts";
import { startCam } from "./cam.ts";

const EXAMPLES = [
  "What does he work on at Hololight?",
  "Which XR headsets has he shipped on?",
  "What graphics projects has he built?",
  "Has he used AI tools at work?",
];

function mount(host: HTMLElement): void {
  const offline = offlineAsker(index as SearchIndex);
  const endpoint = host.dataset.endpoint;
  const asker: Asker = endpoint ? liveAsker(endpoint, offline) : offline;

  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${STYLES}</style>
    <div class="box">
      <span class="cam" aria-hidden="true"></span>
      <div class="top"><span class="mx-t"><i class="mx-d"></i>Program: rag-demo</span><span class="mx-s"><b>Status:</b><span class="mode"></span></span></div>
      <div class="log" aria-live="polite"></div>
      <div class="chips">${EXAMPLES.map((q) => `<button type="button">${escapeHtml(q)}</button>`).join("")}</div>
      <form><input name="q" maxlength="${MAX_QUESTION_CHARS}" placeholder="Ask about his work, projects or skills" autocomplete="off" aria-label="Question"><button>Run</button></form>
    </div>`;

  const log = root.querySelector<HTMLElement>(".log")!;
  const form = root.querySelector("form")!;
  const input = form.querySelector("input")!;
  const button = form.querySelector("button")!;
  const mode = root.querySelector<HTMLElement>(".mode")!;
  const modeLabel = (live: boolean) => (live ? "Active" : "Offline · search only");
  const setMode = (live: boolean) => {
    mode.textContent = modeLabel(live);
    mode.classList.toggle("on", live);
  };
  setMode(Boolean(endpoint));
  startCam(root.querySelector<HTMLElement>(".cam")!, host.dataset.cam ?? "RAG_07");

  async function ask(question: string): Promise<void> {
    question = question.trim();
    if (!question || button.disabled) return;
    button.disabled = true;
    input.value = "";

    const entry = document.createElement("div");
    entry.className = "entry";
    entry.innerHTML = `<p class="q">${escapeHtml(question)}</p><p class="a wait">Searching records</p>`;
    log.append(entry);
    log.scrollTop = log.scrollHeight;
    const answerEl = entry.querySelector<HTMLElement>(".a")!;

    try {
      const res = await asker.ask(question);
      setMode(res.mode === "live");
      answerEl.classList.remove("wait");
      await typeOut(answerEl, res.answer, renderAnswer(res.answer, res.sources.length));
      if (res.sources.length) {
        const src = document.createElement("div");
        src.className = "src";
        src.innerHTML = res.sources
          .map((s) => {
            const label = `Asset ${String(s.n).padStart(2, "0")} · ${escapeHtml(s.title)} / ${escapeHtml(s.section)}`;
            return s.url ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${label}</a>` : `<span>${label}</span>`;
          })
          .join("");
        entry.append(src);
      }
    } catch {
      answerEl.textContent = "Something went wrong. Try again.";
    } finally {
      button.disabled = false;
      log.scrollTop = log.scrollHeight;
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void ask(input.value);
  });
  root.querySelectorAll<HTMLButtonElement>(".chips button").forEach((b) => b.addEventListener("click", () => void ask(b.textContent ?? "")));
}

document.querySelectorAll<HTMLElement>("[data-rag-demo]").forEach(mount);
