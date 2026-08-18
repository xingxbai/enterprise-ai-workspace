# 第 12 天：工单分类、优先级与 SLA 风险结构化预测

掌握级别：必须精通

企业使用频率：每天

面试重要度：高

## 本节 60 分钟任务

| 时间 | 学习任务 | 完成结果 |
| --- | --- | --- |
| 0～10 分钟 | 对比人工字段和 AI 建议 | 知道为什么 AI 不能直接覆盖业务字段 |
| 10～20 分钟 | 定位最小 DTO、BFF、应用服务和 Schema | 能从按钮追到模型调用和审计日志 |
| 20～35 分钟 | 阅读 `generateText + Output.json + Zod` | 能解释 Provider JSON 模式和运行时 Schema 校验 |
| 35～50 分钟 | 用固定工单调试正常和失败请求 | 能区分请求校验、模型调用和输出解析失败 |
| 50～60 分钟 | 手动验收与面试复述 | 能讲清业务价值、安全边界和后续调优方法 |

## 一句话理解

浏览器只把 `ticketId` 交给 AI BFF；服务端读取可信工单数据并调用模型，AI SDK 用 Zod Schema 把模型结果约束成分类、优先级、SLA 风险、证据和不确定性，页面只展示建议，不能自动改工单。

## 本节先记住的完整运行流程

```text
用户点击“AI 预测”
  ↓
Client Component 只发送 { ticketId }
  ↓
POST /api/ai/tickets/predict
  ↓
验证服务端 Session 身份
  ↓
Zod 校验请求 JSON
  ↓
服务端根据 ticketId 读取可信工单
  ↓
删除与当前任务无关或会造成标签泄漏的字段
  ↓
Provider Adapter 读取服务端密钥、模型和超时配置
  ↓
应用服务组装 System Prompt、业务 Prompt 和 JSON Schema
  ↓
generateText + Output.json 调用 DeepSeek/Kimi
  ↓
记录 requestId、用户、Provider、模型、finishReason 和 Token
  ↓
AI SDK 把 Provider 返回内容解析成 JSON
  ↓
服务端 Zod 校验字段、枚举、长度和严格对象
  ↓
BFF 返回 prediction、generatedAt、requestId
  ↓
客户端再次校验响应协议
  ↓
页面展示 AI 建议，不覆盖人工字段，不执行真实写入
```

### 每一步到底做什么

| 步骤 | 输入 | 处理 | 输出或失败 |
| --- | --- | --- | --- |
| 1. 页面触发 | 工单行中的 `ticketId` | 设置 pending，创建 `AbortController` | 发起同源 POST 请求 |
| 2. BFF 身份验证 | HttpOnly Session Cookie | `authenticateApiRequest()` 解析可信用户 | 未登录返回 401，模型尚未调用 |
| 3. 请求校验 | 未知 JSON | Zod 校验 `ticketId` 且拒绝额外字段 | 错误返回 400，不消耗 Token |
| 4. 业务数据读取 | `ticketId` | 服务端查询当前用户可见的最新工单 | 不存在返回 404 |
| 5. 输入最小化 | 完整工单 | 只选主题、描述、渠道、状态、SLA 和最近处理文本 | 不发送人工标签、客户名称和完整档案 |
| 6. Provider 选择 | 服务端环境变量 | `getChatModel()` 创建 DeepSeek/Kimi Chat 模型 | 缺密钥返回 503 |
| 7. Prompt 组装 | 最小工单 DTO、JSON Schema | 说明任务、枚举、证据、不确定性和 Prompt 注入防护 | 服务端 Prompt，浏览器不可见 |
| 8. 模型调用 | 模型对象、Prompt、超时、取消信号 | `generateText({ output: Output.json() })` | Provider 返回 JSON 或抛出调用错误 |
| 9. 完成审计 | 身份、requestId、usage、finishReason | `recordModelCompletion()` 写脱敏日志 | 即使后续业务 Schema 失败，也不能漏记已产生的模型成本 |
| 10. 服务端输出校验 | `result.output` 未知 JSON | `ticketPredictionSchema.safeParse()` 校验字段、枚举和长度 | 不合格返回 502，不把半正确对象交给页面 |
| 11. BFF 响应 | 已验证预测对象 | 添加 `x-request-id` 响应头 | 返回稳定 JSON 协议 |
| 12. 客户端验收 | BFF JSON | 再次用响应 Schema 校验 | 协议漂移时显示明确错误 |
| 13. 页面展示 | 已验证预测 | 显示等级、证据、不确定性和人工复核状态 | 不自动修改工单 |

