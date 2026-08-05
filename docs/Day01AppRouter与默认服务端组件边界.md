# 第 1 天：App Router 与默认服务端组件边界

掌握级别：必须精通

企业使用频率：每天

面试重要度：高

## 一句话理解

Next.js App Router 中的页面和布局默认是 Server Component，只有必须响应浏览器交互的局部边界才应进入客户端。

## 为什么会出现

传统 React 单页应用通常把页面组件、数据请求和渲染逻辑全部交给浏览器。浏览器必须先下载并执行 JavaScript，再请求数据并生成页面，首屏链路较长；API Key、数据库和内部服务也不能被浏览器安全访问。

React Server Components 将一部分组件放到服务端执行。Next.js App Router 使用它们组织页面、布局和数据访问，使服务端可以直接读取可信资源，并把渲染结果和 RSC Payload 发送给浏览器。

## 企业为什么需要

企业 AI 工作台会读取用户身份、权限、CRM、工单、知识库和模型配置。这些信息不能全部交给浏览器处理。

默认使用 Server Component 可以：

- 在靠近数据源的位置读取数据库和内部 API。
- 避免将 API Key、数据库凭证和完整 Prompt 打包到浏览器。
- 减少发送到客户端的 JavaScript。
- 先返回可见 HTML，再对真正需要交互的局部组件进行水合。
- 为后续认证、RAG 和 Tool Calling 建立明确的服务端信任边界。

## 企业每天怎么使用

日常开发页面时，先保持 `page.tsx`、`layout.tsx` 和数据展示组件为 Server Component。

只有出现以下需求时才增加 Client Component：

- `useState`、`useReducer` 或 `useEffect`。
- `onClick`、`onChange` 等事件处理。
- `window`、`localStorage`、剪贴板等浏览器 API。
- 依赖浏览器环境的第三方组件。

## 底层原理

### 服务端阶段

Next.js 在服务端协调渲染：

1. Server Component 执行数据读取和组件渲染。
2. React 生成 RSC Payload，其中包含服务端组件结果、客户端组件占位信息和传给客户端组件的 Props。
3. Next.js 使用 RSC Payload 和 Client Component 生成首屏 HTML。

### 浏览器首次加载

1. HTML 先显示非交互首屏。
2. RSC Payload 用于协调服务端和客户端组件树。
3. 客户端 JavaScript 对 Client Component 水合并绑定事件。

### `"use client"` 的真实含义

`"use client"` 声明的是客户端模块图入口，不是“关闭服务端渲染”。该文件导入的模块会进入客户端依赖图，因此边界放得越高，浏览器需要下载和执行的 JavaScript 通常越多。

Server Component 可以渲染 Client Component，并向它传入可序列化 Props。Client Component 不能直接导入 Server Component，但可以通过 `children` 等可序列化边界接收已经由服务端渲染的内容。

## 企业最佳实践

- 页面、布局和数据访问默认留在服务端。
- 将 `"use client"` 下沉到真正需要交互的叶子组件。
- 不要为了使用 Hook 把整个页面改成 Client Component，应提取小型交互组件。
- 服务端只向客户端传递完成界面所需的最小数据。
- 跨边界 Props 必须可序列化，不能传函数、数据库连接或服务实例。
- API Key、权限判断、系统 Prompt 和内部业务数据访问始终留在服务端。
- 不把 Server Component 等同于传统 SSR；RSC 关注组件执行位置和传输协议，SSR 关注 HTML 的生成时机。

本章安全风险：一旦把敏感模块导入 Client Component 的模块图，即使页面没有直接显示密钥，也可能导致实现细节或环境变量使用方式进入客户端产物。敏感模块必须保持服务端专用，并在后续课程使用 `server-only` 建立构建期保护。

## 常见错误

1. 在首页顶部添加 `"use client"`，导致整个页面依赖树进入客户端边界。
2. 认为 Client Component 只在浏览器渲染；首次加载时它也可能参与服务端预渲染，之后在浏览器水合。
3. 在 Server Component 中使用 `useState`、事件处理器或 `window`。
4. 从 Client Component 直接读取数据库或私有环境变量。
5. 把服务端函数作为普通 Props 传给 Client Component。
6. 为了“统一”而给每个组件都添加 `"use client"`。
7. 把 SEO 改善简单归因于 Server Component；SEO 还取决于内容、元数据、可访问性和抓取策略。
8. 把 RSC Payload 当成普通 JSON；它是 React 用来表达组件树和边界的专用传输格式。

## 面试题

1. App Router 中页面为什么默认是 Server Component？
   - 追问：默认服务端执行给企业 AI 应用带来什么价值？
2. 什么情况下必须使用 Client Component？
   - 追问：只使用普通变量是否需要 `"use client"`？
3. `"use client"` 标记的是单个组件还是模块边界？
   - 追问：为什么边界放在根布局会增加客户端 JavaScript？
4. Server Component 和传统 SSR 有什么区别？
   - 追问：Client Component 首屏是否完全不经过服务端？
5. 什么是 RSC Payload？
   - 追问：浏览器首次加载如何使用 HTML、RSC Payload 和 JavaScript？
6. Server Component 能否操作 DOM？
   - 追问：需要滚动到底部时应该如何拆分组件？
