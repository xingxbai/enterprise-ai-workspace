# 第 10 天：Next.js AI BFF 请求校验和错误边界

掌握级别：必须精通

企业使用频率：每天

面试重要度：高

## 一句话理解

AI BFF 不是简单转发请求，而是浏览器和模型/业务系统之间的安全边界：它负责生成 requestId、校验请求体、隐藏敏感错误、传递取消信号，并用统一错误格式把前端、服务端日志和模型审计串起来。

## 为什么会出现

前面几天已经完成了客服回复建议的模型调用、Streaming、`useChat` 和 Provider Adapter。但如果 BFF 错误边界不统一，会出现几个真实企业问题：

- 前端看到 Zod 原始英文错误，例如 `Invalid input: expected string, received undefined`。
- 服务端日志没有 requestId，用户截图和后端日志对不上。
- 模型配置错误、业务数据不存在、JSON 格式错误混在一起，不利于排查。
- BFF 把上游模型原始错误返回给浏览器，可能泄漏密钥、baseURL 或内部实现。
- 每个 Route Handler 都手写错误响应，后续 RBAC、限流、Tool Calling 会越来越乱。

所以第 10 天的目标是把 AI BFF 的入口错误边界做成公共规范。

## 企业为什么需要

企业 AI 功能一定要能排障。客服说“我点生成失败了”，研发不能只看到一句“请求失败”，而要能通过 requestId 找到：

- 哪个 BFF 路由失败。
- 请求体是否通过校验。
- 当前调用的是 DeepSeek 还是 Kimi。
- 是模型密钥缺失、模型限流、超时，还是工单不存在。
- 这次模型调用有没有进入审计日志。

同时，用户和浏览器只能看到安全、稳定、可理解的错误文案，不能看到 API Key、Authorization、Prompt、客户正文、堆栈和上游完整错误。

## 企业每天怎么使用

前端仍然只调用：

```ts
api: "/api/ai/reply-chat"
```

请求体仍然只包含最小 DTO：

```ts
{
  ticketId,
  messageId,
  messages,
  trigger,
}
```