### 取消流程

```text
用户点击取消
  -> AbortController.abort()
  -> fetch 请求被取消
  -> Request.signal 传到 predictTicket
  -> generateText.abortSignal 传到 Provider 请求
  -> 页面恢复可重试状态
```

只在前端隐藏 loading 不算取消。企业项目必须把取消信号沿 BFF、应用服务一直传到模型请求，否则浏览器虽然显示停止，服务端仍会继续消耗 Token。

### Zod 输出校验失败分支

```text
DeepSeek/Kimi 请求成功并返回 JSON
  -> recordModelCompletion 记录本次 Token 和完成原因
  -> ticketPredictionSchema.safeParse 返回 success: false
  -> 服务端只记录 Zod issue 的 path、code 和 requestId
  -> TicketPredictionOutputError
  -> BFF 返回 502 MODEL_OUTPUT_INVALID
  -> 页面显示“模型未返回符合要求的结构化结果，请重试”
```

该分支只处理 Provider 真实返回但不符合业务 Schema 的结果。项目不再提供人为篡改模型输出的故障开关；没有出现真实失败时，不使用伪造结果冒充模型失败。

## 本节需要特别注意的点

### 1. 先区分“确定性事实”和“AI 判断”

这是本节最重要的工程边界：能由普通代码准确计算的内容，不交给大模型猜。

| 内容 | 正确负责人 | 原因 |
| --- | --- | --- |
| 当前时间、SLA 截止时间 | 普通代码 | 输入确定，可精确计算 |
| 是否已经超时 | 普通代码 | `now > slaDueAt` 就有确定答案 |
| 剩余分钟数 | 普通代码 | 不能接受模型算错时区或日期 |
| 工单业务分类 | AI + 人工确认 | 需要理解自然语言语义 |
| 业务影响程度 | AI + 业务规则 | 需要结合描述、客户影响和规则 |
| 信息是否不足 | AI | 需要理解上下文缺口 |
| 升级建议和解释 | AI + 人工确认 | 属于语义判断和辅助决策 |

本次真实结果中，工单 SLA 截止时间已经早于当前上海时间，但模型仍给出“中风险”。这不是可以接受的小偏差，而是架构边界错误：当前 Day12 基线让模型直接比较时间，结果证明它不可靠。

后续正确输入应该先由服务端代码生成：

```ts
{
  isOverdue: true,
  remainingMinutes: -255,
  slaDueAt: "2026-08-14 12:00",
  timeZone: "Asia/Shanghai"
}
```

模型可以解释为什么需要升级，但不能推翻 `isOverdue` 这个确定性事实。Day13 会把它改造成“规则计算 + AI 语义判断”的混合链路。

### 2. 浏览器只传最小 DTO

- 只传 `ticketId`，不能传完整工单、人工分类、人工优先级或客户档案。
- 浏览器传入的对象可以被 F12 修改，不能作为可信业务数据。
- BFF 必须根据 Session 身份重新读取资源，并在真实系统中执行租户和资源级授权。
- API Key、baseURL、模型名、完整 Prompt 和权限判断不能进入客户端。

### 3. 不要把人工答案泄漏给模型

