# 第 6 天：useChat 状态、停止和重新生成

掌握级别：必须精通

企业使用频率：每天

面试重要度：高

## 一句话理解

`useChat` 是 AI SDK 提供的前端消息状态管理方案，它把提交、流式接收、停止、重新生成和错误状态封装成稳定 hook，适合企业项目里的聊天式 AI 交互。

## 为什么会出现

第 5 天我们自己定义了 NDJSON 事件协议，前端手动读取 `ReadableStream` 并维护状态机。这种方式适合理解协议边界，但当功能升级到多轮消息、重新生成、工具调用、恢复流和更复杂的 UI 状态时，继续手写会越来越重。

企业项目更常见的做法是：

- 模型调用仍在服务端。
- Provider Adapter 仍在服务端。
- BFF 仍负责校验、脱敏和安全边界。
- 前端用成熟 hook 管理消息和交互状态。

## 企业为什么需要

客服回复建议后续不只是“点一下生成文字”。它会继续演进到：

- 多轮补充上下文。
- 重新生成不同版本回复。
- 停止长输出，保留已生成内容。
- 人工编辑后采纳。
- 记录采纳率、重新生成率和失败率。
- 接入 Tool Calling 查询订单、客户和知识库。

这些场景都需要稳定消息模型，而不是每个按钮自己维护一套流读取逻辑。

## 企业每天怎么使用

本章把客服回复建议升级成 AI SDK UI Message Stream：

```txt
浏览器 ReplySuggestionChatPanel
  -> useChat
  -> DefaultChatTransport
  -> POST /api/ai/reply-chat
  -> Route Handler 校验 ticketId 和 UI messages
  -> AI 应用服务读取工单并组装 Prompt
  -> streamText 调用模型
  -> toUIMessageStream 转成 UI Message Chunk
  -> createUIMessageStreamResponse 返回 text/event-stream
  -> useChat 更新 messages/status/error
```

这和第 5 天不同：

```txt
Day05：自定义 NDJSON 事件流，Content-Type 是 application/x-ndjson
Day06：AI SDK UI Message Stream，Content-Type 是 text/event-stream
```

## 底层原理

`useChat` 不直接调用模型厂商。它通过 Transport 调用服务端 BFF，然后消费 AI SDK UI Message Stream。

核心状态：

- `submitted`：请求已提交，等待服务端开始返回。
- `streaming`：服务端正在流式返回。
- `ready`：当前流结束，可以继续提交。
- `error`：请求失败。

核心动作：

- `sendMessage`：提交用户消息，并触发服务端生成 assistant 回复。
- `stop`：取消当前请求，保留已经生成的内容。
- `regenerate`：重新生成最后一条 assistant 回复。
- `setMessages`：本地更新消息列表，适合清空、编辑或回滚。
- `clearError`：清理错误状态。
## AI SDK 调用顺序与企业场景

| 顺序 | 函数或对象 | 所属分层 | 作用 | 企业开发场景 |
|---|---|---|---|---|
| 1 | `useChat(...)` | 前端交互叶子组件 | 管理消息、状态、错误和操作函数 | 客服回复建议、多轮问答、知识助手、表单助手等聊天式交互 |
| 2 | `DefaultChatTransport(...)` | 前端通信适配层 | 定义前端调用哪个 BFF，以及请求体如何准备 | 统一把 `ticketId` 和 UI messages 发给 `/api/ai/reply-chat`，不让页面散落 fetch 细节 |
| 3 | `sendMessage(...)` | 前端交互动作 | 追加用户消息并触发生成 | 点击“生成建议”后提交固定业务意图 |
| 4 | `stop()` | 前端交互动作 | 取消当前流式请求，保留部分输出 | 用户发现输出过长、方向不对或误点时及时止损 |
| 5 | `regenerate()` | 前端交互动作 | 重新生成最后一条 assistant 回复 | 客服对第一版不满意时快速生成另一个版本 |
| 6 | `safeValidateUIMessages(...)` | 服务端 BFF | 校验前端传来的 UI messages 是否符合 AI SDK 协议 | 防止非法消息结构进入模型调用链路 |
| 7 | `streamText(...)` | AI 应用服务 | 调用模型并获得结构化流 | 回复建议、摘要、分类、改写等服务端 AI 能力 |
| 8 | `toUIMessageStream(...)` | BFF 协议层 | 把 `TextStreamPart` 转成 UI Message Chunk | 让前端使用 AI SDK 标准消息协议，不依赖厂商原始流 |
| 9 | `createUIMessageStreamResponse(...)` | BFF 响应层 | 把 UI Message Chunk 转成 SSE 响应 | Network 可以看到 `text/event-stream`，`useChat` 可直接消费 |

