#!/usr/bin/env tsx
/** Send an existing report without fetching news, calling an LLM, or publishing. */
import "./_env";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";
import type { DailyReport } from "../lib/ai/pipeline";
import { sendEmail } from "../lib/notify/email";

const MAX_ENCODED_LENGTH = 64_000;
const MAX_DECOMPRESSED_BYTES = 2 * 1024 * 1024;

interface ReportBundle {
  date: string;
  report: DailyReport;
  html: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validate the complete bundle before allowing any email operation. */
export function decodeReportBundle(encoded: unknown): ReportBundle {
  if (typeof encoded !== "string" || encoded.length === 0) {
    throw new Error("Missing report bundle");
  }
  if (encoded.length > MAX_ENCODED_LENGTH) {
    throw new Error("Report bundle exceeds the 64000-character limit");
  }
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error("Report bundle must be canonical base64");
  }
  const compressed = Buffer.from(encoded, "base64");
  if (compressed.toString("base64") !== encoded) {
    throw new Error("Report bundle must be canonical base64");
  }

  let decoded: Buffer;
  try {
    decoded = brotliDecompressSync(compressed, { maxOutputLength: MAX_DECOMPRESSED_BYTES });
  } catch {
    throw new Error("Report bundle is invalid Brotli data or exceeds the 2 MiB decoded limit");
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decoded));
  } catch {
    throw new Error("Report bundle must contain valid UTF-8 JSON");
  }
  if (!isObject(value)) throw new Error("Report bundle must be an object");

  const { date, report, html } = value;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Report date must use YYYY-MM-DD");
  }
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new Error("Report date is not a valid calendar date");
  }
  if (!isObject(report)) throw new Error("Report must be an object");
  for (const field of ["hero_headline", "daily_overview", "editor_note"]) {
    if (typeof report[field] !== "string") throw new Error(`Report field ${field} must be a string`);
  }
  if (!Array.isArray(report.keywords) || !report.keywords.every((item) => typeof item === "string")) {
    throw new Error("Report keywords must be an array of strings");
  }
  for (const field of ["tech_briefs", "finance_briefs", "politics_briefs"]) {
    const items = report[field];
    if (!Array.isArray(items) || !items.every((item) =>
      isObject(item)
      && ["title", "url", "source", "summary"].every((key) => typeof item[key] === "string")
      && typeof item.importance === "number" && Number.isFinite(item.importance)
    )) {
      throw new Error(`Report field ${field} must be an array of valid brief items`);
    }
  }
  if (report.section_insights !== undefined && (
    !isObject(report.section_insights)
    || !Object.values(report.section_insights).every((item) => typeof item === "string")
  )) {
    throw new Error("Report section_insights must contain string values");
  }
  if (typeof html !== "string"
    || !/^\s*<!doctype\s+html\s*>/i.test(html)
    || !/<html(?:\s[^>]*)?>[\s\S]*<\/html>\s*$/i.test(html)
    || !html.includes(date)) {
    throw new Error("Report HTML must be a complete HTML document containing its report date");
  }
  return { date, report: report as unknown as DailyReport, html };
}

/** GitHub's event file avoids putting the report payload in printed step env. */
export function readReportBundle(env: NodeJS.ProcessEnv = process.env): unknown {
  if (env.REPORT_BUNDLE !== undefined) return env.REPORT_BUNDLE;
  if (!env.GITHUB_EVENT_PATH) throw new Error("Missing report bundle: provide REPORT_BUNDLE or a workflow input");
  let event: unknown;
  try {
    event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
  } catch {
    throw new Error("Unable to read the GitHub workflow event");
  }
  return isObject(event) && isObject(event.inputs) ? event.inputs.email_report_bundle : undefined;
}

export async function sendExistingReport(encoded: unknown): Promise<void> {
  const { date, report, html } = decodeReportBundle(encoded);
  const status = await sendEmail(report, date, html);
  if (status !== "sent") throw new Error("Email was not sent: configure SMTP_HOST, SMTP_USER, SMTP_PASS and NOTIFY_EMAIL_TO");
  console.log(`[email-existing] report ${date} accepted by SMTP`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  Promise.resolve()
    .then(() => sendExistingReport(readReportBundle()))
    .catch((error) => {
      console.error("[email-existing] FAILED:", error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
