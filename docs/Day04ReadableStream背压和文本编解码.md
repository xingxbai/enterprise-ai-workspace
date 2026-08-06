# 第 4 天：ReadableStream、背压和文本编解码

掌握级别：必须精通

企业使用频率：每天

面试重要度：高

## 一句话理解

流式响应不是一次性返回完整文本，而是服务端不断产生小块数据，浏览器一边接收一边渲染；`ReadableStream` 负责分块传输，背压负责控制速度，`TextEncoder` 和 `TextDecoder` 负责字节与文本之间的转换。

## 为什么会出现

AI 回复、日志输出、文件下载和长任务进度都可能需要较长时间。如果服务端等全部内容生成完成后再返回，用户会一直看不到反馈，接口也更容易超时。

Streaming 让服务端先返回响应头，然后逐步发送内容。用户可以更早看到模型输出，前端也可以支持停止、增量渲染和更好的等待体验。

## 企业为什么需要

企业 AI 工作台常见流式场景：

- 客服回复建议逐字输出。
- 知识库问答边生成边展示引用。
- 长文档总结边处理边返回阶段结果。
- 后台任务实时显示进度和日志。
- Tool Calling 执行时向前端返回状态事件。

没有流式能力，AI 功能会像“卡住的表单提交”；有了流式能力，用户能感知系统正在工作，也能更早取消错误请求。

## 企业每天怎么使用

最常见链路：

```txt
Client Component
  -> fetch("/api/ai/reply")
  -> Route Handler
  -> new ReadableStream(...)
  -> return new Response(stream)
  -> 浏览器 reader.read()
  -> TextDecoder 解码并追加到 UI
```

在 Next.js Route Handler 中可以直接返回：

```ts
export async function POST() {
  const stream = new ReadableStream({
    async pull(controller) {
      controller.enqueue(new TextEncoder().encode("第一段内容"));
      controller.close();
    },
  });

  return new Response(stream);
}
```

这只是底层形态。后续接入 AI SDK 或模型厂商时，本质仍然是在处理流、字节、文本和协议。

## 底层原理

### ReadableStream

`ReadableStream` 表示一个可读取的数据源。服务端通过 `controller.enqueue(chunk)` 放入数据，通过 `controller.close()` 表示结束。

常见数据块是 `Uint8Array`，因为 HTTP 传输本质是字节流。

### pull

`pull(controller)` 会在消费者准备继续读取时被调用。它适合把 async iterator、模型流或上游响应流转换成 Web Stream。

这比在循环里不受控制地连续 `enqueue` 更稳，因为它更容易配合消费端速度。

### 背压

背压就是“下游读得慢时，上游别无限制地产生数据”。如果服务端生成速度远快于浏览器读取速度，中间缓冲区会增长，导致内存压力、延迟升高甚至请求失败。

在 Web Streams 中，`pull`、队列大小和 `desiredSize` 都和背压有关。企业代码不一定每天手写复杂背压算法，但必须理解：流式不是疯狂 `enqueue`，而是尊重消费速度。

### TextEncoder 和 TextDecoder

`TextEncoder` 把字符串编码成 `Uint8Array`：

```ts
const bytes = new TextEncoder().encode("你好");
```

`TextDecoder` 把 `Uint8Array` 解码成字符串：

```ts
const text = new TextDecoder().decode(bytes);
```

中文、emoji 和部分特殊字符可能跨 chunk 被切开。前端持续解码时应使用：

```ts
decoder.decode(value, { stream: true });
```

这样 `TextDecoder` 会保留未完成的多字节字符，等下一块数据到来后再正确拼接。

## 企业最佳实践

- Route Handler 返回流时，不在响应里泄漏密钥、Prompt 和内部错误。
- 服务端输出小块文本或事件，不等待完整 AI 结果。
- 前端读取流时处理 `done`、异常、取消和最终收尾。
- 解码增量文本时使用 `TextDecoder`，不要直接把字节当字符串拼。
- 中文和 emoji 场景下使用 `{ stream: true }`。
- 流式接口仍要做认证、授权、输入校验、限流和审计。
- 需要结构化事件时优先设计清晰协议，下一章再进入 SSE。
- 生产环境要考虑代理、CDN、serverless 超时和缓冲行为。

本章安全风险：Streaming 不是安全特权。只要 chunk 被发送给浏览器，就默认用户可见。敏感信息不能因为“只是中间片段”就进入流。

## 常见错误

1. 把完整 AI 结果生成完再一次性返回，却误称为 streaming。
2. 在 Server Component 中处理浏览器流式读取逻辑。
3. 忘记 `controller.close()`，导致请求一直不结束。
4. 前端忽略 `done`，造成死循环。
5. 用字符串拼接处理原始 `Uint8Array`。
6. 解码中文时不用 `{ stream: true }`，偶发乱码。
7. 不处理用户取消，导致模型和业务请求继续消耗成本。
8. 在流里输出完整 Prompt、内部工具参数或上游错误堆栈。
9. 认为流式一定更快；它是更早可见，不代表总耗时一定更短。
10. 忽略代理和部署平台可能缓冲响应。

## 面试题

1. 什么是 `ReadableStream`？
   - 追问：它和一次性 `Response.json()` 有什么区别？
2. Route Handler 如何返回流式响应？
   - 追问：为什么可以 `return new Response(stream)`？
3. `controller.enqueue()` 和 `controller.close()` 分别做什么？
   - 追问：忘记 close 会怎样？
