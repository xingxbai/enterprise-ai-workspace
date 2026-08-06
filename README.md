# Enterprise AI Workspace

面向存量企业系统的 AI 能力接入项目，用于完成 60 天 AI Application Engineer 学习与 Offer 冲刺。

## 当前进度

- 当前课程：第 4 天。
- 当前知识点：ReadableStream、背压和文本编解码。
- 当前代码：前三天代码保持稳定；本节先沉淀流式响应底层知识，不引入虚假 AI 链路。

## 权威文档

- [课程执行规范与 60 天路线](./docs/00课程执行规范与60天Offer路线.md)
- [第 1 天：App Router 与默认服务端组件边界](./docs/Day01AppRouter与默认服务端组件边界.md)
- [第 2 天：Client Component 边界和可序列化 Props](./docs/Day02ClientComponent边界和可序列化Props.md)
- [第 3 天：Route Handler 与服务端密钥边界](./docs/Day03RouteHandler与服务端密钥边界.md)
- [第 4 天：ReadableStream、背压和文本编解码](./docs/Day04ReadableStream背压和文本编解码.md)

后续课程、代码、练习和面试准备均以新项目内的课程执行规范为准。旧项目只保留为历史学习记录，不再作为新课程代码基础。

## 技术基线

- Node.js 22
- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- pnpm

## 常用检查

```bash
pnpm typecheck
pnpm lint
```

按照课程约束，不默认执行构建、启动开发服务或 Git 操作。
