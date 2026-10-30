#!/usr/bin/env tsx
/**
 * Standalone notification script. Reads today's report JSON + HTML from
 * daily_reports/ and sends notifications via all configured channels.
 *
 * Usage:
 *   npx tsx scripts/notify.ts            # send today's report
 *   npx tsx scripts/notify.ts 2026-09-05 # send a specific date's report
 */
import "../scripts/_env";

import fs from "node:fs";
import path from "node:path";
import { sendNotifications } from "../lib/notify/index";
import type { DailyReport } from "../lib/ai/pipeline";
import { todayKey } from "../lib/utils";

const date = process.argv[2] || todayKey();
const dateDir = path.join("daily_reports", date);
const jsonPath = path.join(dateDir, `${date}.json`);
const htmlPath = path.join(dateDir, `${date}.html`);

if (!fs.existsSync(jsonPath) || !fs.existsSync(htmlPath)) {
  console.error(`[notify] report not found for ${date} — run \`npm run daily\` first`);
  process.exit(1);
}

const report: DailyReport = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const htmlContent = fs.readFileSync(htmlPath, "utf8");

console.log(`[notify] sending notifications for ${date}…`);
sendNotifications(report, date, htmlContent)
  .then(() => console.log("[notify] done."))
  .catch((e) => {
    console.error("[notify] FAILED:", e);
    process.exit(1);
  });
