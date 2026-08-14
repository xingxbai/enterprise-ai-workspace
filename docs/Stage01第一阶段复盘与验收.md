# 第一阶段复盘与验收：Next.js 与 AI 交互基础

## 阶段结论

第一阶段已经完成 Server/Client Component 边界、AI BFF、AI SDK Streaming、`useChat`、安全 Markdown、DeepSeek/Kimi Provider Adapter、运行时校验、统一错误和 requestId。

当前只完成了浏览器到模型的受控请求边界，尚未完成可信 Session、租户隔离、RBAC 和资源级权限，因此不能直接视为生产可用安全链路。

## 阶段收口

- 客服回复建议只保留 AI SDK UI Message Stream 主链路。
- 删除旧 `/api/ai/reply`、自定义 NDJSON 解析器、旧按钮和旧流服务。
- 外部工单响应使用 Zod 做运行时校验，不再用 TypeScript 类型断言信任上游 JSON。
- 演示工单只允许在非生产环境使用；生产环境缺配置或上游失败返回空状态。
- 审批 Route Handler 接入统一错误码、requestId、超时、取消和上游错误分类。
- 服务端日志采用白名单字段，不记录不可控的上游错误正文。
- 补充手动验收范围，覆盖数据契约、Demo 环境边界、审批写入失败和统一错误响应。

## 当前主链路

```txt
Server Component 工单列表
  -> Client Component 回复建议面板
  -> useChat + DefaultChatTransport
  -> POST /api/ai/reply-chat
  -> Zod + safeValidateUIMessages
  -> 工单数据契约校验
  -> Provider Adapter
  -> streamText
  -> AI SDK UI Message Stream
  -> Markdown 安全渲染
  -> requestId + usage 学习审计
```

## 静态检查与手动验收

```bash
pnpm typecheck
pnpm lint
```

本项目不生成自动化测试源码，由学习者按照各章异常场景自行验证。真实 DeepSeek/Kimi 的内容质量、首 Token 延迟和 usage 需要使用个人服务端密钥进行受控 smoke 验证。

## 下一阶段

Day11进入服务端 Session 与可信身份，Day12补租户隔离、RBAC和资源级权限。后续任何RAG、Tool Calling和Agent能力都必须复用这条身份与授权链路。
