# AI 应用开发课程执行规范与 60 天 Offer 路线

> 文档状态：新项目最高优先级规范
>
> 适用范围：第 1 天至第 60 天，以及后续代码实践、复盘和面试准备
>
> 冲突处理：与旧项目文档或历史课程冲突时，以本文件为准

## 一、目标与真实边界

学习者具备 6 年 React、TypeScript、企业后台和工程化经验，目标岗位是中高级 AI Application Engineer、AI Frontend Engineer 或偏应用层 AI Full Stack Engineer。

60 天目标：

- 能够将 AI 安全地接入现有 React、Next.js 和企业业务系统。
- 能够独立负责 Streaming、Prompt、结构化输出、RAG、Tool Calling 和业务集成。
- 能够设计认证、权限、异常、审计、成本和效果评估方案。
- 能够说明真实技术决策并通过中高级岗位面试。

不学习模型训练、算法推导、论文复现和 PyTorch 模型开发。

本项目属于个人学习和作品集，不得虚构为上家公司已经上线的生产项目。

## 二、统一企业背景

`Enterprise AI Workspace` 服务于一家已有企业后台、CRM、客服工单、知识库、订单系统和权限体系的 B2B SaaS 企业。

所有模块必须属于这家企业的持续演进：

- 客服助手读取工单、客户和知识库，生成可编辑的回复建议。
- 知识助手基于企业文档回答，并返回受权限控制的引用来源。
- 表单助手提取结构化字段，用户确认后调用真实业务接口。
- 数据分析助手解释由业务代码计算的可信指标。
- 工作流助手通过 Tool Calling 查询或操作订单、客户和任务。

项目不能成为多个无关 Demo 的组合。

## 三、教学原则

1. 只讲企业常用技术，并按使用频率排序。
2. 每章只讲一个知识点，完成后等待“下一章”。
3. 所有案例围绕企业业务，不开发纯聊天、Todo 或技术炫技功能。
4. 每章说明是什么、为什么需要、企业如何使用、最佳实践、常见坑、面试方式和掌握程度。
5. 明确区分必须精通、熟悉即可和了解即可，不平均投入精力。
6. 先判断业务是否需要 AI，确定性查询和计算优先由普通代码完成。
7. 不为使用框架而使用 LangChain、Agent、LangGraph、MCP、Redis 或向量数据库。
8. 安全、权限、异常、成本和效果评估贯穿每一章。

## 四、企业项目实战优先口径

本项目的核心目标是让学习者在面试中能讲出真实、完整、企业可落地的 AI 应用项目经验，而不是从 0 到 1 手写底层 API。

执行要求：

- 每章优先沉淀企业项目实战功能、架构决策、边界设计和面试表达。
- 成熟方案优先于原生手写实现。Streaming、模型调用和消息协议优先使用 AI SDK、Provider Adapter、SSE 或稳定 UI message 协议。
- 原生 `ReadableStream`、`TextEncoder`、`TextDecoder`、SSE 字符串格式等只作为底层理解、线上排障和面试追问内容，不作为长期业务主实现。
- 表单、请求体、模型输出和工具参数优先使用 Zod 等运行时校验方案。
- UI 和交互优先遵循项目组件规范或成熟组件库，不把手搓控件作为课程主线。
- 每章代码必须接入 `Enterprise AI Workspace` 业务链路，能够被后续课程继续演进，不做不可复用的孤立 Demo。
- 每章都要能回答：业务为什么需要、为什么选这个成熟方案、安全边界在哪里、如何处理权限/租户/Prompt/敏感数据/超时/取消/重试/审计/成本、后续如何扩展到 RAG 或 Tool Calling。
- 没有真实密钥或真实业务 API 时，返回明确错误或空状态，不用模拟 AI 文本、固定回答、人工延迟冒充真实链路。
- 为了支撑课程和面试演示，可以提供明确命名的学习演示种子数据，但必须标注为 demo fixture，且真实业务 API 配置存在时必须优先使用真实数据源。
- 读取型业务 API 在开发环境不可用时，可以降级到学习演示种子数据并记录脱敏日志，避免页面整体崩溃；写入型业务 API 不允许假成功。

## 五、每章固定结构

```markdown
# 第 XX 天：章节标题

掌握级别：必须精通 / 熟悉即可 / 了解即可
企业使用频率：每天 / 每周 / 按需 / 部署阶段
面试重要度：高 / 中 / 低

## 一句话理解

## 为什么会出现

## 企业为什么需要

## 企业每天怎么使用

## 底层原理

## 企业最佳实践

## 常见错误

## 面试题

## 标准答案

## 项目实践

## 官方文档

## 延伸阅读

## 企业级练习与验收标准
```

执行要求：

