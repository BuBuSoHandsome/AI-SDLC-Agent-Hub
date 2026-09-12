#!/usr/bin/env node
/**
 * apply_patch.js — 将人审通过的追审补丁应用到存量 PRD JSON，生成新版 JSON + 变更清单。
 * 用法: node apply_patch.js <old-prd.json> <patch.json> --version <X.Y> [-o new.json] [--changes changes.json]
 *
 * patch.json 格式（仅包含人审 accepted/edited 的决策）:
 * {
 *   "decisions": [
 *     { "op": "add",    "channel": "mobile", "description": "...", "labels": {...}, "acceptance_criteria": [{content, labels}], "twin_of": "OHI-REQ-03"|null, "after_req_id": null|"OHM-REQ-05" },
 *     { "op": "modify", "req_id": "OHM-REQ-02", "description": "新描述", "labels": {...} },
 *     { "op": "modify", "req_id": "OHM-REQ-02", "ac_id": "OHM-REQ-02-AC-01", "content": "新AC", "labels": {...} },
 *     { "op": "merge",  "req_id": "OHM-REQ-07", "add_acs": [{content, labels}], "description": "可选：同时更新描述" },
 *     { "op": "delete", "req_id": "OHM-REQ-02", "reason": "..." },
 *     { "op": "delete", "req_id": "OHM-REQ-02", "ac_id": "OHM-REQ-02-AC-01", "reason": "..." },
 *     { "op": "reopen", "req_id": "OHM-REQ-02" },
 *     { "op": "unlink_twin", "req_id": "OHM-REQ-01" }
 *   ]
 * }
 */
'use strict';
const fs = require('fs');
const crypto = require('crypto');

const COVERS = ['happy_path', 'edge_case', 'error_path'];
const BEHAVIORS = ['navigation', 'validation', 'display', 'interaction', 'state_change', 'notification', 'permission'];
const CHANNEL_PREFIX = { mobile: 'OHM', desktop: 'OHI' };

function die(msg) { console.error('ERROR: ' + msg); process.exit(1); }
function hashReq(req) {
  return 'sha256:' + crypto.createHash('sha256')
    .update(JSON.stringify({ description: req.description, acs: req.acceptance_criteria.map(a => a.content) }), 'utf8')
    .digest('hex');
}
function prefixOf(reqId) { const m = reqId.match(/^(OH[MI])-REQ-/); if (!m) die(`req_id 格式非法: ${reqId}`); return m[1]; }

