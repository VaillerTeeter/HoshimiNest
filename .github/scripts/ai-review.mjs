#!/usr/bin/env node

/**
 * AI Code Review Script
 *
 * Two review modes:
 *   diff  (triggered by /review)      — reviews the PR diff only
 *   full  (triggered by /review-all)  — reviews the entire repository
 *
 * For both modes the source files are split into batches of at most BATCH_LINES
 * lines without cutting in the middle of a single file.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// ── Config ──────────────────────────────────────────────────────────────────
const BATCH_LINES = 2000;
const REVIEW_MODE = process.env.REVIEW_MODE || 'diff'; // 'diff' | 'full'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_ENDPOINT = process.env.OPENAI_API_ENDPOINT || 'https://api.cline.bot/api/v1';
const MODEL = process.env.MODEL || 'deepseek/deepseek-v4-pro';
const LANGUAGE = process.env.LANGUAGE || 'Chinese';
const PR_NUMBER = process.env.PR_NUMBER;
const REPO = process.env.REPO; // owner/repo

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Run a shell command and return stdout (throws on non-zero exit). */
function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

/** Minimal exponential-backoff fetch with retries. */
async function fetchWithRetry(url, options, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      const body = await res.text().catch(() => '');
      console.error(`HTTP ${res.status} ${res.statusText}: ${body.slice(0, 500)}`);
    } catch (err) {
      console.error(`Fetch error (attempt ${i + 1}):`, err.message);
    }
    if (i < retries) {
      const delay = (i + 1) * 2000;
      console.log(`Retrying in ${delay}ms…`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error(`Request failed after ${retries + 1} attempts`);
}

/** Post a comment on the PR (issue comment). */
async function postPRComment(body) {
  const url = `https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/comments`;
  await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ body }),
  });
}

// ── File / diff helpers ─────────────────────────────────────────────────────

/**
 * Parse `git diff` into an array of { path, content, lines } objects.
 * Uses "diff --git a/…" as a file boundary marker.
 */