4. 什么是背压？
   - 追问：为什么 AI Streaming 也要考虑背压？
5. 为什么 HTTP 流里通常传的是字节而不是字符串？
   - 追问：`Uint8Array` 是什么角色？
6. `TextEncoder` 和 `TextDecoder` 分别解决什么问题？
   - 追问：中文乱码通常怎么产生？
7. `decoder.decode(value, { stream: true })` 的作用是什么？
   - 追问：什么时候需要最后再 `decoder.decode()` 收尾？
8. 流式响应如何处理错误？
   - 追问：响应已经开始后还能不能随便改状态码？
9. 流式接口如何做安全控制？
   - 追问：Prompt 和密钥为什么不能出现在 chunk 中？
10. Streaming 和 SSE 有什么关系？
    - 追问：为什么先学 Web Stream，再学 SSE 协议？

## 标准答案

### 1. ReadableStream

`ReadableStream` 是 Web 标准的可读数据流，允许服务端或其他数据源按 chunk 提供数据。和 `Response.json()` 一次性返回完整内容不同，流可以让浏览器边接收边处理。

### 2. Route Handler 返回流

Next.js Route Handler 基于 Web `Request` 和 `Response` API，可以直接把 `ReadableStream` 作为 `Response` body 返回。AI SDK 的流式封装底层也是基于这些 Web APIs。

### 3. enqueue 和 close

`controller.enqueue()` 把新的数据块放进流队列，`controller.close()` 表示没有更多数据。忘记 close 会让客户端一直等待结束信号，UI 可能停在加载状态。

### 4. 背压

背压是消费者读取速度反向影响生产者生成速度的机制。AI 输出、日志和文件流都可能产生大量数据，如果不尊重消费速度，缓冲区会膨胀并造成内存和延迟问题。

### 5. 字节流

网络传输的底层是字节，文本只是字节按字符编码解释后的结果。`Uint8Array` 是 JavaScript 中表达二进制字节块的常见类型。

### 6. 文本编解码

`TextEncoder` 把字符串编码成 UTF-8 字节，`TextDecoder` 把 UTF-8 字节解码回字符串。中文和 emoji 是多字节字符，如果一个字符被拆到两个 chunk，错误解码就可能出现乱码。

### 7. stream 解码

`decoder.decode(value, { stream: true })` 告诉解码器当前不是最后一块数据，可以保留未完成的多字节字符。流结束后可以再调用一次 `decoder.decode()` 释放缓冲中的剩余文本。

### 8. 错误处理

响应开始发送后，HTTP 状态码和部分响应头通常已经确定，不能像普通 JSON 接口一样随时改状态码。企业流式协议应提前校验输入，流中错误则用约定事件或安全文本表达。

### 9. 安全控制

流式接口仍是浏览器可见响应。认证、授权、租户隔离和输入校验要在开始 streaming 前完成，chunk 中不能包含密钥、完整 Prompt、内部工具参数或上游敏感错误。

### 10. Streaming 和 SSE

Streaming 是底层数据传输能力，SSE 是建立在文本流上的事件协议。先理解 Web Stream、字节和解码，再学 SSE 的 `data:`、`event:` 和消息边界会更稳。

## 项目实践

### 业务需求

本章只完成底层理解，不默认新增运行时代码。后续第 5 天会在 Route Handler 上设计 SSE 与 AI SDK 消息协议。

### 改动范围

- `docs/Day04ReadableStream背压和文本编解码.md`：记录课程知识点、面试题、标准答案和练习。
- `README.md`：同步当前课程进度和权威文档入口。

### 代码阅读顺序

1. 阅读 `src/app/api/tickets/approve/route.ts`，回顾 Route Handler 服务端边界。
2. 对照 Next.js Route Handler 文档中的 Streaming 示例，理解 `new Response(stream)`。
3. 暂不把 AI SDK 引入项目，避免在没有模型账号和协议设计前制造假链路。

### 验证方式

```bash
pnpm typecheck
pnpm lint
```

本章不启动服务、不执行构建、不操作浏览器。

### 异常场景

- 上游模型调用前校验失败，应返回普通错误响应，不启动流。
- 流开始后发生错误，应通过约定 chunk 或事件告诉前端，不返回敏感堆栈。
- 用户取消请求后，应停止继续读取上游模型流，避免继续消耗 token。

## 官方文档

- [Next.js：route.js Streaming](https://nextjs.org/docs/app/api-reference/file-conventions/route#streaming)
- [Next.js：Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [MDN：ReadableStream](https://developer.mozilla.org/docs/Web/API/ReadableStream)
- [MDN：TextEncoder](https://developer.mozilla.org/docs/Web/API/TextEncoder)
- [MDN：TextDecoder](https://developer.mozilla.org/docs/Web/API/TextDecoder)

## 延伸阅读

下一章学习 SSE 与 AI SDK 消息协议，把底层字节流组织成浏览器和 AI UI 能稳定消费的事件流。

## 企业级练习与验收标准

练习：判断下面几段流式代码的风险，并说明如何修正。

验收标准：

- 能解释 `ReadableStream`、`enqueue`、`close` 的职责。
- 能说明背压为什么和消费速度有关。
- 能解释为什么中文流式解码需要 `{ stream: true }`。
- 能指出流式 chunk 中不能包含密钥、Prompt 和内部错误。
- 能区分一次性 JSON 响应、原生 Streaming 和下一章 SSE 协议。
- 能在面试中说明为什么 AI SDK Streaming 底层仍离不开 Web Streams。
