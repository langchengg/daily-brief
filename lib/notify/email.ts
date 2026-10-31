import nodemailer from "nodemailer";
import type { DailyReport } from "../ai/pipeline";

/**
 * Send the daily report as an HTML email via SMTP (Gmail / QQ / 163 etc.).
 *
 * Required env vars:
 *   SMTP_HOST, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL_TO (SMTP_PORT defaults to 465)
 */
export async function sendEmail(
  report: DailyReport,
  date: string,
  htmlContent: string,
): Promise<"sent" | "skipped"> {
  const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "NOTIFY_EMAIL_TO"] as const;
  if (![...required, "SMTP_PORT"].some((name) => process.env[name])) {
    console.log("[notify:email] skipped — email is not configured");
    return "skipped";
  }
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Email configuration is incomplete: missing ${missing.join(", ")}`);
  }

  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER!.trim();
  const rawPass = process.env.SMTP_PASS!;
  // Google displays its 16-letter app passwords in space-separated groups.
  // Normalize that specific format only; other providers' passwords are literal.
  const pass = host.toLowerCase() === "smtp.gmail.com"
    && /^(?:[a-z]\s*){16}$/i.test(rawPass.trim())
    ? rawPass.replace(/\s/g, "")
    : rawPass;
  const to = process.env.NOTIFY_EMAIL_TO!.trim();
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be an integer between 1 and 65535");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
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

  try {
    const result = await transporter.sendMail({
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

    const accepted = result.accepted?.length ?? 0;
    const rejected = result.rejected?.length ?? 0;
    if (rejected > 0) {
      throw new Error(
        `SMTP rejected ${rejected} recipient(s); ${accepted} accepted. Check delivery before retrying to avoid duplicate emails.`,
      );
    }
    if (accepted === 0) {
      throw new Error("SMTP did not accept any recipients");
    }

    console.log(`[notify:email] sent to ${to} (accepted by SMTP)`);
    return "sent";
  } finally {
    transporter.close();
  }
}
