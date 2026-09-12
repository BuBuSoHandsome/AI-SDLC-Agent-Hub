# 需求拆分规则（重建自 requirements-to-user-stories-zh）

> 本文件重建自团队 BA skill（照片版）。将自然语言业务需求转换为按渠道划分、符合 INVEST 原则的结构化需求与可测试验收标准。
>
> **与 BA skill 的三处差异（本 skill 有意覆盖）：**
> 1. ID 体系：`UID-01` → `OHM-REQ-xx`（mobile）/ `OHI-REQ-xx`（desktop），由脚本分配，删除留断号、永不复用，详见 prd-schema.md。
> 2. AC 语法：Given/When/Then → **EARS 语法**（见第 8 节）。
> 3. 输出载体：Markdown 矩阵改为 PRD JSON（SoT）+ 渲染产物；本文件只管"怎么拆"，产物格式见 prd-schema.md。

## 1. 目的

扮演资深 Product Owner 与 IT Business Analyst，把自然语言需求转换为清晰、可追溯的结构化需求与验收标准，供业务干系人评审，并供开发与测试团队使用。

这种转换是"结构化精炼"，**不是"重新解释"**。必须保留原始输入的业务含义、范围、条件、参与角色、规则、顺序、术语和结果。提升清晰度时，绝不能新增、删除、放宽、收窄或以其他方式改变源需求意图。

对每条结构化需求应用 INVEST 标准：

- **Independent（独立）**——以最小化对其他结构化需求依赖的方式交付一个连贯结果。
- **Negotiable（可协商）**——表达业务意图，避免规定不必要的实现细节。
- **Valuable（有价值）**——说明对用户或干系人的可观察收益。
- **Estimable（可估算）**——具备足够范围、规则与上下文，便于交付团队估算。
- **Small（足够小）**——可合理放入一个迭代；若包含多个旅程或结果，需拆分。
- **Testable（可测试）**——具备客观、可观察的验收标准。

## 2. 适用场景

在以下场景使用本规则：

- Product Owner 或业务干系人提供自然语言需求。
- IT BA 需要将需求结构化以便细化。
- 需求需要拆分为结构化需求和验收标准。
- 现有结构化需求需要做 INVEST 质量评审。
- 开发与测试团队需要从源需求到验收标准的可追溯性。

**不要**使用本规则去臆造源需求中不存在的产品策略、架构、UI 设计、法律规则或运营政策。

## 3. 源需求忠实性（强制）

源需求忠实性优先于文风优化和"完整性补全"。每次转换都必须遵循：

1. 将原始输入视为业务意图的权威来源。
2. 保留所有明确的角色、动作、条件、限定词、异常、规则、数值、阈值、顺序依赖与结果。
3. 不得添加隐含行为、臆测最佳实践、行业常识规则或"好心补充"的功能。
4. 不得因"重复、不便、不一致或技术困难"而删减细节。
5. 不得把具体角色/产品/渠道/条件/结果替换为泛化表达以扩大范围。
6. 不得引入源文本中不存在的限制、前提、排除或解释以缩小范围。
7. 不得把示例转换成强制规则，除非源文本明确如此定义。
8. 不得把"必须"改成"可选"，也不得把"可选"改成"必须"。
9. 必须精确保留否定关系、逻辑关系、阈值、单位、时序、顺序，以及包含/排他边界。
10. 涉及领域术语时，若改写可能改变含义，应逐字保留；若术语不清晰，引用原词并请求澄清。
11. 当源文本存在歧义或冲突时，应暴露问题，不得自行选一种解释。
12. 当一条需求拆成多条结构化需求时，合并后的语义必须与源需求等价：不丢失、不新增。
13. 只有在保持语义等价时，才可优化语法与可读性。
14. 若无法保证语义等价，应保留原措辞，并在输出最终矩阵前请求澄清。

## 4. 必需输入格式

要求请求方使用以下模板。可接受部分填写，但在认定"可交付"前必须识别缺失信息。

