import { BookOpen, Search } from "lucide-react";

import EmptyState from "@/components/workspace/emptyState";
import PageHeader from "@/components/workspace/pageHeader";
import StatusBadge from "@/components/workspace/statusBadge";
import { getKnowledgeArticles } from "@/data/legacySystem";

type KnowledgeSearchParams = Promise<{ q?: string | string[] }>;

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: KnowledgeSearchParams;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const articles = getKnowledgeArticles().filter(
    (article) =>
      !query ||
      [article.title, article.summary, article.category, ...article.tags]
        .join(" ")
        .toLowerCase()
        .includes(query),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        description="维护客服排障手册、标准流程和产品说明。当前使用关键词人工搜索。"
        eyebrow="Knowledge operations"
        title="知识库"
      />

      <form className="flex max-w-xl gap-2">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">搜索知识库</span>
          <Search aria-hidden="true" className="absolute left-3 top-2.5 size-4 text-zinc-400" />
          <input className="h-9 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-zinc-500" defaultValue={typeof params.q === "string" ? params.q : ""} name="q" placeholder="标题、分类或关键词" />
        </label>
        <button className="h-9 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700" type="submit">搜索</button>
      </form>

      {articles.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {articles.map((article) => (
            <article className="rounded-lg border border-zinc-200 bg-white p-5" key={article.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <BookOpen aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-zinc-400" />
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500">{article.id} · {article.category}</p>
                    <h2 className="mt-1 text-sm font-semibold">{article.title}</h2>
                  </div>
                </div>
                <StatusBadge>{article.status}</StatusBadge>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-600">{article.summary}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {article.tags.map((tag) => <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-500" key={tag}>{tag}</span>)}
              </div>
              <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
                <span>{article.owner} · {article.updatedAt}</span>
                <span>{article.views} 次查看 · {article.helpfulRate}% 有帮助</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState message="没有匹配的知识文章" />
      )}
    </div>
  );
}