- 人工分类和人工优先级是后续评测标签，不是模型输入。
- 如果把标签放进 Prompt，模型很可能直接照抄，离线准确率会虚高。
- 页面可以并列显示人工值和 AI 建议，但 Provider 请求中要排除人工答案。
- 评测时必须区分模型生成值、人工标准答案和最终采纳值。

### 4. OpenAI-compatible 不等于完全兼容

- DeepSeek/Kimi 使用 OpenAI-compatible Chat Completions，但不代表支持所有 OpenAI 高级参数。
- 当前 DeepSeek 不接受 AI SDK `Output.object()` 生成的 `response_format: json_schema`，真实请求返回 HTTP 400。
- 当前实现使用 AI SDK `Output.json()` 进入 JSON Object 模式，再用 Zod 严格校验。
- 接入新 Provider 时必须验证 JSON Schema、Tools、Streaming、取消、usage 和 finishReason，不能只验证普通文本请求。

### 5. JSON 格式正确不等于业务结果正确

模型可能返回合法 JSON，但仍然存在以下问题：

- 分类选择错误。
- SLA 风险和确定性时间事实冲突。
- `evidence` 只是复述原文，没有支撑结论。
- `uncertainty` 为空，但输入实际上缺少关键信息。
- `needsHumanReview=false`，但业务风险很高。

因此要经过两层验收：Zod 负责“格式是否合格”，评测集和人工复核负责“业务是否正确”。

### 6. 必须提供“无法判断”和人工接管

- 枚举中保留 `无法判断`，不能强迫模型在信息不足时猜一个答案。
- 输出包含 `uncertainty`，明确缺少哪些数据。
- 输出包含 `needsHumanReview`，给高风险和模糊场景提供人工路径。
- 未经评测校准，模型自报的 `confidence` 不是可信概率，当前不返回该字段。

### 7. AI 建议不能直接覆盖业务字段

- 分类、优先级和 SLA 会影响排队、通知、绩效和责任分配。
- Day12 尚未完成评测、确认、幂等、资源授权和写入审计，因此只能展示建议。
- 后续真实写入必须由用户确认，再由 BFF 重新鉴权并调用真实业务 API。
- 取消、失败或超时不能产生“假成功”的工单状态。

### 8. 日志必须既能排障又不泄密

应该记录：

- `requestId`
- 服务端解析出的 `actorUserId`
- Provider 和模型 ID
- HTTP 状态或安全错误分类
- `finishReason`
- 输入、输出和总 Token
- 总耗时与后续阶段耗时

不能记录：

- API Key、Authorization 和 Cookie
- 完整 Prompt
- 完整工单正文和客户隐私
- Provider 原始响应正文
- 未经过白名单筛选的异常对象

### 9. 看效果不能只看“像不像正确答案”

Day12 的真实结果只能证明链路可运行，不能证明功能已经达到生产质量。至少要继续观察：

- 分类准确率和各分类混淆情况。
- 高优先级、升级风险的召回率与误报率。
- 证据是否真的支持结论。
- 人工采纳率、修改率和拒绝原因。
- 平均分诊耗时是否下降。
- 模型失败率、延迟、Token 和单次成本。

本次“分类正确但 SLA 风险错误”的结果比一条完全正确的演示更有价值，因为它明确暴露了下一步应该修正的是规则与 AI 的职责，而不是盲目继续增加 Prompt。

## 运行时每层能看到什么

| 位置 | 能看到 | 不应该看到 | 主要用途 |
| --- | --- | --- | --- |
| 浏览器 Network Request | `ticketId` | 工单正文、Prompt、密钥、模型配置 | 检查最小 DTO |
| 浏览器 Network Response | prediction、generatedAt、requestId | Provider 原始错误、完整模型配置 | 页面展示和报错关联 |
| AI BFF | Session 用户、请求 DTO、稳定错误码 | 不信任客户端传入的业务对象 | 认证、校验、错误边界 |
| AI 应用服务 | 最小工单上下文、Schema、模型对象 | 无关客户档案、人工答案和完整模型输出日志 | Prompt、调用、输出校验 |
| Provider Adapter | API Key、baseURL、模型、超时 | 不向页面暴露配置 | 厂商差异和模型切换 |
| `logs/MM-DD.json` | requestId、用户、模型、usage、finishReason | Prompt、正文、密钥 | 审计、成本和排障 |
| 工单页面 | 人工字段和 AI 建议 | 不展示内部 Prompt 和 Provider 错误正文 | 人工比较与确认 |

