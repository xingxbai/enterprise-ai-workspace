# 第 3 天：Route Handler 与服务端密钥边界

掌握级别：必须精通

企业使用频率：每天

面试重要度：高

## 一句话理解

Route Handler 是 App Router 中的服务端 HTTP 边界，用来让浏览器安全地请求服务端能力，而不是把密钥、数据库或内部业务系统暴露给前端。

## 为什么会出现

Client Component 运行在浏览器里，不能安全读取数据库、内网 API、模型密钥和权限系统。但企业应用又需要由用户点击按钮、提交表单、上传文件或发起 AI 请求。

Route Handler 提供了 `app/**/route.ts` 约定，让应用可以在服务端处理 HTTP 请求。浏览器只调用公开路径，服务端内部再读取环境变量、校验身份和权限、调用真实业务 API 或 AI Provider，并返回经过脱敏的结果。

## 企业为什么需要

企业 AI 应用中，Route Handler 常作为 BFF 层使用：

- 接收客户端交互请求。
- 读取服务端环境变量和私有 token。
- 校验 session、RBAC、租户和资源权限。
- 调用 CRM、工单、订单、知识库或模型接口。
- 过滤敏感字段，只返回前端需要的 DTO。
- 统一处理错误、审计、限流和请求追踪。

它不是“随便写接口”的地方，而是浏览器和可信服务端之间的安全门。

## 企业每天怎么使用

典型交互链路：

```txt
Client Component
  -> fetch("/api/tickets/approve")
  -> app/api/tickets/approve/route.ts
  -> 服务端校验和调用真实业务 API
  -> 返回安全响应
```

典型数据展示链路：

```txt
Server Component
  -> getTicketSummaries()
  -> 直接调用数据库或业务 API adapter
  -> 渲染表格
```

Server Component 不应该为了读取数据再请求自己的 Route Handler，因为它本来就在服务端，可以直接调用服务端函数。

## 底层原理

Route Handler 写在 `app` 目录中的 `route.ts` 文件里，可以导出 HTTP 方法函数：

```ts
export async function GET(request: Request) {}
export async function POST(request: Request) {}
```

支持的方法包括 `GET`、`POST`、`PUT`、`PATCH`、`DELETE`、`HEAD` 和 `OPTIONS`。如果请求了未支持的方法，Next.js 会返回 `405 Method Not Allowed`。

Route Handler 使用 Web 标准 `Request` 和 `Response` API，也可以使用 Next.js 扩展的 `NextRequest` 和 `NextResponse`。它运行在服务端，可以访问私有环境变量，但它的响应会发送给客户端，因此响应内容仍必须严格脱敏。

## 企业最佳实践

- Client Component 通过 Route Handler 请求服务端能力。
- Server Component 直接调用服务端函数，不绕自己的 `/api`。
- Route Handler 第一件事是解析和校验请求体。
- 任何来自浏览器的字段都不可信，包括 `ticketId`、`tenantId`、`role` 和 `userId`。
- 服务端重新计算身份、权限、租户和资源访问范围。
- 私有环境变量不使用 `NEXT_PUBLIC_` 前缀。
- 密钥、内部 token、完整 Prompt 和上游错误详情不能返回给前端。
- 对外返回稳定错误消息，对内记录可追踪日志。
- `GET` 不传敏感查询条件；敏感输入优先使用 `POST` 请求体。
- 调用外部系统时设置明确的 adapter 边界，避免页面直接依赖供应商 SDK。

本章安全风险：Route Handler 在服务端运行，不代表返回的数据安全。`Response.json({ apiKey })` 仍然是把密钥直接交给浏览器。

## 常见错误

1. 在 Client Component 中直接读取 `process.env.API_KEY`。
2. 给私有密钥加 `NEXT_PUBLIC_` 前缀。
3. 在 Route Handler 中返回密钥、内部 token 或完整 Prompt。
4. Server Component 使用 `fetch("/api/xxx")` 调自己的 Route Handler。
5. 信任浏览器传来的 `tenantId`、`userId` 或 `role`。
6. 只做 TypeScript 类型断言，不做运行时校验。
7. 把上游服务的完整错误响应原样返回给前端。
8. 把客户手机号、内部备注和权限细节放进响应 DTO。
9. 使用模拟数据冒充真实业务 API 链路。
10. 忽略 Route Handler 在 serverless 环境中可能被超时终止。

## 面试题

1. App Router 里 Route Handler 的文件约定是什么？
   - 追问：它和 Pages Router 的 API Routes 是否需要一起使用？
2. Client Component 为什么要通过 Route Handler 调服务端能力？
   - 追问：浏览器为什么不是安全边界？
3. Server Component 是否应该 fetch 自己的 `/api`？
   - 追问：构建阶段为什么可能出问题？
4. Route Handler 可以读取 `process.env.API_KEY` 吗？
   - 追问：能读取是否代表能返回？
5. `NEXT_PUBLIC_` 环境变量和私有环境变量有什么区别？
   - 追问：私有环境变量是否就永远不会泄漏？
6. Route Handler 中如何处理浏览器传来的 `ticketId`？
   - 追问：为什么不能信任前端传来的 `tenantId`？
7. 为什么敏感查询不建议放在 GET query 中？
   - 追问：日志、缓存和浏览器历史有什么风险？
