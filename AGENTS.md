<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Enterprise AI Workspace 项目协作提示词

本项目的目标不是从 0 到 1 手写底层 API，而是沉淀一套面试中能讲、企业中也能落地的 AI 应用工程项目。

## 课程与代码主线

- 每一章必须围绕企业级项目实战功能展开，而不是孤立技术 Demo。
- 项目主线是 `Enterprise AI Workspace`：客服工单、客户、知识库、权限、Prompt、Provider、Streaming、人工确认、审计、成本和效果评估必须逐步连成一条真实业务链路。
- 后续课程要优先产出面试可讲的企业功能、架构决策、边界设计和工程取舍。
- 不把课程做成多个无关 Demo，不开发纯聊天、Todo 或技术炫技功能。

## 成熟方案优先

- 企业中成熟方案优先于手写底层实现。
- Streaming、模型调用和消息协议优先使用 AI SDK、Provider Adapter、SSE 或稳定 UI message 协议。
- 表单、请求体和模型输出校验优先使用 Zod 等运行时校验方案。
- UI 和交互优先遵循项目组件规范或成熟组件库，不手搓复杂控件作为主线。
- 状态、取消、重试和错误处理优先使用成熟 hook、service 和 adapter 抽象。

## 真实 AI 接入参考源

真实 AI 场景接入优先参考本机历史项目：

```txt
/Users/baixingxing/xingxbai/AI/FrontendEngineer
```

重点参考内容：

- `apps/web/.env.example`：DeepSeek、Kimi、模型名、Base URL 和超时配置命名。
- `apps/web/src/lib/ai/deepseek.ts`：DeepSeek OpenAI-compatible Chat Completions 接入方式。
- `apps/web/src/lib/ai/kimi.ts`：Kimi OpenAI-compatible Chat Completions 接入方式。
- `apps/web/src/lib/ai/model-service.ts`：Provider 选择、错误归一化和日志脱敏。
- `apps/web/src/lib/ai/chat-service.ts`：AI SDK `streamText`、取消信号、流式响应和用量处理。
- `apps/web/src/app/api/chat/route.ts`：Route Handler 作为 AI BFF 的请求校验和错误边界。

当前项目沿用的关键约定：

- DeepSeek：`DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL=https://api.deepseek.com`、`DEEPSEEK_MODEL=deepseek-chat`。
- Kimi：`KIMI_API_KEY`、`KIMI_BASE_URL=https://api.moonshot.cn/v1`、`KIMI_MODEL=kimi-k2.7-code-highspeed`。客服回复建议优先低延迟体验，官方文档标注该模型为高速版；如后续更看重通用客服话术质量，可评估 `kimi-k2.6` 或 `kimi-k3`。
- Provider 选择：`AI_CHAT_PROVIDER=deepseek | kimi`。
- 调用方式：OpenAI-compatible Chat Completions，使用 AI SDK `createOpenAI(...).chat(modelId)` 和 `streamText`，不要走 OpenAI Responses API。
- 密钥变量严禁使用 `NEXT_PUBLIC_` 前缀，严禁返回给浏览器。

## 原生底层的定位

- 原生 `ReadableStream`、`TextEncoder`、`TextDecoder`、SSE 字符串格式等只作为底层理解、排障和面试追问内容。
- 原生代码可以一笔带过，避免为底层 API 写大量独立业务实现。
- 需要讲底层时，重点说明它解决什么问题、企业项目如何通过成熟方案封装它、线上如何排查乱码、卡住、取消不生效、代理缓冲等问题。
- 不长期维护手写模型 SSE parser 作为企业主实现。

## 面试表达优先

每章都要能沉淀成中高级候选人的项目表达，至少回答：

- 为什么业务需要这个 AI 功能？
- 为什么选择这个成熟方案？
- 安全边界在哪里？
- 客户端、BFF、应用服务、Provider Adapter、业务 API Adapter 分别负责什么？
- 如何处理权限、租户隔离、Prompt 泄漏、敏感数据、超时、取消、重试、错误脱敏、审计和成本？
- 如果换模型厂商、接入真实业务 API、扩展到 RAG 或 Tool Calling，当前设计如何演进？

## 代码实践要求

- 默认页面和布局保持 Server Component，交互叶子才使用 Client Component。
- 客户端只传最小 DTO，例如 `ticketId`，不能传 API Key、baseURL、模型名、完整 Prompt、权限判断或完整敏感对象。
- Route Handler 是 AI BFF 边界，必须做运行时校验、错误脱敏，并把取消信号继续传给模型或上游业务请求。
- Provider Adapter 只在服务端读取密钥和厂商配置，封装 DeepSeek、Kimi 等 OpenAI-compatible 差异。
- 没有真实密钥或真实业务 API 时，返回明确错误或空状态，不用模拟 AI 文本、固定回答、人工延迟冒充真实链路。
- 为了支撑课程和面试演示，可以提供明确命名的学习演示种子数据，但必须标注为 demo fixture，且真实业务 API 配置存在时必须优先使用真实数据源。
- 读取型业务 API 在开发环境不可用时，可以降级到学习演示种子数据并记录脱敏日志，避免页面整体崩溃；写入型业务 API 不允许假成功。
- 每章代码必须和后续课程可连续演进，不做不可复用、不可连接的临时功能。

## 文档要求

- 每节课必须生成或更新对应 `docs/DayXX...md` 文档。
- 章节文档应突出企业项目功能、架构决策、成熟方案、常见坑、面试题、标准答案、项目实践和验收标准。
- 如果课程方向发生调整，必须同步更新 `README.md` 和 `docs/00课程执行规范与60天Offer路线.md`。
