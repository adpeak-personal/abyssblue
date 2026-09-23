import { LogForm } from "./LogForm";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "새 로그 기록" };

export default function NewLogPage() {
  return (
    <div>
      <PageTitle title="새 다이빙 로그" desc="다이빙 직후 기억이 생생할 때 기록하세요. 다이브 컴퓨터 연동은 추후 지원 예정입니다." />
      <LogForm />
    </div>
  );
}
