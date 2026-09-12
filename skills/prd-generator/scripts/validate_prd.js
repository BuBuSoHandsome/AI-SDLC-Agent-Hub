#!/usr/bin/env node
/**
 * validate_prd.js — PRD JSON 不变量校验。
 * 用法:
 *   node validate_prd.js <prd.json>                          基础校验
 *   node validate_prd.js <prd.json> --base <old-prd.json> --changes <changes.json>   合并后校验（含"未触碰条目不变"）
 */
'use strict';
const fs = require('fs');
const crypto = require('crypto');

const COVERS = ['happy_path', 'edge_case', 'error_path'];
const BEHAVIORS = ['navigation', 'validation', 'display', 'interaction', 'state_change', 'notification', 'permission'];

function hashReq(req) {
  return 'sha256:' + crypto.createHash('sha256')
    .update(JSON.stringify({ description: req.description, acs: req.acceptance_criteria.map(a => a.content) }), 'utf8')
    .digest('hex');
}

const errors = [];
const warnings = [];
function err(m) { errors.push(m); }
function warn(m) { warnings.push(m); }

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) { console.error('usage: node validate_prd.js <prd.json> [--base old.json --changes changes.json]'); process.exit(1); }
  const prd = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  const baseIdx = args.indexOf('--base');
  const chIdx = args.indexOf('--changes');
  const base = baseIdx >= 0 ? JSON.parse(fs.readFileSync(args[baseIdx + 1], 'utf8')) : null;
  const changes = chIdx >= 0 ? JSON.parse(fs.readFileSync(args[chIdx + 1], 'utf8')) : null;

  if (!prd.prd_id) err('缺少 prd_id');
  if (!prd.version) err('缺少 version');
  if (!Array.isArray(prd.requirements)) err('requirements 不是数组');
  const reqs = prd.requirements || [];

  // 1. ID 唯一性与格式
  const seen = new Set();
  for (const r of reqs) {
    if (!/^(OHM|OHI)-REQ-\d+$/.test(r.req_id)) err(`req_id 格式非法: ${r.req_id}`);
    if (seen.has(r.req_id)) err(`req_id 重复: ${r.req_id}`);
    seen.add(r.req_id);
    const acSeen = new Set();
    for (const a of r.acceptance_criteria || []) {
      if (!a.ac_id.startsWith(r.req_id + '-AC-')) err(`孤儿/错配 AC: ${a.ac_id} 不属于 ${r.req_id}`);
      if (acSeen.has(a.ac_id)) err(`ac_id 重复: ${a.ac_id}`);
      acSeen.add(a.ac_id);
      const al = a.labels || {};
      if (!COVERS.includes(al.covers)) err(`${a.ac_id} covers 非法: ${al.covers}`);
      for (const b of al.behavior || []) if (!BEHAVIORS.includes(b)) err(`${a.ac_id} behavior 非法: ${b}`);
      if (al.testable === false) warn(`${a.ac_id} 标记为不可测试（testable=false）`);
      if (a.status === 'deleted' && !a.deleted_in_version) err(`${a.ac_id} 是 tombstone 但缺 deleted_in_version`);
    }
    if (!Array.isArray(r.labels?.keywords) || r.labels.keywords.length === 0) warn(`${r.req_id} 缺少 keywords`);
    if (r.status === 'deleted' && !r.deleted_in_version) err(`${r.req_id} 是 tombstone 但缺 deleted_in_version`);
    if (!['active', 'deleted'].includes(r.status)) err(`${r.req_id} status 非法: ${r.status}`);
  }

  // 2. order 唯一（active 范围内）
  const orderSeen = new Map();
  for (const r of reqs.filter(x => x.status === 'active')) {
    if (orderSeen.has(r.order)) err(`order 冲突: ${r.req_id} 与 ${orderSeen.get(r.order)} 同为 ${r.order}`);
    orderSeen.set(r.order, r.req_id);
  }

  // 3. twin 对称性 + 跨渠道
  const byId = new Map(reqs.map(r => [r.req_id, r]));
  for (const r of reqs) {
    if (!r.twin_id) continue;
    const t = byId.get(r.twin_id);
    if (!t) { err(`${r.req_id} 的 twin_id 指向不存在的 ${r.twin_id}`); continue; }
    if (t.twin_id !== r.req_id) err(`twin 不对称: ${r.req_id} -> ${r.twin_id}，但反向为 ${t.twin_id}`);
    if (r.req_id.slice(0, 3) === t.req_id.slice(0, 3)) err(`twin 双方渠道相同: ${r.req_id} / ${t.req_id}`);
  }

  // 4. content_hash 自洽
  for (const r of reqs) {
    if (r.content_hash && r.content_hash !== hashReq(r)) err(`${r.req_id} content_hash 与内容不符`);
  }

  // 5. 合并校验：未触碰条目的 hash 必须与 base 一致
  if (base && changes) {
    const touched = new Set();
    for (const c of changes.items || []) touched.add(c.req_id);
    const baseById = new Map(base.requirements.map(r => [r.req_id, r]));
    let unchanged = 0;
    for (const [id, b] of baseById) {
      if (touched.has(id)) continue;
      const cur = byId.get(id);
      if (!cur) { err(`未被补丁触碰的条目在新版中消失: ${id}`); continue; }
      if (cur.content_hash !== b.content_hash) err(`未被补丁触碰的条目内容被修改: ${id}`);
      if (cur.status !== b.status) err(`未被补丁触碰的条目状态变化: ${id}`);
      unchanged++;
    }
    console.log(`未触碰条目校验: ${unchanged} 条一致`);
  }

  // 输出
  for (const w of warnings) console.log('WARN: ' + w);
  if (errors.length) {
    for (const e of errors) console.error('FAIL: ' + e);
    console.error(`\n校验未通过：${errors.length} 个错误，${warnings.length} 个警告`);
    process.exit(1);
  }
  console.log(`校验通过：${reqs.length} 条需求（active ${reqs.filter(r => r.status === 'active').length} / deleted ${reqs.filter(r => r.status === 'deleted').length}），${warnings.length} 个警告`);
}

main();
