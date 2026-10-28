import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { PageTitle } from "@/components/ui";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "프로필 수정" };

export default async function ProfileEditPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/login?next=/mypage/edit");

  return (
    <div>
      <PageTitle title="프로필 수정" desc="다른 다이버에게 보이는 정보를 바꿉니다." />
      <ProfileForm me={me} />
    </div>
  );
}
