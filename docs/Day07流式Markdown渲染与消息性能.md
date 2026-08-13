# 第 7 天：流式 Markdown 渲染与消息性能

掌握级别：必须精通

企业使用频率：每天

面试重要度：高

## 一句话理解

企业 AI 回复不能长期用普通文本展示，而应该把模型输出约束成安全 Markdown，再用成熟 Markdown 渲染组件和节流策略控制流式渲染性能。

## 为什么会出现

第 6 天已经用 `useChat` 管理客服回复建议的状态、停止和重新生成。但真实客服回复经常不是一段纯文本，而是：

- 问题摘要。
- 建议回复。
- 后续动作。
- 风险提醒。
- 表格、列表、代码或配置片段。

如果继续用 `<p>{text}</p>`，可读性差，也不利于后续人工编辑和采纳反馈。

## 企业为什么需要

企业 AI 输出要服务业务角色。客服需要快速判断：

- 这次问题是什么。
- 回复客户的话术是否得体。
- 还需要查哪些系统或补哪些信息。

Markdown 能让模型输出更结构化，但也带来两个工程问题：

- 安全：不能让模型输出 HTML 并直接渲染。
- 性能：流式输出会频繁更新，Markdown 解析和 React 渲染不能过度触发。

## 企业每天怎么使用

本章把回复建议输出约束为 Markdown：

```markdown
### 问题摘要
- ...

### 建议回复
- ...

### 后续动作
- ...
```

前端渲染链路：

```txt
useChat messages
  -> 提取最新 assistant text part
  -> StreamingMarkdown
  -> react-markdown
  -> remark-gfm
  -> 限制 allowedElements
  -> 展示安全 Markdown
```

同时通过 `useChat({ throttle: 80 })` 降低流式过程中 Markdown 解析和 React 重渲染频率。

## 底层原理

Markdown 渲染不是简单 `innerHTML`。成熟方案会把 Markdown 解析成语法树，再映射成 React 元素。

本章使用：

- `react-markdown`：把 Markdown 文本渲染为 React 元素。
- `remark-gfm`：支持 GFM 语法，例如表格和任务列表。
- `allowedElements`：只允许业务需要的标签。
- 不启用 `rehype-raw`：不渲染模型输出中的原始 HTML。
- `useChat throttle`：控制流式消息更新频率。

## AI SDK 与三方库调用顺序

| 顺序 | 函数或对象 | 所属分层 | 作用 | 企业开发场景 |
|---|---|---|---|---|
| 1 | `streamText(...)` | AI 应用服务 | 调用模型并流式生成 Markdown 文本 | 客服回复建议、知识库答案、工单总结等结构化输出 |
| 2 | `toUIMessageStream(...)` | BFF 协议层 | 把模型流转换成 UI Message Chunk | 让前端继续使用 AI SDK 标准消息协议 |
| 3 | `createUIMessageStreamResponse(...)` | BFF 响应层 | 返回 `text/event-stream` | 支撑 `useChat` 流式消费 |
| 4 | `useChat({ throttle })` | 前端状态层 | 管理消息、状态、停止、重新生成，并节流更新 | 避免 token 级更新导致 Markdown 频繁解析 |
| 5 | `react-markdown` | 前端渲染层 | 把 Markdown 渲染为 React 元素 | 展示列表、标题、表格、代码块等 AI 回复格式 |
| 6 | `remark-gfm` | Markdown 插件层 | 支持 GFM 语法 | 企业回复中常见表格和任务列表 |

面试表达：

> 我们没有用 `dangerouslySetInnerHTML` 渲染模型输出，而是要求服务端 Prompt 约束模型输出简洁 Markdown，前端使用 `react-markdown + remark-gfm` 渲染，并限制允许的标签，不启用原始 HTML。由于流式输出会频繁更新，我们在 `useChat` 上加 `throttle`，减少 Markdown 解析和 React 重渲染压力。

## 企业最佳实践

- Prompt 中明确要求输出 Markdown，但不要输出 HTML。
- 前端不使用 `dangerouslySetInnerHTML`。
- 不启用 `rehype-raw` 渲染模型原始 HTML。
- 用 `allowedElements` 控制可渲染标签范围。
- 长文本和流式输出使用节流，避免每个 token 都触发 Markdown 解析。
- Markdown 渲染组件独立拆分，避免整个工单表格跟着重渲染。
- 如果后续支持链接，必须做 URL 白名单和跳转安全策略。
- 如果后续支持代码块高亮，应懒加载高亮库，避免首屏包过大。

## 常见错误

1. 用 `<p>` 展示所有 AI 输出，结构差、可读性差。
2. 用 `dangerouslySetInnerHTML` 直接渲染模型输出。
3. 启用原始 HTML 渲染，导致 XSS 风险扩大。
4. 不限制 Markdown 标签，输出内容不可控。
5. 每个 token 都触发全量 Markdown 解析，长文本时明显卡顿。
6. 把 Markdown 渲染组件写进大表格父组件，导致整表重渲染。
7. Prompt 没约束输出结构，前端渲染样式不可预测。
8. 让模型输出复杂表格，但移动端和窄表格无法展示。
9. 不处理代码块横向滚动。
10. 为了好看引入过重渲染插件，增加客户端包体积。

## 面试题

1. 为什么 AI 回复建议需要 Markdown 渲染？
   - 追问：哪些业务内容适合结构化？
