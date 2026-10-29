import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { PageTitle } from "@/components/ui";
import { TourForm } from "./TourForm";

export const metadata = { title: "투어 열기" };

/** 강사·운영진만. 백엔드도 같은 조건을 다시 확인하므로 화면이 유일한 방어선은 아니다 */
const CAN_OPEN = ["강사", "운영진"];

export default async function NewTourPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login?next=/tours/new");
  if (!CAN_OPEN.includes(me.level)) redirect("/tours?denied=1");

  return (
    <div>
      <PageTitle
        title="투어 열기"
        desc="일정과 조건을 적어두면 회원들이 신청할 수 있어요."
      />
      <TourForm />
    </div>
  );
}