```markdown
## Impacted Channels
- <Mobile e-banking or Desktop e-banking>

## Common Requirements
| Type | Logic |
|---|---|
| Segment Blocking | <Detailed logic> |
| Cross Boarding Checking | <Detailed logic> |
| Lite Mode Availability | <Detailed logic> |

## Function Entrances
| Entrance ID | Detailed Logic |
|---|---|
| <Unique entrance ID> | <Entrance conditions and behavior> |

## Pages

### <Page Name>

#### How to Trigger the Page
| ID | Relation Logic |
|---|---|
| <Unique trigger ID> | <Relationship to other trigger conditions, including AND/OR logic where applicable> |

#### Page Information
| ID | Field Name | Field Type | Value Type | Sample Value | Mandatory or Optional | Interaction Logic | Validation Logic | Error Display |
|---|---|---|---|---|---|---|---|---|
| <Unique field ID> | <Confirmed wording or interim description> | <Read-only text, button, input box, or another stated type> | <Amount, text, date, or another stated type> | ... | ... | ... | ... | ... |
```

## 5. 最低信息要求

至少必须包含：

1. Impacted Channel。
2. 三个强制 Common Requirements 及其 Logic。
3. Function Entrances（唯一 ID + 详细逻辑）。
4. 页面名称与触发 Relation Logic。
5. 完整页面字段信息（含所有强制属性）。

若缺失任一项，应提出聚焦澄清问题。若存在强制项缺失/无效，在请求方明确要求下仍可出草稿，但受影响内容标记为 `TBD`。

## 6. 强制输入检测（Mandatory Input Detection）

转换前，必须检查完整源需求中是否明确包含以下内容。检测基于"语义"，标题名/表名可不同，但所需含义与细节必须明确。不得根据产品惯例或历史项目推断缺失内容。

### 6.1 Impacted Channel

1. 至少声明一个受影响渠道。
2. 每个渠道必须可明确归一到以下规范值之一：`Mobile e-banking` / `Desktop e-banking`。
3. 若两个渠道都明确受影响，可同时选择。
4. 大小写、空格、连字符可在不改变含义前提下归一；不得把"不同渠道"错误归一成允许值。
5. `e-banking`、`digital`、`online`、`all channels` 这类泛称不通过，除非源文本明确映射到上述一个或两个规范值。
6. 缺失或不支持的渠道值属于重大缺口。

### 6.2 Common Requirements

源需求必须包含以下三项：`Segment Blocking`、`Cross Boarding Checking`、`Lite Mode Availability`。

对每一项：

- `Logic` 为强制，不可为空。
- `N/A` 表示源需求明确"无补充"，应作为"显式无补充值"保留，不可当作空、缺失或无效，也不可推断替代逻辑。
- `TBD`、`-`、纯空白等占位值视为空。
- 逻辑必须说明适用条件和预期行为/结果，仅重复名称不通过。
- 必须保留原术语 `Cross Boarding Checking`，不得静默改名或重解释。

### 6.3 Function Entrance

每种进入功能的方式都必须包含：

1. 非空 `Entrance ID`，且在该需求内唯一；
2. 入口方式描述；
3. 非空详细逻辑（覆盖其条件与行为）。

重复 ID、缺失 ID、缺失详细逻辑均属重大缺口。不得为了掩盖缺失而自动生成 Entrance ID。

### 6.4 Page Information

每个受影响页面都必须有非空 `Page Name`。每个页面都必须包含页面触发信息与完整字段清单。

#### 6.4.1 页面触发（Page Trigger）

每个触发条件必须包含：

1. 非空且在需求内唯一的 `Trigger ID`；
2. 非空触发条件；
3. 非空 `Relation Logic`，描述其与其他触发条件关系。

`Relation Logic` 必须保留显式逻辑运算与分组（`AND`、`OR`、`NOT`、优先级、括号）。若只有单一触发且无与其他触发关系，源文本必须显式写明单独逻辑（如 `Standalone`），不得自行假设。缺失 ID 或缺失 Relation Logic 属重大缺口。

#### 6.4.2 页面字段信息（Page Field Information）

源需求必须列出每个页面展示或使用的所有字段。每条字段记录必须包含以下属性：

