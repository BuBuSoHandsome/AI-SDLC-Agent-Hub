# 合并工作流细节（工作流二）

输入：存量 PRD（html 或 json）+ delta 需求文档（标准模板，**永远单渠道**）。输出：新版本三件套（json/md/html，带变更标记）+ 追审单 md。

## 1. 总流程

```
1. 提取存量 JSON
   - 输入为 html：运行 extract_json.js 抽出内嵌 JSON
   - 输入为 json：直接使用
2. delta 结构化
   - delta 走工作流一完整拆分逻辑（splitting-rules.md + labeling-guide.md）
   - 产出 delta draft（中间产物，不含 ID）
3. 对齐（alignment）
   - 见第 2 节
4. 生成追审单（review-format.md）并落 md 文件
5. 对话式逐条/分组确认（人审）
   - 此时向人询问新版本号
6. 人审通过后运行 apply_patch.js 生成新版 JSON + 变更清单
7. 运行 validate_prd.js 校验不变量
8. 运行 render_prd.js（带标记模式）产出新版 md/html
```

## 2. 对齐规则

### 2.1 渠道硬过滤（可靠）

delta 单渠道 → 只与存量 JSON 中**同前缀**的 active 需求比对：
- delta 是 mobile → 只比对 `OHM-*`
- delta 是 desktop → 只比对 `OHI-*`

跨渠道误合并被结构性杜绝。

### 2.2 候选排序（软匹配）

对每条 delta requirement，与同渠道存量需求计算相似度：

1. `keywords` 重叠度（主信号）：重叠词数 / 并集词数；
2. `surface` 匹配（加分项，命名漂移常见，匹配上加分、不匹配不扣分）；
3. description 语义相似度（Agent 判断）。

取 top N（建议 5）候选进入逐条精判。

### 2.3 精判决策

Agent 对每个候选对判断关系：

- `merge`：delta 与存量描述同一功能 → 合并（通常为存量补充 AC 或修改描述）
- `add`：无足够相似候选 → 全新需求
- `modify`：delta 明确改变存量需求的既有行为
- `clarify`：无法确定，请求人澄清

**删除**：模板无删除语义。用户口头/文字说明要废弃某条需求时，Agent 识别后生成 `delete` 决策进追审单。

### 2.4 twin 联动（强制）

任何 modify/merge/delete 决策命中带 `twin_id` 的需求时：

1. 自动把孪生需求拉入同一条追审决策；
2. 人审时必须显式三选一：**两边同步改 / 只改本渠道 / 解除孪生关系**；
3. AI 不得自行决定孪生是否跟随（delta 单渠道，另一边必须人来定）。

## 3. 应用补丁规则（apply_patch.js 实现）

| 决策 | 行为 |
|---|---|
| `add` | 新需求：req_id = 该前缀历史最大号 + 1（含 tombstone）；order 默认追加到该渠道末尾，除非人审指定位置 |
| `modify` | 保留 req_id，替换内容，重算 hash；AC 修改保留 ac_id 只变 content |
| `merge` | 保留存量 req_id，将 delta 内容并入（新增 AC 取该需求内最大 AC 号 + 1） |
| `delete` | 置 `status: deleted`，写 `deleted_in_version` / `deleted_reason`，内容保留只读 |
| `reopen` | tombstone 恢复为 active（人审显式决策） |

## 4. 变更标记渲染（render_prd.js 带标记模式）

仅工作流二产出的新版 md/html 带标记；干净版渲染不含标记。

| 变更 | md | html |
|---|---|---|
| 新增 | 描述后加 `(***)` | `(***)` + 黄底 |
| 删除 | 整段 `~~删除线~~`（tombstone 内容在原位置渲染） | 删除线 + 黄底 |
| 修改 | `~~原文~~` 紧跟新内容 | 同上 + 黄底 |

修改的标记粒度为**整段**：整个旧 description/AC content 打删除线，后接新内容，不做词级 diff。

## 5. 版本与文件

- 版本号由人在追审时指定（无固定递增规则）；
- 新旧文件并存，命名 `<title>-prd-v{X.Y}.{json,md,html}`；
- 追审单落 `<title>-review-v{X.Y}.md`。
