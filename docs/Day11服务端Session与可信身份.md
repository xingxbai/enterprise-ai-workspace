# 第 11 天：服务端 Session 与可信身份

掌握级别：AI 调用身份边界需要掌握，Session 业务实现了解即可

学习范围调整：本章的登录、Cookie 和 Session 实现作为已经提供的业务基础代码，后续不要求学习者跟写。只需要理解 AI BFF 为什么必须从服务端 Session 获取可信 `actorUserId`，以及它如何支持权限、Token 成本和审计归属。

## 今天完成的企业功能

为 `Enterprise AI Workspace` 增加统一的服务端身份入口：

- 未登录用户不能读取工单页面。
- 模型状态、AI 回复和工单审批 BFF 都验证 Session。
- 浏览器请求体不传 `userId`，避免用户在 F12 中篡改操作人。
- AI 完成日志记录由服务端 Session 得到的 `actorUserId`。
- 非生产环境提供明确命名的演示身份，生产环境禁止使用。

这不是孤立登录 Demo。后续业务权限、租户和资源授权由项目直接补齐；Day12 从当前可信 `AuthenticatedUser` 出发，学习如何为工单接入 AI 分类、优先级和 SLA 风险预测。

## 一句话理解

认证系统先证明“你是谁”，Session 负责让后续每个请求都能在服务端恢复这份身份；浏览器传来的 `userId` 只是普通输入，不能作为可信身份。

## 为什么企业 AI 功能必须先接身份

没有可信身份时，即使 API Key 和 Prompt 都藏在服务端，链路仍然不安全：

- 任意访问者都能消耗模型 Token。
- 用户可以修改请求体中的 `userId` 冒充他人。
- 审计日志无法证明是谁发起生成或审批。
- 后续租户隔离、RBAC、知识权限和成本归属都没有可信起点。

因此企业链路必须是：

```txt
企业 IdP/登录验证
  -> 服务端创建 Session
  -> 浏览器保存加密 HttpOnly Cookie
  -> 页面、BFF、DAL 每次从 Session 恢复用户
  -> 再做租户、角色和资源权限判断
```

## 本章成熟方案

本项目使用 `iron-session` 管理无状态 Session。Next.js 16.3 官方认证指南明确建议使用 Session 管理库，例如 `iron-session` 或 `jose`，避免自行实现密码学协议和 Cookie 封装。

`iron-session`负责：

- 签名并加密 Session 数据。
- 生成和删除 Session Cookie。
- 设置 Session 有效期。
- 支持密钥轮换配置。

`iron-session`不负责：

- 校验企业账号密码。
- 对接 OAuth/OIDC 或企业 SSO。
- 查询真实用户目录。
- 判断租户、角色和工单权限。

生产项目通常由 Auth.js、Better Auth、Keycloak、Auth0、Clerk 或企业自建 IdP 完成登录，Session 层只承接验证后的用户标识。本章没有伪造生产登录能力。

## 当前项目链路

```txt
开发环境登录页
  -> signInWithDemoSession
  -> createDemoUserSession
  -> getIronSession
  -> session.save()
  -> 加密 HttpOnly Cookie

后续请求
  -> requireAuthenticatedUser / authenticateApiRequest
  -> getAuthenticationContext
  -> getIronSession
  -> Zod校验解密后的Session payload
  -> 服务端身份目录解析userId
  -> 页面、AI BFF、审批 BFF继续执行业务
```

## 按调用顺序理解函数

