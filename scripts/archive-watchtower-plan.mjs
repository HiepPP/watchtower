#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function today() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function timestamp() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}${mm}${ss}`;
}

function readField(content, name) {
  const re = new RegExp(`^\\s*-?\\s*${name}:\\s*(.+)$`, "im");
  const match = content.match(re);
  return match ? match[1].trim() : "";
}

function safeSlug(raw) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function replaceOrAppendField(content, name, value) {
  const re = new RegExp(`^(\\s*-?\\s*${name}:\\s*).+$`, "im");
  if (re.test(content)) return content.replace(re, `$1${value}`);
  return `${content.trimEnd()}\n- ${name}: ${value}\n`;
}

function appendArchiveRow(content, date, archiveName) {
  const row = `- Archived: ${date} -> watchtower/archive/${archiveName}/`;
  if (content.includes(row)) return content;

  const lines = content.trimEnd().split(/\r?\n/);
  const idx = lines.findIndex((line) => /^##\s+Archive\s*$/.test(line));
  if (idx === -1) return `${lines.join("\n")}\n\n## Archive\n\n${row}\n`;

  let insertAt = idx + 1;
  while (insertAt < lines.length && lines[insertAt].trim() === "") insertAt++;
  lines.splice(insertAt, 0, row);
  return `${lines.join("\n")}\n`;
}

function uniqueArchiveDir(archiveRoot, baseSlug) {
  const first = path.join(archiveRoot, baseSlug);
  if (!fs.existsSync(first)) return first;

  const timed = path.join(archiveRoot, `${baseSlug}-${timestamp()}`);
  if (!fs.existsSync(timed)) return timed;

  for (let i = 2; i < 100; i++) {
    const candidate = path.join(archiveRoot, `${baseSlug}-${timestamp()}-${i}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  fail("Could not find a free archive folder name.");
}

function moveIfExists(from, to) {
  if (!fs.existsSync(from)) return;
  if (fs.existsSync(to)) fail(`Refusing to overwrite ${to}`);
  fs.renameSync(from, to);
}

function archivePlan(rootDir) {
  const watchtowerDir = path.join(rootDir, "watchtower");
  const nextPath = path.join(watchtowerDir, "NEXT.md");
  if (!fs.existsSync(nextPath)) fail("No watchtower/NEXT.md found.");

  const content = fs.readFileSync(nextPath, "utf8");
  const slug = safeSlug(readField(content, "Slug")) || `${today().replaceAll("-", "")}-watchtower-plan`;
  const archiveRoot = path.join(watchtowerDir, "archive");
  fs.mkdirSync(archiveRoot, { recursive: true });

  const archiveDir = uniqueArchiveDir(archiveRoot, slug);
  const archiveName = path.basename(archiveDir);
  fs.mkdirSync(archiveDir, { recursive: false });

  const archivedNext = path.join(archiveDir, "NEXT.md");
  moveIfExists(nextPath, archivedNext);
  let archivedContent = fs.readFileSync(archivedNext, "utf8");
  archivedContent = replaceOrAppendField(archivedContent, "Status", "ARCHIVED");
  archivedContent = replaceOrAppendField(archivedContent, "Updated", today());
  archivedContent = appendArchiveRow(archivedContent, today(), archiveName);
  fs.writeFileSync(archivedNext, archivedContent, "utf8");

  moveIfExists(path.join(watchtowerDir, "CONTEXT.md"), path.join(archiveDir, "CONTEXT.md"));
  moveIfExists(path.join(watchtowerDir, "todos"), path.join(archiveDir, "todos"));

  return archiveName;
}

const rootDir = process.argv[2];
if (!rootDir) fail("Usage: archive-watchtower-plan.mjs <workspace-root>");

const archiveName = archivePlan(path.resolve(rootDir));
console.log(`Archived ${archiveName}`);
