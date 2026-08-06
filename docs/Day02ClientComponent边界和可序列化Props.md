# 第 2 天：Client Component 边界和可序列化 Props

掌握级别：必须精通

企业使用频率：每天

面试重要度：高

## 一句话理解

Client Component 只应该放在需要浏览器交互的叶子位置，Server Component 传给它的 Props 必须是可序列化、最小且安全的数据。

## 为什么会出现

React Server Components 把组件树拆成服务端执行和客户端执行两部分。服务端可以读取数据库、业务 API、权限和密钥；客户端负责事件、状态和浏览器能力。

这两部分之间需要通过协议传输数据，因此不能像传统纯前端 React 那样随意传函数、类实例、连接对象或服务实例。即使某些数据技术上能被序列化，也不代表业务上应该发送给浏览器。

## 企业为什么需要

企业 AI 工作台会处理工单、客户、知识库、Prompt、模型配置和权限结果。浏览器不是安全边界，任何传给 Client Component 的数据都应默认用户可见。

正确控制 Client Component 边界可以：

- 减少客户端 JavaScript 和水合成本。
- 避免把客户隐私、内部备注、Prompt 和密钥发到浏览器。
- 让服务端继续承担认证、权限和数据最小化职责。
- 让交互组件保持简单、可测试和可替换。

## 企业每天怎么使用

日常开发时，先把页面、列表、详情数据读取留在 Server Component。遇到按钮、弹窗、输入框、筛选器、复制、上传、拖拽等浏览器交互时，再提取小型 Client Component。

典型模式：

```tsx
<DetailModal ticketId={ticket.id} />
```

而不是：

```tsx
<DetailModal ticket={fullTicket} onApprove={() => approveTicket(ticket.id)} />
```

前者只传交互需要的最小 `ticketId`。后者把完整对象和函数都推向客户端边界，容易造成序列化错误和数据泄漏。

## 底层原理

`"use client"` 声明客户端模块图入口。Server Component 可以渲染 Client Component，并通过 React 的 RSC Payload 传递 Props。

跨边界 Props 需要满足 React 可序列化协议。普通函数、数据库连接、文件句柄、服务实例、类实例中的方法和循环引用对象都不适合作为普通 Props 从 Server Component 传到 Client Component。

React 的序列化能力比 JSON 更宽，例如 `Date`、`Map`、`Set` 等在部分场景可以被支持。但企业项目不应该因此随意传复杂对象。中高级工程实践更偏向传最小普通 DTO，因为它更清晰、更安全，也更容易审计。

## 企业最佳实践

- `"use client"` 下沉到交互叶子组件。
- Server Component 只传 Client Component 当前交互需要的数据。
- 优先传 `string`、`number`、`boolean`、普通对象和数组。
- 不跨边界传函数，交互逻辑放在 Client Component 内部。
- 不跨边界传数据库连接、业务服务实例、SDK client 或文件对象。
- 不把完整客户对象、完整工单对象和完整 Prompt 直接传给客户端。
- 可以序列化的数据也要做业务安全判断。
- 给客户端的 DTO 字段应能回答：页面真的需要吗，用户有权限看吗，F12 看到是否可接受。

本章安全风险：开发者容易把“页面没有展示”误认为“浏览器看不到”。只要字段进入 Client Component Props，就可能出现在 RSC Payload、运行时内存或调试工具里。

## 常见错误

1. 因为一个按钮点击，把整张页面加上 `"use client"`。
2. 从 Server Component 向 Client Component 传普通回调函数。
3. 把完整工单对象传给弹窗，只为了显示一个编号。
4. 认为字段没有渲染到 HTML 就不会被用户看到。
5. 把客户手机号、内部备注和权限判断结果混在前端 DTO 里。
6. 把可序列化等同于安全。
7. 用 `useId` 生成业务 ID、数据库 ID 或列表 key。
8. 在 Client Component 里导入 `server-only` 数据模块。
9. 为了省事把 SDK client 或 service class 传到客户端。
10. 忽略服务端和客户端 hydration 时 ID、Props 和组件树必须稳定。

## 面试题

1. `"use client"` 的边界应该放在哪里？
   - 追问：为什么不建议放在 `page.tsx` 顶部？
2. Server Component 能否向 Client Component 传函数 Props？
   - 追问：如果父子组件都在客户端边界内呢？
3. 什么叫可序列化 Props？
   - 追问：React 的可序列化能力和 JSON 是否完全相同？
4. `Date` 能不能传给 Client Component？
   - 追问：技术上能传是否代表业务上应该传？
5. 完整工单对象能否传给客户端详情组件？
   - 追问：对象里有客户电话和内部备注怎么办？
6. 为什么数据库连接不能作为 Props 传给 Client Component？
   - 追问：即使 TypeScript 类型能通过是否就安全？
7. 如何判断一个 DTO 是否适合返回给浏览器？
   - 追问：你会如何做字段脱敏？
8. `useId` 的作用是什么？
   - 追问：为什么不能用它生成业务 ID？
