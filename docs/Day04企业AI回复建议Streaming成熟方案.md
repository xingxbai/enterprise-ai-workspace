# 第 4 天：企业 AI 回复建议 Streaming 成熟方案

掌握级别：必须精通

企业使用频率：每天

面试重要度：高

## 一句话理解

企业项目里不手写模型流协议作为主方案，而是用 AI SDK 接入 DeepSeek/Kimi，由 BFF 和 Provider Adapter 负责密钥、模型差异、超时、取消、错误脱敏和流式响应。

## 为什么会出现

客服回复建议是 AI 应用里最常见、最容易讲清楚价值的功能：客服看到工单后点击生成，模型逐步输出建议，人工再编辑确认。

这类功能需要流式体验，但企业代码不应该把大量精力放在手写 `ReadableStream` 和解析厂商 SSE 上。成熟方案应该把底层协议交给 AI SDK，把工程复杂度放在业务边界：权限、Prompt、Provider Adapter、错误处理、审计和成本。

## 企业为什么需要

企业客服场景关心的是能否落地：

- 客服能在工单列表中直接生成回复建议。
- API Key 和 Provider URL 只在服务端。
- DeepSeek 和 Kimi 可以通过配置切换。
- 客户端只提交 `ticketId`，不能传密钥、模型名、baseURL 或完整 Prompt。
- 生成过程中可以取消，避免继续消耗 token。
- 错误提示对用户友好，日志不泄漏敏感信息。

## 企业每天怎么使用

本章项目链路：

```txt
ReplySuggestionChatPanel
  -> useChat + DefaultChatTransport
  -> POST /api/ai/reply-chat
  -> Route Handler 用 Zod 校验 ticketId
  -> Customer Service 组装客服回复建议 Prompt
  -> Provider Adapter 选择 DeepSeek/Kimi
  -> AI SDK streamText
  -> AI SDK UI Message Stream
  -> useChat 增量展示
```

面试时不要说“我手写了 ReadableStream”。更好的说法是：

> 我在客服工单工作台里实现过 AI 回复建议的流式生成链路。前端只传工单 ID，服务端 BFF 做请求校验和安全边界，Provider Adapter 封装 DeepSeek/Kimi 的差异，AI SDK 负责模型 streaming，错误和密钥都不会暴露到浏览器。

## 底层原理

AI SDK 的 `streamText` 底层仍然依赖 Web Streams 和模型厂商的流式协议。你需要知道这些底层概念用于排查问题：

- `ReadableStream`：流式响应的底层数据容器。
- `TextDecoder`：浏览器把字节流解码成文本时需要处理中文和 emoji 的跨 chunk 问题。
- 背压：下游消费慢时，上游不能无限制堆积数据。
- 取消：浏览器 `AbortController` 应传到服务端，再传给模型调用。

但这些不是本项目的主实现。主实现是 AI SDK + BFF + Provider Adapter。

## 企业最佳实践

- 使用成熟 AI SDK 处理模型 streaming，不在业务代码里手写厂商 SSE 解析。
- Provider Adapter 负责 `apiKey`、`baseURL`、`modelId`、`temperature` 和厂商差异。
- Route Handler 是 HTTP 信任边界，只接收最小 DTO。
- 使用 Zod 做运行时校验，不只依赖 TypeScript 类型。
- 客户端不能传 `apiKey`、`baseURL`、`model`、`system prompt`。
- 服务端日志不记录 Authorization、API Key、完整 Prompt 和客户敏感正文。
- 用户取消请求时，把 `request.signal` 继续传给 `streamText`。
- 没有真实模型密钥时返回错误，不用假文本冒充 AI。

本章安全风险：Streaming 的每个 token 都会进入浏览器，不能在输出中泄漏内部 Prompt、工具参数、权限规则和客户隐私。

## 常见错误

1. 让客户端传模型厂商、baseURL 或 API Key。
2. 没有 Zod 校验，直接信任浏览器传入的 JSON。
3. 把模型报错、堆栈或上游原始错误原样返回给前端。
4. 前端点停止后，只停止 UI，不取消服务端模型调用。
5. 把完整工单、客户电话、内部备注全塞进 Prompt。
6. 为了学习底层，在业务代码里长期维护手写 SSE parser。
7. 不封装 Provider Adapter，导致换模型要改页面和业务组件。
8. 没有区分用户可见错误和内部日志。
9. 用模拟 AI 文本包装成 streaming，面试时讲不出真实链路。
10. 忽略 token 上限、超时和重试策略。

## 面试题

1. 为什么企业项目里通常用 AI SDK，而不是手写 `ReadableStream`？
   - 追问：那为什么还要懂 Web Streams？
2. 客服回复建议的完整链路怎么设计？
   - 追问：前端应该传哪些字段？
3. Provider Adapter 解决什么问题？
   - 追问：DeepSeek 和 Kimi 的差异放在哪里？
4. API Key 为什么只能在服务端读取？
   - 追问：Route Handler 返回流时会不会泄密？
5. Zod 在 Route Handler 里解决什么问题？
   - 追问：TypeScript 类型为什么不够？
6. 用户点击停止生成，信号应该怎么传递？
   - 追问：只停止前端读取有什么成本问题？
7. 模型服务 401、429、timeout 分别怎么给用户提示？
   - 追问：日志里能不能记录完整请求？
8. 为什么不能让客户端传 system prompt？
   - 追问：Prompt 版本和变量后续应该怎么治理？
9. `streamText` 返回的是什么？
   - 追问：`toTextStreamResponse` 和后续 UI message stream 有什么区别？