面试表达：

> 第 6 天我们没有继续手写前端流读取，而是把客服回复建议升级到 AI SDK 的 `useChat` 和 UI Message Stream。前端只负责提交 `ticketId` 和 UI messages，BFF 做运行时校验和错误脱敏，服务端应用服务读取工单并组装 Prompt，再通过 Provider Adapter 调用模型。这样状态、停止、重新生成和后续 Tool Calling 都可以复用成熟协议。

## 企业最佳实践

- 页面和表格仍保持 Server Component，只有回复建议面板是 Client Component。
- 前端只提交 `ticketId` 和 UI messages，不提交 API Key、baseURL、模型名或系统 Prompt。
- BFF 使用 Zod 校验请求体，再用 `safeValidateUIMessages` 校验消息协议。
- BFF 校验失败时要返回稳定中文业务文案，不能把 Zod 原始英文错误直接暴露给前端。
- 服务端不相信客户端 Prompt，真实 Prompt 由服务端基于工单摘要组装。
- 错误通过 `onError` 转成稳定文案，不把模型厂商原始错误返回给浏览器。
- `stop` 不是失败，也不是完成；它代表用户主动中止。
- `regenerate` 适合重新生成最后一条回复，不适合绕过权限或重新读取未授权数据。
- UI Message Stream 默认返回 `text/event-stream`，更适合浏览器 Network 和 AI SDK hook 调试。

## 常见错误

1. 以为 `useChat` 可以放在 Server Component。
2. 让前端直接传 API Key、modelId、baseURL 或完整 Prompt。
3. 直接相信前端传来的 messages，不做运行时校验。
4. 把 `sendMessage`、`stop`、`regenerate` 当成普通 fetch 自己再包一套状态。
5. 没有区分 `submitted` 和 `streaming`，导致按钮状态闪烁。
6. 点击停止后把状态当成成功完成。
7. 错误流直接返回上游原始错误，泄漏内部信息。
8. 不配置 Transport，默认请求 `/api/chat`，但项目真实 BFF 并不在这个路径。
9. 把 UI Message Stream 和第 5 天的 NDJSON 协议混在一起。
10. 为了演示重新生成，写死 AI 文本，破坏真实链路。

## 面试题

1. 为什么第 6 天要从手写 ReadableStream 读取升级到 `useChat`？
   - 追问：哪些场景继续手写会变复杂？
2. `useChat` 主要管理哪些状态？
   - 追问：`submitted` 和 `streaming` 有什么区别？
3. `DefaultChatTransport` 的作用是什么？
   - 追问：为什么不用页面里到处写 `fetch`？
4. `sendMessage` 做了什么？
   - 追问：它和普通按钮点击调用接口有什么区别？
5. `stop` 的企业价值是什么？
   - 追问：停止后是否应该丢弃已生成内容？
6. `regenerate` 适合什么场景？
   - 追问：重新生成时还需要重新做权限判断吗？
7. 服务端为什么还要校验 UI messages？
   - 追问：Zod 和 `safeValidateUIMessages` 分别校验什么？
8. `toUIMessageStream` 解决了什么问题？
   - 追问：为什么不把 `TextStreamPart` 原样返回给前端？
9. `createUIMessageStreamResponse` 返回的是什么协议？
   - 追问：它和第 5 天的 NDJSON 有什么不同？
10. 当前方案如何演进到 Tool Calling？
    - 追问：哪些工具调用必须加人工确认？

## 标准答案

### 1. 为什么升级到 useChat

第 5 天的自定义 NDJSON 适合理解协议，但多轮消息、重新生成、停止、恢复流和 Tool Calling 都会让手写状态机变复杂。`useChat` 是成熟 UI 层方案，可以减少重复代码，并和 AI SDK UI Message Stream 保持协议一致。

### 2. useChat 状态

`submitted` 表示请求已发送但响应流尚未真正进入稳定接收阶段；`streaming` 表示正在接收模型输出；`ready` 表示当前请求结束；`error` 表示请求失败。

### 3. DefaultChatTransport

Transport 是前端到 BFF 的通信适配层。它负责 API 路径、请求体、headers 和 credentials。企业项目用它集中控制请求格式，避免多个组件散落 fetch 细节。

### 4. sendMessage

`sendMessage` 会把用户消息加入本地消息列表，并通过 Transport 调用 BFF，随后把服务端返回的 UI Message Stream 合并进 assistant 消息。

### 5. stop