## 为什么会出现

旧系统依赖客服人工阅读工单，再填写分类和优先级。数量增加后常见问题是：

- 不同客服对同一问题分类不一致。
- 高影响问题可能因为描述不明显而延迟升级。
- SLA 截止时间存在，但客服仍要人工结合状态和上下文判断风险。
- 主管无法统一分析模型建议是否准确、是否真的节省时间。

AI 适合提供“分诊建议”，但不适合在没有评测和人工确认的情况下直接修改业务字段。

## 企业为什么需要

结构化预测比一段自然语言更容易进入企业流程：

- 分类和风险等级可以筛选、统计和比较。
- `evidence` 可以让客服核对判断依据。
- `uncertainty` 和 `needsHumanReview` 给出人工接管路径。
- 固定 Schema 方便后续记录采纳率、准确率和混淆矩阵。
- Provider 更换后，页面仍使用同一业务协议。

## 当前页面如何使用

进入 `/tickets`，点击工单主题下方的“AI 预测”。页面会显示：

- 分类：限定为项目已有业务分类、`其他` 或 `无法判断`。
- 建议优先级：`高 / 中 / 低 / 无法判断`。
- SLA 风险：`高 / 中 / 低 / 无法判断`。
- 依据：1～3 条来自输入工单的可核对事实。
- 不确定性：缺少哪些信息，或为什么需要人工复核。
- `requestId`：用于关联 BFF、模型日志和完成审计。

这三个预测字段不会替换表格中的人工分类、人工优先级和 SLA 截止时间。

## 底层原理

### 1. Structured Output 不是“让模型随便输出 JSON”

普通 Prompt 即使写了“请返回 JSON”，模型仍可能输出 Markdown、漏字段或使用错误枚举。DeepSeek 当前兼容接口支持 JSON Object 模式，但不支持 OpenAI 原生 `json_schema` 请求，因此当前成熟兼容写法是：

```ts
const result = await generateText({
  model,
  output: Output.json({ name: "ticket_prediction" }),
  prompt,
});

const prediction = ticketPredictionSchema.safeParse(result.output);
```

`Output.json` 让 AI SDK 使用 Provider 的 JSON Object 模式并完成 JSON 解析；同一份 Zod Schema 会先转换为 JSON Schema 放进 Prompt，返回后再做严格运行时校验。校验不通过时不会把半正确对象交给业务页面。

如果未来接入原生支持 `response_format: json_schema` 的 Provider，可以使用 `Output.object({ schema })`，让 Provider 直接约束 Schema。企业代码必须根据 Provider 实际能力选择模式，不能因为接口“OpenAI-compatible”就假设所有高级参数都兼容。

本项目使用 AI SDK 7。旧的 `generateObject` 已被当前版本标记为 deprecated，因此不再把它作为新代码主线。

### 2. TypeScript 类型不能替代 Zod

TypeScript 只在编译时检查项目代码，不能约束网络返回值。模型响应和浏览器 JSON 都属于运行时数据，因此必须由 Zod 校验。

### 3. 预测等级不是概率

`slaRisk: "高"` 表示模型根据当前证据给出的风险等级，不等于“有 90% 概率超时”。只有使用标注评测集做过校准，才能把输出描述成可信概率。本节没有做概率校准，因此只展示等级、依据和不确定性。

## AI 调用链定位

