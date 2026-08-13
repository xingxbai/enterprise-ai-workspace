# 第 9 天：多 Provider Adapter 与 Kimi 切换治理

掌握级别：必须精通

企业使用频率：每天

面试重要度：高

## 一句话理解

多 Provider Adapter 的价值不是“多写一个 Kimi 配置”，而是让页面、业务流程和 AI 应用服务不绑定具体模型厂商；今天通过 DeepSeek/Kimi 的服务端切换、非敏感状态展示和审计职责拆分，把模型接入做成企业可治理的架构边界。

## 为什么会出现

真实企业不会永远只用一个模型厂商。常见情况包括：

- DeepSeek 某个时间段限流，需要临时切到 Kimi。
- 不同模型在客服回复、摘要、知识问答上的效果不同，需要灰度对比。
- 公司采购策略、预算、合规要求变化，需要替换 Provider。
- 线上问题排查时，需要知道当前 active provider、模型名、host、是否已配置，但不能暴露 API Key。
- 审计日志、Token usage、错误日志属于可观测性，不应混在 Provider Adapter 里。

所以第 9 天的核心是“模型供应商治理”，不是重复讲密钥。

## 企业为什么需要

企业项目里，一个 AI 功能通常会被很多系统依赖：客服工作台、知识库、审批系统、数据分析看板。模型厂商如果散落在页面和业务代码里，后续换模型会变成高风险改造。

正确做法是：

- 前端只调用固定 BFF，不知道 DeepSeek/Kimi。
- 客户端只传 `ticketId` 和 UI messages，不传 providerId、modelId、baseURL、Prompt 或密钥。
- AI 应用服务只拿统一模型对象和运行参数。
- Provider Adapter 负责读取服务端环境变量、创建模型对象、处理厂商参数差异。
- 审计日志独立出来，记录 requestId、providerId、modelId、finishReason、usage。

## 企业每天怎么使用

本地 `.env.local` 中通过一个变量切换当前 Provider：

```env
AI_CHAT_PROVIDER=deepseek
```

需要切到 Kimi 时，只改服务端环境变量：

```env
AI_CHAT_PROVIDER=kimi
```

前端页面、客服回复建议按钮、`useChat`、Route Handler 和 Prompt 组装逻辑都不需要改。

注意：密钥仍然只保存在服务端变量中，不能使用 `NEXT_PUBLIC_` 前缀。

## 底层原理

DeepSeek 和 Kimi 都提供 OpenAI-compatible Chat Completions 接口，因此可以统一通过 `@ai-sdk/openai` 的 `createOpenAI` 适配：

```ts
createOpenAI({
  apiKey,
  baseURL,
  name: providerId,
}).chat(modelId)
```

但是“兼容”不代表完全一样。不同厂商可能在模型名、baseURL、temperature 推荐值、错误格式、Token usage 字段、超时表现上存在差异。所以本项目把这些差异放进 `src/features/ai/server/chatProvider.ts`。

## 本章代码改动

### 1. Provider Adapter 职责收敛

`src/features/ai/server/chatProvider.ts` 现在只负责：

- 用 Zod 校验 AI 服务端环境变量。
- 管理 DeepSeek/Kimi Provider 定义。
- 创建 AI SDK Chat 模型对象。
- 返回非敏感 Provider 状态。
- 记录脱敏错误。

它不再负责写本地 JSON 审计日志。

### 2. 新增模型审计日志模块

新增 `src/features/ai/server/modelAuditLog.ts`，专门负责本地学习审计日志：

- 日志目录：`logs/`
- 文件命名：`MM-DD.json`
- 时区：`Asia/Shanghai`
- 记录字段：`createdAt`、`requestId`、`providerId`、`modelId`、`finishReason`、`usage`
- 不记录字段：API Key、Authorization、Prompt、客户正文、完整工单对象

重要边界：

> 本地 JSON 文件适合学习和面试演示。生产环境 Route Handler 可能运行在 Serverless 中，文件系统不一定可靠，应替换为数据库、日志平台或审计事件流。

