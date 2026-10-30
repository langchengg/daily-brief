#!/usr/bin/env node
/**
 * Scheduler wrapper for `npm run daily`. Runs the pipeline, tees stdout+stderr
 * to logs/daily-<YYYY-MM-DD>.log, and triggers `npm run open` on success so
 * the report pops up in Chrome (on the user's interactive session).
 *
 * Returns non-zero exit code on pipeline failure so the OS scheduler marks
 * the run as errored.
 *
 * Invoked by:
 *   - Windows Task Scheduler  →  node.exe scripts\run-daily.mjs
 *   - macOS launchd            →  node scripts/run-daily.mjs
 *   - Linux cron / systemd     →  node scripts/run-daily.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Mirror deploy stdout/stderr into the daily log instead of the parent
// stdio (which the scheduler swallowed anyway). Returns the spawnSync result.
function spawnSyncShim(cmd, args, opts) {
  const r = spawnSync(cmd, args, { ...opts, stdio: "pipe", shell: true });
  const out = (r.stdout?.toString("utf8") ?? "") + (r.stderr?.toString("utf8") ?? "");
  if (out) fs.appendFileSync(logFile, out);
  return r;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
process.chdir(projectRoot);

const today = (() => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
})();

const now = () =>
  new Date().toTimeString().slice(0, 8); // HH:MM:SS

const logDir = path.join(projectRoot, "logs");
fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, `daily-${today}.log`);

// Temporary operational pause requested on 2026-08-16. Keeping launchd loaded
// means the existing 08:00 schedule resumes automatically on this date.
const resumeOn = "2026-08-25";
if (today < resumeOn) {
  const message = `[${now()}] paused: report generation resumes on ${resumeOn}\n`;
  fs.appendFileSync(logFile, message);
  process.stdout.write(message);
  process.exit(0);
}

fs.appendFileSync(logFile, `[${now()}] running npm run daily\n`);

// `shell: true` lets us write 'npm' instead of resolving npm.cmd vs npm
// across platforms. The downside (shell injection) is not a concern here
// since we're not passing user-controlled args.
const child = spawn("npm", ["run", "daily"], {
  cwd: projectRoot,
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
});

const logStream = fs.createWriteStream(logFile, { flags: "a" });
child.stdout.pipe(logStream);
child.stderr.pipe(logStream);

child.on("close", (code) => {
  if (code === 0) {
    fs.appendFileSync(logFile, `\n[${now()}] OK\n`);

    // Deploy to remote host (no-op if DEPLOY_HOST not set in .env.local).
    // Runs synchronously so the log captures the outcome, but a failure
    // here is non-fatal — daily.html is on disk, the user can rerun
    // `npm run deploy` later.
    fs.appendFileSync(logFile, `[${now()}] deploying…\n`);
    const deployResult = spawnSyncShim("node", ["scripts/deploy.mjs"], {
      cwd: projectRoot,
    });
    if (deployResult.status === 0) {
      fs.appendFileSync(logFile, `[${now()}] deploy OK\n`);
    } else {
      fs.appendFileSync(
        logFile,
        `[${now()}] deploy FAILED (exit ${deployResult.status}) — non-fatal, run \`npm run deploy\` to retry\n`,
      );
    }

    // Send push notifications (email + Telegram). Non-fatal — if it
    // errors, the report still exists on disk and Chrome still opens.
    fs.appendFileSync(logFile, `[${now()}] sending notifications…\n`);
    const notifyResult = spawnSyncShim("npx", ["tsx", "scripts/notify.ts"], {
      cwd: projectRoot,
    });
    if (notifyResult.status === 0) {
      fs.appendFileSync(logFile, `[${now()}] notifications OK\n`);
    } else {
      fs.appendFileSync(
        logFile,
        `[${now()}] notifications FAILED (exit ${notifyResult.status}) — non-fatal\n`,
      );
    }

    // Detached so we don't block on Chrome's lifetime. Errors here are
    // cosmetic — the report exists on disk regardless.
    const opener = spawn(process.execPath, [path.join(projectRoot, "scripts", "open-report.mjs")], {
      cwd: projectRoot,
      detached: true,
      stdio: "ignore",
    });
    opener.unref();
    process.exit(0);
  } else {
    fs.appendFileSync(logFile, `\n[${now()}] FAILED: npm run daily exited ${code}\n`);
    process.exit(1);
  }
});

child.on("error", (err) => {
  fs.appendFileSync(logFile, `\n[${now()}] FAILED to spawn: ${err.message}\n`);
  process.exit(1);
});
