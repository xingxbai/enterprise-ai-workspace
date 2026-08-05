"use client";

import { useId, useRef } from "react";

export default function DetailModal({ ticketId }: { ticketId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        className="font-medium text-blue-700 hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        展开详情
      </button>

      <dialog
        aria-labelledby={titleId}
        aria-modal="true"
        className="m-auto w-[min(32rem,calc(100%_-_2rem))] border-0 bg-transparent p-0 backdrop:bg-black/50"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            event.currentTarget.close();
          }
        }}
        ref={dialogRef}
      >
        <div className="rounded-lg bg-white p-6 text-zinc-950 shadow-xl">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="text-lg font-semibold" id={titleId}>
                工单详情
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                工单编号：{ticketId}
              </p>
            </div>
            <button
              aria-label="关闭工单详情"
              className="shrink-0 px-2 py-1 text-sm text-zinc-600 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-700"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              关闭
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