```text
TicketPredictionCell
  -> POST /api/ai/tickets/predict { ticketId }
  -> authenticateApiRequest
  -> ticketPredictionPayloadSchema.safeParse
  -> predictTicket
  -> getLegacyTicketById
  -> getChatModel
  -> generateText + Output.json
  -> recordModelCompletion
  -> ticketPredictionSchema.safeParse
  -> TicketPredictionCell 再校验 BFF 响应并展示建议
```

## 函数调用顺序

| 顺序 | 函数或对象 | 分层 | 作用 | 企业场景 |
| --- | --- | --- | --- | --- |
| 1 | `generatePrediction()` | Client Component | 提交 `ticketId`，管理 pending、取消和错误 | 页面交互，不接触 Prompt 和密钥 |
| 2 | `authenticateApiRequest()` | AI BFF | 从加密 Session 解析可信身份 | 防止匿名用户消耗模型额度 |
| 3 | `ticketPredictionPayloadSchema.safeParse()` | AI BFF | 校验请求 JSON 且拒绝多余字段 | 阻止错误 DTO 进入模型链路 |
| 4 | `getLegacyTicketById()` | 业务 API Adapter | 服务端按 ID 获取可信工单 | 浏览器不能伪造正文、分类或优先级 |
| 5 | `getChatModel()` | Provider Adapter | 读取服务端 Provider、密钥和模型配置 | DeepSeek/Kimi 切换不影响页面 |
| 6 | `Output.json()` | AI 应用服务 | 使用 Provider JSON Object 模式 | 兼容 DeepSeek/Kimi Chat Completions |
| 7 | `generateText()` | AI 应用服务 | 执行一次非流式模型预测并解析 JSON | 小型结构化结果不需要流式渲染 |
| 8 | `recordModelCompletion()` | 可观测性 | 记录身份、Provider、模型、usage 和完成原因 | 输出后续校验失败时仍保留成本记录 |
| 9 | `ticketPredictionSchema.safeParse()` | AI 应用服务 | 校验字段、枚举、长度和严格对象 | 失败对象不会进入页面 |
| 10 | `ticketPredictionApiResponseSchema.safeParse()` | Client Component | 校验 BFF 最终响应 | 防止协议漂移导致页面静默错显 |

## 为什么本节不用 Streaming

输出只有一个小对象，必须完整通过 Schema 后才有业务意义。逐字符展示 `{ "category": ...` 既不能提前使用，也会增加部分 JSON 状态处理。因此这里使用非流式 `generateText`。

长回复、知识问答等自然语言内容仍适合 Streaming；结构化预测默认等待完整校验结果。

## 最小 DTO 与数据最小化

浏览器请求体：

```json
{
  "ticketId": "TICKET-20260811-001"
}
```

BFF 在服务端读取工单后，只把当前任务需要的字段交给模型：主题、描述、渠道、状态、SLA 截止时间和最近 5 条处理文本。它没有把客户名称、人工分类、人工优先级、负责人或完整客户档案发送给模型。

没有把人工分类和人工优先级放入模型输入，是为了避免模型直接照抄标签，导致后续评测结果虚高。

## 输出契约

```ts
{
  category: "数据同步" | "数据导入" | "权限配置" | ... | "无法判断";
  priority: "高" | "中" | "低" | "无法判断";
  slaRisk: "高" | "中" | "低" | "无法判断";
  evidence: string[];       // 1～3 条，每条最多 120 字
  uncertainty: string | null;
  needsHumanReview: boolean;
}
```

为什么不返回 `confidence: 0.95`：模型自报数字没有经过校准，容易让业务用户误以为它是统计概率。当前更可靠的表达是“风险等级 + 证据 + 不确定性 + 人工复核”。

## 企业最佳实践

