# Enterprise AI Workspace

面向存量企业系统的 AI 能力接入项目，用于完成 60 天 AI Application Engineer 学习与 Offer 冲刺。

## 当前进度

- 当前课程：第 5 天。
- 当前知识点：企业 AI 回复建议的消息协议与状态管理。
- 当前代码：前三天代码保持稳定；工单列表默认使用学习演示种子数据，真实工单 API 不可用时自动降级；客服回复建议使用 AI SDK、Provider Adapter 和结构化事件协议处理开始、增量、完成、失败和取消。

## 权威文档

- [课程执行规范与 60 天路线](./docs/00课程执行规范与60天Offer路线.md)
- [第 1 天：App Router 与默认服务端组件边界](./docs/Day01AppRouter与默认服务端组件边界.md)
- [第 2 天：Client Component 边界和可序列化 Props](./docs/Day02ClientComponent边界和可序列化Props.md)
- [第 3 天：Route Handler 与服务端密钥边界](./docs/Day03RouteHandler与服务端密钥边界.md)
- [第 4 天：企业 AI 回复建议 Streaming 成熟方案](./docs/Day04企业AI回复建议Streaming成熟方案.md)
- [第 5 天：企业 AI 回复建议的消息协议与状态管理](./docs/Day05企业AI回复建议的消息协议与状态管理.md)

后续课程、代码、练习和面试准备均以新项目内的课程执行规范为准。旧项目只保留为历史学习记录，不再作为新课程代码基础。

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
- `ai`：Vercel AI SDK 核心包，提供 `streamText`、`generateText`、消息流和模型调用抽象。
- `@ai-sdk/openai`：Vercel AI SDK 的 OpenAI Provider 包，本项目用于接入 DeepSeek 和 Kimi 的 OpenAI-compatible Chat Completions。
- `zod`：运行时 Schema 校验，用于 Route Handler 请求体、Prompt 变量、模型输出和 Tool 参数校验。
- `server-only`：服务端模块边界保护，防止密钥、Provider Adapter 和业务 API 代码被误导入客户端。

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

按照课程约束，不默认执行构建、启动开发服务或 Git 操作。
