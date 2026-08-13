# 第 5 天：企业 AI 回复建议的消息协议与状态管理

掌握级别：必须精通

企业使用频率：每天

面试重要度：高

## 一句话理解

企业 AI Streaming 不应该只返回裸文本，而应该有稳定消息协议，让前端明确区分开始、增量、完成、失败和取消状态。

## 为什么会出现

第 4 天已经用 AI SDK 打通了客服回复建议的流式生成。但裸文本流只能表达“来了哪些字”，不能表达业务状态。

企业项目需要前端知道：

- 什么时候真正开始生成。
- 哪些是模型增量文本。
- 什么时候正常完成。
- 什么时候用户取消。
- 什么时候模型或服务端失败。
- 是否有 requestId、providerId、modelId 和 usage 可用于审计和成本统计。

## 企业为什么需要

客服回复建议不是一个玩具按钮。它后续要接入人工编辑、采纳反馈、审计、成本和效果评估。

如果没有协议，后续功能会越来越乱：

- 前端只能猜测 loading 状态。
- 取消和失败容易混在一起。
- 无法稳定记录本次生成使用了哪个模型。
- 不能给审计和成本统计留下数据入口。
- 后续升级到 `useChat` 或 UI Message Stream 时缺少迁移路径。

## 企业每天怎么使用

本章使用轻量 NDJSON 事件协议：

```txt
start  -> 本次生成开始，携带 requestId、ticketId、providerId、modelId
delta  -> 模型增量文本
finish -> 生成完成，携带 finishReason 和 usage
error  -> 服务端或模型失败，返回脱敏错误
aborted -> 用户取消生成
```

这不是手写厂商 SSE parser。模型侧 streaming 仍由 AI SDK `streamText` 负责；本章只是在 BFF 层把 AI SDK 的高层 stream part 转换成业务可消费的事件协议。

## 底层原理

AI SDK `streamText` 会产出 `TextStreamPart`，其中包括 `text-delta`、`finish`、`abort`、`error` 等 part。

服务端 BFF 把这些 part 转成业务协议：

```txt
TextStreamPart.text-delta -> delta
TextStreamPart.finish     -> finish
TextStreamPart.abort      -> aborted
TextStreamPart.error      -> error
```

前端不直接理解模型厂商协议，也不直接理解 AI SDK 内部所有 part，只理解业务稳定事件。

### AI SDK 调用顺序与企业场景

当前功能的 AI 调用链路如下：

```txt
getChatModel()
  -> createOpenAI({ apiKey, baseURL, name })
  -> provider.chat(modelId)
  -> streamText({ model, system, prompt, abortSignal, timeout })
  -> result.stream
  -> 转换成 NDJSON 业务事件流
  -> 前端 fetch + reader.read() 消费
```

| 顺序 | 函数或对象 | 所属分层 | 作用 | 企业开发场景 |
|---|---|---|---|---|
| 1 | `createOpenAI(...)` | Provider Adapter | 创建 OpenAI-compatible 厂商适配器 | 统一接入 DeepSeek、Kimi 等兼容 Chat Completions 的模型厂商，隐藏 API Key 和 Base URL |
| 2 | `provider.chat(modelId)` | Provider Adapter | 得到 AI SDK 可调用的 Chat 模型对象 | 业务服务只接收模型对象，不直接关心厂商地址、密钥和模型初始化细节 |
| 3 | `streamText(...)` | AI 应用服务 | 调用模型并返回流式生成结果 | 客服回复建议、工单摘要、问题归类等需要边生成边展示的 AI 功能 |
| 4 | `result.stream` | AI 应用服务到 BFF 协议层 | 提供 AI SDK 结构化流事件，例如 `text-delta`、`finish`、`abort`、`error` | 服务端继续转换为稳定业务协议，避免前端依赖 AI SDK 内部事件格式 |
| 5 | `TextStreamPart<ToolSet>` | TypeScript 类型约束 | 描述 AI SDK 流里每个 part 的类型 | 后续接入 Tool Calling、RAG 引用和 usage 统计时，降低漏处理状态的风险 |

