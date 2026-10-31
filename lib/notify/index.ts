import type { DailyReport } from "../ai/pipeline";
import { sendEmail } from "./email";
import { sendTelegram } from "./telegram";

/**
 * Unified notification entry point. Sends via all configured channels.
 * Each channel is independent — if one fails, the others still send.
 * Report failures after attempting every channel so the CLI cannot claim a
 * successful delivery when a configured channel failed or nothing was sent.
 */
export async function sendNotifications(
  report: DailyReport,
  date: string,
  htmlContent: string,
): Promise<{ sent: string[]; skipped: string[] }> {
  const channels: Array<{ name: string; fn: () => Promise<"sent" | "skipped"> }> = [
    { name: "email", fn: () => sendEmail(report, date, htmlContent) },
    { name: "telegram", fn: () => sendTelegram(report, date) },
  ];

  const sent: string[] = [];
  const skipped: string[] = [];
  const failures: string[] = [];
  for (const ch of channels) {
    try {
      const status = await ch.fn();
      (status === "sent" ? sent : skipped).push(ch.name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[notify:${ch.name}] FAILED: ${msg}`);
      failures.push(`${ch.name}: ${msg}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`Notification failed (${failures.join("; ")}). Successful channels: ${sent.join(", ") || "none"}.`);
  }
  if (sent.length === 0) {
    throw new Error("No notifications sent: configure email (SMTP_HOST, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL_TO) or Telegram (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)");
  }
  return { sent, skipped };
}
