import { Sidebar } from "@/components/layout/Sidebar";

export default function CafeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl gap-5 px-4 py-5">
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