`stop` 会取消当前请求。企业里停止常用于控制成本和体验，例如输出方向不对时及时停止。停止不等于失败，也不等于完整成功，通常应保留已生成内容供用户判断。

### 6. regenerate

`regenerate` 用于重新生成最后一条 assistant 回复。重新生成仍然必须经过 BFF，重新读取权限内业务上下文，不能绕过服务端权限和数据边界。

### 7. 服务端校验

Zod 校验业务请求体，例如 `ticketId` 是否存在、字段是否多传；`safeValidateUIMessages` 校验 UI messages 是否符合 AI SDK 协议，避免非法结构进入模型链路。

### 8. toUIMessageStream

`streamText` 返回的是模型生成过程的 `TextStreamPart`。`toUIMessageStream` 把它转换为前端 `useChat` 能消费的 UI Message Chunk，隐藏模型底层流格式。

### 9. createUIMessageStreamResponse

它把 UI Message Chunk 转成 SSE 响应，响应头是 `text/event-stream`。第 5 天的 NDJSON 是一行一个 JSON；第 6 天是 AI SDK 标准 UI Message Stream。

### 10. Tool Calling 演进

后续可以把查询客户、订单、知识库注册为工具。查询型工具需要权限校验和参数校验；写入型工具，例如退款、关单、改状态，必须加入人工确认、幂等和审计。

## 项目实践

### 业务需求

把客服回复建议从“单次按钮 + 自定义 NDJSON 读取”升级为“AI SDK 聊天式状态管理”，支持生成、停止、重新生成和清空。

### 改动范围

- `src/app/api/ai/reply-chat/route.ts`：新增 AI SDK UI Message Stream BFF。
- `src/features/customer-service/server/replySuggestionChatStream.ts`：新增服务端应用服务，校验 UI messages、读取工单、调用模型并返回 UI Message Stream。
- `src/features/http/server/requestValidation.ts`：统一把 Zod 校验错误转换为前端可理解的中文业务错误。
- `src/app/replySuggestionChatPanel.tsx`：新增 `useChat` 前端交互叶子组件。
- `src/app/page.tsx`：把工单行里的回复建议入口切到 `ReplySuggestionChatPanel`。
- `README.md`：更新当前课程和三方依赖说明。
- `docs/Day06useChat状态停止和重新生成.md`：记录本章设计和面试表达。

### 代码阅读顺序

1. 阅读 `src/app/replySuggestionChatPanel.tsx`，理解 `useChat`、Transport、`sendMessage`、`stop` 和 `regenerate`。
2. 阅读 `src/app/api/ai/reply-chat/route.ts`，确认 BFF 只接收 `ticketId` 和 UI messages。
3. 阅读 `src/features/http/server/requestValidation.ts`，理解 Zod 原始错误如何转换成稳定中文错误。
4. 阅读 `src/features/customer-service/server/replySuggestionChatStream.ts`，理解 `safeValidateUIMessages`、`streamText`、`toUIMessageStream` 和 `createUIMessageStreamResponse`。
5. 对照第 5 天的 `src/features/customer-service/replySuggestionProtocol.ts`，区分 NDJSON 和 UI Message Stream。

### 验证方式

```bash
pnpm typecheck
pnpm lint
```

本章不默认启动服务、不执行构建、不操作浏览器。

### 异常场景

- 模型密钥未配置，Route Handler 返回 `503`，`useChat` 进入 `error`。
- 缺少 `ticketId` 或 UI messages 格式非法，返回 `400` 和中文业务错误。
- 工单不存在，返回 `404`。
- 用户点击停止，请求取消，保留已生成内容。
- 用户点击重新生成，复用当前消息上下文重新生成最后一条 assistant 回复。

## 官方文档

- [AI SDK：useChat](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [AI SDK：UI Message Streams](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol)
- [AI SDK：streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [Next.js：Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)

## 延伸阅读

下一章进入流式 Markdown 渲染与消息性能，解决企业 AI 回复里常见的 Markdown、长文本、频繁渲染和布局抖动问题。

## 企业级练习与验收标准

练习：用自己的话讲清楚 `useChat` 如何替代手写前端流状态机，并解释它和服务端 BFF 的边界。

验收标准：

- 能说出 `submitted`、`streaming`、`ready`、`error` 的区别。
- 能解释 `sendMessage`、`stop`、`regenerate` 的作用。
- 能说明为什么前端不能传模型配置和完整 Prompt。
- 能区分 Day05 NDJSON 和 Day06 UI Message Stream。
- 能在 Network 里根据 `Content-Type` 判断当前是否是 SSE。
- 能把本章讲成企业项目里的 AI 消息状态管理升级经验。
