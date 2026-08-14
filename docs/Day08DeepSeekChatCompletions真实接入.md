# 第 8 天：DeepSeek Chat Completions 真实接入与调用审计

掌握级别：必须精通

企业使用频率：每天

面试重要度：高

## 一句话理解

DeepSeek 在本项目里不是浏览器直接调用，而是通过服务端 Provider Adapter 以 OpenAI-compatible Chat Completions 方式接入，再由 AI SDK `streamText` 输出到企业业务链路；本章真正有价值的部分是把真实调用、requestId、finishReason 和 usage 纳入后续审计与成本统计链路。

## 为什么会出现

前 7 天已经完成了客服工单、AI BFF、`useChat`、UI Message Stream 和 Markdown 展示。第 8 天不是重复讲“怎么把密钥写进 `.env.local`”，而是把模型厂商接入边界和调用审计讲清楚：服务端如何选择模型、错误如何脱敏、前端为什么不能看到密钥和完整配置、一次模型完成后如何记录 usage。

## 企业为什么需要

真实企业不会让页面直接请求 DeepSeek。原因很直接：

- API Key 不能进入浏览器。
- baseURL 和模型配置需要由服务端统一管理。
- 模型厂商错误不能原样返回给用户。
- 需要统一超时、重试、取消、日志和成本统计。
- 后续要能把 DeepSeek 切到 Kimi 或其他兼容厂商。

## 企业每天怎么使用

当前 `.env.local` 应按 `.env.example` 配置：

```env
AI_CHAT_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的服务端密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
AI_MAX_OUTPUT_TOKENS=2048
AI_REQUEST_TIMEOUT_MS=60000
```

注意：所有密钥变量都不能使用 `NEXT_PUBLIC_` 前缀。

## 底层原理

DeepSeek 提供 OpenAI-compatible Chat Completions 接口。本项目通过 `@ai-sdk/openai` 的 `createOpenAI` 创建兼容 Provider：

```ts
createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
  name: "deepseek",
}).chat("deepseek-chat")
```

业务代码不直接持有 `apiKey`、`baseURL` 或模型厂商 SDK，只拿到 AI SDK 的模型对象。

## AI SDK 与服务端函数调用顺序

| 顺序 | 函数或对象 | 所属分层 | 作用 | 企业开发场景 |
|---|---|---|---|---|
| 1 | `parseAIEnvironment()` | Provider Adapter | 用 Zod 校验服务端环境变量 | 避免缺密钥、baseURL 错误、模型名为空导致运行时隐性失败 |
| 2 | `getChatProviderStatus()` | Provider Adapter | 返回非敏感 Provider 状态 | 排查当前是否配置 DeepSeek，只暴露 host、modelId、是否已配置 |
| 3 | `createOpenAI(...)` | Provider Adapter | 创建 DeepSeek OpenAI-compatible Provider | 封装 API Key、baseURL 和厂商名称 |
| 4 | `deepseekProvider.chat(modelId)` | Provider Adapter | 创建 AI SDK Chat 模型对象 | 业务层只依赖模型对象，不依赖 DeepSeek SDK |
| 5 | `getChatModel()` | AI 应用服务入口 | 根据 `AI_CHAT_PROVIDER` 返回当前模型和配置 | 支持后续 DeepSeek/Kimi/其他厂商切换 |
| 6 | `streamText(...)` | AI 应用服务 | 发起真实流式模型调用 | 客服回复建议、摘要、知识问答等生成能力 |
| 7 | `recordModelError(...)` | 可观测性 | 记录脱敏错误 | 排查认证失败、限流、超时、厂商异常 |
| 8 | `recordModelCompletion(...)` | 可观测性 | 按 `logs/MM-DD.json` 记录 requestId、模型、finishReason、usage | 后续接审计、成本统计、效果评估 |

面试表达：

> 我们把 DeepSeek 接入封装在服务端 Provider Adapter 中，使用 `createOpenAI({ baseURL, apiKey }).chat(modelId)` 走 OpenAI-compatible Chat Completions，不走 OpenAI Responses API。浏览器只提交 `ticketId` 和 UI messages，BFF 校验后由服务端读取工单、组装 Prompt 并调用 `streamText`。密钥、baseURL、完整 Prompt 和原始错误都不会返回前端。

