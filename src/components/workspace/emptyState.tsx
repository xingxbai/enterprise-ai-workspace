import { Inbox } from "lucide-react";

export default function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center border-y border-zinc-200 bg-white px-6 text-center">
      <Inbox aria-hidden="true" className="size-5 text-zinc-400" />
      <p className="mt-3 text-sm text-zinc-500">{message}</p>
    </div>
  );
}
