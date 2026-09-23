import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({ page, total, size, makeHref }: { page: number; total: number; size: number; makeHref: (page: number) => string }) {
  const last = Math.max(1, Math.ceil(total / size));
  const pages = Array.from({ length: last }, (_, i) => i + 1);
  return (
    <nav className="mt-5 flex items-center justify-center gap-1 text-sm" aria-label="페이지">
      <Link href={makeHref(Math.max(1, page - 1))} className="rounded p-1.5 text-gray-400 hover:bg-gray-100" aria-label="이전">
        <ChevronLeft size={16} />
      </Link>
      {pages.map((p) => (
        <Link
          key={p}
          href={makeHref(p)}
          className={cn("min-w-8 rounded px-2 py-1 text-center", p === page ? "bg-ocean-600 font-bold text-white" : "text-gray-600 hover:bg-gray-100")}
        >
          {p}
        </Link>
      ))}
      <Link href={makeHref(Math.min(last, page + 1))} className="rounded p-1.5 text-gray-400 hover:bg-gray-100" aria-label="다음">
        <ChevronRight size={16} />
      </Link>
    </nav>
  );
}
