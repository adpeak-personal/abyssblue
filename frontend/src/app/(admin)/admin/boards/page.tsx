import { apiGet } from "@/lib/api";
import { authHeaders } from "@/lib/session";
import { BoardSettings } from "./BoardSettings";
import type { AdminBoardGroup } from "@/types/admin";

export const metadata = { title: "게시판 관리" };

export default async function AdminBoardsPage() {
  const groups = await apiGet<AdminBoardGroup[]>("/admin/boards", await authHeaders());

  if (!groups) {
    return (
      <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        게시판 목록을 불러오지 못했습니다. 백엔드(5030)가 실행 중인지 확인해 주세요.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">게시판 관리</h1>
        <p className="mt-1 text-sm text-gray-500">
          게시판 이름 · 설명 · 목록 형식 · 말머리를 바꿉니다. 글은 그대로 유지됩니다.
        </p>
      </div>

      <BoardSettings groups={groups} />
    </div>
  );
}
