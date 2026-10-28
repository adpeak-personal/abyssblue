import type { Post } from "@/types";

/**
 * 게시글 본문 렌더링.
 *
 * contentHtml 은 서버(backend/src/lib/editor.ts)에서 ProseMirror JSON 으로부터
 * 파생·살균된 HTML 이다. 클라이언트가 보낸 HTML 이 여기까지 오는 경로는 없다.
 * 에디터 이전에 쓰인 더미/구 게시글은 평문이라 그대로 줄바꿈만 살려서 보여준다.
 */
export function PostBody({ post }: { post: Post }) {
  if (post.contentHtml) {
    return (
      <div className="post-content" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
    );
  }

  return (
    <div className="whitespace-pre-line text-[15px] leading-7 text-gray-800">
      {post.content || "본문 내용이 들어갈 자리입니다. (더미 데이터)"}
    </div>
  );
}