function nextReqId(allReqs, prefix) {
  let max = 0;
  for (const r of allReqs) {
    const m = r.req_id.match(new RegExp(`^${prefix}-REQ-(\\d+)$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-REQ-${String(max + 1).padStart(2, '0')}`;
}
function nextAcId(req) {
  let max = 0;
  for (const a of req.acceptance_criteria) {
    const m = a.ac_id.match(/-AC-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${req.req_id}-AC-${String(max + 1).padStart(2, '0')}`;
}
function validateAcLabels(labels, ctx) {
  if (!COVERS.includes(labels.covers)) die(`${ctx} covers 非法: ${labels.covers}`);
  const beh = Array.isArray(labels.behavior) ? labels.behavior : [labels.behavior];
  for (const b of beh) if (!BEHAVIORS.includes(b)) die(`${ctx} behavior 非法: ${b}`);
  return { covers: labels.covers, behavior: beh, testable: labels.testable === true, keywords: labels.keywords || [] };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 4) die('usage: node apply_patch.js <old-prd.json> <patch.json> --version <X.Y> [-o new.json] [--changes changes.json]');
  const prd = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  const patch = JSON.parse(fs.readFileSync(args[1], 'utf8'));
  const verIdx = args.indexOf('--version');
  if (verIdx < 0) die('缺少 --version');
  const newVersion = args[verIdx + 1];
  const outIdx = args.indexOf('-o');
  const chIdx = args.indexOf('--changes');

  if (!Array.isArray(patch.decisions)) die('patch 缺少 decisions 数组');
  const byId = new Map(prd.requirements.map(r => [r.req_id, r]));
  const changes = { prd_id: prd.prd_id, from_version: prd.version, to_version: newVersion, items: [] };

  for (const d of patch.decisions) {
    switch (d.op) {
      case 'add': {
        const prefix = CHANNEL_PREFIX[d.channel] || die(`add 决策缺少合法 channel: ${JSON.stringify(d)}`);
        const req = {
          req_id: nextReqId(prd.requirements, prefix),
          status: 'active',
          twin_id: d.twin_of || null,
          order: 0, // 稍后统一计算
          description: d.description || die('add 决策缺少 description'),
          labels: { surface: (d.labels && d.labels.surface) || [], keywords: (d.labels && d.labels.keywords) || die('add 决策缺少 labels.keywords') },
          acceptance_criteria: (d.acceptance_criteria || []).map((a, j) => ({
            ac_id: '', order: j + 1, status: 'active', content: a.content,
            labels: validateAcLabels(a.labels || {}, 'add 决策的 AC')
          }))
        };
        if (req.acceptance_criteria.length === 0) die('add 决策没有验收标准');
        req.acceptance_criteria.forEach(a => { a.ac_id = `${req.req_id}-AC-${String(a.order).padStart(2, '0')}`; });
        req.content_hash = hashReq(req);
        if (req.twin_id) {
          const twin = byId.get(req.twin_id);
          if (!twin) die(`add 的 twin_of 不存在: ${req.twin_id}`);
          if (twin.twin_id) die(`${req.twin_id} 已有 twin: ${twin.twin_id}`);
          twin.twin_id = req.req_id;
          twin.content_hash = hashReq(twin);
        }
        req._after = d.after_req_id || null;
        prd.requirements.push(req);
        byId.set(req.req_id, req);
        changes.items.push({ type: 'add', req_id: req.req_id });
        break;
      }
      case 'modify': {
        const req = byId.get(d.req_id) || die(`modify 目标不存在: ${d.req_id}`);
        if (req.status === 'deleted') die(`modify 目标是 tombstone: ${d.req_id}`);
        if (d.ac_id) {
          const ac = req.acceptance_criteria.find(a => a.ac_id === d.ac_id) || die(`AC 不存在: ${d.ac_id}`);
          if (ac.status === 'deleted') die(`modify 的 AC 是 tombstone: ${d.ac_id}`);
          changes.items.push({ type: 'modify', req_id: d.req_id, ac_id: d.ac_id, old_content: ac.content });
          ac.content = d.content || die('modify AC 缺少 content');
          if (d.labels) ac.labels = validateAcLabels(d.labels, d.ac_id);
        } else {
          changes.items.push({ type: 'modify', req_id: d.req_id, old_content: req.description });
          req.description = d.description || die('modify 缺少 description');
          if (d.labels) req.labels = { surface: d.labels.surface || req.labels.surface, keywords: d.labels.keywords || req.labels.keywords };
        }
        req.content_hash = hashReq(req);
        break;
      }
      case 'merge': {
        const req = byId.get(d.req_id) || die(`merge 目标不存在: ${d.req_id}`);
        if (req.status === 'deleted') die(`merge 目标是 tombstone: ${d.req_id}`);
        if (d.description) {
          changes.items.push({ type: 'modify', req_id: d.req_id, old_content: req.description });
          req.description = d.description;
        }
        for (const a of d.add_acs || []) {
          const ac = {
            ac_id: nextAcId(req), status: 'active',
            order: req.acceptance_criteria.length + 1,
            content: a.content || die('merge 的 add_acs 缺少 content'),
            labels: validateAcLabels(a.labels || {}, 'merge 的新增 AC')
          };
          req.acceptance_criteria.push(ac);
          changes.items.push({ type: 'add', req_id: d.req_id, ac_id: ac.ac_id });
        }
        req.content_hash = hashReq(req);
        break;
      }
      case 'delete': {
        const req = byId.get(d.req_id) || die(`delete 目标不存在: ${d.req_id}`);
        if (d.ac_id) {
          const ac = req.acceptance_criteria.find(a => a.ac_id === d.ac_id) || die(`AC 不存在: ${d.ac_id}`);
          if (ac.status === 'deleted') die(`AC 已是 tombstone: ${d.ac_id}`);
          ac.status = 'deleted';
          ac.deleted_in_version = newVersion;
          changes.items.push({ type: 'delete', req_id: d.req_id, ac_id: d.ac_id });
        } else {
          if (req.status === 'deleted') die(`需求已是 tombstone: ${d.req_id}`);
          req.status = 'deleted';
          req.deleted_in_version = newVersion;
          req.deleted_reason = d.reason || '';
          changes.items.push({ type: 'delete', req_id: d.req_id, old_content: req.description });
        }
        req.content_hash = hashReq(req);
        break;
      }
      case 'reopen': {
        const req = byId.get(d.req_id) || die(`reopen 目标不存在: ${d.req_id}`);
        if (req.status !== 'deleted') die(`reopen 目标不是 tombstone: ${d.req_id}`);
        req.status = 'active';
        delete req.deleted_in_version;
        delete req.deleted_reason;
        req.content_hash = hashReq(req);
        changes.items.push({ type: 'add', req_id: d.req_id });
        break;
      }
      case 'unlink_twin': {
        const req = byId.get(d.req_id) || die(`unlink_twin 目标不存在: ${d.req_id}`);
        if (req.twin_id) {
          const twin = byId.get(req.twin_id);
          if (twin && twin.twin_id === req.req_id) { twin.twin_id = null; twin.content_hash = hashReq(twin); }
          req.twin_id = null;
          req.content_hash = hashReq(req);
        }
        break;
      }
      default:
        die(`未知 op: ${d.op}`);
    }
  }

  // 统一重排 order：active 保持相对顺序；add 的 _after 指定插入点
  const adds = prd.requirements.filter(r => r._after !== undefined);
  const others = prd.requirements.filter(r => r._after === undefined);
  let seq = others.filter(r => r.status !== 'deleted').sort((a, b) => a.order - b.order);
  const finalSeq = [];
  const addQueue = [...adds];
  for (const r of seq) {
    finalSeq.push(r);
    for (let i = addQueue.length - 1; i >= 0; i--) {
      if (addQueue[i]._after === r.req_id) { finalSeq.push(addQueue[i]); addQueue.splice(i, 1); }
    }
  }
  finalSeq.push(...addQueue); // 未指定位置的追加到末尾
  finalSeq.forEach((r, i) => { r.order = i + 1; delete r._after; });
  prd.requirements.forEach(r => delete r._after);

  prd.version = newVersion;

  const text = JSON.stringify(prd, null, 2);
  if (outIdx >= 0) { fs.writeFileSync(args[outIdx + 1], text); console.log(`OK: ${args[outIdx + 1]}（v${newVersion}）`); }
  else console.log(text);
  if (chIdx >= 0) { fs.writeFileSync(args[chIdx + 1], JSON.stringify(changes, null, 2)); console.log(`OK: ${args[chIdx + 1]}（${changes.items.length} 项变更）`); }
}

main();
