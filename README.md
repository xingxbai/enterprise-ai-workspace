# Enterprise AI Workspace

面向存量企业系统的 AI 能力接入项目，用于完成 60 天 AI Application Engineer 学习与 Offer 冲刺。

## 当前进度

- 当前课程：第 11 天。
- 当前知识点：服务端 Session 与可信身份。
- 当前代码：页面、模型状态、AI 回复和工单审批均从服务端加密 Session 读取当前用户；浏览器只持有 HttpOnly Cookie，不能通过请求体指定 `userId`；模型审计记录服务端解析出的 `actorUserId`。
- 当前边界：非生产环境提供明确标注的演示身份；生产环境尚未接入企业 SSO/OIDC、用户目录、租户隔离、RBAC 和资源级权限，因此仍不能直接作为生产登录方案。

## 权威文档

- [课程执行规范与 60 天路线](./docs/00课程执行规范与60天Offer路线.md)
- [第 1 天：App Router 与默认服务端组件边界](./docs/Day01AppRouter与默认服务端组件边界.md)
- [第 2 天：Client Component 边界和可序列化 Props](./docs/Day02ClientComponent边界和可序列化Props.md)
- [第 3 天：Route Handler 与服务端密钥边界](./docs/Day03RouteHandler与服务端密钥边界.md)
- [第 4 天：企业 AI 回复建议 Streaming 成熟方案](./docs/Day04企业AI回复建议Streaming成熟方案.md)
- [第 5 天：企业 AI 消息协议选型与状态建模](./docs/Day05企业AI回复建议的消息协议与状态管理.md)
- [第 6 天：useChat 状态、停止和重新生成](./docs/Day06useChat状态停止和重新生成.md)
- [第 7 天：流式 Markdown 渲染与消息性能](./docs/Day07流式Markdown渲染与消息性能.md)
- [第 8 天：DeepSeek Chat Completions 真实接入](./docs/Day08DeepSeekChatCompletions真实接入.md)
- [第 9 天：多 Provider Adapter 与 Kimi 切换治理](./docs/Day09多ProviderAdapter与Kimi切换治理.md)
- [第 10 天：Next.js AI BFF 请求校验和错误边界](./docs/Day10NextjsAIBFF请求校验和错误边界.md)
- [第 11 天：服务端 Session 与可信身份](./docs/Day11服务端Session与可信身份.md)
- [第一阶段复盘与验收](./docs/Stage01第一阶段复盘与验收.md)

后续课程、代码、练习和面试准备均以新项目内的课程执行规范为准。旧项目只保留为历史学习记录，不再作为新课程代码基础。

## 后续学习范围

- 重点学习：给工单、知识库、表单和数据分析业务接入 AI，生成回复建议、分类、结构化提取、风险预测、下一步动作和 Agent 工作流。
- 重点掌握：Prompt、Structured Output、Provider、Streaming、RAG、Embedding、Tool Calling、Agent、评测、人工确认、成本和效果指标。
- 业务基础设施由项目直接提供：登录、Session、RBAC、租户、CRUD、业务 API、数据库、文件上传和普通 UI 不再作为课程主讲内容。
- 预测结果必须给出依据和不确定性；未经评测校准的模型自报置信度不作为真实概率。
- 每个 AI 功能都按老员工工作方式训练：建立可复现基线，沿完整调用链调试，使用固定失败样本做单变量调优，并比较质量、首 Token 延迟、总耗时、Token、成本和失败率。
- 概念按第一次接触的程度讲解，但验收要求达到能够独立定位线上 AI 问题、解释调优证据和做上线取舍的水平。

## 技术基线

- Node.js 22
- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- pnpm

## 三方依赖与用途

### 运行时依赖

- `next`：应用框架，使用 App Router、Server Component、Client Component 和 Route Handler。
- `react` / `react-dom`：React 19 组件和渲染运行时。
- `react-markdown`：Markdown 渲染组件，用于把模型输出的结构化回复渲染为安全可读的业务内容。
- `remark-gfm`：GitHub Flavored Markdown 插件，用于支持表格、任务列表等企业回复中常见的 Markdown 语法。
- `ai`：Vercel AI SDK 核心包，提供 `streamText`、`generateText`、消息流和模型调用抽象。
- `@ai-sdk/react`：Vercel AI SDK 的 React UI 包，提供 `useChat` 等成熟 hook，用于管理消息、状态、停止和重新生成。
- `@ai-sdk/openai`：Vercel AI SDK 的 OpenAI Provider 包，本项目用于接入 DeepSeek 和 Kimi 的 OpenAI-compatible Chat Completions。
- `zod`：运行时 Schema 校验，用于 Route Handler 请求体、Prompt 变量、模型输出和 Tool 参数校验。
- `server-only`：服务端模块边界保护，防止密钥、Provider Adapter 和业务 API 代码被误导入客户端。
- `iron-session`：Next.js 官方认证指南推荐的无状态 Session 库，用于签名、加密和管理 HttpOnly Cookie；它不负责企业账号认证或权限判断。

### 开发期依赖

- `typescript`：类型检查。
- `eslint` / `eslint-config-next`：代码质量检查和 Next.js 推荐规则。
- `tailwindcss` / `@tailwindcss/postcss`：样式工具链。
- `@types/node`、`@types/react`、`@types/react-dom`：TypeScript 类型声明。

新增三方依赖时，必须同步更新本节，说明它解决的企业问题、使用边界和是否进入客户端产物。

## 常用检查

```bash
pnpm typecheck
pnpm lint
```

## 本地启动

```bash
pnpm dev
```

项目启动端口固定为：

```txt
http://localhost:4000
```

按照课程约束，不默认执行构建、启动开发服务或 Git 操作。
