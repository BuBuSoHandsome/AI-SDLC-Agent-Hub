#!/usr/bin/env node
/**
 * build_prd.js — 将 Agent 产出的中间产物（draft JSON）构建为合法 PRD JSON。
 * 负责：分配 req_id / ac_id / order / content_hash / status，校验 labels 取值。
 * 用法: node build_prd.js <draft.json> [-o output.json] [--version 1.0]
 */
'use strict';
const fs = require('fs');
const crypto = require('crypto');

const COVERS = ['happy_path', 'edge_case', 'error_path'];
const BEHAVIORS = ['navigation', 'validation', 'display', 'interaction', 'state_change', 'notification', 'permission'];
const CHANNEL_PREFIX = { mobile: 'OHM', desktop: 'OHI' };

function die(msg) { console.error('ERROR: ' + msg); process.exit(1); }

function hashContent(text) {
  return 'sha256:' + crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function reqHash(req) {
  const norm = JSON.stringify({
    description: req.description,
    acs: req.acceptance_criteria.map(a => a.content)
  });
  return hashContent(norm);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) die('usage: node build_prd.js <draft.json> [-o output.json] [--version 1.0]');
  const draftPath = args[0];
  const outIdx = args.indexOf('-o');
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;
  const verIdx = args.indexOf('--version');
  const version = verIdx >= 0 ? args[verIdx + 1] : '1.0';

  const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
  if (!draft.prd_id) die('draft 缺少 prd_id');
  if (!Array.isArray(draft.requirements)) die('draft 缺少 requirements 数组');

  // 编号器：按前缀独立计数（新文档从 1 开始；合并走 apply_patch.js）
  const counters = { OHM: 0, OHI: 0 };

  // 第一遍：分配 req_id
  const reqs = draft.requirements.map((r, i) => {
    if (!r.channel || !CHANNEL_PREFIX[r.channel]) die(`requirements[${i}] 缺少合法 channel（mobile/desktop）`);
    if (!r.description) die(`requirements[${i}] 缺少 description`);
    const prefix = CHANNEL_PREFIX[r.channel];
    const id = `${prefix}-REQ-${String(++counters[prefix]).padStart(2, '0')}`;
    return { ...r, req_id: id, _index: i };
  });

  // 第二遍：解析 twin_of（可引用 draft 内序号 0-based 或已有 req_id）
  for (const r of reqs) {
    if (r.twin_of === null || r.twin_of === undefined) { r.twin_id = null; continue; }
    const t = typeof r.twin_of === 'number' ? reqs[r.twin_of] : reqs.find(x => x.req_id === r.twin_of);
    if (!t) die(`${r.req_id} 的 twin_of 无法解析: ${r.twin_of}`);
    r.twin_id = t.req_id;
  }
  // twin 对称性检查
  for (const r of reqs) {
    if (r.twin_id) {
      const t = reqs.find(x => x.req_id === r.twin_id);
      if (t.twin_id && t.twin_id !== r.req_id) die(`twin 不对称: ${r.req_id} -> ${r.twin_id} -> ${t.twin_id}`);
      t.twin_id = r.req_id;
      if (r.channel === t.channel) die(`twin 双方渠道相同: ${r.req_id} / ${t.req_id}`);
    }
  }

  // 第三遍：组装正式对象
  const out = reqs.map((r, i) => {
    const labels = r.labels || {};
    if (labels.surface && !Array.isArray(labels.surface)) die(`${r.req_id} labels.surface 必须是数组`);
    if (!Array.isArray(labels.keywords) || labels.keywords.length === 0) die(`${r.req_id} labels.keywords 必须是非空数组`);

    const acs = (r.acceptance_criteria || []).map((a, j) => {
      if (!a.content) die(`${r.req_id} 的 acceptance_criteria[${j}] 缺少 content`);
      const al = a.labels || {};
      if (!COVERS.includes(al.covers)) die(`${r.req_id}-AC 的 covers 非法: ${al.covers}（允许: ${COVERS.join('/')}）`);
      const beh = Array.isArray(al.behavior) ? al.behavior : [al.behavior];
      for (const b of beh) if (!BEHAVIORS.includes(b)) die(`${r.req_id}-AC 的 behavior 非法: ${b}（允许: ${BEHAVIORS.join('/')}）`);
      if (typeof al.testable !== 'boolean') die(`${r.req_id}-AC 的 testable 必须是布尔值`);
      return {
        ac_id: `${r.req_id}-AC-${String(j + 1).padStart(2, '0')}`,
        status: 'active',
        order: j + 1,
        content: a.content,
        labels: { covers: al.covers, behavior: beh, testable: al.testable, keywords: al.keywords || [] }
      };
    });
    if (acs.length === 0) die(`${r.req_id} 没有验收标准`);

    const req = {
      req_id: r.req_id,
      status: 'active',
      twin_id: r.twin_id,
      order: i + 1,
      description: r.description,
      labels: { surface: labels.surface || [], keywords: labels.keywords },
      acceptance_criteria: acs
    };
    req.content_hash = reqHash(req);
    return req;
  });

  const prd = {
    prd_id: draft.prd_id,
    title: draft.title || draft.prd_id,
    version,
    created_at: new Date().toISOString(),
    impacted_channels: draft.impacted_channels || [],
    requirements: out
  };

  const text = JSON.stringify(prd, null, 2);
  if (outPath) { fs.writeFileSync(outPath, text); console.log(`OK: ${outPath}（${out.length} 条需求）`); }
  else console.log(text);
}

main();