| 顺序 | 函数 | 所属分层 | 作用 | 企业场景 |
| --- | --- | --- | --- | --- |
| 1 | `signInWithDemoSession` | Server Action | 接收开发环境登录操作 | 生产中替换为 SSO/OIDC 回调后的建 Session 步骤 |
| 2 | `createDemoUserSession` | Session Service | 只在非生产环境写入演示用户标识 | 课程演示，不冒充真实企业账号认证 |
| 3 | `getIronSession` | 成熟 Session 库 | 读取、签名、加密和写入 Cookie | 避免手写 JWT、Cookie 序列化和密码学细节 |
| 4 | `session.save` | Session Service | 在响应头发出 `Set-Cookie` | 必须在响应或 Streaming 开始前完成 |
| 5 | `getAuthenticationContext` | Auth DAL | 解密、校验 Session 并解析用户 DTO | 页面和多个 BFF 共享同一身份来源 |
| 6 | `sessionPayloadSchema.safeParse` | Runtime Validation | 校验解密后的 payload 结构 | 防止旧 Cookie、损坏数据或版本漂移进入业务 |
| 7 | `requireAuthenticatedUser` | 页面访问边界 | 未登录时重定向登录页 | 保护 Server Component 页面数据读取 |
| 8 | `authenticateApiRequest` | BFF 访问边界 | 返回统一 401 或 503 错误 | Route Handler 不能依赖页面隐藏按钮 |
| 9 | `recordModelCompletion` | 审计层 | 记录可信 `actorUserId` | 成本归属、问题追踪和后续采纳分析 |
| 10 | `session.destroy` | Session Service | 删除浏览器 Session Cookie | 退出登录和会话清理 |

## 为什么不能从请求体读取 userId

下面的请求不可信：

```json
{
  "ticketId": "TICKET-001",
  "userId": "USER-ADMIN-001"
}
```

请求体、查询参数、普通请求头都能在浏览器 F12、curl 或代理工具中修改。正确做法是：

```ts
const authentication = await authenticateApiRequest(requestId);

if (!authentication.ok) {
  return authentication.response;
}

const actorUserId = authentication.user.id;
```

此时 `actorUserId` 来自服务端验证过的 Session，而不是客户端输入。

## Cookie 中保存什么

当前 Session 只保存：

```ts
{
  userId: string;
  authenticatedAt: string;
}
```

不保存：

- API Key、Access Token 或 Refresh Token 明文。
- 邮箱、手机号等个人敏感信息。
- 完整用户对象。
- 可频繁变化的角色和权限。
- 租户名称、客户数据或 Prompt。

Session payload 越大，Cookie 会在每个请求中重复传输，还可能超过浏览器约 4 KB 的限制。

## Cookie 安全选项

当前配置：

```ts
{
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/"
}
```

- `httpOnly`：浏览器 JavaScript 不能读取 Cookie，降低 XSS 窃取风险。
- `secure`：生产环境只通过 HTTPS 发送。
- `sameSite=lax`：降低常见跨站请求携带 Cookie 的风险。
- `path=/`：工作台内的页面和 BFF 都能使用同一 Session。
- `ttl=8小时`：限制单次 Session 生命周期。

Cookie 安全选项不能替代 XSS 防护、CSRF 防护、权限校验和 Session 撤销机制。

## 为什么页面和 BFF 都要检查

只在页面中隐藏按钮没有安全意义。攻击者可以绕过页面直接调用：

```txt
POST /api/ai/reply-chat
POST /api/tickets/approve
GET  /api/ai/providers/status
```

所以本章采用两种入口：

- Server Component 使用 `requireAuthenticatedUser`，未登录重定向。
- Route Handler 使用 `authenticateApiRequest`，未登录返回统一 JSON 401。

安全检查应该尽量靠近数据和操作入口。Proxy 可以做快速跳转，但不能成为唯一防线。

## 错误契约

未登录：

```json
{
  "code": "AUTHENTICATION_REQUIRED",
  "message": "登录状态已失效，请重新登录",
  "requestId": "..."
}
```

Session 密钥缺失或不合规：

```json
{
  "code": "AUTHENTICATION_CONFIGURATION_ERROR",
  "message": "身份服务未正确配置，请联系管理员",
  "requestId": "..."
}
```

前端不接收解密失败原因、密钥长度、Cookie 原文或调用堆栈。