8. Route Handler 应该返回上游错误详情吗？
   - 追问：如何同时满足用户反馈和内部排查？
9. Route Handler 和业务 API Adapter 怎么分层？
   - 追问：为什么页面不应该直接依赖模型厂商 SDK？
10. AI BFF 中 Route Handler 通常承担哪些职责？
    - 追问：认证、授权、限流、审计和脱敏分别在哪一步做？

## 标准答案

### 1. 文件约定

Route Handler 定义在 `app/**/route.ts` 中，通过导出 `GET`、`POST` 等函数处理 HTTP 请求。它是 App Router 中 API Routes 的对应能力，不需要和 Pages Router 的 API Routes 混用。

### 2. 客户端请求服务端能力

Client Component 运行在浏览器，用户可以检查代码、Network、运行时状态和响应。密钥、数据库、内部 API 和权限判断必须留在服务端，因此客户端只能通过 Route Handler 请求受控能力。

### 3. Server Component 不绕 `/api`

Server Component 本来就在服务端，应直接调用 `getTicketSummaries()` 这类服务端函数。绕自己的 Route Handler 会多一次 HTTP 往返，构建阶段也可能没有服务器监听该地址。

### 4. 密钥读取和返回

Route Handler 可以读取服务端私有环境变量，但不能把它们返回给前端。服务端能接触密钥，响应却会进入浏览器，这两个边界必须分清。

### 5. 环境变量边界

`NEXT_PUBLIC_` 前缀变量会进入客户端 bundle，适合公开配置。私有环境变量只应在服务端读取，但仍可能因错误响应、日志、客户端导入服务端模块或手动返回而泄漏。

### 6. 请求校验

来自浏览器的 `ticketId` 只能作为候选输入，必须做运行时校验。`tenantId`、`userId` 和 `role` 应由服务端 session 和权限系统重新计算，不能信任客户端声明。

### 7. GET 敏感信息风险

GET query 可能出现在浏览器历史、代理日志、服务器日志和缓存键中。客户隐私、Prompt、地理位置、令牌和复杂业务输入应优先放在 POST body 中，并配合权限和日志脱敏。

### 8. 错误处理

对前端返回稳定、可理解、不泄密的错误消息；对内部日志记录 request id、状态码和必要上下文。不能把上游堆栈、SQL、密钥、供应商原始错误和客户敏感正文原样返回。

### 9. 分层设计

Route Handler 负责 HTTP 边界、请求解析、鉴权和响应。业务 API Adapter 负责和 CRM、工单或模型服务通信。页面不直接依赖供应商 SDK，避免模型切换影响 UI 和业务流程。

### 10. AI BFF 职责

AI BFF 通常承担认证、RBAC、租户隔离、输入校验、Prompt 组装、模型调用、流式协议转换、异常处理、审计、成本统计和敏感信息脱敏。

## 项目实践

### 业务需求

为客服工单审批建立服务端 Route Handler。客户端按钮只提交 `ticketId`，服务端读取真实业务 API 配置并调用审批接口。

### 改动范围

- `src/app/approveButton.tsx`：客户端按钮通过 `fetch("/api/tickets/approve")` 发起审批请求。
- `src/app/api/tickets/approve/route.ts`：解析请求、校验 `ticketId`、读取服务端配置、调用上游业务接口。
- `src/data/tickets.ts`：集中维护服务端业务 API headers，使用 `server-only` 防止误入客户端边界。

### 代码阅读顺序

1. 阅读 `src/app/page.tsx`，确认 Server Component 直接调用 `getTicketSummaries()`。
2. 阅读 `src/app/approveButton.tsx`，确认客户端只提交 `ticketId`。
3. 阅读 `src/app/api/tickets/approve/route.ts`，确认 Route Handler 不返回密钥。
4. 阅读 `src/data/tickets.ts`，确认业务 API token 只在服务端 headers 中使用。

### 验证方式

```bash
pnpm typecheck
pnpm lint
```

本章不启动服务、不执行构建、不操作浏览器。

### 异常场景

- 请求体不是 JSON 时，Route Handler 返回 `400`。
- `ticketId` 为空时，Route Handler 返回 `400`。
- 未配置真实业务接口时，Route Handler 返回 `503`，不使用模拟成功。
- 上游审批失败时，Route Handler 返回稳定失败消息，不泄漏上游细节。

## 官方文档

- [Next.js：Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Next.js：route.js API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/route)
- [Next.js：Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Next.js：Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

## 延伸阅读

下一章直接使用 AI SDK 的成熟 Streaming 方案。`ReadableStream`、背压和文本编解码只用于理解底层、Network 排障和面试追问，不再单独维护原生业务实现。

## 企业级练习与验收标准

练习：为一个“生成客服回复建议”按钮设计 Route Handler 边界，说明请求字段、服务端校验、密钥使用、响应 DTO 和错误处理策略。

验收标准：

- 能说明 Client Component 为什么只能提交最小输入。
- 能指出密钥、Prompt、权限判断和上游错误不能返回给前端。
- 能解释 Server Component 为什么不 fetch 自己的 `/api`。
- 能设计至少 3 个运行时校验点。
- 能区分用户可见错误和内部排查日志。
- 能在面试中说清楚 Route Handler 在 AI BFF 中的位置。