7. Server Component 能否使用 `useState` 和 `useEffect`？
   - 追问：为什么这些 Hook 属于客户端能力？
8. Server Component 如何与 Client Component 组合？
   - 追问：跨边界 Props 有什么限制？
9. 为什么 API Key 不能放在 Client Component？
   - 追问：不使用 `NEXT_PUBLIC_` 是否就绝对不会泄漏？
10. 如何判断一个页面的客户端边界是否过大？
    - 追问：你会如何重构一个顶部已经标记 `"use client"` 的复杂页面？

## 标准答案

### 1. 默认服务端组件

App Router 默认让页面和布局成为 Server Component，使数据读取靠近数据源，减少客户端 JavaScript，并允许安全访问服务端资源。企业 AI 应用中的用户身份、权限、Prompt、内部 API 和模型密钥都需要服务端边界。

### 2. Client Component 的使用条件

需要状态、事件、生命周期、浏览器 API 或客户端专用库时使用。普通计算和局部变量不需要 `"use client"`。

### 3. 客户端模块边界

`"use client"` 标记文件导出的客户端入口。该文件静态导入的依赖会进入客户端模块图，所以应将边界下沉到交互叶子节点，避免扩大浏览器包体和水合范围。

### 4. RSC 与 SSR

SSR 描述在服务端生成 HTML；RSC 描述组件在哪里执行、结果如何通过 RSC Payload 传输。Client Component 首屏仍可能被预渲染成 HTML，但必须下载 JavaScript 并水合后才能交互。

### 5. RSC Payload

RSC Payload 是 React 表达服务端组件结果、客户端组件引用、占位信息和 Props 的专用格式。首屏 HTML 用于快速显示，RSC Payload 用于协调组件树，JavaScript 用于水合客户端组件。

### 6. DOM 操作

Server Component 没有浏览器 DOM，不能使用 `document`、`window` 或 `scrollIntoView`。聊天自动滚动应提取为小型 Client Component，并通过 Props 或上下文接收需要的状态。

### 7. Hook 边界

`useState` 管理浏览器中的交互状态，`useEffect` 在客户端提交后执行副作用，它们依赖客户端生命周期，因此不能在 Server Component 中使用。

### 8. 组件组合

Server Component 可以导入并渲染 Client Component。跨边界数据必须可序列化，不能把普通函数、连接对象或类实例作为 Props 传递。服务端内容也可以通过 `children` 组合进客户端外壳。

### 9. API Key 安全

浏览器中的代码、请求和运行时状态都能被用户检查，因此 API Key 不能进入客户端。私有环境变量不加 `NEXT_PUBLIC_` 是基础保护，但还需要避免从 Client Component 导入服务端模块、把密钥写入响应或日志，并通过服务端 BFF 调用模型。

### 10. 判断和重构边界

检查页面是否因为少量交互就在高层使用 `"use client"`，并分析客户端依赖图、JavaScript 体积和水合范围。重构时先保持页面和数据读取在服务端，再把搜索框、模型选择器或聊天输入等交互部分拆为小型 Client Component。

## 项目实践

### 业务需求

为企业 AI Workspace 建立首个页面骨架。当前没有真实业务 API 和模型账号参与本章，不创建模拟业务数据。

### 改动范围

- `src/app/layout.tsx`：服务端根布局和中文元数据。
- `src/app/page.tsx`：默认 Server Component 首页。
- `src/app/globals.css`：最小全局样式基线。

### 代码阅读顺序

1. 阅读 `src/app/layout.tsx`，确认没有 `"use client"`。
2. 阅读 `src/app/page.tsx`，确认可以直接读取服务端的 `process.env.NODE_ENV`。
3. 阅读 `src/app/globals.css`，理解样式文件不会改变组件执行边界。

### 验证方式

```bash
pnpm typecheck
pnpm lint
```

本章不启动服务、不操作浏览器，也不执行构建。运行时页面验收留给学习者明确要求启动服务后进行。

### 异常场景

- 在 `page.tsx` 中加入 `useState` 但不添加 `"use client"`，应出现编译边界错误。
- 给 `page.tsx` 添加 `"use client"` 后再访问服务端专用模块，会破坏安全边界。
- 从 Server Component 向 Client Component 传普通回调函数，会违反可序列化 Props 约束。

## 官方文档

- [Next.js：Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js：use client](https://nextjs.org/docs/app/api-reference/directives/use-client)
- [React：Server Components](https://react.dev/reference/rsc/server-components)
- [React：use client](https://react.dev/reference/rsc/use-client)

## 延伸阅读

下一章学习 Client Component 边界和可序列化 Props，并在真实需要交互时创建第一个客户端叶子组件。

## 企业级练习与验收标准

练习：审查一个包含标题、用户信息、业务数据列表和筛选按钮的企业页面，划分 Server Component 与 Client Component 边界，并说明数据和 Props 的流向。

验收标准：

- 能解释为什么页面和数据列表保留在服务端。
- 能指出筛选交互中真正需要客户端状态的最小部分。
- 能列出至少 5 种必须使用 Client Component 的能力。
- 能解释 RSC Payload、HTML 和水合的职责差异。
- 能说明为什么 API Key、权限判断和数据库访问必须留在服务端。
- 能在 2 分钟内回答“`"use client"` 会不会让整个项目失去服务端渲染”并承受连续追问。