## 当前开发演示身份

为了保证课程主线可以运行，非生产环境允许使用固定演示用户：

```txt
USER-DEMO-CS-001 / 演示客服
```

它的边界是：

- `NODE_ENV=production` 时永远禁用。
- `ENABLE_DEMO_AUTH=false` 时禁用。
- 只用于创建加密 Session，不代表真实账号密码验证。
- 生产环境必须接企业 IdP 和用户目录。

开发环境没有配置 `AUTH_SESSION_PASSWORD` 时使用明确的开发专用密钥。生产环境没有至少 32 位独立随机密钥时直接失败关闭。

## 无状态 Session 的企业取舍

优点：

- 读取 Session 不需要数据库或 Redis 请求。
- 部署简单，适合当前学习项目和中小规模内部系统。
- Cookie 内容经过签名和加密，客户端不能安全篡改。

限制：

- 服务端无法立即撤销某一个已经签发的 Cookie。
- 用户禁用、全端退出和设备管理需要额外状态存储。
- 权限变化不能只依赖 Cookie 中的旧角色。

生产项目常见演进方式：Cookie 只保存随机 Session ID，服务端在数据库或 Redis 中保存会话状态；敏感操作每次重新查询用户、租户和权限。

## 常见错误

### 1. 把 localStorage 当 Session

`localStorage` 可以被前端 JavaScript 读取，也不会自动被 Server Component 和 Route Handler 安全恢复。敏感认证 Token 不应作为本项目主方案放入 localStorage。

### 2. Cookie 没有 HttpOnly

这样 XSS 脚本可以直接读取 Session。认证 Cookie 应由服务端设置，并启用 HttpOnly。

### 3. 只保护页面，不保护 API

隐藏按钮只能改善交互，不能阻止直接请求。每个 Route Handler、Server Action 和数据访问函数都要独立校验。

### 4. 把角色长期写死在 Cookie

管理员权限被回收后，旧 Cookie 仍可能携带旧角色。高风险操作应查询服务端权限来源。Day12 会实现这一层。

### 5. 在日志中记录 Cookie 或 Token

Session Cookie、Authorization 和身份提供方 Token 都属于凭证，不能写入普通应用日志。

### 6. 在 Streaming 开始后更新 Session

HTTP 响应开始发送后不能再设置 Cookie。登录、刷新和退出必须在响应头发送前完成。

## 面试题与标准答案

### 1. Authentication、Session、Authorization 有什么区别？

Authentication 验证用户身份；Session 跨请求保存认证状态；Authorization 根据可信身份判断是否能访问某个租户、资源或操作。三者不能混为一层。

### 2. 为什么客户端传 userId 不可信？

因为客户端输入都能被修改。可信 userId 必须来自服务端验证过的 Session、Access Token 或 mTLS 身份，再由服务端映射用户目录。

### 3. 为什么选择 iron-session？

它是 Next.js 官方认证指南推荐的成熟无状态 Session 库，封装了签名、加密、Cookie 和有效期管理。当前项目不需要为了教学维护手写密码学实现。

### 4. iron-session 是否等于完整认证系统？

不是。它管理 Session，不验证企业账号，也不提供完整 OIDC、MFA、用户生命周期和 RBAC。生产中仍需要 IdP 或认证平台。

### 5. HttpOnly 能防住所有 XSS 吗？

不能。HttpOnly 只阻止 JavaScript 直接读取 Cookie。XSS 仍可能借助用户现有 Session 发起操作，因此还需要内容安全、输入输出防护、权限校验和高风险操作确认。

### 6. SameSite 能否完全替代 CSRF Token？

不能。SameSite 可以降低常见跨站请求风险，但复杂跨域、旧客户端或特定业务仍需 Origin 校验、CSRF Token 或框架提供的 Server Action 防护。

### 7. 为什么不把完整用户对象写入 Cookie？

