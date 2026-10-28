// 게시판 하나를 비운다 — 시드로 넣은 mock 글을 걷어내고 실제 글로 채우기 위한 것.
//
//   npm run board:clear -- free              무엇이 지워지는지 보기만 (기본)
//   npm run board:clear -- free --yes        실제 삭제
//   npm run board:clear -- free qna --yes    여러 게시판 한 번에
//   npm run board:clear -- free --yes --no-backup
//
// 지우기 전에 backups/ 에 JSON 으로 받아 둔다. 되돌릴 일이 생기면 그 파일이 원본이다.
//
// 함께 사라지는 것 (외래키 CASCADE)
//   · 댓글, 좋아요, 스크랩
// 함께 끊기는 것 (ON DELETE SET NULL)
//   · 업로드 이미지의 글 연결 → 이후 `npm run uploads:gc` 가 파일까지 정리한다
//
// ⚠️ 되돌릴 수 없는 삭제다. 운영 DB 에서는 백업을 확인하고 쓸 것.
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RowDataPacket } from "mysql2";
import { closePool, execute, query, queryOne } from "../src/db/pool.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(here, "../backups");

const args = process.argv.slice(2);
const confirmed = args.includes("--yes");
const noBackup = args.includes("--no-backup");
const slugs = args.filter((a) => !a.startsWith("--"));

if (slugs.length === 0) {
  console.error("❌ 비울 게시판을 지정하세요.  예) npm run board:clear -- free");
  process.exit(1);
}

interface BoardRow extends RowDataPacket {
  id: number;
  name: string;
}

interface PostRow extends RowDataPacket {
  id: number;
  title: string;
  author: string | null;
  created_at: string;
  comments: number;
  images: number;
  deleted_at: string | null;
}

async function clearBoard(slug: string) {
  const board = await queryOne<BoardRow>("SELECT id, name FROM boards WHERE slug = ?", [slug]);
  if (!board) {
    console.log(`⚠️  '${slug}' — 그런 게시판이 없습니다.\n`);
    return 0;
  }

  const posts = await query<PostRow>(
    `SELECT p.id, p.title, u.nickname AS author, p.created_at, p.deleted_at,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments,
            (SELECT COUNT(*) FROM uploads up WHERE up.post_id = p.id) AS images
       FROM posts p
       LEFT JOIN users u ON u.id = p.author_id
      WHERE p.board_id = ?
      ORDER BY p.id`,
    [board.id],
  );

  console.log(`\n■ ${board.name} (${slug}) — 글 ${posts.length}건`);
  if (posts.length === 0) {
    console.log("  이미 비어 있습니다.");
    return 0;
  }

  console.table(
    posts.map((p) => ({
      id: p.id,
      제목: p.title.length > 30 ? p.title.slice(0, 29) + "…" : p.title,
      작성자: p.author ?? "-",
      작성일: String(p.created_at).slice(0, 10),
      댓글: Number(p.comments),
      이미지: Number(p.images),
      삭제됨: p.deleted_at ? "Y" : "",
    })),
  );

  const totals = posts.reduce(
    (acc, p) => ({ comments: acc.comments + Number(p.comments), images: acc.images + Number(p.images) }),
    { comments: 0, images: 0 },
  );
  console.log(`  함께 삭제: 댓글 ${totals.comments}건 / 이미지 연결 해제 ${totals.images}건`);

  if (!confirmed) return posts.length;

  // 지우기 전에 받아 둔다 — 삭제는 되돌릴 수 없다
  if (!noBackup) {
    const ids = posts.map((p) => p.id);
    const marks = ids.map(() => "?").join(",");
    const [fullPosts, fullComments] = await Promise.all([
      query<RowDataPacket>(`SELECT * FROM posts WHERE id IN (${marks})`, ids),
      query<RowDataPacket>(`SELECT * FROM comments WHERE post_id IN (${marks})`, ids),
    ]);

    await mkdir(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const file = path.join(BACKUP_DIR, `board-${slug}-${stamp}.json`);
    await writeFile(
      file,
      JSON.stringify({ board: { slug, name: board.name }, posts: fullPosts, comments: fullComments }, null, 2),
      "utf8",
    );
    console.log(`  백업: ${path.relative(process.cwd(), file)}`);
  }

  // 댓글·좋아요·스크랩은 외래키가 함께 지우고, 업로드는 연결만 끊긴다
  const { affectedRows } = await execute("DELETE FROM posts WHERE board_id = ?", [board.id]);
  console.log(`  ✔ ${affectedRows}건 삭제`);
  return affectedRows;
}

async function main() {
  let total = 0;
  for (const slug of slugs) total += await clearBoard(slug);

  if (total === 0) return;

  if (!confirmed) {
    console.log(`\n실제로 지우려면: npm run board:clear -- ${slugs.join(" ")} --yes`);
    return;
  }

  console.log(
    "\n✅ 완료. 글에 붙어 있던 이미지는 연결만 끊긴 상태입니다 —\n" +
      "   파일까지 지우려면 유예 시간이 지난 뒤 `npm run uploads:gc -- --yes` 를 돌리세요.",
  );
}

try {
  await main();
} finally {
  await closePool();
}
