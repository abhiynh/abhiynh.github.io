#!/usr/bin/env node
/* Static regression checks for the hand written pages:
   - every inline <script> must parse as JS (module or classic)
   - every internal *.html link must point at a file that exists
   - the feed must not fall back to the duplicate-rendering innerHTML+= pattern */

import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PAGES = [
  "index.html",
  "feeds.html",
  "feed.html",
  "create-post.html",
  "admin.html",
  "administration.html",
  "approve-members.html",
  "citizen_login.html",
  "register.html",
  "about.html",
  "contact.html",
  "announcements.html"
];

const failures = [];
const workDir = mkdtempSync(join(tmpdir(), "pagecheck-"));

function checkScript(source, label, kind) {
  const ext = kind === "module" ? "mjs" : "cjs";
  const file = join(workDir, `${label}.${ext}`);
  writeFileSync(file, source);
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (err) {
    const detail = err.stderr ? err.stderr.toString() : err.message;
    failures.push(`${label}: ${kind} script failed to parse\n${detail}`);
  }
}

for (const page of PAGES) {
  if (!existsSync(page)) {
    failures.push(`${page}: page is missing`);
    continue;
  }

  const html = readFileSync(page, "utf8");
  const stem = page.replace(/\.html$/, "");

  for (const [index, match] of [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].entries()) {
    checkScript(match[1], `${stem}-module-${index}`, "module");
  }

  for (const [index, match] of [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="module")[^>]*>([\s\S]*?)<\/script>/g)].entries()) {
    if (match[1].trim()) checkScript(match[1], `${stem}-classic-${index}`, "classic");
  }

  for (const match of html.matchAll(/href="([^"#?:]+\.html)[^"]*"/g)) {
    if (!existsSync(match[1])) {
      failures.push(`${page}: link points at missing page ${match[1]}`);
    }
  }

  for (const match of html.matchAll(/src="([^"#?:]+\.(?:js|css))[^"]*"/g)) {
    if (!/^https?:/.test(match[1]) && !existsSync(match[1])) {
      failures.push(`${page}: asset is missing ${match[1]}`);
    }
  }
}

const feedHtml = readFileSync("feeds.html", "utf8");

if (feedHtml.includes("innerHTML+=")) {
  failures.push("feeds.html: innerHTML+= duplicates every post on each Firestore snapshot");
}

if (!feedHtml.includes("./js/community.js")) {
  failures.push("feeds.html: expected to use the shared ./js/community.js helpers");
}

if (!existsSync("js/community.js")) {
  failures.push("js/community.js: shared helpers are missing");
}

rmSync(workDir, { recursive: true, force: true });

if (failures.length) {
  console.error(`Page checks failed (${failures.length}):\n`);
  for (const failure of failures) console.error(`- ${failure}\n`);
  process.exit(1);
}

console.log(`Page checks passed: ${PAGES.length} pages parsed, internal links and assets resolved.`);