- 前端只传资源 ID，BFF 重新读取有权限的业务数据。
- 模型建议和人工字段并列展示，不自动覆盖。
- 枚举值来自业务词典，不允许模型自由发明分类。
- 输出必须包含可核对证据和人工接管字段。
- Prompt 把工单正文标记为不可信数据，不能执行正文中的指令。
- 不把完整 Prompt、模型名、Provider 配置或客户正文返回浏览器。
- 非流式预测也要支持 `AbortSignal`、超时、重试和错误归一化。
- 记录 `requestId` 和 usage，不记录 Prompt、密钥或原始客户正文。
- 页面收到 BFF JSON 后再次做协议校验，错误时明确提示。
- 后续用固定标注集计算准确率，不能凭一条结果判断模型效果。

## AI 调试实战

### 正常请求

1. 打开 F12 Network。
2. 点击第一条工单“AI 预测”。
3. 找到 `POST /api/ai/tickets/predict`。
4. Request Payload 应只有 `ticketId`。
5. Response 应为 JSON，包含 `prediction`、`requestId` 和 `generatedAt`。
6. Response Header 的 `x-request-id` 应与 JSON 中 `requestId` 一致。
7. `logs/MM-DD.json` 应新增相同 requestId 的完成记录。

### 分层排查顺序

| 现象 | 先看哪里 | 典型原因 |
| --- | --- | --- |
| 401 | Session / Cookie | 未登录或 Session 失效 |
| 400 | Request Payload | 缺少 `ticketId`、类型错误或多传字段 |
| 404 | 业务数据层 | 工单不存在或当前数据源不可见 |
| 503 | Provider 配置 | 服务端密钥未配置或环境变量错误 |
| 502 + `MODEL_OUTPUT_INVALID` | Structured Output | 模型没有产出符合 Schema 的完整对象 |
| 502 + `MODEL_SERVICE_UNAVAILABLE` | Provider/网络 | 认证、限流、超时或厂商异常 |
| 浏览器显示“响应格式不正确” | BFF 到客户端协议 | BFF 返回字段与客户端 Schema 漂移 |

## 本节基线与调优实验

本节目标是建立第一版可复现基线，不宣布“已经调优”。固定使用以下 3 条工单，各调用一次并记录：

| 固定样本 | 重点观察 | 人工期望 |
| --- | --- | --- |
| `TICKET-20260811-001` | 业务影响和 SLA 紧迫性 | 数据同步、高优先级、较高 SLA 风险 |
| `TICKET-20260811-003` | 权限问题与发车时点 | 权限配置、需要人工核对影响范围 |
| `TICKET-20260809-006` | 告警未触达和夜间风险 | 消息通知、高风险、需要人工复核接收链路 |

记录表：

| 样本 | 分类正确 | 优先级合理 | SLA 风险合理 | 证据可核对 | 总耗时 | 输入/输出 Token | 失败原因 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 001 | 是：数据同步 | 是：高 | 首次结果为中，待扩大样本判断 | 是：2 条均来自原文 | 约 2.1 秒 | 输入 552 / 输出 72 | 无，`finishReason=stop` |
| 003 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 查看日志 | 无/待填写 |
| 006 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 查看日志 | 无/待填写 |

本节只建立基线。Day15 才修改 Prompt，Day16 调整模型参数，Day17 比较 Provider；每次只改一个主要变量。

## 失败样本与复盘

### 真实 Provider 兼容性失败

首次实现使用了 `Output.object({ schema })`。当前 `@ai-sdk/openai` 会把它转换为 `response_format: { type: "json_schema" }`，DeepSeek 返回不可重试的 HTTP 400。调用还没有进入 Zod 解析，因此日志中错误类型是 `AI_APICallError`，不是 `MODEL_OUTPUT_INVALID`。

修复方式：保留 AI SDK 的成熟输出抽象，改用 DeepSeek 支持的 `Output.json()` JSON Object 模式；Prompt 中放入由同一份 Zod Schema 生成的 JSON Schema，模型返回后再执行 `ticketPredictionSchema.safeParse()`。修复后相同工单约 2.1 秒成功，requestId 为一次性运行数据，不写死在代码或文档契约中。

