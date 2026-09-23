import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl">🐡</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">너무 깊이 들어왔어요</h1>
      <p className="mt-2 text-sm text-gray-500">요청하신 페이지를 찾을 수 없습니다. 천천히 상승해서 홈으로 돌아가요.</p>
      <Link href="/" className="mt-6 rounded-full bg-ocean-600 px-5 py-2.5 text-sm font-semibold text-white">홈으로</Link>
    </div>
  );
}
