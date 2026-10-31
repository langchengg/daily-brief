import assert from "node:assert/strict";
import { test } from "node:test";
import { brotliCompressSync } from "node:zlib";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import nodemailer from "nodemailer";
import { decodeReportBundle, readReportBundle, sendExistingReport } from "../scripts/email-existing";

const example = {
  date: "2026-10-31",
  report: {
    hero_headline: "示例标题", daily_overview: "示例概览", editor_note: "示例备注",
    keywords: ["test"], tech_briefs: [{
      title: "Brief", url: "https://example.test/brief", source: "Example",
      summary: "Summary", importance: 3,
    }], finance_briefs: [], politics_briefs: [], section_insights: { tech: "Insight" },
  },
  html: '<!doctype html>\n<html lang="zh"><head><title>2026-10-31</title></head><body>示例 &amp; content\n</body></html>\n',
};
const encode = (value: unknown) => brotliCompressSync(Buffer.from(JSON.stringify(value))).toString("base64");

test("bundle decoding preserves the original report and HTML exactly", () => {
  assert.deepEqual(decodeReportBundle(encode(example)), example);
});

test("missing, invalid, noncanonical and oversized base64 is rejected", () => {
  for (const value of [undefined, null, ""]) assert.throws(() => decodeReportBundle(value), /Missing report bundle/);
  for (const value of ["????", "AA", "AB==", "AAAA\n"]) {
    assert.throws(() => decodeReportBundle(value), /canonical base64/);
  }
  assert.throws(() => decodeReportBundle("A".repeat(64_004)), /64000-character limit/);
});

test("Brotli decoding rejects malformed data and compressed oversized output", () => {
  assert.throws(() => decodeReportBundle(Buffer.from("not brotli").toString("base64")), /invalid Brotli/);
  const large = brotliCompressSync(Buffer.alloc(2 * 1024 * 1024 + 1, 65)).toString("base64");
  assert(large.length < 64_000);
  assert.throws(() => decodeReportBundle(large), /2 MiB decoded limit/);
});

test("malformed JSON errors never echo the supplied content", () => {
  const privateText = "content-that-must-not-appear-in-errors";
  const data = brotliCompressSync(Buffer.from(`{${privateText}`)).toString("base64");
  assert.throws(() => decodeReportBundle(data), (error: Error) => {
    assert.equal(error.message, "Report bundle must contain valid UTF-8 JSON");
    assert(!error.message.includes(privateText));
    return true;
  });
});

test("report dates must have a valid unambiguous calendar date", () => {
  for (const date of ["2026-2-01", "2026-02-29", "2026-04-31", "2026-13-01", "../report"]) {
    assert.throws(() => decodeReportBundle(encode({ ...example, date })), /Report date/);
  }
  const date = "2024-02-29";
  assert.equal(decodeReportBundle(encode({ ...example, date, html: example.html.replaceAll(example.date, date) })).date, date);
});

test("malformed report schemas and incomplete or mismatched HTML are rejected", () => {
  for (const report of [null, [], {}, { ...example.report, keywords: [42] },
    { ...example.report, hero_headline: false }, { ...example.report, tech_briefs: [{}] },
    { ...example.report, section_insights: { tech: null } }]) {
    assert.throws(() => decodeReportBundle(encode({ ...example, report })), /Report/);
  }
  for (const html of ["2026-10-31", "<!doctype html><html>2026-10-31", example.html.replace(example.date, "2026-10-30")]) {
    assert.throws(() => decodeReportBundle(encode({ ...example, html })), /complete HTML document/);
  }
});

test("GitHub input is read from its event file without requiring a payload env variable", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "daily-brief-event-test-"));
  const eventPath = path.join(dir, "event.json");
  const encoded = encode(example);
  try {
    writeFileSync(eventPath, JSON.stringify({ inputs: { email_report_bundle: encoded } }));
    assert.equal(readReportBundle({ GITHUB_EVENT_PATH: eventPath }), encoded);
    assert.equal(readReportBundle({ GITHUB_EVENT_PATH: eventPath, REPORT_BUNDLE: "override" }), "override");
    assert.throws(() => readReportBundle({}), /Missing report bundle/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("existing-report sending uses the exact HTML and requires SMTP acceptance", async (t) => {
  const names = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "NOTIFY_EMAIL_TO"];
  const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  let sentMessage: any;
  t.mock.method(nodemailer, "createTransport", () => ({
    sendMail: async (message: any) => {
      sentMessage = message;
      return { accepted: ["reader@example.test"], rejected: [] };
    },
    close() {},
  }));
  try {
    for (const name of names) delete process.env[name];
    await assert.rejects(sendExistingReport(encode(example)), /Email was not sent/);
    Object.assign(process.env, {
      SMTP_HOST: "smtp.example.test", SMTP_USER: "sender@example.test",
      SMTP_PASS: "test-only-password", NOTIFY_EMAIL_TO: "reader@example.test",
    });
    await sendExistingReport(encode(example));
    assert.equal(sentMessage.attachments[0].content, example.html);
    assert.equal(sentMessage.attachments[0].filename, `${example.date}.html`);
    assert.equal(sentMessage.subject, `每日简报 · ${example.date}`);
  } finally {
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  }
});

test("CLI input failures exit nonzero and do not leak the bundle", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const env = { ...process.env, REPORT_BUNDLE: "invalid-private-payload" };
  const result = spawnSync(process.execPath, [
    path.join(root, "node_modules/tsx/dist/cli.mjs"), path.join(root, "scripts/email-existing.ts"),
  ], { cwd: root, env, encoding: "utf8", timeout: 10_000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[email-existing\] FAILED: Report bundle must be canonical base64/);
  assert(!result.stdout.includes(env.REPORT_BUNDLE));
  assert(!result.stderr.includes(env.REPORT_BUNDLE));
});
