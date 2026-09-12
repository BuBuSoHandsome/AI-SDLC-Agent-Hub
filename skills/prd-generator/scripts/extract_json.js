#!/usr/bin/env node
/**
 * extract_json.js — 从 PRD html 中抽出内嵌的 PRD JSON。
 * 用法: node extract_json.js <prd.html> [-o output.json]
 */
'use strict';
const fs = require('fs');

function die(msg) { console.error('ERROR: ' + msg); process.exit(1); }

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) die('usage: node extract_json.js <prd.html> [-o output.json]');
  const html = fs.readFileSync(args[0], 'utf8');
  const m = html.match(/<script\s+type="application\/json"\s+id="prd-data">([\s\S]*?)<\/script>/);
  if (!m) die('html 中未找到 <script type="application/json" id="prd-data"> 内嵌数据');
  let prd;
  try { prd = JSON.parse(m[1].trim()); } catch (e) { die('内嵌 JSON 解析失败: ' + e.message); }
  if (!prd.prd_id || !Array.isArray(prd.requirements)) die('内嵌数据不是合法 PRD JSON（缺 prd_id 或 requirements）');

  const outIdx = args.indexOf('-o');
  if (outIdx >= 0) { fs.writeFileSync(args[outIdx + 1], JSON.stringify(prd, null, 2)); console.log(`OK: ${args[outIdx + 1]}`); }
  else console.log(JSON.stringify(prd, null, 2));
}

main();
