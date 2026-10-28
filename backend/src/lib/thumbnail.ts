// 목록 썸네일 — 글을 등록·수정할 때 **첫 이미지 하나만** 만든다.
//
// 썸네일이 쓰이는 곳은 게시판 목록과 갤러리뿐이고, 거기 뜨는 건 글의 첫 이미지다.
// 올리는 족족 만들면 사진 30장짜리 글에서 29장은 아무도 안 보는 파일이 된다.
import { makeThumb } from "./images.js";
import { getStorage, toKey, toThumbPath } from "./storage.js";
import { setThumbUrl } from "../repositories/uploads.js";

/**
 * 본문 첫 이미지의 썸네일을 준비하고, **글에 저장할 경로를 돌려준다.**
 *
 * 돌려준 값을 그대로 `posts.thumbnail_url` 에 넣는다 — 저장된 값이 곧 "실제로 있는 파일"
 * 이 되도록. 예전에는 읽을 때 경로를 썸네일 규칙으로 바꿔서 내보냈는데,
 * 생성이 실패하면 없는 파일을 가리켜 목록에 깨진 이미지가 떴다.
 *
 * 이미 있으면 다시 만들지 않는다 — 글을 고칠 때마다 만들 이유가 없다.
 * 실패하면 원본 경로를 그대로 돌려준다. 조금 무거울 뿐 화면은 멀쩡하다.
 *
 * @param storedPath 본문에 저장된 경로 (`/2026/10/12/uuid.webp`)
 */
export async function ensureThumbnail(storedPath: string): Promise<string> {
  const thumbPath = toThumbPath(storedPath);
  // webp 가 아니면 파생본을 안 만든 경우(애니메이션 GIF) — 원본을 그대로 쓴다
  if (thumbPath === storedPath) return storedPath;

  const storage = getStorage();
  const thumbKey = toKey(thumbPath);

  try {
    if (await storage.get(thumbKey)) return thumbPath;

    const source = await storage.get(toKey(storedPath));
    if (!source) return storedPath;

    const thumb = await makeThumb(source);
    await storage.put(thumbKey, thumb.body, "image/webp");

    // 청소 대상을 찾을 때 썸네일도 같이 지워져야 하므로 기록해 둔다
    await setThumbUrl(storedPath, thumbPath);
    return thumbPath;
  } catch {
    // 썸네일 하나 때문에 글 등록을 막지 않는다
    return storedPath;
  }
}
