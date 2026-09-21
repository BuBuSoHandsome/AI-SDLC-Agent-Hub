# 三列归属判定规则

将 logic flow 章节的每个子小节映射到三列之一。logic flow 在用户文档中的章节号不固定（不一定是第 4 章），先按 `Logic flow` 标题名定位章节，再处理其下的子小节；所有规则按语义生效，与子小节编号无关。标题命名是自由的，**必须按内容语义判定，不要按标题名硬匹配**（下述可识别的标题模式除外）。

**拆分粒度**：一小节通常对应一个类；若一节塞了多个职责（如同时含两个下游调用 + 业务判断）或一个职责被拆成多节（如取字段 / 脱敏 / 组装分成三节），在映射表中提出拆分或合并方案。**所有拆分决策都在确认闸由用户拍板，agent 不自行决定**。

## logic flow 列（中列，本服务类）

每个子小节原则上由一个本服务类承接，主流程自上而下用 ▼ 串联。

**可按标题模式识别的三类：**

| 标题模式 | 生成类 | 说明 |
|---|---|---|
| `Entry & Routing` | `{Endpoint}Controller` | 接收请求；若无 routing 逻辑，注明"目前只有一个实现，无 Routing 逻辑" |
| `Parameter Validation` | `{Endpoint}ParameterValidator` | **即使文档写"无参数、无需校验"，也创建该标准件类**，内容为 `validate()` 恒 return true，未来在此类扩展校验规则 |
| 以 `Response Assembly` 结尾（如 `PAPI Response Assembly`） | `{Endpoint}ResponseBuilder` | 组装响应返回前端；样式用紫色（bp） |

**中间段（标题自由命名，按正文语义）：**

- 正文含"Call backend / 调用下游系统 / 获取 xx 信息" → 建取数类（如 `CustomerInfoService`），并在 common component 列建对应下游的 UML 类框；正文提到"失败则中止/进入其他小节" → 该失败分支挂 error handling。
- 正文是"拿到上一步结果做业务判断/校验" → 建业务总管类 `{Endpoint}Service`。**描述第一句写"业务总管：xxx 后的业务逻辑统一在此类承载"，再列当前规则**——当前规则未来会扩展，类名不得绑定具体规则（禁止 `XxxChecker` 这类过窄命名）。
- 正文含"脱敏" → common component 列加 Masking 类的 UML 框（common jar），logic 框内用橙色高亮标注经 common component 处理。
- 正文含"按语言/请求头语言标识取选项列表"且"本地文件维护" → common component 列加配置文件框（灰色，`kind: "file"`）。

## common component 列（左列）

三种框型：

| 框型 | kind | 外观 | 用途 |
|---|---|---|---|
| UML 类图框（common jar） | `uml` | 橙色，标题=类名+（common jar），正文 `+ 方法签名 : 返回类型` | 下游调用客户端、脱敏服务等外部能力 |
| UML 常量类框 | `uml` | 同上，标题=Constants | `+ static final String XXX = "值"`，业务判断用的字面量一律抽成常量 |
| 配置文件框 | `file` | 灰色，标题=文件名+（配置文件） | API 项目内维护的静态数据（如多语言选项列表）。**文件名与存放路径文档通常不写，一律标注「待确认」** |

logic → cc 的箭头用 ◀——，可在 `cc_arrow` 标注语义（调用 / 引用常量 / 读取配置）。

## error handling 列（右列）

**判定只看正文，不看标题**：某子小节正文是"中止流程，返回 2.2.x Sample Response（原因）到前端"，整体放 error handling 列，红色框，由触发它的 logic 步骤用 ——▶ 指向，箭头标注触发条件（如"获取失败"、"非 HKID"）。

## 类命名约定

- endpoint 名做前缀：`DebtConsolidation` + `Controller / ParameterValidator / Service / ResponseBuilder`
- error handling 类：`{场景}Handler`，如 `CallCusFailedHandler`、`IdTypeInvalidHandler`
- 取数类按资源命名：`CustomerInfoService`
- 禁止过窄命名：类名要能容纳未来扩展（业务总管类不要叫 XxxChecker）

## 高亮规则

logic 框正文里凡涉及 common component 的引用，用 `<span class="hl">...</span>` 橙色加粗，如 `<span class="hl">common jar MaskingService</span>`、`<span class="hl">Constants.ID_TYPE_HKID</span>`。

## 依据来源标注

文档通常只写业务逻辑，以下两类信息经常缺失，确认闸的映射表中必须逐条标注依据来源：
1. **组件归属**：该能力是 common jar 还是本服务实现（文档常不写）
2. **设计决策**：是否抽常量及常量值、配置文件名与路径、新建还是复用已有文件（文档永远不会写）

标注三级：「文档明确」/「推断 ⚠️」/「待确认 ⚠️」。
