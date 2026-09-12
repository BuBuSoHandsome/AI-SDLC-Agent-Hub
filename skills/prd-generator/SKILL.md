---
name: prd-generator
description: 将标准需求模板文档生成结构化 PRD 三件套（PRD json 作为 Single Source of Truth + PRD md + PRD html），并支持基于 delta 需求合并生成带变更标记的新版本。使用场景：(1) 用户提供按标准模板（Impacted Channels / Common Requirements / Function Entrances / Pages）编写的需求文档，要求生成 PRD；(2) 用户提供已有 PRD html 或 json 加一份 delta 需求，要求合并生成新版本 PRD。PRD 产物语言为英文。
---

# PRD Generator

## 核心原则

1. **PRD json 是 Single Source of Truth**：所有"创作"只发生在 JSON；md/html 由脚本从 JSON 单向渲染；任何修改必须回到 JSON 或合并工作流，禁止直接编辑 md/html。
2. **脚本做机械操作，Agent 做判断**：ID 分配、hash 计算、补丁应用、校验、渲染全部由 scripts/ 完成；Agent 负责拆分、撰写、标注、对齐判断与人审交互。Agent 禁止手写 req_id/ac_id/order/content_hash。
3. **产物语言英文**，labels 跟随产物语言。
4. 拆分规则遵循 references/splitting-rules.md（忠实性优先，禁止臆造，缺失信息走澄清）。

## 工作流一：从需求文档生成 PRD

输入：按标准模板编写的需求文档。

1. 阅读 references/splitting-rules.md，执行 Mandatory Input Detection；存在重大缺口时先向用户提出聚焦澄清问题。
2. 按 splitting-rules.md 拆分结构化需求与 EARS 验收标准，并按 references/labeling-guide.md 同步标注 labels。
3. 从需求标题派生 `prd_id`（`PRD-{SLUG}-{序号}`），**向用户确认一次**；确认输出文件名前缀。
4. 产出中间产物 draft JSON（格式见 references/prd-schema.md 第 4 节；不含 ID/order/hash），写入临时文件。
5. 运行 `node scripts/build_prd.js <draft.json> -o <out.json>` 生成 PRD JSON。
6. 运行 `node scripts/validate_prd.js <out.json>` 校验；失败则修正 draft 后重建。
7. 运行 `node scripts/render_prd.js <out.json> --out-dir <dir>` 生成 md 与 html。
8. 交付三件套：`<slug>-prd-v1.0.json` / `.md` / `.html`。

## 工作流二：合并 delta 需求生成新版本

输入：存量 PRD html 或 json + delta 需求文档（标准模板，单渠道）+ 可选的用户口头删除说明。

1. 提取存量 JSON：输入为 html 时运行 `node scripts/extract_json.js <prd.html> -o <prd.json>`。
2. delta 走工作流一第 1~2 步的拆分逻辑，产出 delta draft（**不运行 build_prd.js**）。
3. 按 references/merge-workflow.md 执行对齐：渠道硬过滤（同 ID 前缀）→ keywords/surface 软匹配 → 逐条精判（add / modify / merge / delete / reopen / clarify）。
4. 按 references/review-format.md 生成追审单 md 文件，并进行对话式逐条/分组确认；twin 联动必须显式决策；此时询问新版本号。
5. 全部决策 locked 后，将人审通过的决策整理为 patch JSON（格式见 merge-workflow.md 第 3 节），运行：
   `node scripts/apply_patch.js <old.json> <patch.json> --version <X.Y> -o <new.json> --changes <changes.json>`
6. 运行 `node scripts/validate_prd.js <new.json> --base <old.json> --changes <changes.json>`；未触碰条目 hash 不一致时必须中止并报告。
7. 运行 `node scripts/render_prd.js <new.json> --changes <changes.json> --out-dir <dir>` 生成**带变更标记**的新版 md/html。
8. 交付新版三件套（新旧并存）与追审单 `<slug>-review-v{X.Y}.md`。

## 参考文件索引

| 文件 | 何时阅读 |
|---|---|
| references/splitting-rules.md | 拆分需求/撰写 AC 前必读（两个工作流共用） |
| references/labeling-guide.md | 标注 labels 前必读 |
| references/prd-schema.md | 构造 draft / 理解 JSON 结构时阅读 |
| references/merge-workflow.md | 仅工作流二：对齐与补丁规则 |
| references/review-format.md | 仅工作流二：生成追审单时阅读 |

## 脚本索引（Node.js，无第三方依赖）

| 脚本 | 用途 |
|---|---|
| scripts/build_prd.js | draft JSON → 合法 PRD JSON（分配 ID/order/hash） |
| scripts/render_prd.js | PRD JSON → md + html；`--changes` 启用变更标记模式 |
| scripts/extract_json.js | 从 PRD html 抽取内嵌 JSON |
| scripts/apply_patch.js | 追审补丁 + 旧 JSON → 新版 JSON + 变更清单 |
| scripts/validate_prd.js | 不变量校验；`--base` + `--changes` 校验"未触碰条目不变" |
