"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type StreamingMarkdownProps = {
  content: string;
};

const allowedMarkdownElements = [
  "p",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "h3",
  "h4",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "br",
];

export default function StreamingMarkdown({ content }: StreamingMarkdownProps) {
  return (
    <div className="ai-markdown">
      <Markdown
        allowedElements={allowedMarkdownElements}
        // 企业重点：开启 GFM 支持列表、表格等常见业务回复格式，但不启用原始 HTML，避免模型输出 HTML 带来 XSS 风险。
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </Markdown>
    </div>
  );
}