## 企业最佳实践

- DeepSeek 密钥只放服务端环境变量，不使用 `NEXT_PUBLIC_`。
- `.env.example` 只写变量名和占位值，不提交真实密钥。
- Provider Adapter 统一读取密钥、baseURL、模型名、超时和输出 token 限制。
- 缺密钥时明确返回 `503`，不模拟 AI 文本。
- 日志记录 provider、model、requestId、错误类型和 usage，不记录 Prompt 和客户敏感正文。
- 本地学习环境把完成日志写入 `logs/MM-DD.json`；生产环境应替换为数据库、日志平台或审计事件流。
- 提供状态接口时只返回非敏感信息，例如 `isConfigured`、`modelId`、`baseURLHost`。
- 前端不传 providerId、modelId、baseURL 或系统 Prompt。
- 真实请求失败时使用稳定中文错误，避免泄漏上游原始错误。

## 常见错误

1. 把 `DEEPSEEK_API_KEY` 写成 `NEXT_PUBLIC_DEEPSEEK_API_KEY`。
2. 在 Client Component 里直接调用 DeepSeek。
3. 把 DeepSeek 原始错误完整返回给浏览器。
4. 缺密钥时返回固定模拟文本。
5. 业务代码到处写 `createOpenAI`，没有 Provider Adapter。
6. 混用 Responses API 和 Chat Completions 兼容接口。
7. 没有设置超时和输出 token 限制。
8. 日志记录完整 Prompt、客户正文或 Authorization。
9. 没有 requestId，无法追踪一次生成。
10. 前端依赖具体模型厂商，导致切换 Provider 时大面积改 UI。

## 面试题

1. DeepSeek 在这个项目里如何接入？
   - 追问：为什么用 OpenAI-compatible Provider？
2. 为什么不能在前端调用 DeepSeek？
   - 追问：F12 能看到哪些敏感信息？
3. `createOpenAI` 和 `.chat(modelId)` 分别做什么？
   - 追问：`streamText` 接收的是字符串还是模型对象？
4. `AI_CHAT_PROVIDER` 的价值是什么？
   - 追问：切到 Kimi 时前端要不要改？
5. 缺少 `DEEPSEEK_API_KEY` 应该怎么处理？
   - 追问：为什么不能返回模拟 AI 文本？
6. baseURL 是否可以返回给前端？
   - 追问：状态接口能返回哪些非敏感信息？
7. 模型调用失败如何脱敏？
   - 追问：内部日志和用户错误文案有什么区别？
8. token usage 应该在哪里处理？
   - 追问：为什么不一定展示给普通客服？
9. 为什么要记录 requestId？
   - 追问：它如何关联审计和成本？
10. 当前设计如何扩展到其他模型厂商？
    - 追问：哪些差异应该留在 Provider Adapter？

## 标准答案

### 1. DeepSeek 接入方式

本项目使用 `@ai-sdk/openai` 的 `createOpenAI` 创建 OpenAI-compatible Provider，然后通过 `.chat(DEEPSEEK_MODEL)` 得到 AI SDK 模型对象，最后由 `streamText` 发起模型调用。

### 2. 不能前端直连

前端直连会暴露 API Key、baseURL、模型名、Prompt 和业务上下文。浏览器请求体、响应和源码都可以通过 F12 查看，因此模型调用必须放在服务端 BFF 和 Provider Adapter 后面。

### 3. createOpenAI 和 chat

`createOpenAI` 创建厂商适配器，负责 baseURL、apiKey 和 provider name；`.chat(modelId)` 创建具体 Chat 模型对象。`streamText` 接收的是模型对象，不是普通字符串。

### 4. Provider 选择

`AI_CHAT_PROVIDER` 让服务端决定当前使用 DeepSeek 还是 Kimi。前端始终调用同一个 BFF，不需要知道模型厂商。

### 5. 缺密钥处理

缺密钥返回明确 `503`，告诉管理员配置服务端密钥。不能用固定文本或人工延迟冒充真实 AI，否则学习和面试表达都会失真。

### 6. 非敏感状态

