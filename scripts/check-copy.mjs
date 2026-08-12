#!/usr/bin/env node
/**
 * Copy check — the mechanically-detectable subset of .claude/skills/no-ai-slop.
 *
 *   node scripts/check-copy.mjs          # exit 1 on any error-level finding
 *   node scripts/check-copy.mjs --list   # report everything, always exit 0
 *   node scripts/check-copy.mjs --warn   # include warn-level findings
 *
 * This does NOT replace the skill. Most of its rules — portability, show
 * don't tell, voice preservation, robotic rhythm — need a reader. What a
 * regex can catch reliably is banned vocabulary, filler phrases, and the
 * handful of patterns with fixed surface forms. Those are worth automating
 * so they can't drift back in; everything else stays a human/model pass over
 * SKILL.md.
 *
 * Adverbs are warn-level on purpose: the skill says cut them "when they add
 * nothing" and keep them when they carry the writer's rhythm, which is a
 * judgment call, not a build failure.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const DIRS = ["app", "components", "emails"];

/** SKILL.md "Banned outright". */
const BANNED_WORDS = [
  "delve", "foster", "leverage", "utilize", "facilitate", "empower",
  "streamline", "robust", "cutting-edge", "paradigm shift", "game changer",
  "this is huge", "this changes everything", "tapestry", "realm", "beacon",
  "multifaceted", "meticulous", "intricate", "paramount", "transformative",
  "elevate", "embark", "supercharge", "harness", "ever-evolving",
];

/** SKILL.md "Often-empty phrases". */
const BANNED_PHRASES = [
  "it's worth noting", "it's important to note", "at the end of the day",
  "when it comes to", "at its core", "in today's world", "in the age of",
  "in the world of", "the reality is", "the truth is", "in terms of",
  "with regard to", "in order to", "going forward", "in this article",
  "let's dive in",
];

/** SKILL.md "Often-empty adverbs" — warn only; the skill keeps them sometimes. */
const SOFT_ADVERBS = [
  "literally", "fundamentally", "importantly", "crucially", "inherently",
  "inevitably",
];

