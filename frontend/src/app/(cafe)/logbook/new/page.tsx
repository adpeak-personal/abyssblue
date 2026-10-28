import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api";
import { authHeaders, getSessionUser } from "@/lib/session";
import { LogForm } from "./LogForm";
import { PageTitle } from "@/components/ui";
import type { DivePoint } from "@/types";

export const metadata = { title: "새 로그 기록" };

export default async function NewLogPage() {
  // 로그는 본인 것만 쓴다 — 서버도 막지만 화면에서 먼저 돌려보낸다
  const me = await getSessionUser();
  if (!me) redirect("/login?next=/logbook/new");

  // 포인트 목록과 다음 다이브 번호를 미리 채워 준다.
  // 번호는 안내용이고, 실제 채번은 저장할 때 서버가 한다 (동시에 쓰면 어긋날 수 있다).
  const [points, stats] = await Promise.all([
    apiGet<DivePoint[]>("/points"),
    apiGet<{ totalDives: number }>(`/logs/stats?userId=${me.id}`, await authHeaders()),
  ]);

  return (
    <div>
      <PageTitle title="새 다이빙 로그" desc="다이빙 직후 기억이 생생할 때 기록하세요. 다이브 컴퓨터 연동은 추후 지원 예정입니다." />
      <LogForm points={points ?? []} nextDiveNo={(stats?.totalDives ?? 0) + 1} />
    </div>
  );
}