### 3. Provider 状态接口升级

`src/app/api/ai/providers/status/route.ts` 返回所有 Provider 的非敏感状态：

- `activeProviderId`
- `providers[].providerId`
- `providers[].label`
- `providers[].isActive`
- `providers[].isConfigured`
- `providers[].modelId`
- `providers[].baseURLHost`
- `providers[].maxOutputTokens`
- `providers[].requestTimeoutMs`
- `providers[].temperature`

它不会返回：

- `apiKey`
- `Authorization`
- 完整 `baseURL`
- 完整 `.env.local`
- Prompt
- 客户敏感正文

### 4. 首页展示模型服务状态

`src/app/page.tsx` 仍然是 Server Component，直接调用服务端 `getChatProvidersStatus()`，不是 HTTP 请求自己的 `/api/ai/providers/status`。

这体现了 Next.js App Router 的正确边界：

- Server Component 读服务端数据：直接调用服务端函数。
- Client Component 需要数据或触发 AI：调用 Route Handler BFF。
- Route Handler 保护密钥、校验请求、处理 AI 调用和错误边界。

### 5. 端口固定为 4000

`package.json` 已恢复：

```json
{
  "dev": "next dev --port 4000",
  "start": "next start --port 4000"
}
```

以后文档、启动脚本和讲解统一使用：

```txt
http://localhost:4000
```

## 函数调用顺序

| 顺序 | 函数或对象 | 所属分层 | 作用 | 企业开发场景 |
|---|---|---|---|---|
| 1 | `getChatProvidersStatus()` | Provider Adapter | 返回所有 Provider 的非敏感状态 | 页面展示当前模型服务状态，方便排障和演示 |
| 2 | `parseAIEnvironment()` | Provider Adapter | 用 Zod 校验服务端环境变量 | 避免 provider、baseURL、modelId、超时配置错误 |
| 3 | `createAIConfiguration(...)` | Provider Adapter | 根据 providerId 生成统一配置 | 封装 DeepSeek/Kimi 的 baseURL、modelId、temperature 差异 |
| 4 | `getChatModel()` | Provider Adapter 对外入口 | 返回 AI SDK 模型对象和业务需要的安全配置 | AI 应用服务不直接依赖具体厂商 |
| 5 | `createOpenAI(...)` | Provider Adapter | 创建 OpenAI-compatible Provider | 接入 DeepSeek、Kimi 等兼容 Chat Completions 的厂商 |
| 6 | `.chat(modelId)` | Provider Adapter | 创建 Chat 模型对象 | `streamText` 必须接收模型对象，而不是字符串 |
| 7 | `streamText(...)` | AI 应用服务 | 进行流式模型调用 | 客服回复建议、摘要、知识问答等真实 AI 生成 |
| 8 | `toUIMessageStream(...)` | AI 应用服务 | 转换为 UI Message Stream | 让 `useChat` 统一处理状态、停止、重新生成 |
| 9 | `createUIMessageStreamResponse(...)` | AI BFF 响应层 | 返回前端可消费的事件流响应 | 对接 AI SDK React 的成熟 UI 协议 |
| 10 | `recordModelCompletion(...)` | 可观测性/审计 | 记录 requestId、provider、model、finishReason、usage | 后续成本统计、审计、效果评估 |
| 11 | `recordModelError(...)` | 可观测性/错误边界 | 输出脱敏错误日志 | 排查认证失败、限流、超时和上游异常 |

## 企业最佳实践

- Provider 切换只通过服务端配置，不让前端传 providerId。
- 前端永远不接触 API Key、baseURL、模型名、系统 Prompt 和完整业务上下文。
- Provider Adapter 可以知道厂商差异，AI 应用服务只处理业务逻辑。
- 状态接口只返回非敏感状态，方便排障但不泄漏安全信息。
- 审计日志不要记录 Prompt、客户正文和 Authorization。
- 本地文件日志只用于学习演示，生产要接数据库、日志平台或事件流。
- 不要在 Server Component 中 HTTP 调用自己的 Route Handler。
- 新增 Provider 时先确认它是否真的兼容 Chat Completions，再封装差异。