| 属性 | 检测与校验规则 |
|---|---|
| Field ID | 强制、非空，且在"整个需求"范围内唯一（包括跨页面）。任何重复均不通过。不得臆造缺失 ID。 |
| Field Name | 强制。可为已确认文案，或最终文案未定时的临时描述。临时名称标记为 `Interim`。 |
| Field Type | 强制。需说明展示/控件类型，如只读文本、按钮、输入框等。保留源文本类型。 |
| Value Type | 强制。需说明字段表示的数据类型（如金额、文本）。仅当源文本明确并给出原因时，才可用 `Not applicable`。 |
| Sample Value | 强制。保留源示例，如 `HKD 10,000`。示例不是业务规则或可接受值，除非源文本明确规定。 |
| Mandatory or Optional | 若源文本给出则使用 `Mandatory` 或 `Optional`。显式 `N/A` 表示无补充，不得推断。其他任何值均无效。 |
| Interaction Logic | 强制。描述由字段触发的展示或交互行为，不得混入校验与错误展示行为。 |
| Validation Logic | 强制。描述校验规则及触发事件（如用户点击按钮触发校验）。若无校验，源文本必须明确 `No validation` 并解释适用性。 |
| Error Display | 强制。描述校验失败时如何展示错误（如行内错误提示）。若无错误展示，源文本必须明确 `No error display` 并解释适用性。 |

任一属性为空、`Mandatory or Optional` 出现除显式 `N/A` 外的非法值、或 Field ID 重复，均属重大缺口。`Interaction Logic`、`Validation Logic`、`Error Display` 必须严格分离，不得为"看起来完整"而相互挪用或复制行为。

### 6.5 N/A 输入处理

凡输入出现 `N/A`，遵循：

1. 解释为"该项明确无补充信息"。
2. 不得仅因是 `N/A` 就判定为空、缺失、无效或 `TBD`。
3. 不得用推断行为/数值/校验/错误处理/适用性/业务规则替换 `N/A`。
4. 不得仅基于 `N/A` 生成结构化需求或验收标准。
5. 同一记录中的其他显式信息应保留，仅基于有支撑信息产出。
6. 若其他源语句与 `N/A` 冲突，标记为 `Conflicting` 并请求澄清。

## 7. 检测结果状态规则

每个强制项必须赋予状态之一：

- `Present`——明确、非空、有效、内部一致。
- `Missing`——缺失或为空。
- `Invalid`——存在但违反允许值、唯一性或结构规则。
- `Ambiguous`——存在但可产生多个重要解释。
- `Conflicting`——与其他源语句冲突。

只有**全部为 `Present`** 时，输入才通过强制检测。否则：

1. 在输出最终产物前，先针对重大缺口提聚焦问题。
2. 若请求方要求继续，草稿仅基于已提供信息生成。
3. `TBD` 仅用于真实缺失信息；不得新增解释性区块或列。

## 8. 验收标准规则（EARS 语法）

每条 AC 必须使用 EARS（Easy Approach to Requirements Syntax）五种句型之一：

| 句型 | 模板 | 适用场景 |
|---|---|---|
| Ubiquitous | `The <system> shall <response>.` | 无条件恒成立的规则 |
| Event-driven | `WHEN <trigger>, the <system> shall <response>.` | 由单一动作/事件触发 |
| Unwanted behavior | `IF <undesired condition>, THEN the <system> shall <response>.` | 异常/错误处理 |
| State-driven | `WHILE <state>, the <system> shall <response>.` | 某状态持续期间生效 |
| Optional | `WHERE <feature is present>, the <system> shall <response>.` | 特定配置/功能下生效 |

规则：

1. 每条验收标准必须必要、无歧义、可独立验证。
2. 成功路径、替代路径、边界、校验失败、权限、异常等，只在源文本声明或直接要求时覆盖。
3. 每条验收标准只测试一个规则/分支/结果（一个触发、一个响应；复合行为必须拆成多条）。
4. 仅当源文本提供时，使用具体数值与阈值。
5. 不得使用 `properly`、`correctly`、`quickly`、`user-friendly`、`as needed` 等模糊词。
6. 结果必须可观察（展示信息、持久化状态、生成输出、通知、审计记录或外部可见系统响应）。
7. 涉及权限或角色行为时必须包含角色。
8. 除非源文本明确要求，UI 细节应保持方案中立。
9. 不得把缺失决策藏在验收标准里；输出最终产物前先澄清。
10. 验收标准不得比源需求更严或更宽。
11. 必须精确保留源需求逻辑（`and`、`or`、`unless`、`only if`、`at least`、`at most` 等）。

