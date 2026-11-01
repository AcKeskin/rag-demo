const STOPWORDS = new Set(
  (
    "a an and are as at be by did do does for from has have he his how i in is it its " +
    "me my of on or that the their them they this to was what when where which who why " +
    "will with you your ali can keskin"
  ).split(" "),
);

/** Lowercase word tokens without stopwords. Keeps "c++" and "c#" as distinct terms. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/c\+\+/g, " cpp ")
    .replace(/c#/g, " csharp ")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

/** Tiny stemmer: "platforms" -> "platform", "libraries" -> "library", "studied" -> "study". */
function stem(t: string): string {
  if (t.length > 4 && (t.endsWith("ies") || t.endsWith("ied"))) return t.slice(0, -3) + "y";
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