当前响应头是：

```txt
Content-Type: application/x-ndjson; charset=utf-8
```

因此当前走的是 NDJSON 事件流，不是标准 `text/event-stream` SSE。浏览器 Network 面板不一定显示 SSE/EventStream 视图，调试时应优先看响应头、状态码和每行 JSON 事件。

面试表达：

> 我们把 AI SDK 放在服务端应用服务里使用，通过 `createOpenAI` 和 `provider.chat(modelId)` 屏蔽 DeepSeek、Kimi 的兼容接口差异，再用 `streamText` 获取结构化流。BFF 不直接把 AI SDK 原始流暴露给浏览器，而是转换成 NDJSON 业务事件协议，用来表达开始、增量、完成、失败和取消，并为审计、成本统计和采纳反馈预留字段。

## 企业最佳实践

- 协议字段要少而稳定，先服务业务状态，不追求一次设计完所有未来功能。
- `requestId`、`providerId`、`modelId` 从第一天就进入协议，为审计和成本统计铺路。
- 错误事件只返回用户可见文案，不返回堆栈、密钥、Prompt 或上游原始错误。
- 前端状态机要区分 `idle`、`streaming`、`done`、`error`、`stopped`。
- 用户取消应进入 stopped，不应误判为 done。
- 写入型业务动作不允许假成功；读取型展示可以降级但要记录脱敏日志。
- 后续如果升级到 AI SDK UI Message Stream，当前协议概念仍可迁移。

## 常见错误

1. 直接返回裸文本，前端靠流结束猜状态。
2. 把取消当成失败，或者把取消当成成功。
3. 不记录 requestId，后续无法排查一次生成链路。
4. 把模型错误堆栈放进 error event。
5. 让客户端传 providerId、modelId 或 system prompt。
6. 前端没有禁用重复生成，导致多个流互相覆盖。
7. 只停止前端读取，不把取消信号传给模型调用。
8. 协议没有版本意识，后续扩展时破坏兼容性。
9. 为了演示写死模型输出，面试时讲不出真实链路。
10. 忽略 usage，后续成本统计要返工。

## 面试题

1. 为什么裸文本流不适合企业 AI 功能？
   - 追问：哪些状态必须协议化？
2. 你们的回复建议协议有哪些事件？
   - 追问：为什么需要 start 事件？
3. requestId 在 AI Streaming 中有什么价值？
   - 追问：它和审计、日志、成本如何关联？
4. delta 和 finish 分别表达什么？
   - 追问：finish 中为什么适合放 usage？
5. error 事件如何避免泄密？
   - 追问：内部日志又该记录什么？
6. 用户取消应该如何建模？
   - 追问：为什么不能把取消当 done？
7. 服务端为什么仍然使用 AI SDK？
   - 追问：本章协议和厂商 SSE 有什么区别？
8. 前端状态机如何设计？
   - 追问：重复点击生成如何处理？
9. 这个协议如何升级到 `useChat`？
   - 追问：什么时候应该使用 AI SDK UI Message Stream？
10. 后续如何把协议接入审计和采纳反馈？
    - 追问：哪些字段需要持久化？

## 标准答案

### 1. 裸文本流问题

裸文本只能表达内容，不能表达业务状态。企业 AI 功能需要知道开始、增量、完成、失败和取消，否则前端状态、审计和成本统计都会变得脆弱。

### 2. 协议事件

本章使用 `start`、`delta`、`finish`、`error`、`aborted` 五类事件。它们覆盖了客服回复建议生成的核心生命周期，并为后续元数据和审计留入口。

### 3. requestId

`requestId` 用于追踪一次生成请求。它可以关联前端操作、BFF 日志、Provider 调用、token usage、错误和后续采纳反馈。