如果请求体缺 `ticketId`，BFF 返回：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "ticketId 不能为空或类型不正确",
  "requestId": "..."
}
```

响应头同时带：

```txt
x-request-id: ...
```

前端只展示 `message`，服务端日志和模型审计用 `requestId` 串联。

## 底层原理

Next.js Route Handler 运行在服务端，使用 Web `Request` 和 `Response` API。它适合做 Client Component 的 BFF 边界：

- 读取浏览器请求。
- 做运行时校验。
- 读取服务端环境变量和业务数据。
- 调用 AI 应用服务。
- 返回 JSON 错误或流式响应。

但 Server Component 不应该 HTTP 调自己的 Route Handler。Server Component 已在服务端执行，应直接调用服务端函数；Route Handler 主要服务于浏览器交互、外部 webhook 或第三方调用。

## 本章代码改动

### 1. 新增统一 API 响应模块

新增 `src/features/http/server/apiResponse.ts`：

- `createRequestId()`：每次 BFF 请求生成一个追踪 ID。
- `createApiResponseHeaders(requestId)`：统一响应头，写入 `x-request-id`。
- `createApiErrorResponse(...)`：统一 JSON 错误格式。
- `recordApiError(...)`：记录脱敏 BFF 错误日志。

统一错误格式：

```ts
{
  code: "VALIDATION_ERROR",
  message: "ticketId 不能为空或类型不正确",
  requestId: "..."
}
```

### 2. Zod 校验响应接入 requestId

`src/features/http/server/requestValidation.ts` 继续负责把 Zod 的错误转成中文业务文案，但现在返回统一格式：

```ts
createBadRequestResponseFromZodError(error, fieldLabels, requestId)
```

这样前端不会再看到 Zod 默认英文错误。

### 3. `/api/ai/reply-chat` 接入统一错误边界

`src/app/api/ai/reply-chat/route.ts` 现在做四件事：

1. 创建 `requestId`。
2. 解析 JSON，失败返回 `INVALID_JSON`。
3. 用 Zod 校验请求体，失败返回 `VALIDATION_ERROR`。
4. 把 `requestId`、`ticketId`、`messages` 和 `request.signal` 传给 AI 应用服务。

### 4. AI 应用服务使用同一个 requestId

`src/features/customer-service/server/replySuggestionChatStream.ts` 不再自己生成 requestId，而是接收 BFF 传入的 requestId：

- JSON 错误响应带 requestId。
- UI Message Stream 响应头带 `x-request-id`。
- `messageMetadata` 中继续把 requestId 返回给前端消息元数据。
- `recordModelCompletion` 用同一个 requestId 写入本地审计日志。

### 5. 所有 BFF 使用同一错误契约

`/api/ai/reply-chat` 和 `/api/tickets/approve` 都使用 `{ code, message, requestId }` 与 `x-request-id`。写入型审批接口不会使用演示数据假成功，并把浏览器取消和超时信号传给上游业务请求。

### 6. 删除被成熟方案替代的教学旧链路

第一阶段收口时删除旧 `/api/ai/reply`、自定义 NDJSON 解析器、旧按钮和旧流服务。NDJSON保留在Day5作为协议选型与排障知识，不再占用主业务维护成本。

### 7. 前端展示安全中文错误

`src/app/replySuggestionChatPanel.tsx` 给 `DefaultChatTransport` 加了一个轻量 `fetch` 包装：

- 如果 BFF 返回成功流，正常交给 `useChat`。
- 如果 BFF 返回 JSON 错误，读取安全中文 `message` 并抛给 `useChat`。
- 页面显示 `error.message`，例如“未配置 Kimi 服务端密钥”或“ticketId 不能为空或类型不正确”。

## 函数调用顺序

| 顺序 | 函数或对象 | 所属分层 | 作用 | 企业开发场景 |
|---|---|---|---|---|
| 1 | `prepareSendMessagesRequest(...)` | Client Component | 组装最小请求体 | 前端只传 `ticketId`、messages、trigger，不传敏感配置 |
| 2 | `fetchChatResponse(...)` | Client Component | 拦截非 2xx JSON 错误并显示中文 message | 让用户看到可理解错误，而不是通用失败文案 |
| 3 | `POST(request)` | AI BFF / Route Handler | 接收浏览器请求 | 客服点击“生成建议”后的服务端入口 |
| 4 | `createRequestId()` | AI BFF | 生成请求追踪 ID | 串联前端报错、BFF 日志、模型审计和 usage |
| 5 | `request.json()` | AI BFF | 解析 JSON 请求体 | 捕获非法 JSON，返回 `INVALID_JSON` |
| 6 | `replySuggestionChatPayloadSchema.safeParse(...)` | AI BFF | 运行时校验 DTO | 防止缺字段、字段类型错误和多余字段进入业务层 |
| 7 | `createBadRequestResponseFromZodError(...)` | HTTP 公共层 | 把 Zod 错误转成中文错误响应 | 避免暴露 `Invalid input` 这类英文技术细节 |
| 8 | `createApiErrorResponse(...)` | HTTP 公共层 | 返回 `{ code, message, requestId }` | 建立统一 BFF 错误契约 |
| 9 | `recordApiError(...)` | 可观测性 | 记录脱敏 BFF 错误日志 | 排查非法 JSON、模型配置错误、未知异常 |
| 10 | `createReplySuggestionChatResponse(...)` | AI 应用服务 | 读取工单、选择模型、启动 streamText | 业务上下文和模型调用入口 |
| 11 | `createApiResponseHeaders(...)` | HTTP 公共层 | 给流式响应写 `x-request-id` | 成功和失败都可追踪 |
| 12 | `recordModelCompletion(...)` | 审计 | 记录模型完成和 usage | 后续成本统计、效果评估和审计 |

## 企业最佳实践

- BFF 入口第一步生成 requestId。
- JSON 解析错误、Schema 校验错误、业务不存在、模型配置错误要分开编码。
- 前端只能展示安全中文 message，不展示堆栈和上游原始错误。
- 服务端日志只记录 requestId、错误码、错误类型等白名单字段，不记录不可控的上游 message、请求体、Prompt、Authorization 或 API Key。
- Route Handler 要把 `request.signal` 继续传给模型调用，保证用户停止生成时能取消上游请求。
- `safeParse` 用于普通业务 DTO；`safeValidateUIMessages` 用于 AI SDK UI messages。
- 对外错误响应保持稳定，内部实现可以继续演进。
- 成功流和失败 JSON 都要带 requestId。

## 常见错误

1. 直接把 Zod 原始错误返回给浏览器。
2. 每个 Route Handler 都手写 `{ message }`，没有统一 `code` 和 `requestId`。
3. requestId 在 BFF、模型调用和审计日志里各生成一次，导致无法关联。
4. 把 API Key、Authorization、Prompt 或客户正文写进日志。
5. 把模型上游错误完整返回给前端。
6. 只做 TypeScript 类型，不做运行时校验。
7. 忘记传 `request.signal`，用户点击停止但模型仍在计费生成。
8. 前端永远显示“请稍后重试”，用户不知道是缺配置还是参数错误。
9. Server Component HTTP 调自己的 Route Handler。
10. 错误码随意命名，后续监控和告警无法聚合。

## 面试题

1. AI BFF 和普通 API Route 有什么区别？
   - 追问：为什么它是安全边界？
2. 为什么 TypeScript 类型不够，还要 Zod？
   - 追问：浏览器传来的 JSON 为什么不能相信？
3. 为什么要统一错误格式？
   - 追问：`code`、`message`、`requestId` 分别给谁用？
4. requestId 应该在哪里生成？
   - 追问：为什么不能模型服务里再生成一个？
5. 为什么不能把 Zod 原始错误返回给前端？
   - 追问：如何转成稳定中文？
6. 模型服务认证失败应该返回什么？
   - 追问：内部日志和用户文案有什么区别？
7. `request.signal` 的价值是什么？
   - 追问：不传 signal 会有什么线上成本问题？
8. `safeParse` 和 `safeValidateUIMessages` 各自适合什么？
   - 追问：UI messages 为什么不能只用 `z.unknown()`？
9. 成功的流式响应为什么也要带 requestId？
   - 追问：后续如何关联 usage 和采纳反馈？
10. 当前错误边界如何扩展到 RBAC、限流和 Tool Calling？
    - 追问：写入型 Tool 失败能不能假成功？

## 标准答案

### 1. AI BFF 的定位

AI BFF 是浏览器和 AI/业务系统之间的服务端边界。它不只是转发请求，而是负责认证、授权、请求校验、Prompt 和密钥保护、取消信号传递、错误脱敏、审计和成本追踪。

### 2. TypeScript 不替代运行时校验

TypeScript 只约束开发期代码，浏览器发来的 JSON 在运行时可能缺字段、类型错误或包含多余字段。企业 BFF 必须用 Zod 等运行时 Schema 做校验。

### 3. 统一错误格式

统一返回 `{ code, message, requestId }`。`message` 给用户看，`code` 给前端分支和监控聚合，`requestId` 给研发排查和审计关联。

### 4. requestId 生成位置

requestId 应在 BFF 入口生成，然后贯穿业务查询、模型调用、流式响应和审计日志。这样一次用户操作只有一个主追踪 ID。

### 5. 错误脱敏

前端只看到稳定中文错误，例如“模型服务认证失败，请联系管理员”。服务端日志可以记录 provider、错误类型和 requestId，但不能记录 API Key、Authorization、Prompt 或客户正文。

### 6. signal 传递

`request.signal` 要继续传给 `streamText`。用户断开连接或点击停止时，上游模型请求可以被取消，减少无效生成和 Token 成本。

### 7. 面试表达

> 我们的 AI BFF 会在入口生成 requestId，用 Zod 校验浏览器传来的最小 DTO。非法 JSON、Schema 错误、业务资源不存在和模型配置错误分别返回稳定错误码。前端只展示安全中文 message，服务端日志只记录脱敏错误和 requestId。成功的 UI Message Stream 也带 `x-request-id`，并在 `onFinish` 里用同一个 requestId 记录 usage，方便后续审计、成本统计和效果评估。

## 项目实践

### 业务需求

客服点击“生成建议”时，如果请求错误、缺少配置、工单不存在或模型服务不可用，前端要显示可理解的中文错误；研发要能通过 requestId 关联前端、BFF、模型调用和审计日志。

### 改动范围

- `src/features/http/server/apiResponse.ts`：新增统一错误响应、requestId 和脱敏 BFF 日志。
- `src/features/http/server/requestValidation.ts`：Zod 校验错误接入统一错误格式。
- `src/app/api/ai/reply-chat/route.ts`：主 AI BFF 接入 requestId、JSON 错误和 Schema 错误边界。
- `src/features/customer-service/server/replySuggestionChatStream.ts`：使用 BFF 传入的 requestId，并给 UI Message Stream 响应头写入 `x-request-id`。
- `src/app/api/tickets/approve/route.ts`：写入型BFF接入相同错误契约、超时、取消和上游错误分类。
- `src/data/ticketContracts.ts`：使用Zod校验外部工单DTO并限制演示数据环境边界。
- `src/app/replySuggestionChatPanel.tsx`：前端展示 BFF 返回的安全中文错误。
- `README.md`：更新当前课程和文档入口。

### 代码阅读顺序

1. 阅读 `src/features/http/server/apiResponse.ts`，理解统一 BFF 错误格式。
2. 阅读 `src/features/http/server/requestValidation.ts`，理解 Zod 错误如何转中文。
3. 阅读 `src/app/api/ai/reply-chat/route.ts`，理解 BFF 入口职责。
4. 阅读 `src/features/customer-service/server/replySuggestionChatStream.ts`，理解 requestId 如何进入模型调用和审计。
5. 阅读 `src/app/replySuggestionChatPanel.tsx`，理解前端如何展示安全错误。
6. 按异常场景手动调用审批接口，确认写入失败不会假成功，并核对错误码和requestId。

### 验证方式

```bash
pnpm typecheck
pnpm lint
```

本章不默认启动服务、不真实调用模型、不操作浏览器。

### 异常场景

- 请求体不是 JSON：返回 `INVALID_JSON`。
- 缺少 `ticketId`：返回 `VALIDATION_ERROR`。
- 工单不存在：返回 `NOT_FOUND`。
- 未配置当前 Provider 密钥：返回 `MODEL_CONFIGURATION_ERROR`。
- 模型服务异常：流内返回安全错误，或 BFF 返回 `MODEL_SERVICE_UNAVAILABLE`。
- 生产环境工单API不可用：返回空状态，不降级到学习演示数据。
- 未配置真实审批接口：返回 `BUSINESS_API_CONFIGURATION_ERROR`，不假成功。

## 官方文档

- [Next.js：Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Next.js：Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [AI SDK：UI Message Stream](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol)
- [AI SDK：safeValidateUIMessages](https://ai-sdk.dev/docs/reference/ai-sdk-core/validate-ui-messages)
- [Zod 文档](https://zod.dev/)

## 延伸阅读

下一阶段进入服务端 Session 与可信身份。当前只完成了公开BFF的请求与错误边界，尚未完成登录态、租户、RBAC和资源级权限，不能视为生产可用安全链路。

## 企业级练习与验收标准

练习：手动构造一个缺少 `ticketId` 的 `/api/ai/reply-chat` 请求，观察返回 JSON 和响应头。

验收标准：

- 返回体包含 `code`、`message`、`requestId`。
- 响应头包含 `x-request-id`。
- 前端不会显示 Zod 英文错误。
- 服务端日志不包含请求体、Prompt、Authorization 或 API Key。
- 成功生成后的审计日志 requestId 与 BFF requestId 一致。
- 手动验证生产环境禁止Demo降级、审批写入不假成功和统一错误契约。
