import nodemailer from "nodemailer";
import type { DailyReport } from "../ai/pipeline";

/**
 * Send the daily report as an HTML email via SMTP (Gmail / QQ / 163 etc.).
 *
 * Required env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL_TO
 */
export async function sendEmail(
  report: DailyReport,
  date: string,
  htmlContent: string,
): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.NOTIFY_EMAIL_TO;

  if (!host || !user || !pass || !to) {
    console.log("[notify:email] skipped — SMTP_* or NOTIFY_EMAIL_TO not configured");
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  // Build a concise email body with key highlights
  const insights = report.section_insights ?? {};
  const insightBlocks = Object.entries(insights)
    .filter(([, v]) => v)
    .map(
      ([cat, text]) =>
        `<div style="margin:12px 0;padding:10px 14px;border-left:4px solid #d97706;background:#fffbeb;border-radius:6px;">
          <strong style="color:#92400e;font-size:12px;text-transform:uppercase;letter-spacing:1px;">💰 ${cat}</strong>
          <p style="margin:6px 0 0;color:#1a1a1a;font-size:14px;line-height:1.6;">${text}</p>
        </div>`,
    )
    .join("");

  const emailHtml = `
<div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;">
  <h1 style="font-size:22px;margin:0 0 8px;">每日简报 · ${date}</h1>
  ${report.hero_headline ? `<p style="font-size:18px;font-weight:600;color:#18181b;margin:0 0 16px;line-height:1.4;">${report.hero_headline}</p>` : ""}
  ${report.daily_overview ? `<div style="padding:12px 16px;background:#f4f4f5;border-radius:8px;margin:0 0 20px;">
    <p style="margin:0;font-size:14px;line-height:1.7;color:#3f3f46;">${report.daily_overview}</p>
  </div>` : ""}
  ${insightBlocks ? `<h2 style="font-size:16px;margin:20px 0 8px;color:#92400e;">💰 赚钱洞察</h2>${insightBlocks}` : ""}
  <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;">完整报告见附件 HTML 文件，或在电脑上查看。</p>
</div>`;

  await transporter.sendMail({
    from: `"每日简报" <${user}>`,
    to,
    subject: `每日简报 · ${date}`,
    html: emailHtml,
    attachments: [
      {
        filename: `${date}.html`,
        content: htmlContent,
        contentType: "text/html",
      },
    ],
  });

  console.log(`[notify:email] sent to ${to}`);
}