## 常见错误

1. 把 Kimi 当作“再复制一份 DeepSeek 代码”，导致重复逻辑越来越多。
2. 前端传 `providerId`，让用户或攻击者可以绕过服务端策略。
3. 状态接口返回完整 `baseURL`、API Key 或环境变量。
4. Provider Adapter 同时写日志、读业务数据、拼 Prompt，职责过重。
5. 认为 OpenAI-compatible 厂商完全一致，不处理参数和错误差异。
6. 本地 `logs/MM-DD.json` 记录了客户问题正文。
7. Server Component 通过 `fetch("http://localhost:4000/api/...")` 调自己。
8. 切换 Provider 后前端要改代码，说明抽象边界失败。
9. 端口文档和 `package.json` 不一致，导致联调混乱。
10. 缺少 requestId，无法关联前端操作、模型调用和审计记录。

## 面试题

1. 为什么企业项目要做多 Provider Adapter？
   - 追问：它和简单 if/else 切模型有什么区别？
2. DeepSeek 和 Kimi 都是 OpenAI-compatible，为什么还要封装差异？
   - 追问：哪些字段可能不完全一样？
3. Provider 切换为什么不能由前端传参？
   - 追问：如果前端能传 providerId，会有什么风险？
4. 状态接口能返回哪些信息？
   - 追问：为什么 `baseURLHost` 可以返回，API Key 不能返回？
5. 为什么把 `recordModelCompletion` 从 Provider Adapter 拆出来？
   - 追问：如果不拆，会造成什么维护问题？
6. Server Component 为什么不应该 fetch 自己的 Route Handler？
   - 追问：Next.js 官方为什么建议直接读数据源？
7. 本地 JSON 审计日志适合生产吗？
   - 追问：生产应该替换成什么？
8. 如果 Kimi 限流，系统应该怎么返回错误？
   - 追问：内部日志和用户错误文案有什么区别？
9. 切换 Kimi 时前端要改哪些代码？
   - 追问：如果需要改页面，说明哪层设计有问题？
10. 后续如何把 Provider Adapter 扩展到 RAG 或 Tool Calling？
    - 追问：哪些逻辑仍然不能放进前端？

## 标准答案

### 1. 多 Provider Adapter 的价值

多 Provider Adapter 是为了隔离模型厂商变化。业务层只依赖统一模型对象和安全配置，不关心 DeepSeek、Kimi 或其他厂商的密钥、baseURL、模型名和参数差异。这样做可以支持供应商切换、灰度实验、故障兜底和成本治理。

### 2. OpenAI-compatible 不等于完全一致

它们的接口形状接近，但模型名、baseURL、temperature 推荐值、错误格式、usage 字段、超时表现和能力边界可能不同。企业项目要把差异封装在 Provider Adapter，而不是让页面和业务服务到处判断。

### 3. 前端不能选择 Provider

Provider 选择属于服务端策略，涉及成本、权限、合规和稳定性。前端如果可以传 providerId，用户可能绕过灰度策略、调用未授权模型或造成不可控成本。

### 4. 状态接口安全边界

状态接口可以返回 `isConfigured`、`modelId`、`baseURLHost`、`activeProviderId` 等非敏感信息，用于排障和展示；不能返回 API Key、Authorization、完整 baseURL、Prompt 或客户正文。

### 5. 审计日志拆分

Provider Adapter 应专注模型厂商接入。`recordModelCompletion` 属于可观测性/审计模块，后续会演进到成本表、审计事件流和效果评估。如果混在一起，Provider 代码会越来越胖，新增厂商时风险变高。

### 6. Server Component 不调自己的 Route Handler

Server Component 已经在服务端执行，应该直接调用数据函数或服务端模块。HTTP 调自己的 Route Handler 会多一次网络开销，并且构建阶段可能没有服务器监听。

### 7. 本地 JSON 日志定位