2. 为什么不能用 `dangerouslySetInnerHTML`？
   - 追问：模型输出为什么不能被完全信任？
3. `react-markdown` 的作用是什么？
   - 追问：它和直接插入 HTML 有什么区别？
4. `remark-gfm` 解决什么问题？
   - 追问：企业回复里什么时候会用表格？
5. 为什么本章不启用 `rehype-raw`？
   - 追问：如果业务必须支持 HTML 应该怎么做？
6. 流式 Markdown 为什么有性能问题？
   - 追问：`throttle` 能缓解什么？
7. 为什么 Markdown 渲染组件要拆出来？
   - 追问：如何减少父组件重渲染范围？
8. Prompt 为什么要约束 Markdown 输出格式？
   - 追问：前端是否应该依赖模型自然输出？
9. 如果 AI 回复里有链接，如何做安全处理？
   - 追问：是否允许任意外链？
10. 后续如何支持代码高亮？
    - 追问：为什么不一开始就引入重型高亮库？

## 标准答案

### 1. 为什么需要 Markdown

AI 回复通常包含摘要、建议、步骤和风险提醒。Markdown 可以低成本表达结构，让客服更快阅读和编辑。

### 2. 不用 dangerouslySetInnerHTML

模型输出是不可信输入，直接插入 HTML 会扩大 XSS 风险。企业项目应使用 Markdown 解析器，并限制允许标签，不渲染原始 HTML。

### 3. react-markdown

`react-markdown` 把 Markdown 解析成 React 元素，而不是把字符串当 HTML 插入。它更适合在 React 应用中安全、可控地渲染模型输出。

### 4. remark-gfm

`remark-gfm` 支持 GitHub Flavored Markdown，例如表格和任务列表。企业客服回复、排障步骤和对比信息经常需要这些格式。

### 5. 不启用 rehype-raw

`rehype-raw` 会处理 Markdown 中的原始 HTML。模型输出不可完全信任，除非有严格 HTML 清洗和白名单，否则不应启用。

### 6. 流式性能

流式输出可能每几十毫秒追加文本。如果每次都全量解析 Markdown，会造成频繁计算和重渲染。`useChat` 的 `throttle` 可以降低更新频率。

### 7. 组件拆分

把 Markdown 渲染拆成独立叶子组件，可以把高频变化限制在局部，不让整个表格和页面跟着重渲染。

### 8. Prompt 约束

前端不能依赖模型自由发挥格式。服务端 Prompt 应明确输出结构，例如摘要、建议回复和后续动作，减少 UI 不确定性。

### 9. 链接安全

链接需要 URL 协议校验、域名白名单、`rel="noopener noreferrer"` 和跳转提示。敏感系统链接还要做权限校验。

### 10. 代码高亮

代码高亮库通常较重，应在确有业务需求后懒加载或按语言加载，避免影响客服列表首屏性能。

## 项目实践

### 业务需求

让客服回复建议以 Markdown 结构展示，同时控制流式渲染过程中的性能和安全风险。

### 改动范围

- `src/app/streamingMarkdown.tsx`：新增安全 Markdown 渲染组件。
- `src/app/replySuggestionChatPanel.tsx`：接入 Markdown 渲染，并使用 `useChat({ throttle: 80 })` 节流。
- `src/features/customer-service/server/replySuggestionChatStream.ts`：调整 Prompt，要求模型输出结构化 Markdown。
- `src/app/globals.css`：新增 Markdown 内容样式。
- `README.md`：更新当前课程和三方依赖说明。
- `docs/Day07流式Markdown渲染与消息性能.md`：记录本章设计和面试表达。

### 代码阅读顺序

1. 阅读 `src/features/customer-service/server/replySuggestionChatStream.ts`，理解服务端如何约束 Markdown 输出。
2. 阅读 `src/app/replySuggestionChatPanel.tsx`，理解 `useChat` 节流和 Markdown 渲染入口。
3. 阅读 `src/app/streamingMarkdown.tsx`，理解 `react-markdown`、`remark-gfm` 和 `allowedElements`。
4. 阅读 `src/app/globals.css`，理解 Markdown 样式范围。

### 验证方式

```bash
pnpm typecheck
pnpm lint
```

本章不默认启动服务、不执行构建、不操作浏览器。

### 异常场景

- 模型输出普通文本，Markdown 仍能正常显示为段落。
- 模型输出列表或表格，前端按受控标签渲染。
- 模型输出 HTML，不作为 HTML 执行。
- 流式输出较长时，`throttle` 降低渲染压力。

## 官方文档

- [react-markdown](https://github.com/remarkjs/react-markdown)
- [remark-gfm](https://github.com/remarkjs/remark-gfm)
- [AI SDK：useChat](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [AI SDK：UI Message Streams](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol)

## 延伸阅读

下一章进入 DeepSeek Chat Completions 真实接入，把当前 Provider Adapter、环境变量和真实模型调用链路再系统化。

## 企业级练习与验收标准

练习：用自己的话讲清楚为什么企业 AI 输出要用安全 Markdown 渲染，以及流式渲染为什么需要节流。

验收标准：

- 能解释为什么不用 `dangerouslySetInnerHTML`。
- 能说明 `react-markdown` 和 `remark-gfm` 的职责。
- 能讲清楚为什么不启用原始 HTML 渲染。
- 能说明 `useChat throttle` 解决什么性能问题。
- 能把本章讲成企业 AI 回复展示层的安全与性能实践。
