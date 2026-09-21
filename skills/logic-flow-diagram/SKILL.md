---
name: logic-flow-diagram
description: 将接口文档中的 logic flow（Entry & Routing / Parameter Validation / 下游调用 / 业务处理 / Response Assembly 等子小节）转换为三列模块图（common component ｜ logic flow ｜ error handling），输出 HTML。当用户提供 logic flow 文档（Markdown 文本或屏幕截图照片），要求生成架构图、分层图、模块图、三列图，或把 logic flow 落到类设计并图形化时使用。也适用于在已有图上按反馈迭代调整（改类名、加常量框、加配置文件框等）。
---

# Logic Flow 三列模块图

将 logic flow 文档转换为三列模块图：左列 common component（common jar 能力 / 常量类 / 配置文件），中列 logic flow（logic flow 每个子小节一个本服务类），右列 error handling（中止流程）。

## 工作流（全新生成）

1. **获取并定位 logic flow 章节**。logic flow 通常只是用户传入 Markdown 文档的一部分：先在文档中定位 `Logic flow` 标题（章节号不限，可能是 `## 4. Logic flow` 也可能是其他编号），只处理该标题下的子小节。用户给屏幕截图照片则先自行读图转录原文（不要调 OCR 工具）。
2. **阅读 [references/column-rules.md](../references/column-rules.md)**，按语义把 logic flow 的每个子小节映射到三列。注意：标题命名是自由的，按正文语义判定，不要按标题硬匹配；业务总管类命名不得绑定当前规则。
3. **【强制确认闸】输出三列映射表，等待用户确认后才继续**。用 ask_user 或直接表格形式给出完整方案，一次性确认三列全部内容：

| 子小节（保留文档原始编号） | 归属列 | 生成类 / 框 | 分支与箭头 |
|---|---|---|---|
| 每个小节一行 | logic flow / common component / error handling | 类名、UML 框、常量框、配置文件框 | 谁指向谁、触发条件 |

类名采用**提案制**：按命名约定先给一版，用户直接改不认同的。用户提出修改后按修改执行，**不再二次确认**。

确认表中每条 common component / error handling 条目必须带**依据来源标注**：
- 「文档明确」：logic flow 原文直接写明（如"调用公共服务组件提供的 xxx 能力"）
- 「推断」：按惯例或上下文推断（如"脱敏"推断为 common jar 能力；"调下游系统"推断需要 client 类）
- 「待确认」：文档未覆盖的设计决策——组件归属（common jar 还是本服务实现）、是否抽常量及常量值、配置文件的文件名与存放路径（新建还是复用已有文件）

「推断」和「待确认」项必须在表中用 ⚠️ 标出，确认时用户重点审这些条目。
4. **编写 spec JSON**（格式见 `scripts/render_diagram.js` 顶部注释）。logic flow 每个子小节一个 step：logic 必填；`tag` 填文档中的原始编号与标题（如 "5.3 Call Backend CUS"），保证图与文档对得上号；有外部依赖加 `cc`（可多个框）；有中止分支加 `err`。logic 的 `style`：普通类 blue，ResponseBuilder purple，透传/说明类 grey。bullets 中可用 `<span class="hl">...</span>` 高亮 common component 引用。注意保持每行文字简短，过长会溢出框体，宁可拆成两条 bullet。
5. **渲染**（Node.js）：

```bash
node scripts/render_diagram.js spec.json --template assets/diagram-template.html --out /mnt/agents/output/{名称}_三列模块图
```

产出 `{名称}_三列模块图.html`，即最终交付物。

## 迭代修改（已有图）

用户对已有图做局部调整（改类名、改文案、加框、删框）时，**不走确认闸**：直接改 spec JSON 对应字段重新渲染，不要手改 HTML。

## 注意事项

- 文档中"无参数校验"的小节仍要生成 `{Endpoint}ParameterValidator` 标准件类（return true），保持每个 endpoint 结构统一。
- "中止流程，返回 2.2.x"的小节整体放 error handling 列，由触发它的 logic 步骤箭头指向并标注触发条件。
- 图标题用接口路径（如 `GET /loans/debt-consolidation`），不带 query 参数。
- spec JSON 是中间产物，不要交付；只交付 HTML。
