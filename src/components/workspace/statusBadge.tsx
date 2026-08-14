type StatusBadgeProps = {
  children: string;
};

const statusStyles: Record<string, string> = {
  中: "bg-amber-50 text-amber-700 ring-amber-200",
  低: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  失败: "bg-red-50 text-red-700 ring-red-200",
  健康: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  成功: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  在线: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  处理中: "bg-blue-50 text-blue-700 ring-blue-200",
  审核中: "bg-blue-50 text-blue-700 ring-blue-200",
  已发布: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  已解决: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  忙碌: "bg-amber-50 text-amber-700 ring-amber-200",
  待处理: "bg-amber-50 text-amber-700 ring-amber-200",
  关注: "bg-amber-50 text-amber-700 ring-amber-200",
  离线: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  草稿: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  风险: "bg-red-50 text-red-700 ring-red-200",
  高: "bg-red-50 text-red-700 ring-red-200",
};

export default function StatusBadge({ children }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[children] ?? "bg-zinc-100 text-zinc-600 ring-zinc-200"}`}
    >
      {children}
    </span>
  );
}
