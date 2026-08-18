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
- 从 Day12 开始，每节课按约 60 分钟设计，只完成一个可验收的 AI 增量；固定包含概念与目标、调用链定位、实现、调试/调优、手动验收和面试表达。
- 旧系统业务页面一次性作为稳定基线提供，后续课程只能在明确的页面接入点逐步增加 AI 能力，不能为了讲课反复重写普通业务功能。

## 学习者关注范围

- 学习者只重点学习：现有企业业务如何接入 AI、如何选择模型和上下文、如何设计 Prompt/Structured Output/RAG/Tools/Agent、如何生成建议或预测结果，以及如何评估提效、质量、延迟和成本。
- 登录、Session、RBAC、租户、传统 CRUD、业务 API、数据库表、文件上传和普通页面等业务基础能力，由 Codex 按成熟企业方案直接实现；课程文档只用一小节说明它们给 AI 提供的输入、安全边界和调用位置，不要求学习者跟写实现细节。
- 每节课必须明确区分“业务基础代码”和“本节 AI 学习代码”，代码阅读顺序优先指向 AI BFF、AI 应用服务、Prompt、模型调用、输出校验、评估和人工确认。
- 预测类功能优先覆盖工单分类、优先级、SLA 风险、客户意图、情绪、升级风险和下一步动作；输出必须包含可验证依据、不确定性和人工确认边界。
- 不把模型自报的 `confidence` 冒充真实概率。需要概率或置信度时，必须说明它来自评测集校准、规则/模型融合或专用预测模型；未校准时只使用风险等级、证据和“无法判断”。
- 非 AI 业务知识不再单独占用完整章节；只有直接影响 AI 安全、数据质量和上线效果的部分才保留为面试级架构说明。

## AI 调试与调优训练标准

- 默认学习者是第一次接触 AI 工程：首次出现的模型参数、流事件、Token、Structured Output、Embedding、RAG、Tool 和 Agent 概念必须用业务例子讲清楚，并展示它在代码、Network、日志或模型响应中的实际形态。
- 最终培养目标按能独立负责线上 AI 功能的老员工标准执行：不仅会调用 SDK，还要会建立基线、定位故障、提出假设、做单变量对照、分析失败样本、决定上线或回滚，并能向面试官解释证据和取舍。
- 每个 AI 章节必须包含“AI 调用链定位”“调试实战”“调优实验”“失败样本”“线上排障清单”和“面试表达”，不能只给最终正确代码。
- 调试顺序固定覆盖：业务输入 DTO、AI BFF、Prompt 与上下文、Provider 请求、首 Token/Streaming、Structured Output 解析、完成原因、Token/延迟/成本、日志与审计。先确认问题在哪一层，再修改代码。
- 调优必须先定义基线和目标指标，固定代表性样本，一次只修改一个主要变量，并记录修改前后质量、首 Token 延迟、总耗时、输入/输出 Token、成本和失败率；禁止凭单次输出或主观感觉宣布效果提升。
- Prompt 调优要覆盖角色、任务、上下文、约束、输出 Schema、Few-shot、反例和拒答；模型参数调优要覆盖模型选择、`temperature`、输出 Token、超时、重试和上下文预算，并解释各自适用边界。
- RAG 调试要区分“没有召回、召回错误、上下文组装错误、模型未引用、知识本身错误”；Tool/Agent 调试要区分参数生成、权限、工具执行、状态流转、停止条件和补偿失败。
- 每章至少保留一个真实失败案例和一份可复现排查路径。没有真实模型密钥时提前说明阻塞，不用模拟文本冒充调试结果。

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
- 全程不生成 `.test.ts`、`.spec.ts`、测试替身或测试框架配置，不引入 Vitest、Jest 等测试依赖；每章改为提供手动验收清单，由学习者自行验证。

## 文档要求

- 每节课必须生成或更新对应 `docs/DayXX...md` 文档。
- 章节文档应突出企业项目功能、架构决策、成熟方案、常见坑、面试题、标准答案、项目实践和验收标准。
- 从 Day12 开始，每节课文档必须在前半部分集中提供“完整运行流程”，从用户操作开始，按真实执行顺序覆盖客户端、AI BFF、身份/权限、请求校验、业务数据、AI 应用服务、Prompt/上下文、Provider、输出解析、运行时校验、审计和页面结果；不能只列函数名。
- 完整流程后必须提供逐步表格，至少写清每一步的输入、处理、输出或失败状态；存在 Streaming、取消、重试、Tool、Agent 或写入时，还必须单列对应的分支流程。
- 每节课必须集中整理“本节需要特别注意的点”，按确定性代码与 AI 的职责、最小 DTO、数据/标签泄漏、Provider 兼容性、格式正确与业务正确、安全、人工确认、日志脱敏和效果评估等实际相关维度说明，不能只把注意点零散埋在正文。
- 每节课必须提供“运行时每层能看到什么”表格，说明浏览器、BFF、应用服务、Provider Adapter、日志/审计和业务页面分别可见与禁止暴露的信息。
- 只要功能包含预测、计算或决策，就必须明确哪些确定性事实由普通代码计算，哪些语义判断交给 AI；不得把时间、金额、权限、精确统计等确定性计算完全交给大模型。
- 真实运行结果一般、错误或与业务事实冲突时，必须如实写入本章基线和失败复盘，指出问题属于数据、规则、Prompt、Provider、解析还是评测层，并明确后续修正课程；不得只保留效果最好的演示结果。
- 如果课程方向发生调整，必须同步更新 `README.md` 和 `docs/00课程执行规范与60天Offer路线.md`。