### 4. delta 和 finish

`delta` 是模型增量文本，前端只负责追加。`finish` 表示模型生成结束，适合携带 `finishReason` 和 `usage`，后续可用于成本和质量分析。

### 5. 错误脱敏

前端 error event 只返回稳定文案。内部日志可以记录 provider、状态码、错误类型和 requestId，但不能记录 API Key、Authorization、完整 Prompt、客户敏感正文或上游堆栈。

### 6. 取消状态

取消是用户主动停止，不等同于模型失败，也不等同于成功完成。前端应进入 `stopped`，服务端应把取消信号继续传给 `streamText`。

### 7. AI SDK 与业务协议

AI SDK 负责模型 streaming 和 Provider 抽象。本章协议是 BFF 对前端暴露的业务事件，不解析厂商底层 SSE，也不把 AI SDK 内部全部 part 泄漏给 UI。

### 8. 前端状态机

前端至少区分 `idle`、`streaming`、`done`、`error`、`stopped`。生成中禁用重复生成，停止按钮只在 streaming 时出现。

### 9. 升级路径

当功能进入多轮聊天、消息列表、重新生成和工具调用时，适合升级到 AI SDK UI Message Stream 和 `useChat`。当前协议先服务客服回复建议这个较小场景。

### 10. 审计和反馈

后续应持久化 `requestId`、`ticketId`、`providerId`、`modelId`、`finishReason`、`usage`、生成耗时、用户是否采纳和编辑后的最终回复。

## 项目实践

### 业务需求

把客服回复建议从裸文本流升级为结构化消息协议，使前端能稳定处理生成中、完成、失败和取消。

### 改动范围

- `src/features/customer-service/replySuggestionProtocol.ts`：定义回复建议事件协议、服务端编码和客户端读取。
- `src/features/customer-service/server/replySuggestionStream.ts`：把 AI SDK `streamText` 的 stream part 转成业务事件。
- `src/app/replySuggestionButton.tsx`：按事件更新前端状态机。
- `docs/Day05企业AI回复建议的消息协议与状态管理.md`：记录本章设计和面试表达。
- `README.md`：更新当前课程和文档入口。

### 代码阅读顺序

1. 阅读 `src/features/customer-service/replySuggestionProtocol.ts`，理解事件协议。
2. 阅读 `src/features/customer-service/server/replySuggestionStream.ts`，理解 AI SDK part 到业务事件的转换。
3. 阅读 `src/app/replySuggestionButton.tsx`，理解前端状态机。
4. 阅读 `src/app/api/ai/reply/route.ts`，确认 BFF 校验边界不变。

### 验证方式

```bash
pnpm typecheck
pnpm lint
```

本章不默认启动服务、不执行构建、不操作浏览器。

### 异常场景

- 模型密钥未配置，Route Handler 返回 `503`，不启动流。
- 模型流中途错误，协议返回 `error` 事件。
- 用户停止生成，前端进入 `stopped`，不误判为成功。
- 工单不存在，返回 `404`，不进入模型调用。

## 官方文档

- [AI SDK：streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [AI SDK：UI Message Streams](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol)
- [Next.js：Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Zod](https://zod.dev/)

## 延伸阅读

下一章进入 `useChat` 状态、停止和重新生成，把消息协议扩展到更完整的聊天体验。

## 企业级练习与验收标准

练习：用自己的话讲清楚客服回复建议的消息协议，并说明它如何支撑后续审计、成本和采纳反馈。

验收标准：

- 能说出五类事件及其职责。
- 能解释为什么不直接返回裸文本。
- 能说明取消、失败、完成的区别。
- 能讲清楚 AI SDK 和业务协议的边界。
- 能说明哪些字段可以进协议，哪些字段不能进浏览器。
- 能把本章功能讲成企业项目里的 Streaming 状态管理经验。