/** "Patterns to cut" that have a stable surface form. */
const PATTERNS = [
  { name: "binary contrast", re: /\b(it'?s not\s+[^.!?]{1,40}[.,]\s*it'?s\b|the question isn'?t\b|not just\s+[^.!?]{1,40}\bbut\b)/i },
  { name: "throat-clearing opener", re: /\b(here'?s the thing|here'?s what i mean|let me be clear|i'?ll be honest|the uncomfortable truth)\b/i },
  { name: "faux-insight setup", re: /\b(what nobody tells you|the part everyone misses|what most people get wrong|most people skip)\b/i },
  { name: "importance puffery", re: /\b(a testament to|marks a pivotal|plays a vital role|solidifies its position|underscores its significance|make[s]? a real difference)\b/i },
  { name: "weasel attribution", re: /\b(experts agree|studies show|many argue|widely regarded as|industry reports suggest)\b/i },
  { name: "superficial analysis", re: /,\s*(highlighting|underscoring|reflecting|showcasing)\s+(the|its|their)\b/i },
  { name: "rhetorical setup", re: /\b(what if i told you|think about it:|plot twist:)/i },
  { name: "summary-recap ending", re: /^\s*["'`>]?\s*(in conclusion|ultimately,|overall,)/i },
  { name: "dramatic fragmentation", re: /\bthat'?s it\.\s*that'?s the (whole|entire)\b/i },
];

/**
 * Em dashes: "Do not use them as a default rhythm crutch. In short copy, use
 * none." The rule targets prose, so three non-prose uses are allowed:
 *
 *   1. A bare "—" standing in for a missing value in a stat or table cell.
 *   2. "Brand — Tagline" in a title, alt text, or aria-label, where the dash
 *      is the conventional separator rather than sentence rhythm.
 *   3. "Label — qualifier" in a short data label such as "Analytics — optional".
 *
 * Anything inside an actual sentence is a finding.
 *
 * Individually reviewed separators that those shape rules can't recognise.
 * Kept explicit rather than loosening the heuristic, so each carries a reason
 * and a new one has to be argued for.
 */
const EM_DASH_REVIEWED = [
  { file: "app/layout.tsx", contains: "SITE_TAGLINE", why: "brand/tagline title separator" },
  { file: "app/dashboard/recap/RecapExperience.tsx", contains: "fillText", why: "share-image title separator" },
  { file: "components/RecentActivity.tsx", contains: "item.body", why: "separates actor from quoted snippet" },
];

function emDashAllowed(line, rel) {
  // Bare placeholder glyph: "—" or `${x || "—"}`.
  if (/["'`]\s*—\s*["'`]/.test(line)) return true;
  // Title / alt / aria-label separator.
  if (/\b(title|ariaLabel|aria-label|alt|subject)\b\s*[:=]/.test(line)) return true;
  // Short "Label — qualifier" data label: at most three words after the dash.
  if (/\b(category|type|label|kind)\s*:\s*["'`][^"'`]{0,40}—[^"'`]{0,25}["'`]/.test(line)) {
    return true;
  }
  return EM_DASH_REVIEWED.some((a) => rel === a.file && line.includes(a.contains));
}

/** Exclamation marks here are quoted examples of what to say, not UI status. */
const BANG_ALLOW = ["app/legal/community-guidelines/page.tsx"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Blank comments and imports so code prose can't trigger a copy rule. */
function stripNonCopy(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split("\n")
    .map((line) => {
      if (/^\s*(\/\/|\*|import\s|export\s+\*)/.test(line)) return "";
      return line.replace(/\/\/.*$/, "");
    })
    .join("\n");
}

const findings = [];
const add = (level, file, lineNo, rule, text) =>
  findings.push({ level, file, lineNo, rule, text: text.trim().slice(0, 130) });

for (const dir of DIRS) {
  let files;
  try {
    files = walk(join(ROOT, dir));
  } catch {
    continue;
  }

  for (const file of files) {
    const rel = relative(ROOT, file);
    stripNonCopy(readFileSync(file, "utf8"))
      .split("\n")
      .forEach((line, i) => {
        const lineNo = i + 1;
        if (!line.trim()) return;
        const lower = line.toLowerCase();

        for (const word of BANNED_WORDS) {
          const re = new RegExp(`\\b${word.replace(/[-\s]/g, "[-\\s]")}\\b`, "i");
          if (re.test(line)) add("error", rel, lineNo, `banned word: ${word}`, line);
        }

        for (const phrase of BANNED_PHRASES) {
          if (lower.includes(phrase)) {
            add("error", rel, lineNo, `filler phrase: ${phrase}`, line);
          }
        }

        for (const { name, re } of PATTERNS) {
          if (re.test(line)) add("error", rel, lineNo, name, line);
        }

        if (line.includes("—") && !emDashAllowed(line, rel)) {
          add("error", rel, lineNo, "em dash in user copy", line);
        }

        if (!BANG_ALLOW.includes(rel)) {
          const quoted = line.match(/["'`]([^"'`]*!)["'`]/);
          if (quoted && /[a-z]/i.test(quoted[1])) {
            add("error", rel, lineNo, "exclamation mark in copy", line);
          }
        }

        for (const adverb of SOFT_ADVERBS) {
          if (new RegExp(`\\b${adverb}\\b`, "i").test(line)) {
            add("warn", rel, lineNo, `often-empty adverb: ${adverb}`, line);
          }
        }
      });
  }
}

const listOnly = process.argv.includes("--list");
const showWarn = process.argv.includes("--warn") || listOnly;
const shown = findings.filter((f) => showWarn || f.level === "error");
const errors = findings.filter((f) => f.level === "error");

if (shown.length === 0) {
  console.log("copy check: clean");
  process.exit(0);
}

for (const f of shown) {
  console.log(`  ${f.file}:${f.lineNo}  [${f.level}] ${f.rule}`);
  console.log(`     ${f.text}\n`);
}

const counts = new Map();
for (const f of shown) {
  const key = f.rule.split(":")[0];
  counts.set(key, (counts.get(key) ?? 0) + 1);
}
console.log("summary:");
for (const [rule, count] of [...counts].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${rule}: ${count}`);
}
console.log(`\n${errors.length} error(s), ${findings.length - errors.length} warning(s)`);

process.exit(listOnly ? 0 : errors.length > 0 ? 1 : 0);
