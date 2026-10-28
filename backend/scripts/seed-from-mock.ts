// mock 데이터를 전부 MySQL 에 넣는다.
//
//   npm run db:seed          기존 데이터 지우고 다시 넣기
//
// src/db/seed.sql 은 대표 데이터 일부만 들어 있어서, 저장소를 MySQL 로 바꾸면
// 화면이 휑해진다. 이 스크립트는 mock.ts 를 그대로 옮겨서 지금 보던 화면을 유지한다.
//
// ⚠️ 대상 테이블을 비우고 시작한다. 실제 데이터가 있는 DB 에 쓰면 안 된다.
import "dotenv/config";
import * as mock from "../src/data/mock.js";
import { closePool, getPool } from "../src/db/pool.js";

const pool = getPool();

/** DATETIME 컬럼용 — ISO 문자열을 MySQL 형식으로 */
const dt = (iso: string) => new Date(iso).toISOString().slice(0, 19).replace("T", " ");
const d = (iso: string) => iso.slice(0, 10);

async function main() {
  const conn = await pool.getConnection();
  try {
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const t of [
      "tour_participants", "tours", "dive_log_sightings", "dive_logs",
      "dive_point_water_temps", "dive_points", "uploads", "post_likes",
      "comments", "posts", "boards", "board_groups", "users",
    ]) {
      await conn.query(`TRUNCATE TABLE ${t}`);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");

    // 회원 — 비밀번호는 아직 스텁이라 빈 해시를 넣는다
    for (const u of mock.users) {
      await conn.execute(
        `INSERT INTO users (id, email, password_hash, nickname, avatar_color, level,
           cert_agency, cert_level, total_dives, bio, joined_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [u.id, u.email, "", u.nickname, u.avatarColor, u.level, u.certAgency,
         u.certLevel, u.totalDives, u.bio ?? "", d(u.joinedAt)],
      );
    }

    // 게시판 그룹 / 게시판
    for (const [gi, g] of mock.boardGroups.entries()) {
      await conn.execute(`INSERT INTO board_groups (id, name, sort_order) VALUES (?,?,?)`,
        [g.id, g.name, gi + 1]);
      for (const [bi, b] of g.boards.entries()) {
        await conn.execute(
          `INSERT INTO boards (id, group_id, slug, name, description, type, write_mode,
             high_quality, categories, icon, sort_order)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [b.id, g.id, b.slug, b.name, b.description, b.type, b.writeMode ?? "editor",
           b.highQuality ? 1 : 0, b.categories ? JSON.stringify(b.categories) : null,
           b.icon ?? null, bi + 1],
        );
      }
    }

    // 게시글 — board_id 로 변환해 넣는다
    const boardId = new Map(mock.allBoards.map((b) => [b.slug, b.id]));
    for (const p of mock.posts) {
      const bid = boardId.get(p.boardSlug);
      if (!bid) {
        console.warn(`  건너뜀: 게시글 ${p.id} — 없는 게시판 "${p.boardSlug}"`);
        continue;
      }
      await conn.execute(
        `INSERT INTO posts (id, board_id, author_id, category, title, content,
           views, likes, comment_count, is_notice, has_image, thumb_color, price, trade_status, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [p.id, bid, p.authorId, p.category ?? null, p.title, p.content, p.views, p.likes,
         p.commentCount, p.isNotice ? 1 : 0, p.hasImage ? 1 : 0, p.thumbColor ?? null,
         p.price ?? null, p.tradeStatus ?? null, dt(p.createdAt)],
      );
    }

    // 댓글 — 대댓글이 부모보다 먼저 들어가지 않게 부모 없는 것부터
    const ordered = [...mock.comments].sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));
    for (const c of ordered) {
      await conn.execute(
        `INSERT INTO comments (id, post_id, author_id, parent_id, content, likes, created_at)
         VALUES (?,?,?,?,?,?,?)`,
        [c.id, c.postId, c.authorId, c.parentId ?? null, c.content, c.likes, dt(c.createdAt)],
      );
    }

    // 다이빙 포인트 + 월별 수온
    for (const pt of mock.divePoints) {
      await conn.execute(
        `INSERT INTO dive_points (id, name, region, area, country, difficulty, depth_min, depth_max,
           visibility, best_season, entry_types, marine_life, shops, description, rating,
           review_count, lat, lng, gradient)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [pt.id, pt.name, pt.region, pt.area, pt.country, pt.difficulty, pt.depthMin, pt.depthMax,
         pt.visibility, pt.bestSeason, JSON.stringify(pt.entryType), JSON.stringify(pt.marineLife),
         JSON.stringify(pt.shops), pt.description, pt.rating, pt.reviewCount, pt.lat, pt.lng, pt.gradient],
      );
      for (const w of pt.waterTemp) {
        await conn.execute(
          `INSERT INTO dive_point_water_temps (point_id, month, temp) VALUES (?,?,?)`,
          [pt.id, w.month, w.temp],
        );
      }
    }

    // 다이브 로그 + 관찰 생물
    for (const l of mock.diveLogs) {
      await conn.execute(
        `INSERT INTO dive_logs (id, user_id, dive_no, dive_date, point_id, point_name, max_depth,
           avg_depth, bottom_time, water_temp, visibility, suit, weight, tank_start, tank_end,
           buddy, memo, rating)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [l.id, l.userId, l.diveNo, d(l.date), l.pointId ?? null, l.pointName, l.maxDepth,
         l.avgDepth, l.bottomTime, l.waterTemp, l.visibility, l.suit, l.weight, l.tankStart,
         l.tankEnd, l.buddy ?? null, l.memo, l.rating],
      );
      for (const s of new Set(l.sightings)) {
        await conn.execute(`INSERT INTO dive_log_sightings (log_id, species) VALUES (?,?)`, [l.id, s]);
      }
    }

    // 투어
    for (const t of mock.tours) {
      await conn.execute(
        `INSERT INTO tours (id, host_id, title, type, point_name, region, start_date, end_date,
           capacity, joined, price, min_cert, status, description)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [t.id, t.hostId, t.title, t.type, t.pointName, t.region, d(t.startDate), d(t.endDate),
         t.capacity, t.joined, t.price, t.minCert, t.status, t.description],
      );
    }

    const [[counts]] = await conn.query<any[]>(`
      SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM boards) boards,
             (SELECT COUNT(*) FROM posts) posts, (SELECT COUNT(*) FROM comments) comments,
             (SELECT COUNT(*) FROM dive_points) points, (SELECT COUNT(*) FROM dive_logs) logs,
             (SELECT COUNT(*) FROM tours) tours`);
    console.log("✅ 시드 완료");
    for (const [k, v] of Object.entries(counts)) console.log(`   ${k.padEnd(10)} ${v}`);
  } finally {
    conn.release();
    await closePool();
  }
}

await main();
