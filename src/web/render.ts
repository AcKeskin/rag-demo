const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c]!);
}

/** Escapes the answer, then turns [n] into citation chips for known sources. */
export function renderAnswer(answer: string, sourceCount: number): string {
  return escapeHtml(answer)
    .replace(/\[(\d+)\]/g, (m, n: string) => {
      const i = Number(n);
      return i >= 1 && i <= sourceCount ? `<sup class="cite" data-n="${i}">${i}</sup>` : m;
    })
    .replace(/\n/g, "<br>");
}
