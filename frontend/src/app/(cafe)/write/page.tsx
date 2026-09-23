import { Image as ImageIcon, MapPin, Link2, Bold, Italic, List, Video } from "lucide-react";
import { boardGroups } from "@/data/mock";
import { getBoard } from "@/lib/data";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "글쓰기" };

export default async function WritePage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const { board: boardSlug = "free" } = await searchParams;
  const board = getBoard(boardSlug) ?? getBoard("free")!;

  return (
    <div>
      <PageTitle title="글쓰기" desc="서로 존중하는 글쓰기, 안전한 다이빙 문화를 함께 만들어요." />
      <form className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <select name="board" defaultValue={board.slug} className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm sm:w-56">
            {boardGroups.map((g) => (
              <optgroup key={g.id} label={g.name}>
                {g.boards.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
              </optgroup>
            ))}
          </select>
          {board.categories && (
            <select name="category" className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm sm:w-40">
              <option value="">말머리 선택</option>
              {board.categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          )}
        </div>

        <input name="title" placeholder="제목을 입력해 주세요" className="w-full border-b border-gray-200 px-1 py-3 text-lg font-semibold outline-none focus:border-ocean-500" />

        <div className="flex flex-wrap gap-1 border-b border-gray-100 pb-2 text-gray-500">
          {[ImageIcon, Video, MapPin, Link2, Bold, Italic, List].map((Icon, i) => (
            <button key={i} type="button" className="rounded p-2 hover:bg-gray-100"><Icon size={17} /></button>
          ))}
        </div>

        <textarea name="content" rows={16} placeholder={"내용을 입력하세요.\n\n· 다이빙 후기는 포인트명, 날짜, 수온/시야를 함께 적어주시면 좋아요.\n· 사고사례는 개인 비난 없이 원인과 교훈 중심으로 작성해주세요."} className="w-full resize-y px-1 text-[15px] leading-7 outline-none" />

        <div className="rounded-lg bg-ocean-50 p-3 text-xs text-ocean-800">
          💡 <b>로그 연결</b> — 내 로그북의 다이빙 기록을 첨부하면 수심 · 수온 · 시야가 카드로 표시돼요. (추후 구현)
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" className="accent-ocean-600" /> 댓글 허용
          </label>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">임시저장</button>
            <button type="button" className="rounded-lg bg-ocean-600 px-5 py-2 text-sm font-semibold text-white hover:bg-ocean-700">등록</button>
          </div>
        </div>
      </form>
    </div>
  );
}
