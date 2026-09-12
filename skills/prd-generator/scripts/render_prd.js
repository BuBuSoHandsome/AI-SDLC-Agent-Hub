#!/usr/bin/env node
/**
 * render_prd.js — 将 PRD JSON 渲染为 md（矩阵）与 html（内嵌 JSON）。
 * 用法:
 *   干净版:  node render_prd.js <prd.json> [--out-dir ./dist]
 *   标记版:  node render_prd.js <prd.json> --changes <changes.json> [--out-dir ./dist]
 * 输出: <slug>-prd-v{version}.md / .html（slug 取 prd_id 小写）
 */
'use strict';
const fs = require('fs');
const path = require('path');

function die(msg) { console.error('ERROR: ' + msg); process.exit(1); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function mdEsc(s) { return String(s).replace(/\|/g, '\\|'); }

const CHANNEL_TITLE = {
  mobile: 'Requirement and Acceptance Criteria Matrix (Mobile)',
  desktop: 'Requirement and Acceptance Criteria Matrix (Desktop)'
};

function slugOf(prd) {
  return prd.prd_id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// changes: { items: [ {type:'add'|'delete'|'modify', req_id, ac_id?, old_content?, new_order?} ] }
function buildChangeIndex(changes) {
  const idx = { req: {}, ac: {} };
  if (!changes) return idx;
  for (const c of changes.items || []) {
    if (c.ac_id) idx.ac[c.ac_id] = c; else idx.req[c.req_id] = c;
  }
  return idx;
}

function markMd(text, change) {
  if (!change) return mdEsc(text);
  if (change.type === 'add') return mdEsc(text) + ' (***)';
  if (change.type === 'delete') return `~~${mdEsc(text)}~~`;
  if (change.type === 'modify') return `~~${mdEsc(change.old_content)}~~ ${mdEsc(text)}`;
  return mdEsc(text);
}

function markHtml(text, change) {
  const hl = ' style="background-color: yellow"';
  if (!change) return esc(text);
  if (change.type === 'add') return `<span${hl}>${esc(text)} (***)</span>`;
  if (change.type === 'delete') return `<span${hl}><del>${esc(text)}</del></span>`;
  if (change.type === 'modify') return `<span${hl}><del>${esc(change.old_content)}</del> ${esc(text)}</span>`;
  return esc(text);
}

function groupByChannel(prd) {
  const groups = { mobile: [], desktop: [] };
  for (const r of prd.requirements) {
    const ch = r.req_id.startsWith('OHM-') ? 'mobile' : r.req_id.startsWith('OHI-') ? 'desktop' : null;
    if (!ch) die(`req_id 前缀无法识别: ${r.req_id}`);
    groups[ch].push(r);
  }
  for (const ch of Object.keys(groups)) groups[ch].sort((a, b) => a.order - b.order);
  return groups;
}

// 渲染时：active 按正常行；tombstone（deleted）仅在标记模式下显示（删除线）
function renderMd(prd, cidx, marked) {
  const lines = [`# ${prd.title}`, '', `> PRD ID: ${prd.prd_id} | Version: ${prd.version}`, ''];
  const groups = groupByChannel(prd);
  for (const ch of ['mobile', 'desktop']) {
    const reqs = groups[ch].filter(r => r.status !== 'deleted' || marked);
    if (reqs.length === 0) continue;
    lines.push(`## ${CHANNEL_TITLE[ch]}`, '');
    lines.push('| Requirement ID | Structured Requirement Description | Acceptance Criteria |');
    lines.push('|---|---|---|');
    for (const r of reqs) {
      const rc = cidx.req[r.req_id];
      const desc = r.status === 'deleted' && !rc
        ? `~~${mdEsc(r.description)}~~`
        : markMd(r.description, rc);
      const acs = r.acceptance_criteria
        .filter(a => a.status !== 'deleted' || marked)
        .sort((a, b) => a.order - b.order)
        .map(a => {
          const ac = cidx.ac[a.ac_id];
          const body = a.status === 'deleted' && !ac ? `~~${mdEsc(a.content)}~~` : markMd(a.content, ac);
          return `**${a.ac_id}** ${body}`;
        })
        .join('<br>');
      lines.push(`| **${r.req_id}** | ${desc} | ${acs} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderHtml(prd, cidx, marked) {
  const groups = groupByChannel(prd);
  const sections = [];
  for (const ch of ['mobile', 'desktop']) {
    const reqs = groups[ch].filter(r => r.status !== 'deleted' || marked);
    if (reqs.length === 0) continue;
    const rows = reqs.map(r => {
      const rc = cidx.req[r.req_id];
      const desc = r.status === 'deleted' && !rc
        ? `<span style="background-color: yellow"><del>${esc(r.description)}</del></span>`
        : markHtml(r.description, rc);
      const acs = r.acceptance_criteria
        .filter(a => a.status !== 'deleted' || marked)
        .sort((a, b) => a.order - b.order)
        .map(a => {
          const ac = cidx.ac[a.ac_id];
          const body = a.status === 'deleted' && !ac
            ? `<span style="background-color: yellow"><del>${esc(a.content)}</del></span>`
            : markHtml(a.content, ac);
          return `<div><strong>${esc(a.ac_id)}</strong> ${body}</div>`;
        })
        .join('');
      return `<tr><td><strong>${esc(r.req_id)}</strong></td><td>${desc}</td><td>${acs}</td></tr>`;
    }).join('\n');
    sections.push(`<h2>${CHANNEL_TITLE[ch]}</h2>
<table border="1" cellspacing="0" cellpadding="6">
<thead><tr><th>Requirement ID</th><th>Structured Requirement Description</th><th>Acceptance Criteria</th></tr></thead>
<tbody>
${rows}
</tbody></table>`);
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(prd.title)} — PRD v${esc(prd.version)}</title>
<style>body{font-family:-apple-system,"Segoe UI",Arial,sans-serif;max-width:1200px;margin:2em auto;padding:0 1em;color:#222}table{width:100%;border-collapse:collapse}th{background:#f2f2f2;text-align:left}td{vertical-align:top}h1{border-bottom:2px solid #ddd;padding-bottom:.3em}.meta{color:#666;margin-bottom:1.5em}</style>
</head>
<body>
<h1>${esc(prd.title)}</h1>
<p class="meta">PRD ID: ${esc(prd.prd_id)} | Version: ${esc(prd.version)}</p>
${sections.join('\n')}
<script type="application/json" id="prd-data">
${JSON.stringify(prd, null, 2)}
</script>
</body>
</html>
`;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) die('usage: node render_prd.js <prd.json> [--changes changes.json] [--out-dir dir]');
  const prd = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  const chIdx = args.indexOf('--changes');
  const changes = chIdx >= 0 ? JSON.parse(fs.readFileSync(args[chIdx + 1], 'utf8')) : null;
  const odIdx = args.indexOf('--out-dir');
  const outDir = odIdx >= 0 ? args[odIdx + 1] : '.';

  const marked = !!changes;
  const cidx = buildChangeIndex(changes);
  const slug = slugOf(prd);
  const mdPath = path.join(outDir, `${slug}-prd-v${prd.version}.md`);
  const htmlPath = path.join(outDir, `${slug}-prd-v${prd.version}.html`);
  fs.writeFileSync(mdPath, renderMd(prd, cidx, marked));
  fs.writeFileSync(htmlPath, renderHtml(prd, cidx, marked));
  console.log(`OK: ${mdPath}`);
  console.log(`OK: ${htmlPath}${marked ? '（含变更标记）' : ''}`);
}

main();
