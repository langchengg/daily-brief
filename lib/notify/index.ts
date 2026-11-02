import type { DailyReport } from "../ai/pipeline";
import { sendEmail } from "./email";
import { sendTelegram } from "./telegram";

/**
 * Unified notification entry point. Sends via all configured channels.
 * Each channel is independent — if one fails, the others still send.
 * Report failures after trying every channel so the CLI exits nonzero.
 */
export async function sendNotifications(
  report: DailyReport,
  date: string,
  htmlContent: string,
): Promise<void> {
  const channels: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: "email", fn: () => sendEmail(report, date, htmlContent) },
    { name: "telegram", fn: () => sendTelegram(report, date) },
  ];

  const failed: string[] = [];
  for (const ch of channels) {
    try {
      await ch.fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[notify:${ch.name}] FAILED: ${msg}`);
      failed.push(ch.name);
    }
  }
  if (failed.length) {
    throw new Error(`Notification delivery failed: ${failed.join(", ")}. See channel errors above.`);
  }
}