结论：OpenAI-compatible 只表示基础协议兼容，不表示 `json_schema`、Tools、usage 和所有高级参数完全一致。Provider 能力必须通过真实请求验证。

### 请求校验失败

失败样本：向接口发送 `{}`。

预期结果：BFF 在调用模型前返回 `400 VALIDATION_ERROR`，文案为“ticketId 不能为空或类型不正确”。这证明运行时校验位于成本边界之前，错误请求不会消耗模型 Token。

第二个失败样本：把 `.env.local` 当前 Provider 的服务端密钥暂时置空并重启开发服务。

预期结果：返回 `503 MODEL_CONFIGURATION_ERROR`，页面显示“未配置 DeepSeek/Kimi 服务端密钥”，不能用固定文本冒充预测结果。验证后恢复自己的密钥，不要把密钥截图或提交到 Git。

## 常见错误

1. 浏览器把完整工单对象和人工标签传给 BFF。
2. 在 Client Component 中读取 API Key 或调用 Provider。
3. 只在 Prompt 里要求 JSON，没有运行时 Schema。
4. 在 AI SDK 7 新代码中继续使用已弃用的 `generateObject`。
5. 把模型自报 `confidence` 当成真实概率。
6. 模型输出后直接覆盖人工分类或优先级。
7. 枚举允许任意字符串，导致分类无法统计。
8. 没有 `无法判断` 和人工复核路径，迫使模型猜测。
9. 把客户名称、联系人和无关历史全部发送给 Provider。
10. Structured Output 失败后把原始模型正文返回浏览器。
11. 为短小结构化对象强行使用 Streaming。
12. 只看一次输出就宣布 Prompt 或模型效果很好。

## 线上排障清单

- 用页面显示的 requestId 关联 Network、BFF 日志和模型完成日志。
- 确认浏览器请求体只有 ticketId。
- 确认 Session 身份存在，并具备该工单的资源权限。
- 确认工单 API 返回的是真实当前数据，不是过期缓存。
- 确认当前 Provider、模型和服务端密钥配置。
- 查看 HTTP 状态、错误 code、耗时和是否发生重试。
- 区分模型没返回、返回被截断、JSON 无效和 Schema 不匹配。
- 查看 finishReason 和 usage，判断是否达到输出 Token 上限。
- 不在日志中输出完整 Prompt、工单正文或 Provider 原始响应。
- 使用固定失败样本复现后再修改 Prompt、Schema 或模型参数。

## 面试题

1. 为什么工单预测要使用 Structured Output，而不是普通文本？
2. `Output.json`、Zod 和 `result.output` 分别负责什么？
3. 为什么 AI SDK 7 不再优先使用 `generateObject`？
4. 为什么浏览器只传 `ticketId`？
5. 为什么模型输入不包含人工分类和人工优先级？
6. 为什么本节不用 Streaming？
7. Structured Output 校验失败应该返回什么，能否返回原始模型文本？
8. 为什么 `confidence: 0.95` 不能直接当真实概率？
9. AI 建议为什么不能自动写入工单？
10. 如何判断这个功能真的提高了客服效率？

## 标准答案

### 1. Structured Output 的价值

企业需要可筛选、可统计、可校验的字段。普通文本格式不稳定，Structured Output 通过 Schema 限定字段、枚举和长度，解析失败就进入明确错误路径，不让半正确数据进入业务流程。

### 2. 三者职责

`Output.json` 告诉 AI SDK 使用 JSON Object 模式并负责 JSON 解析；Zod 描述业务字段规则，并把 `result.output` 从未知 JSON 校验成可信的类型化对象。原生支持 JSON Schema 的 Provider 才改用 `Output.object({ schema })`。

### 3. API 选择

项目安装的是 AI SDK 7，本地类型声明已把 `generateObject` 标记为 deprecated，并推荐 `generateText` 配合 `output`。采用当前主 API 可以减少未来迁移成本，也能让文本和结构化生成使用统一入口。

