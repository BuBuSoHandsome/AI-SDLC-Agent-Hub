#!/usr/bin/env node
/**
 * Render a three-column logic-flow diagram HTML from a JSON spec.
 *
 * Usage:
 *   node render_diagram.js spec.json --template assets/diagram-template.html --out /path/to/name
 *
 * Spec format:
 * {
 *   "title": "GET /loans/debt-consolidation",
 *   "subtitle": "optional subtitle line",
 *   "steps": [
 *     {
 *       "cc": [ { "kind": "uml",  "title": "MaskingService（common jar）",
 *                  "lines": ["+ mask(String target, MaskingEnum maskingEnum) : String"] },
 *                { "kind": "file", "title": "contact-prefer-time.json（配置文件）",
 *                  "lines": ["维护 en_hk / zh_hk / zh_cn 的首选联系时间选项列表"] } ],
 *       "cc_arrow": "调用",                // optional label on the cc <- logic arrow
 *       "logic": { "name": "DebtConsolidationController",
 *                   "tag": "4.1 Entry & Routing",           // optional
 *                   "style": "blue",                         // blue | purple | grey
 *                   "bullets": ["接收客户端请求", "..."] },
 *       "err": { "name": "CallCusFailedHandler",
 *                 "tag": "4.6 Call CUS failed",
 *                 "arrow": "获取失败",                       // optional label on logic -> err arrow
 *                 "bullets": ["中止流程，返回 2.2.2 Sample Response 到前端"] }
 *     }
 *   ],
 *   "legend": "说明文字……"
 * }
 *
 * Notes:
 * - Output: <out>.html only.
 * - logic/err bullets may contain inline HTML such as <span class="hl">...</span>;
 *   names/titles/cc lines are HTML-escaped.
 * - Keep bullet lines short; long lines can overflow their box. If a line risks
 *   clipping, split it into two bullets in the spec.
 */

const fs = require("fs");
const path = require("path");

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderCcBox(b) {
  const cls = b.kind === "file" ? "uml cfg" : "uml";
  const lines = (b.lines || []).map(esc).join("<br/>");
  return `<div class="${cls}"><div class="title">${esc(b.title)}</div><div class="body">${lines}</div></div>`;
}

function renderLogicBox(l) {
  const style = { blue: "bl", purple: "bp", grey: "bg" }[l.style || "blue"] || "bl";
  const tag = l.tag ? ` <span class="tag">｜${esc(l.tag)}</span>` : "";
  const bullets = (l.bullets || []).map((b) => `<li>${b}</li>`).join("");
  return `<div class="box ${style}"><h3>${esc(l.name)}${tag}</h3><ul>${bullets}</ul></div>`;
}

function renderErrBox(e) {
  const tag = e.tag ? ` <span class="tag">｜${esc(e.tag)}</span>` : "";
  const bullets = (e.bullets || []).map((b) => `<li>${b}</li>`).join("");
  return `<div class="box be"><h3>${esc(e.name)}${tag}</h3><ul>${bullets}</ul></div>`;
}

function arrow(glyph, label) {
  const lbl = label ? `<span class="lbl">${esc(label)}</span>` : "";
  return `<div class="arrow">${glyph}${lbl}</div>`;
}

function buildBody(spec) {
  const parts = [`<h1>${esc(spec.title)}</h1>`];
  if (spec.subtitle) parts.push(`<div class="sub">${esc(spec.subtitle)}</div>`);
  const g = [
    '<div class="grid">',
    '<div class="colh ch1">common component</div><div></div>',
    '<div class="colh ch2">logic flow</div><div></div>',
    '<div class="colh ch3">error handling</div>',
  ];
  spec.steps.forEach((s, i) => {
    if (i > 0) g.push('<div class="spacer vflow">▼</div>');
    if (s.cc && s.cc.length) {
      g.push(`<div class="cell cellcol">${s.cc.map(renderCcBox).join("")}</div>`);
      g.push(arrow("◀——", s.cc_arrow));
    } else {
      g.push('<div class="cell"></div><div></div>');
    }
    g.push(`<div class="cell">${renderLogicBox(s.logic)}</div>`);
    if (s.err) {
      g.push(arrow("——▶", s.err.arrow));
      g.push(`<div class="cell">${renderErrBox(s.err)}</div>`);
    } else {
      g.push('<div></div><div class="cell"></div>');
    }
  });
  g.push("</div>");
  parts.push(g.join(""));
  if (spec.legend) parts.push(`<div class="legend">${spec.legend}</div>`);
  return parts.join("\n");
}

function main() {
  const argv = process.argv.slice(2);
  const specPath = argv[0];
  const tIdx = argv.indexOf("--template");
  const oIdx = argv.indexOf("--out");
  if (!specPath || tIdx < 0 || oIdx < 0) {
    console.error("Usage: node render_diagram.js spec.json --template <tpl> --out <path>");
    process.exit(1);
  }
  const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));
  const tpl = fs.readFileSync(argv[tIdx + 1], "utf-8");
  const page = tpl.replace("<!--BODY-->", buildBody(spec));
  const outPath = argv[oIdx + 1].endsWith(".html") ? argv[oIdx + 1] : argv[oIdx + 1] + ".html";
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, page, "utf-8");
  console.log(`written: ${outPath}`);
}

main();