- 面试题至少 10 道，包含连续追问。
- 标准答案达到 6 年经验中高级工程师水平。
- 项目实践说明业务需求、改动范围、阅读顺序、验证方式和异常场景。
- 每章说明安全风险、技术选型、未选方案和最终决策。
- 涉及 AI SDK、Provider、业务 API 或关键三方库时，每章必须按调用顺序列出函数作用、所属分层和企业开发场景。
- 每章练习必须有明确验收标准。
- 后续代码必须保留简单注释，重点解释业务边界、安全边界和企业取舍，避免为普通语法写过密注释。
- 本地项目启动端口固定为 `4000`，`package.json`、README 和课程文档不得漂移到其他端口。

## 六、掌握等级

### 6.1 必须精通

- React、TypeScript 和 Next.js App Router 边界。
- Route Handler、AI BFF、认证、RBAC 和数据权限。
- Vercel AI SDK、Streaming、SSE、取消和消息协议。
- OpenAI Compatible API 与 Provider Adapter。
- Prompt、运行时校验和结构化输出。
- 业务 API Adapter、异常、超时、重试、限流和审计。
- RAG 核心链路、引用和知识权限。
- Tool Calling 的参数校验、授权、确认和幂等。

### 6.2 熟悉即可

- PostgreSQL、pgvector、Embedding 和基础检索评估。
- FastAPI 和文件处理 API。
- Redis 的限流、缓存和任务状态用途。
- Agent 状态、工具循环和错误恢复。
- Docker、部署、可观测性和 Token 成本。

### 6.3 了解即可

- LangChain 常见抽象。
- LangGraph 复杂状态编排。
- MCP 协议定位。
- Rerank、混合检索和复杂评测平台。

## 七、60 天路线

### 第一阶段：Next.js 与 AI 交互基础（Day1～10）

1. App Router 与默认服务端组件边界。
2. Client Component 边界和可序列化 Props。
3. Route Handler 与服务端密钥边界。
4. 企业 AI 回复建议 Streaming 成熟方案。
5. 企业 AI 回复建议的消息协议与状态管理。
6. `useChat` 状态、停止和重新生成。
7. 流式 Markdown 渲染与消息性能。
8. DeepSeek Chat Completions 真实接入与调用审计。
9. 多 Provider Adapter 与 Kimi 切换治理。
10. Next.js AI BFF 请求校验和错误边界。

### 第二阶段：企业接入基础（Day11～20）

11. 服务端 Session 与可信身份。
12. RBAC、租户隔离和资源级权限。
13. 业务 API Adapter 与领域契约。
14. 超时、取消、重试和错误分类。
15. Request ID、日志、审计和敏感信息保护。
16. 企业 Prompt 的角色、约束、变量和版本。
17. 结构化输出与 Zod 运行时校验。
18. AI 功能适用性和人工确认边界。
19. AI 效果、延迟与成本基线。
20. 客服回复建议链路整合与阶段验收。

### 第三阶段：企业知识助手（Day21～30）

21. 企业文件上传与安全校验。
22. PDF 文本、页码和元数据解析。
23. Word 文档解析与格式归一化。
24. Chunk 切分策略与业务语义。
25. Embedding 模型与向量语义。
26. PostgreSQL、pgvector 与向量表设计。
27. 相似度检索和 Top K。
28. RAG 上下文组装与 Token 预算。
29. 引用来源、知识权限和幻觉控制。
30. RAG 评测、失败样本和阶段验收。

### 第四阶段：客服、表单与文档业务（Day31～40）

31. 工单、客户和消息领域模型。
32. 客服上下文选择与数据最小化。
33. 回复建议、人工编辑和采纳反馈。
34. 工单分类、优先级和结构化提取。
35. 客服数据权限、审计和质量指标。
36. 自然语言生成企业表单。
37. Schema、字段映射和业务规则校验。
38. 用户确认后调用真实写入接口。
39. 文档字段提取、脱敏和异常处理。
40. 客服与表单链路阶段验收。

### 第五阶段：数据分析与 Tool Calling（Day41～50）

41. 指标 API 与可信数字边界。
42. 数据权限、时间范围和口径。
43. 日报、周报和趋势解释。
44. 图表数据与自然语言解释分离。
45. 分析事实一致性与质量验收。
46. Function Calling 与 Tool Calling 协议。
47. 查询型工具注册与参数 Schema。
48. 写入型工具授权与人工确认。
49. 工具幂等、超时、重试和审计。
50. 多工具业务流程与失败补偿。

### 第六阶段：Agent、工程化与 Offer（Day51～60）

51. Agent 循环、状态和停止条件。
52. Agent 与普通工作流的选择边界。
53. LangGraph 的适用场景和状态恢复。
54. MCP 的协议定位和接入评估。
55. Redis 限流、缓存和任务状态。
56. AI 可观测性、Token 成本和告警。
57. 自动化测试与 AI 评测集。
58. Docker、环境配置和部署。
59. 安全、性能和关键链路总验收。
60. README、架构图、简历表达和模拟面试。

课程可以根据真实账号和学习反馈微调日序，但不能偏离企业业务集成主线。修改路线必须同步更新本文件。

## 八、架构与 Provider 原则

