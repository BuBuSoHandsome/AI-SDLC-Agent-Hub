# 追审单格式（Merge Review）

合并产出追审单：对话式逐条确认为主，同时落一份 md 文件（`<title>-review-v{X.Y}.md`）供人查阅与留痕。最终以对话确认为准。

## 1. 决策类型

`add`（新增）/ `modify`（修改）/ `merge`（合并入已有需求）/ `delete`（废弃）/ `reopen`（恢复已删除）/ `clarify`（待澄清）。

## 2. 风险分层

每条决策带 `confidence`（0~1）与 `risk`（low/medium/high），决定展示分组：

- ⚠️ **必须处理**（阻塞定版）：clarify、冲突、高风险
- 👀 **建议过目**：中置信度（0.6~0.85）
- ✅ **可批量接受**：高置信度（>0.85）且低风险

## 3. 单条决策格式（md）

```markdown
### [D-003] 🔀 建议合并 — delta「订单超时取消」→ OHM-REQ-07
- **置信度**: 0.87 | **风险**: medium
- **依据**: keywords 重叠 2/4（timeout, cancel）；surface 匹配（Order List Page）；delta 为存量超集
- **变更预览**:
  - + OHM-REQ-07-AC-04: WHEN the order remains unpaid for 30 minutes, the system shall ...
- **twin**: OHI-REQ-03（desktop 孪生）→ 需决策: [两边同步改] [只改 mobile] [解除孪生]
- **备选**: [合并] [保留两条] [编辑]
- **裁决**: accept / reject / edit / defer（人填）
```

## 4. clarify 决策格式

```markdown
### [D-007] ❓ 需要澄清 — delta「提升响应速度」归属不明
- **候选**: OHM-REQ-12 (0.61) / OHM-REQ-04 (0.42)
- **缺少信息**: 目标需求、量化指标
- **裁决**: （人填：指定归属 / 补充信息 / 挂起）
```

## 5. 决策状态机

```
pending → auto_accepted → locked          （低风险高置信，可批量通过）
pending → accepted | rejected | edited → locked
pending → needs_clarification → clarified → accepted → locked
任何状态 → deferred                        （挂起，不阻塞其余决策，但阻塞版本定版）
```

## 6. 追审单骨架

```markdown
# 追审单 MR-{date}-{seq}
基线: {prd_id} v{old} → v{new}（版本号待人指定） | delta: {来源文件}
共 {n} 项决策：⚠️ {x} 项待处理 | 👀 {y} 项建议过目 | ✅ {z} 项可批量接受

## ⚠️ 第一部分：必须处理（阻塞定版）
...

## 👀 第二部分：建议过目
...

## ✅ 第三部分：可批量接受
...

## 🛡️ 机器校验（validate_prd.js 输出）
- [ ] 未触碰的 {n} 条需求 content_hash 一致
- [ ] 无孤儿 AC
- [ ] ID 无冲突、无复用
- [ ] twin 关系对称
```

## 7. 交互原则

1. 人审的是**决策清单**，不是重写后的 PRD 全文；
2. 每条决策必须附**判断依据**（来自 labels 的可解释证据）；
3. 变更以 diff 预览呈现，永不出全文；
4. AI 不敢猜的部分必须问（clarify），不得静默处理；
5. 全部决策 locked 后才允许 apply_patch.js 生成新版本。