`logs/MM-DD.json` 是学习演示和面试讲解用的本地审计日志。生产环境应使用数据库、日志平台、消息队列或审计事件流，因为 Serverless 文件系统可能不可写、不持久，也不能跨实例共享。

### 8. Provider 切换的面试表达

> 我们通过 `AI_CHAT_PROVIDER=deepseek | kimi` 在服务端切换模型供应商。前端只传 `ticketId` 和 UI messages，BFF 校验后调用统一 AI 应用服务。Provider Adapter 读取服务端密钥和模型配置，返回 AI SDK model 对象；DeepSeek/Kimi 的 baseURL、modelId、temperature 和错误差异都封装在服务端。这样后续做 RAG、Tool Calling 或成本治理时，不需要重写前端业务流程。

## 项目实践

### 业务需求

客服工作台需要知道当前模型服务是否可用，并支持在服务端从 DeepSeek 切换到 Kimi，而不影响页面、工单列表、回复建议按钮和 `useChat` 协议。

### 改动范围

- `src/features/ai/server/chatProvider.ts`：收敛 Provider Adapter 职责，新增 `getChatProvidersStatus()`，统一 DeepSeek/Kimi 配置。
- `src/features/ai/server/modelAuditLog.ts`：新增模型完成审计日志模块。
- `src/features/customer-service/server/replySuggestionChatStream.ts`：从独立审计模块记录完成事件。
- `src/app/api/ai/providers/status/route.ts`：返回所有 Provider 的非敏感状态。
- `src/app/page.tsx`：在 Server Component 中直接展示模型服务状态。
- `package.json`：固定本地启动端口为 `4000`。
- `README.md` 和 `docs/00课程执行规范与60天Offer路线.md`：同步课程进度和执行规范。

### 代码阅读顺序

1. 阅读 `src/features/ai/server/chatProvider.ts`，理解 Provider Adapter 如何隔离 DeepSeek/Kimi。
2. 阅读 `src/features/ai/server/modelAuditLog.ts`，理解审计日志为什么独立。
3. 阅读 `src/features/customer-service/server/replySuggestionChatStream.ts`，理解 `streamText.onFinish` 如何记录 usage。
4. 阅读 `src/app/api/ai/providers/status/route.ts`，确认状态接口不返回敏感信息。
5. 阅读 `src/app/page.tsx`，确认 Server Component 直接读服务端状态，不 HTTP 调自己。

### 验证方式

```bash
pnpm typecheck
pnpm lint
```

本章不默认启动服务、不真实调用模型、不操作浏览器。

### 异常场景

- `AI_CHAT_PROVIDER=kimi` 但没有 Kimi 密钥：BFF 返回 `503 未配置 Kimi 服务端密钥`。
- Kimi/DeepSeek 认证失败：前端显示稳定错误，服务端输出脱敏日志。
- 状态接口被浏览器查看：只能看到非敏感状态，看不到密钥和 Prompt。
- 本地写日志失败：记录脱敏错误，不影响前端流式响应主流程。

## 官方文档

- [AI SDK：OpenAI Provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai)
- [AI SDK：streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [Next.js：Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Next.js：Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Moonshot AI / Kimi API 文档](https://platform.moonshot.cn/docs)

## 延伸阅读

下一章建议进入 `Next.js AI BFF 请求校验和错误边界`，把 `/api/ai/reply-chat` 的请求体、错误返回、错误码、前端错误展示进一步做成统一企业规范。

## 企业级练习与验收标准

练习：把当前 Provider 从 DeepSeek 切换为 Kimi，只允许修改服务端环境变量，不允许修改前端组件和业务流程。

验收标准：

- 能说明 Provider Adapter、AI 应用服务、BFF、前端分别负责什么。
- 能解释为什么前端不能传 providerId、modelId 和 baseURL。
- 能通过状态卡片判断当前 active provider 和配置状态。
- 能说明 `recordModelCompletion` 为什么属于审计模块。
- 能说明本地 JSON 日志和生产审计系统的区别。
- 能讲清楚新增第三个 Provider 时应该改哪里、不应该改哪里。
