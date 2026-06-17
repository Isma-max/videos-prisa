import Parser from "rss-parser";

// Parser RSS/Atom. rss-parser maneja ambos formatos y la mayoría de las
// variantes de los medios chilenos.
const parser = new Parser({
  timeout: 15000,
  headers: {
    // Algunos feeds bloquean user-agents vacíos.
    "User-Agent":
      "RadarDeLeads/1.0 (+https://github.com/) feed-fetcher",
  },
});

export interface RssEntry {
  title: string;
  url: string;
  publishedAt: string | null; // ISO
  summary: string | null;
}

// Limpia HTML básico de los resúmenes y recorta a un largo razonable.
function cleanSummary(raw?: string | null): string | null {
  if (!raw) return null;
  const text = raw
    .replace(/<[^>]*>/g, " ") // quita tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > 600 ? text.slice(0, 597) + "…" : text;
}

function toISO(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function fetchFeed(url: string): Promise<RssEntry[]> {
  const feed = await parser.parseURL(url);
  const entries: RssEntry[] = [];

  for (const item of feed.items ?? []) {
    const link = (item.link || item.guid || "").trim();
    const title = (item.title || "").trim();
    if (!link || !title) continue;

    entries.push({
      title,
      url: link,
      publishedAt: toISO(item.isoDate || item.pubDate),
      summary: cleanSummary(
        item.contentSnippet || item.content || (item as any).summary
      ),
    });
  }

  return entries;
}