### 4. 最小 DTO

客户端传完整对象会暴露多余数据，也允许用户伪造正文或人工标签。传 ticketId 后，BFF 可以基于可信身份重新做资源授权并读取服务端最新工单。

### 5. 避免标签泄漏

人工分类和优先级属于后续评测标签。把它们放进输入会让模型照抄答案，离线准确率看起来很高，但不代表模型能处理真实未标注工单。

### 6. 非流式选择

对象只有完整通过 Schema 才能使用，部分 JSON 没有业务价值。非流式调用降低客户端状态和协议复杂度。长自然语言回复仍使用 Streaming。

### 7. 解析失败

返回稳定的 `502 MODEL_OUTPUT_INVALID` 和 requestId。原始模型正文属于不可控内容，可能包含敏感信息或内部 Prompt 片段，不能原样返回浏览器。

### 8. 概率校准

LLM 输出的数字只是生成文本，不天然满足概率统计意义。必须用标注集做可靠性分析或校准后，才能称为概率；否则只展示风险等级、证据和不确定性。

### 9. 人工确认

分类、优先级和 SLA 会影响排队、通知和责任分配。模型尚未经过评测和权限化写入流程，因此只能给建议。后续需要人工确认、审计、幂等和真实写入 API。

### 10. 业务效果

同时比较离线质量指标和线上业务指标：分类准确率、风险召回率、人工采纳率、平均分诊耗时、错误升级率、模型失败率、延迟、Token 和成本。不能只看几条输出是否“像正确答案”。

## 项目实践

### 本节 AI 学习代码

1. `src/features/customer-service/ticketPredictionContract.ts`
2. `src/features/customer-service/server/ticketPredictionService.ts`
3. `src/app/api/ai/tickets/predict/route.ts`
4. `src/components/tickets/ticketPredictionCell.tsx`

### 已提供的业务基础代码

- `src/app/(workspace)/tickets/page.tsx`：工单列表和人工字段。
- `src/data/legacySystem.ts`：服务端工单详情读取。
- `src/features/auth/server/session.ts`：可信 Session 身份。
- `src/features/ai/server/chatProvider.ts`：DeepSeek/Kimi Provider Adapter。
- `src/features/ai/server/modelAuditLog.ts`：模型完成和 usage 记录。

业务代码只需要理解它为 AI 提供什么输入和安全边界，不需要在本节重新实现。

## 官方文档

- [AI SDK：Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
- [AI SDK：generateText](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)
- [Zod](https://zod.dev/)
- [Next.js：Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)

## 延伸阅读

下一节 Day13 不新增预测字段，而是把当前请求变成可系统调试的调用链：记录阶段耗时、Provider 请求、完成原因和失败层级，并学习从浏览器 Network 一直定位到模型服务。

## 企业级练习与验收标准

- 登录后访问 `/tickets`，每条工单都有 AI 预测入口。
- Network 请求体只有 `ticketId`，没有工单正文、人工标签、Prompt、模型名或密钥。
- 正常结果包含分类、优先级、SLA 风险、1～3 条依据和人工复核状态。
- AI 建议不会修改左侧人工分类、优先级和 SLA。
- 点击取消能中止浏览器请求，页面回到可重试状态。
- 缺 `ticketId` 返回中文 `400`；不存在的工单返回 `404`。
- 缺模型密钥返回明确 `503`，不返回模拟预测。
- 不符合 Schema 的模型输出返回 `502 MODEL_OUTPUT_INVALID`。
- 页面显示的 requestId 可以在 Response Header 和本地完成日志中关联。
- 能用自己的话解释为什么不用 Streaming、为什么不返回 confidence、为什么不自动写入。
- `pnpm typecheck`、`pnpm lint` 和 `git diff --check` 通过；原有 `replaySchema` 警告除外。
