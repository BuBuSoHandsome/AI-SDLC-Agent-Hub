# GET /loans/debt-consolidation

> 三列视图：**common component**（原子能力 / 常量 / 配置）｜**logic flow**（本服务类，承接 4.x 逻辑）｜**error handling**（中止流程）

```mermaid
flowchart TB
    subgraph CC["common component"]
        direction TB
        CUS["<b>CUS INSINQP Client（common jar）</b><br/>+ getCustomerDemographicDataDtl(permId)<br/>: HaseCustomerDemographicDataDtlResponse"]
        CONST["<b>Constants</b><br/>+ static final String ID_TYPE_HKID = 'I'"]
        MASK["<b>MaskingService（common jar）</b><br/>+ mask(String target, MaskingEnum maskingEnum) : String"]
        JSON["<b>contact-prefer-time.json（配置文件）</b><br/>维护 en_hk / zh_hk / zh_cn 的首选联系时间选项列表"]
    end

    subgraph LF["logic flow"]
        direction TB
        CTRL["<b>DebtConsolidationController</b> ｜ 4.1 Entry & Routing<br/>接收客户端 GET /loans/debt-consolidation 请求"]
        VAL["<b>DebtConsolidationParameterValidator</b> ｜ 4.2 Parameter Validation<br/>validate() 当前无 parameter，恒 return true<br/>未来新增入参时在此类内扩展校验规则"]
        INFO["<b>CustomerInfoService</b> ｜ 4.3 Call Backend CUS INSINQP<br/>经 common jar Call backend CUS INSINQP 获取客人信息<br/>获取成功 → 带客人信息进入 4.4<br/>获取失败 → 进入 4.6 error handling"]
        SVC["<b>DebtConsolidationService</b> ｜ 4.4 Post CUS Call handling<br/>业务总管：拿到 4.3 客人信息后的业务逻辑统一在此类承载<br/>当前规则：判断【客户证件类型】是否为 Constants.ID_TYPE_HKID 常量<br/>证件类型是 HKID → 带客人信息进入 4.5<br/>否则 → 进入 4.7 error handling"]
        BUILD["<b>DebtConsolidationResponseBuilder</b> ｜ 4.5 PAPI Response Assembly<br/>从 4.4 客人信息获取【客户全名】和【电话号码】<br/>经 common jar MaskingService 对【电话号码】进行脱敏处理<br/>根据请求头传入的语言标识取【首选联系时间选项列表】（找不到匹配语言默认英文版）<br/>组装后返回 2.2.1 Sample Response 到前端"]
        CTRL --> VAL --> INFO --> SVC --> BUILD
    end

    subgraph EH["error handling"]
        direction TB
        E1["<b>CallCusFailedHandler</b> ｜ 4.6 Call CUS failed<br/>中止流程，返回 2.2.2 Sample Response<br/>（demographic response is null）到前端"]
        E2["<b>IdTypeInvalidHandler</b> ｜ 4.7 Customer Id type invalid<br/>中止流程，返回 2.2.3 Sample Response<br/>（Customer id type is non HKID）到前端"]
    end

    INFO -.调用.-> CUS
    INFO -- "获取失败" --> E1
    SVC -.引用常量.-> CONST
    SVC -- "非 HKID" --> E2
    BUILD -.脱敏.-> MASK
    BUILD -.读取配置.-> JSON

    classDef jar fill:#fdf3e7,stroke:#d35400,stroke-width:2px,color:#333
    classDef cfg fill:#f4f4f5,stroke:#555,stroke-width:2px,color:#333
    classDef logic fill:#ffffff,stroke:#2f6fd6,stroke-width:2px,color:#333
    classDef builder fill:#ffffff,stroke:#7c3aed,stroke-width:2px,color:#333
    classDef err fill:#fdf6f5,stroke:#c0392b,stroke-width:2px,color:#333

    class CUS,MASK,CONST jar
    class JSON cfg
    class CTRL,VAL,INFO,SVC logic
    class BUILD builder
    class E1,E2 err
```

## 说明

- logic flow 列每个类承接一个 4.x 标题的逻辑，主流程自上而下：Controller → ParameterValidator → CustomerInfoService → DebtConsolidationService → DebtConsolidationResponseBuilder
- 虚线箭头（-.->）表示调用 common component：原子能力（common jar）/ 引用常量 / 读取配置文件
- 实线箭头（-->）指向 error handling 表示中止流程
- 两条中止分支统一收口在 error handling 列：
  - **2.2.2**：Call CUS failed（demographic response is null）
  - **2.2.3**：Customer Id type invalid（Customer id type is non HKID）

## 类清单

| 列 | 类 / 文件 | 承接章节 | 职责 |
|---|---|---|---|
| logic flow | DebtConsolidationController | 4.1 Entry & Routing | 接收客户端请求 |
| logic flow | DebtConsolidationParameterValidator | 4.2 Parameter Validation | 标准校验入口，当前恒 return true |
| logic flow | CustomerInfoService | 4.3 Call Backend CUS INSINQP | 经 common jar 获取客人信息 |
| logic flow | DebtConsolidationService | 4.4 Post CUS Call handling | 业务总管，当前规则：HKID 判断 |
| logic flow | DebtConsolidationResponseBuilder | 4.5 PAPI Response Assembly | 组装响应返回 2.2.1 |
| common component | CUS INSINQP Client（common jar） | 4.3 | getCustomerDemographicDataDtl(permId) |
| common component | Constants | 4.4 | static final String ID_TYPE_HKID = "I" |
| common component | MaskingService（common jar） | 4.5 | mask(target, MaskingEnum) |
| common component | contact-prefer-time.json（配置文件） | 4.5 | 维护 en_hk / zh_hk / zh_cn 的首选联系时间选项列表 |
| error handling | CallCusFailedHandler | 4.6 | 返回 2.2.2 Sample Response |
| error handling | IdTypeInvalidHandler | 4.7 | 返回 2.2.3 Sample Response |