Cookie 每次请求都会传输，有大小限制；个人信息会扩大泄漏面；角色等字段会过期。应只保存最小稳定标识，服务端按需查询最新状态。

### 8. 无状态 Session 如何强制用户立即退出？

纯无状态 Cookie 无法单独撤销。可以缩短 TTL、轮换密钥，或增加数据库/Redis Session、用户版本号、封禁状态检查实现即时失效。

### 9. 为什么不能只在 Proxy 做认证？

Proxy 适合快速、乐观的路由预检查，但可能运行于预取和大量请求，且不是数据源边界。真正的校验必须在 DAL、Route Handler 和 Server Action 中再次执行。

### 10. AI BFF 为什么也需要身份？

模型调用会产生费用并处理企业数据。身份用于权限控制、租户隔离、限流、成本归属、审计和事故追踪，没有身份就无法建立企业治理链路。

### 11. 401 和 403 分别什么时候使用？

没有有效身份时返回 401；身份有效但没有目标资源权限时返回 403。当前 Day11 主要解决 401，Day12 增加 403。

### 12. 如何轮换 Session 密钥？

保留旧密钥用于解密，使用新密钥签发新 Cookie，等待旧 Session 过期后移除旧密钥。`iron-session`支持带递增版本号的密码对象。

## 项目实践

### 改动范围

- `src/features/auth/server/session.ts`：Session Service、Auth DAL、演示身份和统一 API 身份错误。
- `src/app/login/page.tsx`：服务端登录页面。
- `src/app/login/actions.ts`：创建和删除 Session 的 Server Action。
- `src/app/page.tsx`：页面身份检查和当前用户展示。
- `src/app/api/ai/reply-chat/route.ts`：AI BFF 身份检查。
- `src/app/api/tickets/approve/route.ts`：写入型 BFF 身份检查。
- `src/app/api/ai/providers/status/route.ts`：模型状态接口身份检查。
- `src/features/ai/server/modelAuditLog.ts`：记录可信操作人。
- `.env.example`：Session 密钥和演示身份开关。

### 代码阅读顺序

1. 阅读 `src/features/auth/server/session.ts`，理解 Cookie、payload 和 Auth DAL。
2. 阅读 `src/app/login/actions.ts`，理解 Cookie 只能在 Server Action 或 Route Handler 中写入。
3. 阅读 `src/app/page.tsx`，理解 Server Component 页面保护。
4. 阅读三个 Route Handler，理解 API 必须独立校验身份。
5. 阅读 `modelAuditLog.ts`，确认操作人来自 Session，不来自请求体。

### 静态检查

```bash
pnpm typecheck
pnpm lint
```

本课程不生成自动化测试源码，由学习者按照下面清单手动验收。

### 手动验收清单

1. 删除浏览器中的 Session Cookie 后访问 `/`，应跳转 `/login`。
2. 点击“使用演示身份登录”，应进入工单页面并显示“演示客服”。
3. 在浏览器 Application 面板中确认 Cookie 为 HttpOnly，内容不可读且不是明文 userId。
4. 在 Network 中确认 AI 请求体只有 `ticketId`、messages 等业务 DTO，没有 `userId`。
5. 删除 Cookie 后直接调用 `/api/ai/reply-chat`，应返回 `AUTHENTICATION_REQUIRED`。
6. 点击退出后应删除 Cookie，再次访问工单页应跳转登录页。
7. 设置 `ENABLE_DEMO_AUTH=false` 后，登录页不能创建演示身份。
8. 生成一次 AI 回复后，确认日志中的 `actorUserId` 来自服务端演示身份。
9. 确认响应和浏览器控制台中没有 Session Cookie、密钥或完整用户对象。

## 下一节

Day12 在当前可信身份基础上增加租户隔离、RBAC 和资源级权限：同一个登录用户也不能访问不属于其租户的工单，客服、主管和管理员拥有不同操作能力。