10. 这一章如何为 SSE、`useChat` 和真实业务权限做铺垫？
    - 追问：下一步你会怎么扩展？

## 标准答案

### 1. 成熟方案优先

企业项目更关注稳定性、可维护性和团队协作。AI SDK 已经处理了模型调用、流式响应、取消、错误和不同 Provider 的通用抽象，业务代码不应该长期维护手写协议解析。但理解 Web Streams 有助于排查乱码、卡住、取消不生效和代理缓冲问题。

### 2. 客服回复建议链路

前端按钮只提交 `ticketId`。Route Handler 校验请求，服务端根据身份和权限读取工单上下文，Prompt Service 组装模板，Provider Adapter 选择模型，AI SDK `streamText` 返回流式响应，前端增量展示并允许人工编辑。

### 3. Provider Adapter

Provider Adapter 把厂商差异限制在服务端模块里，包括 baseURL、模型名、temperature、鉴权方式、超时、错误归一化和用量统计。页面和业务服务只面向统一接口。

### 4. 密钥边界

浏览器不是安全边界。API Key、baseURL、完整 Prompt 和权限判断都不能进入客户端。Route Handler 可以读取密钥，但返回给浏览器的 token 流也必须经过脱敏和权限控制。

### 5. 运行时校验

TypeScript 只约束开发时类型，浏览器发来的 JSON 在运行时完全不可信。Zod 用于拒绝空 `ticketId`、未知字段和错误结构，避免脏输入进入业务和模型调用。

### 6. 取消链路

客户端使用 `AbortController` 取消 fetch。Route Handler 的 `request.signal` 继续传给 `streamText`，让模型请求也停止。否则页面不显示了，服务端仍可能继续消耗连接、token 和费用。

### 7. 错误处理

用户只看到稳定文案，例如认证失败、请求过频、模型超时或暂不可用。内部日志只记录厂商、状态和错误类型，不记录密钥、Authorization、完整 Prompt、客户正文或上游堆栈。

### 8. Prompt 边界

system prompt 是服务端资产，不能由客户端传入。后续应进入 Prompt Service，支持模板、变量校验、版本、审计和效果评估。

### 9. streamText

`streamText` 返回 AI SDK 的流式结果对象。本项目直接转换为 UI Message Stream，由 `useChat` 消费；裸文本流和原生 Web Stream 只保留为协议理解与排障知识，不再作为可运行的第二套业务链路。

### 10. 后续扩展

第 5 天会对比裸文本、NDJSON、SSE 和 AI SDK UI Message Stream 的适用边界，后续再加入 Prompt Service、真实工单上下文、权限、审计、成本统计和采纳反馈。

## 项目实践

### 业务需求

在客服工单表格中增加“生成回复建议”能力。当前只传 `ticketId`，通过服务端模型配置调用真实 DeepSeek/Kimi streaming。没有模型密钥时返回 `503`，不使用模拟 AI。

### 改动范围

- `src/app/replySuggestionChatPanel.tsx`：客户端交互入口，通过 `useChat` 管理流式消息和停止生成。
- `src/app/api/ai/reply-chat/route.ts`：Route Handler，使用 Zod 校验请求。
- `src/features/customer-service/server/replySuggestionChatStream.ts`：客服回复建议应用服务，调用 AI SDK `streamText` 并返回 UI Message Stream。
- `src/features/ai/server/chatProvider.ts`：Provider Adapter，封装 DeepSeek/Kimi 配置和错误脱敏。
- `.env.example`：真实模型服务端配置示例。

### 代码阅读顺序

1. 阅读 `src/app/page.tsx`，确认只把 `ticketId` 传给客户端按钮。
2. 阅读 `src/app/replySuggestionChatPanel.tsx`，理解前端状态、取消和增量展示。
3. 阅读 `src/app/api/ai/reply-chat/route.ts`，确认 Zod 校验和 BFF 边界。
4. 阅读 `src/features/customer-service/server/replySuggestionChatStream.ts`，确认 AI SDK `streamText` 和 UI Message Stream 的调用方式。
5. 阅读 `src/features/ai/server/chatProvider.ts`，确认密钥和厂商差异只在服务端。

### 验证方式

```bash
pnpm typecheck
pnpm lint
```

本章不默认启动服务、不执行构建、不操作浏览器。

### 异常场景

- 请求体不是 JSON，返回 `400`。
- `ticketId` 为空或包含未知字段，返回 `400`。
- 未配置模型密钥，返回 `503`。
- 模型调用失败，返回脱敏后的稳定错误。
- 用户停止生成，取消信号继续传给模型调用。

## 官方文档

- [Next.js：Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Next.js：route.js Streaming](https://nextjs.org/docs/app/api-reference/file-conventions/route#streaming)
- [AI SDK：streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [AI SDK：OpenAI Provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai)
- [Zod](https://zod.dev/)

## 延伸阅读

下一章继续企业主线：把当前文本流升级成稳定消息协议，处理生成中、完成、失败、取消和后续元数据。

## 企业级练习与验收标准

练习：围绕“客服回复建议”回答链路设计、边界、安全和面试表达。

验收标准：

- 能讲清楚前端为什么只传 `ticketId`。
- 能解释 Route Handler、应用服务、Provider Adapter 的职责。
- 能说明为什么用 AI SDK，而不是长期维护手写原生流。
- 能指出 API Key、baseURL、system prompt 不能进入客户端。
- 能说明取消信号如何传到模型调用。
- 能把本章功能讲成企业项目经验，而不是底层 demo。
