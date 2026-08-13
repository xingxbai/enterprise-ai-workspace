"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import StreamingMarkdown from "./streamingMarkdown";

type ReplySuggestionChatPanelProps = {
  ticketId: string;
};

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export default function ReplySuggestionChatPanel({
  ticketId,
}: ReplySuggestionChatPanelProps) {
  const transport = new DefaultChatTransport({
    api: "/api/ai/reply-chat",
    prepareSendMessagesRequest: (request) => {
      const { messageId, messages, trigger } = request;
      return {
        body: {
          ticketId,
          messageId,
          messages,
          trigger,
        },
      };
    },
  });

  const {
    messages,
    sendMessage,
    regenerate,
    stop,
    status,
    error,
    clearError,
    setMessages,
  } = useChat({
    id: "reply-suggestion-chat-panel-" + ticketId,
    transport,
    // 企业重点：流式文本会频繁到达，节流可以减少 Markdown 解析和 React 重渲染压力。
    throttle: 80,
  });
  const isGenerating = status === "submitted" || status === "streaming";
  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const latestSuggestion = latestAssistantMessage
    ? getMessageText(latestAssistantMessage)
    : "";

  function generateSuggestion() {
    clearError();
    // 面试重点：sendMessage 触发提交，后续 loading/streaming/error 状态交给 useChat 维护。
    void sendMessage({
      text: "请生成一段客服回复建议。",
    });
  }

  function regenerateSuggestion() {
    clearError();
    // 面试重点：regenerate 复用已有上下文重新生成最后一条 assistant 回复，不需要手写 AbortController。
    void regenerate();
  }

  function resetSuggestion() {
    clearError();
    setMessages([]);
  }

  return (
    <div className="min-w-64 whitespace-normal rounded-lg border border-violet-100 bg-violet-50/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded-md bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          disabled={isGenerating}
          onClick={generateSuggestion}
          type="button"
        >
          {latestSuggestion ? "再次生成" : "生成建议"}
        </button>
        {isGenerating ? (
          <button
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-white"
            onClick={() => void stop()}
            type="button"
          >
            停止
          </button>
        ) : null}
        {latestSuggestion && !isGenerating ? (
          <button
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-white"
            onClick={regenerateSuggestion}
            type="button"
          >
            重新生成
          </button>
        ) : null}
        {messages.length > 0 && !isGenerating ? (
          <button
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-500 hover:bg-white"
            onClick={resetSuggestion}
            type="button"
          >
            清空
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        状态：
        {status === "submitted"
          ? "已提交"
          : status === "streaming"
            ? "生成中"
            : status === "error"
              ? "失败"
              : "就绪"}
      </p>

      {latestSuggestion ? (
        <div className="mt-3 max-w-md rounded-md bg-white/70 p-3 text-xs leading-5 text-zinc-700">
          <StreamingMarkdown content={latestSuggestion} />
        </div>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs leading-5 text-red-600">
          回复建议生成失败，请稍后重试
        </p>
      ) : null}
    </div>
  );
}