状态接口可以返回 `isConfigured`、`providerId`、`modelId`、`baseURLHost` 等非敏感信息，但不能返回 API Key、Authorization、完整环境变量或 Prompt。

### 7. 错误脱敏

前端只看到稳定中文错误。服务端日志可以记录 provider、model、requestId、状态码和错误类型，但必须过滤密钥和敏感正文。

### 8. token usage

usage 属于审计和成本统计字段，应在服务端完成记录，后续进入审计表或成本表。普通客服界面不一定需要展示 usage。

### 9. requestId

`requestId` 用于关联前端操作、BFF 日志、模型调用、usage、错误和后续采纳反馈，是排查和审计的核心线索。

### 10. 扩展 Provider

新增 Provider 时只改 Provider Adapter 和环境配置，不改页面和业务流程。厂商参数、模型能力、错误格式和 usage 差异都应留在适配层处理。

## 项目实践

### 业务需求

把 DeepSeek 真实接入方式固化为企业 Provider Adapter，并补齐服务端安全状态、脱敏日志和完成记录入口。

### 改动范围

- `src/features/ai/server/chatProvider.ts`：补齐 DeepSeek/Kimi Provider 配置、密钥占位值识别、安全状态和完成日志。
- `src/app/api/ai/providers/status/route.ts`：新增非敏感 Provider 状态接口。
- `src/features/customer-service/server/replySuggestionChatStream.ts`：在 `streamText.onFinish` 中记录 requestId、finishReason 和 usage。
- `.gitignore`：忽略本地 `logs/` 审计日志目录，避免运行日志进入版本库。
- `.env.example`：整理 DeepSeek 默认配置和 Provider 选择顺序。
- `README.md`：更新当前课程和文档入口。
- `docs/Day08DeepSeekChatCompletions真实接入.md`：记录本章设计和面试表达。

### 代码阅读顺序

1. 阅读 `.env.example`，确认 DeepSeek 服务端变量命名。
2. 阅读 `src/features/ai/server/chatProvider.ts`，理解 Provider Adapter 如何读取配置并创建模型对象。
3. 阅读 `src/app/api/ai/providers/status/route.ts`，确认状态接口不暴露密钥。
4. 阅读 `src/features/customer-service/server/replySuggestionChatStream.ts`，理解真实模型调用和完成记录。
5. 阅读 `src/app/replySuggestionChatPanel.tsx`，确认前端仍只传 `ticketId` 和 UI messages。

### 验证方式

```bash
pnpm typecheck
pnpm lint
```

完成本章时应使用个人服务端密钥做一次受控 smoke 验证，确认首个流事件、完成状态、requestId 和 usage；不得把真实密钥或客户正文写入演示数据。

### 异常场景

- `DEEPSEEK_API_KEY` 留空或仍是占位值，返回 `503`。
- DeepSeek 返回认证失败，前端显示稳定错误，服务端记录脱敏日志。
- DeepSeek 限流或超时，服务端归一化为用户可理解的错误。
- 状态接口只显示是否配置，不显示密钥。

## 官方文档

- [DeepSeek API 文档](https://api-docs.deepseek.com/)
- [AI SDK：OpenAI Provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai)
- [AI SDK：streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [Next.js：Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)

## 延伸阅读

下一章进入多 Provider Adapter 与 Kimi 切换治理。第 9 天会把 `recordModelCompletion` 从 Provider Adapter 拆到独立审计模块，并把状态接口升级为 DeepSeek/Kimi 全量非敏感状态。

## 企业级练习与验收标准

练习：用自己的话讲清楚 DeepSeek 为什么必须通过服务端 Provider Adapter 接入，并说明前端、BFF、AI 应用服务和 Provider Adapter 的边界。

验收标准：

- 能说明 DeepSeek 使用 OpenAI-compatible Chat Completions。
- 能解释 `createOpenAI(...).chat(modelId)` 和 `streamText` 的关系。
- 能说清楚为什么密钥、baseURL、Prompt 不能进浏览器。
- 能描述缺密钥、认证失败、限流和超时的处理方式。
- 能说明 requestId、usage 和 finishReason 如何服务后续审计和成本统计。
- 能说明为什么本地日志不能记录 Prompt、客户正文和密钥。
