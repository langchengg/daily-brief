import assert from "node:assert/strict";
import { afterEach, beforeEach, test, type TestContext } from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import nodemailer from "nodemailer";
import { sendEmail } from "../lib/notify/email";
import { sendNotifications } from "../lib/notify/index";
import type { DailyReport } from "../lib/ai/pipeline";

const variables = [
  "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "NOTIFY_EMAIL_TO",
  "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID",
];
let previous: Record<string, string | undefined>;
const report: DailyReport = {
  hero_headline: "Test headline", daily_overview: "Test overview",
  tech_briefs: [], finance_briefs: [], politics_briefs: [],
  editor_note: "Test note", keywords: ["test"],
};
const reportDate = "2026-10-31";
const reportHtml = "<!doctype html><html><body>Test report</body></html>";

beforeEach(() => {
  previous = Object.fromEntries(variables.map((name) => [name, process.env[name]]));
  for (const name of variables) delete process.env[name];
});
afterEach(() => {
  for (const name of variables) {
    if (previous[name] === undefined) delete process.env[name];
    else process.env[name] = previous[name];
  }
});

function configureEmail() {
  Object.assign(process.env, {
    SMTP_HOST: "smtp.example.test", SMTP_USER: "sender@example.test",
    SMTP_PASS: "test-only-password", NOTIFY_EMAIL_TO: "reader@example.test",
  });
}

function mockSmtp(t: TestContext, send: (message: any) => Promise<any>) {
  const close = t.mock.fn();
  const create = t.mock.method(nodemailer, "createTransport", () => ({ sendMail: send, close }));
  return { create, close };
}

test("an unconfigured email channel skips, but partial configuration names the missing password", async (t) => {
  const { create } = mockSmtp(t, async () => { throw Error("must not send"); });
  assert.equal(await sendEmail(report, reportDate, reportHtml), "skipped");
  configureEmail();
  delete process.env.SMTP_PASS;
  await assert.rejects(sendEmail(report, reportDate, reportHtml), /missing SMTP_PASS/);
  assert.equal(create.mock.callCount(), 0);
});

test("accepted email uses the selected report attachment and bounded SMTP timeouts", async (t) => {
  configureEmail();
  let message: any;
  const { create, close } = mockSmtp(t, async (value) => {
    message = value;
    return { accepted: ["reader@example.test"], rejected: [] };
  });
  assert.equal(await sendEmail(report, reportDate, reportHtml), "sent");
  assert.equal(message.to, "reader@example.test");
  assert.equal(message.subject, `每日简报 · ${reportDate}`);
  assert.deepEqual(message.attachments, [{
    filename: `${reportDate}.html`, content: reportHtml, contentType: "text/html",
  }]);
  const options = create.mock.calls[0].arguments[0];
  assert.equal(options.port, 465);
  assert.equal(options.secure, true);
  for (const name of ["connectionTimeout", "greetingTimeout", "socketTimeout"]) {
    assert(options[name] > 0 && options[name] <= 30_000);
  }
  assert.equal(close.mock.callCount(), 1);
});

test("SMTP rejection or zero accepted recipients cannot be reported as sent", async (t) => {
  configureEmail();
  let outcome = { accepted: ["one@example.test"], rejected: ["two@example.test"] };
  const { close } = mockSmtp(t, async () => outcome);
  await assert.rejects(sendEmail(report, reportDate, reportHtml), /SMTP rejected 1 recipient.*1 accepted/);
  outcome = { accepted: [], rejected: [] };
  await assert.rejects(sendEmail(report, reportDate, reportHtml), /did not accept any recipients/);
  assert.equal(close.mock.callCount(), 2);
});

test("Gmail app-password display spaces are removed without changing other passwords", async (t) => {
  configureEmail();
  const { create } = mockSmtp(t, async () => ({ accepted: ["reader@example.test"], rejected: [] }));
  process.env.SMTP_HOST = "smtp.gmail.com";
  process.env.SMTP_PASS = " abcd efgh ijkl mnop\n";
  await sendEmail(report, reportDate, reportHtml);
  assert.equal(create.mock.calls[0].arguments[0].auth.pass, "abcdefghijklmnop");
  process.env.SMTP_HOST = "smtp.example.test";
  await sendEmail(report, reportDate, reportHtml);
  assert.equal(create.mock.calls[1].arguments[0].auth.pass, " abcd efgh ijkl mnop\n");
  process.env.SMTP_HOST = "smtp.gmail.com";
  process.env.SMTP_PASS = "arbitrary password";
  await sendEmail(report, reportDate, reportHtml);
  assert.equal(create.mock.calls[2].arguments[0].auth.pass, "arbitrary password");
});

test("SMTP failure still attempts Telegram and fails the aggregate result", async (t) => {
  configureEmail();
  Object.assign(process.env, { TELEGRAM_BOT_TOKEN: "test-token", TELEGRAM_CHAT_ID: "test-chat" });
  const { close } = mockSmtp(t, async () => { throw Error("SMTP authentication failed"); });
  const telegram = t.mock.method(globalThis, "fetch", async () => new Response("{}", { status: 200 }));
  await assert.rejects(sendNotifications(report, reportDate, reportHtml), /SMTP authentication failed.*Successful channels: telegram/);
  assert.equal(telegram.mock.callCount(), 1);
  assert.equal(close.mock.callCount(), 1);
});

test("email delivery succeeds when the optional Telegram channel is absent", async (t) => {
  configureEmail();
  mockSmtp(t, async () => ({ accepted: ["reader@example.test"], rejected: [] }));
  assert.deepEqual(await sendNotifications(report, reportDate, reportHtml), {
    sent: ["email"], skipped: ["telegram"],
  });
});

test("no configured channels and partially configured Telegram both fail", async () => {
  await assert.rejects(sendNotifications(report, reportDate, reportHtml), /No notifications sent/);
  process.env.TELEGRAM_CHAT_ID = "test-chat";
  await assert.rejects(sendNotifications(report, reportDate, reportHtml), /missing TELEGRAM_BOT_TOKEN/);
});

test("notification CLI exits nonzero instead of printing done when email cannot be configured", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "daily-brief-notify-test-"));
  const dateDir = path.join(fixture, "daily_reports", reportDate);
  mkdirSync(dateDir, { recursive: true });
  writeFileSync(path.join(dateDir, `${reportDate}.json`), JSON.stringify(report));
  writeFileSync(path.join(dateDir, `${reportDate}.html`), reportHtml);
  const root = fileURLToPath(new URL("../", import.meta.url));
  try {
    for (const configured of [false, true]) {
      const env = { ...process.env };
      for (const name of variables) delete env[name];
      if (configured) Object.assign(env, {
        SMTP_HOST: "smtp.example.test", SMTP_USER: "sender@example.test",
        NOTIFY_EMAIL_TO: "reader@example.test",
      });
      const result = spawnSync(process.execPath, [
        path.join(root, "node_modules/tsx/dist/cli.mjs"),
        path.join(root, "scripts/notify.ts"), reportDate,
      ], { cwd: fixture, env, encoding: "utf8", timeout: 10_000 });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, configured ? /missing SMTP_PASS/ : /No notifications sent/);
      assert.doesNotMatch(result.stdout, /\[notify\] done\./);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