## 9. 结构化需求描述规则

每条结构化需求描述都应是简洁、精炼的自然语言，说明"要求的行为 + 业务目的"。**不得使用 `As a ..., I want ..., so that ...` 模板**。

示例：

> Eligible cardholders can review and accept a personalized credit-limit offer, enabling an approved limit to take effect without manual processing.

> A Product Owner can return a requirement for revision when mandatory information is missing, while preserving the review comments and audit history.

无需固定句型，但必须清楚表达受益者/责任角色、能力、上下文和预期价值或结果。必要时可用 1-2 句自然语句提高可读性。

规则：

1. 从受益者视角写，而不是从开发团队视角写。
2. 使用具体角色；已知更精确角色时避免泛称 `user`。
3. 描述业务行为而非实现细节；除非角色本身是技术消费者，否则避免 `build`、`code`、`create an API`、`add a database column` 等。
4. 每条结构化需求只表达一个主要能力和一个主要结果，不强制固定语法模板。
5. 必要时按角色、触发器、流程阶段、业务结果、权限边界、渠道差异、可独立测试规则拆分。
6. 不得按前端/后端/数据库等技术分层拆分。
7. 保留源需求显式业务术语，并对歧义术语做澄清。
8. 不得新增源文本无支撑的功能、规则、字段、校验或异常。
9. 内部校验可考虑不可避免依赖，但不得把无支撑行为写入描述。
10. 若结构化需求不够 Small 或 Estimable，应在源文本支持下拆分，否则请求澄清。
11. 优先直接主动语态；避免模板化、重复和 `The system shall` 等泛开头（此条仅约束 description；AC 的 EARS 句型不受此限）。
12. 业务价值应从叙述自然体现；若结果已体现价值，不必硬加"价值子句"。
13. 必须保持与源文本语义等价，不得变强、变弱、变宽、变窄或改变要求。
14. 若源文本未给出业务价值，不得臆造；应请求澄清，或在请求方同意的草稿中标注 `TBD`。

## 10. 拆分与对齐规则

1. 一行对应一个独立且有价值、并通过 INVEST 评估的结构化需求。
2. 一条结构化需求可对应多条验收标准。
3. 不得仅因同页面或同渠道就把不相关需求合并成一条。
4. 同一行为若明确适用于双渠道，按渠道冗余为两条记录（各配各渠道的 req_id），并用 `twin_id` 互相引用；若源文本未说明是单渠道还是双渠道，标记歧义，不得自行选择。
5. 不得为未明确受影响的渠道生成需求。

## 11. 转换工作流

### 11.1 解析源需求

只提取"明确有支撑"的信息：

- 业务目标与价值；
- 角色与参与者；
- 受影响渠道；
- Segment Blocking 类型与逻辑；
- Cross Boarding Checking 类型与逻辑；
- Lite Mode Availability 类型与逻辑；
- 功能入口、Entrance ID、详细逻辑；
- 页面、Trigger ID、触发条件、Relation Logic；
- 完整页面字段清单及全部强制属性；
- 触发器与前置条件；
- 动作、决策、状态、结果；
- 业务规则与计算；
- 替代与异常路径；
- 权限与归属；
- 输入与输出数据；
- 非功能需求；
- 依赖、排除项、开放问题。

若改写可能改变业务含义，保留关键源措辞。

起草前先建立内部"源忠实映射"：对每条源语句记录 actor、action、condition、rule、outcome。用此映射防止拆分和改写时遗漏或语义漂移。

起草前执行 Mandatory Input Detection。记录缺失、无效、歧义、冲突、重复信息，不得用假设补齐。

### 11.2 拆分与撰写

1. 按第 9、10 节规则拆分结构化需求并撰写 description。
2. 按第 8 节规则为每条需求撰写 EARS 验收标准。
3. 按 labeling-guide.md 为每条 requirement 和 AC 打 labels。
4. 不分配 ID、不写 order、不计算 hash——这些由脚本完成（Agent 只产出中间产物，见 prd-schema.md）。

### 11.3 交付前检查

- 每条需求通过 INVEST 评估；
- 每条 AC 可独立验证、无模糊词；
- 检测结果全部 `Present`，或已按规则澄清/标 `TBD`；
- 忠实性 14 条逐条自查通过。
