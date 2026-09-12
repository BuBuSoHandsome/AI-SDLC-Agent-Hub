# PRD JSON Schema 定义

PRD JSON 是 PRD 的 Single Source of Truth（SoT）。PRD md 和 PRD html 均由它单向渲染生成；任何修改必须先改 JSON 再重新渲染，禁止直接编辑 md/html。

## 1. 顶层结构

```json
{
  "prd_id": "PRD-DCL-001",
  "title": "Debt Consolidation Loan Application",
  "version": "1.0",
  "created_at": "2026-09-12T10:00:00+08:00",
  "impacted_channels": ["mobile", "desktop"],
  "requirements": [ ... ]
}
```

| 字段 | 说明 |
|---|---|
| `prd_id` | 稳定身份标识，跨版本不变。首次生成时从需求标题派生 slug（`PRD-{SLUG}-{序号}`），向用户确认一次后终生不变。 |
| `version` | 首次生成为 `1.0`；合并后版本号由人在追审时指定。 |
| `impacted_channels` | 文档级渠道声明，取值 `mobile` / `desktop`。 |
| `requirements` | 扁平需求数组，无嵌套层级。 |

## 2. Requirement 对象

```json
{
  "req_id": "OHM-REQ-07",
  "status": "active",
  "twin_id": "OHI-REQ-03",
  "order": 7,
  "description": "英文需求描述（结构化精炼自然语言）",
  "labels": {
    "surface": ["DCL form input page"],
    "keywords": ["timeout", "cancel"]
  },
  "acceptance_criteria": [ ... ],
  "content_hash": "sha256:..."
}
```

| 字段 | 规则 |
|---|---|
| `req_id` | 格式 `OHM-REQ-{nn}`（mobile）/ `OHI-REQ-{nn}`（desktop）。**渠道由 ID 前缀编码，无单独 channel 字段**。按前缀独立计数：新增 = 该前缀历史最大号 + 1（含已删除条目）；删除留断号，ID 永不复用。**只能由脚本分配，Agent 禁止手写。** |
| `status` | `active`（默认）/ `deleted`（tombstone）。删除是状态变更而非物理移除，内容完整保留。 |
| `twin_id` | 双渠道冗余时的孪生 req_id，单渠道为 `null`。双向对称：A 指向 B 则 B 必须指向 A。 |
| `order` | 全局连续序号（跨渠道统一编号），决定渲染顺序。 |
| `description` | 英文。遵循 splitting-rules.md 第 9 节。 |
| `labels.surface` | 界面载体，自由文本数组（页面/弹窗/overlay/全局组件/触达渠道）。仅作软匹配加分，不做硬过滤。 |
| `labels.keywords` | 语义锚点数组，跟随产物语言（英文）。 |
| `content_hash` | 由脚本对规范化后的 description + AC 内容计算，用于"未触碰条目不变"校验。 |
| `deleted_in_version` | 仅 tombstone：删除发生的版本号。 |
| `deleted_reason` | 仅 tombstone：删除原因（引用追审单决策）。tombstone 只读，恢复走 reopen 决策。 |

## 3. AcceptanceCriteria 对象

```json
{
  "ac_id": "OHM-REQ-07-AC-02",
  "status": "active",
  "order": 2,
  "content": "WHEN the customer clicks ..., the system shall ...",
  "labels": {
    "covers": "happy_path",
    "behavior": ["validation"],
    "testable": true,
    "keywords": ["continue", "inline error"]
  }
}
```

| 字段 | 规则 |
|---|---|
| `ac_id` | `{req_id}-AC-{nn}`，在所属 requirement 内连续编号；AC 删除同样留断号。 |
| `content` | 英文，EARS 五种句型之一（splitting-rules.md 第 8 节），一条 AC 只验证一个行为。 |
| `labels.covers` | 场景分类（单值）：`happy_path` / `edge_case` / `error_path`。合并判重先按 covers 分桶。 |
| `labels.behavior` | 行为类型（可多值）：`navigation` / `validation` / `display` / `interaction` / `state_change` / `notification` / `permission`。优先拆分为单行为 AC，强耦合时才多值。 |
| `labels.testable` | 布尔。结果可观察才可验收；`false` 的 AC 在校验时告警。 |
| `labels.keywords` | AC 级语义锚点（比 requirement 的更细粒度）。 |

注意：AC **不继承** requirement 的 labels（surface/keywords 各自独立标注；渠道归属由 ac_id 前缀天然携带）。

## 4. Agent 中间产物格式（draft）

Agent 产出内容草稿，脚本负责机械补全。draft 是合法 JSON，字段与正式 schema 一致，但**禁止出现** `req_id` / `ac_id` / `order` / `content_hash` / `status`（由 `build_prd.js` 分配）：

```json
{
  "prd_id": "PRD-DCL-001",
  "title": "...",
  "impacted_channels": ["mobile"],
  "requirements": [
    {
      "channel": "mobile",
      "twin_of": null,
      "description": "...",
      "labels": { "surface": [...], "keywords": [...] },
      "acceptance_criteria": [
        { "content": "...", "labels": { "covers": "...", "behavior": [...], "testable": true, "keywords": [...] } }
      ]
    }
  ]
}
```

draft 中用 `channel`（mobile/desktop）告知脚本应使用哪个 ID 前缀；`twin_of` 引用同 draft 内另一条需求的序号或已有 req_id。

## 5. 不变量（validate_prd.js 强制校验）

1. req_id / ac_id 全局唯一，前缀与所属一致；
2. active 需求的 order 严格递增无冲突；
3. twin_id 双向对称，且 twin 双方渠道前缀不同；
4. 无孤儿 AC（ac_id 前缀必须对应存在的 req_id）；
5. tombstone（status=deleted）内容只读，与删除时一致；
6. 未被本次补丁触碰的条目 content_hash 不变（合并时校验）；
7. labels 取值在允许集合内。