function parseDiffFiles(diffText) {
  const files = [];
  const parts = diffText.split(/^(?=diff --git a\/)/m);
  for (const part of parts) {
    if (!part.trim()) continue;
    const m = part.match(/^diff --git a\/(.*?) b\//m);
    const path = m ? m[1] : '<unknown>';
    const lines = part.split('\n').length;
    files.push({ path, content: part, lines });
  }
  return files;
}

/**
 * Build batches where each batch ≤ BATCH_LINES, never splitting a file.
 * If a single file exceeds BATCH_LINES it becomes its own batch.
 */
function buildBatches(files) {
  const batches = [];
  let current = { files: [], totalLines: 0 };

  for (const f of files) {
    if (current.totalLines > 0 && current.totalLines + f.lines > BATCH_LINES) {
      batches.push(current);
      current = { files: [], totalLines: 0 };
    }
    current.files.push(f);
    current.totalLines += f.lines;
  }
  if (current.files.length > 0) batches.push(current);
  return batches;
}

// ── Full-code review helpers ────────────────────────────────────────────────

/** Patterns to exclude from full-code review. */
const EXCLUDE_PATTERNS = [
  // directories
  /^src-tauri\/target\//,
  /^src-tauri\/icons\//,
  /^src-tauri\/binaries\//,
  // lockfiles
  /\.lock$/,
  // images
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.ico$/,
  /\.icns$/,
  /\.svg$/,
  // fonts
  /\.woff2?$/,
  /\.ttf$/,
  /\.eot$/,
  /\.otf$/,
  // binaries / archives
  /\.exe$/,
  /\.dll$/,
  /\.so$/,
  /\.dylib$/,
  /\.bin$/,
  /\.zip$/,
  /\.tar$/,
  /\.gz$/,
  /\.br$/,
  /\.wasm$/,
];

/** Check whether a file is binary (quick heuristic: look for null bytes). */
function isBinaryContent(buf) {
  // Check first 8 KB
  const slice = buf.subarray(0, 8192);
  return slice.includes(0);
}

/** Return true if the file should be reviewed in full mode. */
function shouldIncludeFile(relPath) {
  for (const re of EXCLUDE_PATTERNS) {
    if (re.test(relPath)) return false;
  }
  return true;
}

/**
 * Collect all reviewable source files in the repository.
 * Returns an array of { path, content, lines } (same shape as parseDiffFiles).
 */
function collectFullFiles() {
  const tracked = sh('git ls-files').trim().split('\n').filter(Boolean);
  const files = [];

  for (const relPath of tracked) {
    if (!shouldIncludeFile(relPath)) continue;

    let buf;
    try {
      buf = readFileSync(relPath);
    } catch {
      console.warn(`Skipping unreadable file: ${relPath}`);
      continue;
    }

    if (isBinaryContent(buf)) {
      console.log(`Skipping binary file: ${relPath}`);
      continue;
    }

    const text = buf.toString('utf8');
    const lines = text.split('\n').length;

    // Wrap in a pseudo-diff block so the AI sees the full file path
    const content = [
      `diff --git a/${relPath} b/${relPath}`,
      `--- a/${relPath}`,
      `+++ b/${relPath}`,
      `@@ -0,0 +1,${lines} @@`,
      ...text.split('\n').map((l) => `+${l}`),
    ].join('\n');

    files.push({ path: relPath, content, lines });
  }

  return files;
}

// ── AI review ───────────────────────────────────────────────────────────────

/**
 * Call the AI endpoint for a single batch of source files.
 * Returns the review text.
 */
async function reviewBatch(batchIndex, totalBatches, sourceContent, reviewMode) {
  const header = totalBatches > 1 ? ` (Batch ${batchIndex + 1}/${totalBatches})` : '';

  const promptIntro =
    reviewMode === 'full'
      ? `Please perform a full code review of the following source files. For each file, analyze its overall architecture, potential bugs, logic errors, security issues, performance problems, code style violations, and suggest improvements.`
      : `Please review the following code diff. Focus on: bugs, logic errors, security issues, performance problems, code style violations, and potential improvements.`;

  const messages = [
    {
      role: 'system',
      content: `You are a senior software engineer performing a code review. Provide your review in ${LANGUAGE}. Be concise and actionable.`,
    },
    {
      role: 'user',
      content: `${promptIntro}${header}:\n\n${sourceContent}`,
    },
  ];

  console.log(
    `Reviewing batch ${batchIndex + 1}/${totalBatches} (${sourceContent.split('\n').length} lines, mode: ${reviewMode})…`,
  );

  const res = await fetchWithRetry(`${OPENAI_API_ENDPOINT}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
    }),
  });

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) {
    console.error('Unexpected API response:', JSON.stringify(json).slice(0, 500));
    throw new Error('AI returned empty response');
  }
  return text;
}

// ── Metadata helpers ────────────────────────────────────────────────────────

/** Try to fetch PR metadata from the GitHub event payload. */
function getPRMetadata() {
  try {
    const raw = sh('cat $GITHUB_EVENT_PATH');
    const evt = JSON.parse(raw);
    const base = evt?.issue?.base?.ref;
    return { base, title: evt?.issue?.title || `PR #${PR_NUMBER}` };
  } catch {
    return {};
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!GITHUB_TOKEN || !OPENAI_API_KEY || !PR_NUMBER || !REPO) {
    console.error('Missing required env vars: GITHUB_TOKEN, OPENAI_API_KEY, PR_NUMBER, REPO');
    process.exit(1);
  }

  console.log(`Review mode: ${REVIEW_MODE}`);

  let files = [];

  if (REVIEW_MODE === 'full') {
    // ── Full-code review ──────────────────────────────────────────────────
    files = collectFullFiles();

    if (files.length === 0) {
      await postPRComment('✅ **AI Code Review (Full):** 未找到可审查的源代码文件。');
      console.log('No reviewable source files found. Exiting.');
      return;
    }

    console.log(
      `Collected ${files.length} source file(s), total ${files.reduce((s, f) => s + f.lines, 0)} lines.`,
    );
  } else {
    // ── Diff review (default) ─────────────────────────────────────────────
    const meta = getPRMetadata();
    let base = meta.base;
    if (!base) {
      const defaultBranch = sh("git remote show origin | sed -n '/HEAD branch/s/.*: //p'").trim();
      base = `origin/${defaultBranch}`;
    }
    console.log(`Base ref: ${base}`);

    const diff = sh(`git diff ${base}...HEAD -- .`);
    if (!diff.trim()) {
      await postPRComment('✅ **AI Code Review:** 此 PR 无代码变更。');
      console.log('No diff found. Exiting.');
      return;
    }

    files = parseDiffFiles(diff);
    console.log(
      `Found ${files.length} changed file(s), total ${files.reduce((s, f) => s + f.lines, 0)} lines.`,
    );
  }

  // ── Batch & review ─────────────────────────────────────────────────────
  const batches = buildBatches(files);
  console.log(`Split into ${batches.length} batch(es).`);

  const reviews = [];
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const content = batch.files.map((f) => f.content).join('\n');
    const review = await reviewBatch(i, batches.length, content, REVIEW_MODE);
    reviews.push({ batchIndex: i, review });
  }

  // ── Build final comment ────────────────────────────────────────────────
  const meta = getPRMetadata();
  const isFull = REVIEW_MODE === 'full';
  const modeLabel = isFull ? '🔍 Full Code Review' : '🔬 PR Diff Review';

  let commentBody = `## 🤖 AI Code Review (${MODEL})\n\n`;
  commentBody += `**${modeLabel}** · ${meta.title || `PR #${PR_NUMBER}`}\n`;
  commentBody += `**审查范围:** ${files.length} 个文件 · 分 ${batches.length} 批审查\n\n`;
  commentBody += `---\n\n`;

  if (batches.length > 1) {
    const thresholdLabel = isFull
      ? `项目源码超过 ${BATCH_LINES} 行`
      : `PR diff 超过 ${BATCH_LINES} 行`;
    commentBody += `> ⚠️ ${thresholdLabel}，已自动分为 ${batches.length} 批审查。\n\n`;
  }

  for (const { batchIndex, review } of reviews) {
    if (batches.length > 1) {
      const batchFiles = batches[batchIndex].files.map((f) => f.path);
      commentBody += `### 📦 Batch ${batchIndex + 1}/${batches.length}\n`;
      commentBody += `审查文件: ${batchFiles.join(', ')}\n\n`;
    }
    commentBody += `${review}\n\n`;
    if (batches.length > 1) commentBody += `---\n\n`;
  }

  // 6. Post comment
  await postPRComment(commentBody);
  console.log('Review posted successfully.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