```text
浏览器 UI
  ↓
Next.js AI BFF（认证、授权、校验、限流、审计）
  ↓
AI 应用服务（业务上下文、Prompt、RAG、Tools）
  ├── 业务 API Adapter
  ├── Prompt Service
  ├── Knowledge Service
  └── Tool Registry
  ↓
Provider Adapter
  ├── DeepSeek
  ├── Kimi
  └── 其他受支持模型
```

- 业务层不直接依赖具体模型厂商 SDK。
- API Key、Base URL、完整 Prompt 和权限判断只能位于服务端。
- Provider Adapter 处理鉴权、模型名、参数、流协议、错误和用量差异。
- 模型切换不应影响页面和业务流程；协议差异只进入适配层。
- 不假设所有 OpenAI Compatible 接口支持完全相同的字段和能力。

### 8.1 真实 AI 接入参考源

真实 AI 场景接入优先参考本机历史项目：

```txt
/Users/baixingxing/xingxbai/AI/FrontendEngineer
```

重点参考：

- `apps/web/.env.example`：DeepSeek、Kimi、模型名、Base URL 和超时配置命名。
- `apps/web/src/lib/ai/deepseek.ts`：DeepSeek OpenAI-compatible Chat Completions 接入方式。
- `apps/web/src/lib/ai/kimi.ts`：Kimi OpenAI-compatible Chat Completions 接入方式。
- `apps/web/src/lib/ai/model-service.ts`：Provider 选择、错误归一化和日志脱敏。
- `apps/web/src/lib/ai/chat-service.ts`：AI SDK `streamText`、取消信号、流式响应和用量处理。
- `apps/web/src/app/api/chat/route.ts`：Route Handler 作为 AI BFF 的请求校验和错误边界。

当前项目沿用的关键约定：

- DeepSeek：`DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL=https://api.deepseek.com`、`DEEPSEEK_MODEL=deepseek-chat`。
- Kimi：`KIMI_API_KEY`、`KIMI_BASE_URL=https://api.moonshot.cn/v1`、`KIMI_MODEL=kimi-k2.5`。
- Provider 选择：`AI_CHAT_PROVIDER=deepseek | kimi`。
- 调用方式：OpenAI-compatible Chat Completions，使用 AI SDK `createOpenAI(...).chat(modelId)` 和 `streamText`，不要走 OpenAI Responses API。
- 密钥变量严禁使用 `NEXT_PUBLIC_` 前缀，严禁返回给浏览器。

## 九、安全与工程质量

每个模块必须考虑：

- Prompt Injection、Jailbreak 和上下文污染。
- 身份认证、RBAC、租户隔离和数据越权。
- PII、密钥、Prompt 和日志泄漏。
- Tool 参数伪造与 Function Calling 越权。
- 模型幻觉和事实不一致。
- 超时、取消、重试、降级、幂等和人工接管。

工程验收至少包含：

- 输入和模型输出均经过运行时校验。
- 请求能够通过 Request ID、Conversation ID 和 User ID 追踪。
- Token、延迟、调用状态和费用可统计。
- AI 效果有正确率、引用命中率、采纳率或任务成功率等指标。
- 日志不记录密钥、完整敏感正文和无必要的模型原始输出。

## 十、代码与操作约束

- 统一使用 TypeScript、React 当前稳定实践和 Next.js App Router。
- 页面和布局默认使用 Server Component。
- 只有需要状态、事件或浏览器 API 的叶子组件使用 Client Component。
- 新增代码只在非自解释逻辑处使用中文注释。
- 企业知识注释使用 `// 企业重点：`，面试知识注释使用 `// 面试重点：`。
- 后续新增关键代码必须保留简单注释，重点解释业务边界、安全边界和企业取舍，不写重复代码字面含义的注释。
- 不使用 Mock 模型、固定回答或人工延迟冒充真实链路。
- 需要数据库、模型或第三方账号时，提前通知学习者申请。
- 自动化测试可以使用受控测试数据验证确定性逻辑，但必须明确测试边界。
- 默认不操作浏览器、不启动服务、不执行构建、不执行 Git 暂存、提交或推送。
- 样式问题默认跳过。
- 所有说明、Markdown、注释和 Git 描述使用汉语。

## 十、模块复盘与面试表达

每完成一个模块，必须能够说明：

1. 哪个部门和角色提出了什么问题。
2. 为什么使用 AI，为什么传统代码不足。
3. 模型负责什么，服务端和业务系统负责什么。
4. 页面、BFF、应用服务、Provider 和数据如何流转。
5. 为什么选择当前技术，为什么没有选择更复杂方案。
6. 如何处理权限、安全、失败、降级和人工确认。
7. 如何通过功能、质量、性能、成本和 ROI 验收。
8. 当前方案的不足和下一步演进条件。

## 十一、下一章

下一章固定为：

> 第 2 天：Client Component 边界和可序列化 Props

在学习者明确输入“下一章”前，不提前实现第 2 天内容。
