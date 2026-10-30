import * as cheerio from "cheerio";
import type { RawArticle } from "./types";

/**
 * Product Hunt RSS feed fetcher.
 *
 * PH's Atom feed has the product tagline inside the `<content>` field's
 * first `<p>` tag, while the second `<p>` just contains "Discussion | Link"
 * boilerplate. The standard RSS parser lumps everything into a single
 * excerpt, losing the tagline. This custom fetcher parses the Atom XML
 * directly to extract clean taglines.
 */
export async function fetchProductHunt(
  sourceId: string,
  limit = 30,
): Promise<RawArticle[]> {
  const resp = await fetch("https://www.producthunt.com/feed", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; DailyBriefBot/1.0)",
      Accept: "application/atom+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) throw new Error(`Status code ${resp.status}`);

  const xml = await resp.text();
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: RawArticle[] = [];

  $("entry").each((i, el) => {
    if (i >= limit) return false;

    const title = $(el).find("title").text().trim();
    const link = $(el).find('link[rel="alternate"]').attr("href") ?? "";
    const published = $(el).find("published").text().trim();

    // Extract tagline from <content>: it's the first <p> inside the HTML content
    const contentHtml = $(el).find("content").text();
    const $content = cheerio.load(contentHtml);
    const tagline = $content("p").first().text().trim();

    // Skip entries where tagline is empty or is just boilerplate
    const cleanTagline =
      tagline && !/^Discussion\s*\|/i.test(tagline) ? tagline : "";

    if (!title || !link) return;

    items.push({
      sourceId,
      title,
      url: link,
      excerpt: cleanTagline,
      publishedAt: published ? new Date(published) : undefined,
      category: "tech",
    });
  });

  return items;
}