9. Client Component 里应该如何触发审批操作？
   - 追问：为什么只传 `ticketId` 比传 `onApprove` 更合适？
10. 如何重构一个过大的 Client Component？
    - 追问：你会先移动数据读取还是先拆交互组件？

## 标准答案

### 1. 客户端边界位置

客户端边界应该尽量下沉到真正需要事件、状态或浏览器 API 的叶子组件。页面和布局默认保留为 Server Component，可以减少客户端 JavaScript，并把敏感数据访问留在服务端。

### 2. 函数 Props

Server Component 不能把普通函数作为 Props 传给 Client Component，因为函数不能通过 RSC Payload 序列化。若父子组件都已经处在同一个客户端模块图内，函数 Props 可以正常传递，因为它没有跨 Server 到 Client 边界。

### 3. 可序列化 Props

可序列化 Props 是 React 能通过服务端到客户端协议表示的数据。它不等同于普通 JSON，但企业代码应优先传普通 DTO，避免让协议能力掩盖业务安全问题。

### 4. Date 的判断

`Date` 在 React Server Component 的序列化能力中可以被支持，但如果只需要展示时间，服务端格式化成安全字符串通常更清晰。关键不是“能不能传”，而是“是否必要、是否安全、是否最小”。

### 5. 完整对象风险

完整工单对象技术上可能可以传，但业务上通常不应该传。客户手机号、内部备注、权限字段和模型上下文都不应默认进入浏览器。应构造只包含 `id`、`subject`、`status` 等必要字段的 DTO。

### 6. 数据库连接

数据库连接是服务端资源，不能序列化，也不能暴露给浏览器。客户端只能通过 Route Handler 或 Server Action 请求服务端完成受控操作。

### 7. DTO 判断

判断 DTO 时看三个问题：当前 UI 是否真的需要该字段，当前用户是否有权限看到该字段，字段出现在 F12 中是否可接受。任何一个答案是否定的，都不应该传。

### 8. useId

`useId` 生成稳定的 DOM 关联 ID，适合 `aria-labelledby`、`aria-describedby`、`htmlFor` 和 `id` 配对。它不是业务 ID，不应用于数据库主键、工单编号、列表 key 或安全 token。

### 9. 审批交互

Server Component 传 `ticketId` 给客户端按钮，按钮内部通过 `fetch("/api/tickets/approve")` 调 Route Handler。这样只跨边界传最小数据，服务端继续负责鉴权、校验和真实业务调用。

### 10. 重构过大边界

先识别哪些代码真的依赖客户端能力，再把数据读取、表格渲染和权限判断移回 Server Component。最后保留按钮、弹窗、输入框等小型 Client Component，并通过最小可序列化 Props 连接。

## 项目实践

### 业务需求

在客服工单表格中增加可交互的详情弹窗和审批按钮，同时保持页面主体为 Server Component。

### 改动范围

- `src/app/page.tsx`：服务端读取工单列表并渲染表格。
- `src/app/detailModal.tsx`：客户端弹窗叶子组件，只接收 `ticketId`。
- `src/app/approveButton.tsx`：客户端审批按钮，只接收 `ticketId` 并调用 Route Handler。

### 代码阅读顺序

1. 阅读 `src/app/page.tsx`，确认没有 `"use client"`，数据读取在服务端完成。
2. 阅读 `src/app/detailModal.tsx`，确认只因弹窗交互使用客户端组件。
3. 阅读 `src/app/approveButton.tsx`，确认跨边界 Props 只有 `ticketId: string`。

### 验证方式

```bash
pnpm typecheck
pnpm lint
```

本章不启动服务、不执行构建、不操作浏览器。

### 异常场景

- 把 `onApprove={() => approveTicket()}` 从 Server Component 传给 Client Component，应被识别为错误边界。
- 把完整 `ticket` 对象传给客户端，应审查是否包含客户隐私、内部备注或权限数据。
- 多个弹窗同时渲染时，手写固定 DOM id 会冲突，应使用 `useId`。

## 官方文档

- [Next.js：Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js：use client](https://nextjs.org/docs/app/api-reference/directives/use-client)
- [React：useId](https://react.dev/reference/react/useId)
- [React：Serializable arguments and return values](https://react.dev/reference/rsc/use-client#serializable-types)

## 延伸阅读

下一章学习 Route Handler 与服务端密钥边界，把客户端交互请求接回服务端可信层。

## 企业级练习与验收标准

练习：审查一个工单详情组件的 Props 设计，判断哪些字段可以传、哪些字段不应该传，并给出最小 DTO。

验收标准：

- 能区分技术可序列化和业务可暴露。
- 能解释函数 Props 跨 Server 到 Client 边界为什么错误。
- 能指出客户手机号、内部备注、完整 Prompt 和 API Key 不应进入客户端。
- 能把交互组件拆成只接收 `ticketId` 的叶子组件。
- 能用 `useId` 正确建立弹窗标题和 `aria-labelledby` 的关联。
- 能在面试中说清楚“传给 Client Component 就等于发送到浏览器”。
