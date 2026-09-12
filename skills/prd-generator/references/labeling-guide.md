# Labels 标注指南

labels 是**索引，不是内容**：只用于筛选、排序、对齐与展示，绝不允许反向修改 description/content。标注语言跟随产物语言（英文）。

## 1. Requirement labels

### 1.1 `surface`（界面载体，自由文本数组）

需求被用户感知到的位置。取值不设枚举，常见形态：

- 页面：`Loan Application Page`、`DCL form input page`
- 弹层：`payment confirmation dialog`、`update mobile number overlay`
- 全局组件：`top navigation bar`、`left menu`
- 触达渠道：`App push notification`、`SMS`

规则：

- 多载体时全部列出；
- 从源需求的 Page Name、Function Entrance、Trigger 信息直接提取，禁止臆测；
- 该字段在合并中只做**软匹配加分**，不做硬过滤（命名漂移是常态）。

### 1.2 `keywords`（语义锚点数组）

3~6 个能区分该需求与其他需求的关键词/短语，取名词与核心动词，英文小写。例：`["preferred time of contact", "tab button", "mandatory", "default value"]`。

## 2. AC labels

### 2.1 `covers`（场景分类，单值，必填）

| 取值 | 含义 | 判据 |
|---|---|---|
| `happy_path` | 主流程：条件满足、用户按预期操作时的标准行为 | 读起来像"说明书正文" |
| `edge_case` | 边界：输入/状态落在合法范围临界值；或并发竞态 | 时间/数量/长度边界、同时发生 |
| `error_path` | 异常：外部依赖或内部出错时的系统响应 | 服务失败、超时、数据不存在、权限不足 |

### 2.2 `behavior`（行为类型，数组）

| 取值 | 含义 |
|---|---|
| `navigation` | 页面/状态跳转 |
| `validation` | 输入/规则校验 |
| `display` | 展示/渲染规则 |
| `interaction` | 交互反馈（非跳转，如长按出菜单、置灰） |
| `state_change` | 数据/状态变更（含提交、持久化） |
| `notification` | 通知触达（推送、短信等） |
| `permission` | 权限/可见性控制 |

规则：**优先拆分**——一条 AC 只验证一个行为（EARS 单触发单响应），多值仅用于确实无法拆分的强耦合场景。

### 2.3 `testable`（布尔，必填）

结果可客观观察（展示、持久化、输出、通知、审计）则为 `true`。`false` 的 AC 会在校验时告警（如 "improve user experience" 这类不可验收表述）。

### 2.4 `keywords`（语义锚点数组）

AC 级锚点，比 requirement 层更细：包含具体数值、阈值、字段名。例：`["continue button", "inline error", "mandatory"]`。

## 3. 标注原则

1. **只标注有源文本支撑的特征**；拿不准的 label 宁缺毋滥（labels 错误会污染合并候选集）。
2. AC 不继承 requirement 的 labels；渠道归属由 ID 前缀携带。
3. 所有 labels 由 Agent 在拆分时同步生成，随后由脚本随 JSON 一同校验取值合法性。
