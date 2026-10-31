import type { DailyReport } from "../ai/pipeline";

/**
 * Send a concise daily-brief notification via Telegram Bot API.
 *
 * Required env vars:
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */
export async function sendTelegram(
  report: DailyReport,
  date: string,
): Promise<"sent" | "skipped"> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token && !chatId) {
    console.log("[notify:telegram] skipped — Telegram is not configured");
    return "skipped";
  }
  if (!token || !chatId) {
    throw new Error(`Telegram configuration is incomplete: missing ${!token ? "TELEGRAM_BOT_TOKEN" : "TELEGRAM_CHAT_ID"}`);
  }

  const insights = report.section_insights ?? {};
  const insightLines = Object.entries(insights)
    .filter(([, v]) => v)
    .map(([cat, text]) => `💰 *${cat.toUpperCase()}*\n${escapeMarkdown(text)}`)
    .join("\n\n");

  const lines = [
    `📰 *每日简报 · ${date}*`,
    "",
    report.hero_headline ? `*${escapeMarkdown(report.hero_headline)}*` : "",
    "",
    report.daily_overview ? escapeMarkdown(report.daily_overview) : "",
    "",
    insightLines ? `───── 赚钱洞察 ─────\n\n${insightLines}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: lines,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Telegram API error ${resp.status}: ${body}`);
  }

  console.log(`[notify:telegram] sent to chat ${chatId}`);
  return "sent";
}

/** Escape special Markdown V1 characters. */
function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
