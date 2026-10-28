// 운영진 계정을 만든다 (없을 때만).
//
//   npm run db:admins                               보여주기만
//   ADMIN_PASSWORD='...' npm run db:admins -- --yes 실제 생성
//
// 비밀번호는 ADMIN_PASSWORD 로만 받는다 — 소스에 기본값을 두지 않는다.
//
// 다른 DB 를 대상으로 하려면 환경변수를 바꿔서 실행한다. 예)
//   DB_HOST=127.0.0.1 DB_PORT=13306 DB_USER=abyssblue DB_PASSWORD=... npm run db:admins -- --yes
//
// 이미 있는 계정은 **건드리지 않는다** — 비밀번호를 말없이 덮어쓰면
// 쓰고 있던 사람이 갑자기 못 들어간다. 바꿔야 하면 어드민 회원 관리에서 하거나
// `--reset-password` 를 붙인다.
import "dotenv/config";
import type { RowDataPacket } from "mysql2";
import { closePool, execute, query, queryOne } from "../src/db/pool.js";
import { describeTarget, getDbConfig } from "../src/db/config.js";
import { hashPassword } from "../src/lib/password.js";
import { allowedAdminEmails } from "../src/lib/reserved-email.js";

const args = process.argv.slice(2);
const confirmed = args.includes("--yes");
const resetPassword = args.includes("--reset-password");

/**
 * 계정 비밀번호 — ADMIN_PASSWORD 로만 받는다.
 *
 * 기본값을 두지 않는 이유: 이 저장소는 공개라 소스에 적힌 값은 누구나 읽는다.
 * 기본값이 있으면 그 값으로 계정이 만들어지고, 바꾸기 전까지 누구나 들어온다.
 */
function requirePassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (pw) return pw;
  console.error("ADMIN_PASSWORD 가 없습니다. 비밀번호를 환경변수로 넘겨주세요:");
  console.error("     ADMIN_PASSWORD='...' npm run db:admins -- --yes");
  console.error("   (소스에 기본값을 두지 않습니다 — 이 저장소는 공개입니다)");
  process.exit(1);
}

interface AdminSpec {
  email: string;
  nickname: string;
  /** 숫자만. 한 사람만 가진다 — users.phone 이 유일값이라 나눠 쓸 수 없다 */
  phone?: string;
}

/**
 * 닉네임에 번호가 붙는 이유 — `users.nickname` 이 유일값이다.
 * 글·댓글마다 닉네임이 보이는데 같은 이름이 여럿이면 누가 누군지 구분되지 않는다.
 */
const ADMINS: AdminSpec[] = [
  { email: "abyssblue_yeom@abyssblue.com", nickname: "블루매니저", phone: "01040590011" },
  { email: "admin@abyssblue.com", nickname: "블루매니저2" },
  { email: "abyssblue_yeom@abyssblue.co.kr", nickname: "블루매니저3" },
  { email: "admin@abyssblue.co.kr", nickname: "블루매니저4" },
];

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  nickname: string;
  level: string;
  phone: string | null;
}

/** 넷 다 운영진으로 만든다 — 어드민에 들어갈 계정이라는 뜻으로 받았다 */
const LEVEL = "운영진";
const CERT_AGENCY = "PADI";
const CERT_LEVEL = "Course Director";
const AVATAR_COLOR = "#0e7490";

async function main() {
  console.log(`대상 DB: ${describeTarget(getDbConfig())}\n`);

  // 실제로 쓸 때만 필요하다 — 보여주기만 할 때는 비밀번호 없이도 돌아야 한다
  if (confirmed || resetPassword) requirePassword();

  // 허용 목록과 어긋나면 만들어도 나중에 가입 규칙에 막힌다 — 미리 알려준다
  const allowed = new Set(allowedAdminEmails());
  const missing = ADMINS.filter((a) => !allowed.has(a.email));
  if (missing.length > 0) {
    console.log("⚠️  아래 주소가 lib/reserved-email.ts 의 허용 목록에 없습니다:");
    for (const a of missing) console.log(`     ${a.email}`);
    console.log("");
  }

  const rows: Record<string, string>[] = [];
  const toCreate: AdminSpec[] = [];
  const existing: { spec: AdminSpec; row: UserRow }[] = [];

  for (const spec of ADMINS) {
    const found = await queryOne<UserRow>("SELECT * FROM users WHERE email = ?", [spec.email]);
    if (found) {
      existing.push({ spec, row: found });
      rows.push({
        이메일: spec.email,
        상태: "이미 있음",
        닉네임: found.nickname,
        등급: found.level,
        번호: found.phone ? "있음" : "-",
      });
    } else {
      toCreate.push(spec);
      rows.push({
        이메일: spec.email,
        상태: "새로 만듦",
        닉네임: spec.nickname,
        등급: LEVEL,
        번호: spec.phone ? spec.phone : "-",
      });
    }
  }
  console.table(rows);

  // 닉네임·번호가 다른 사람에게 이미 쓰이고 있으면 INSERT 가 터진다 — 먼저 잡는다
  for (const spec of toCreate) {
    const nick = await queryOne<UserRow>("SELECT id, email FROM users WHERE nickname = ?", [spec.nickname]);
    if (nick) {
      console.error(`❌ 닉네임 "${spec.nickname}" 을(를) 이미 ${nick.email} 가 쓰고 있습니다.`);
      process.exit(1);
    }
    if (spec.phone) {
      const ph = await queryOne<UserRow>("SELECT id, email FROM users WHERE phone = ?", [spec.phone]);
      if (ph) {
        console.error(`❌ 번호 ${spec.phone} 을(를) 이미 ${ph.email} 가 쓰고 있습니다.`);
        process.exit(1);
      }
    }
  }

  if (toCreate.length === 0 && !resetPassword) {
    console.log("✅ 네 계정이 모두 있습니다. 만들 것이 없습니다.");
    return;
  }

  if (!confirmed) {
    console.log(`\n실제로 만들려면: npm run db:admins -- --yes`);
    if (existing.length > 0) {
      console.log("(이미 있는 계정의 비밀번호까지 맞추려면 --reset-password 를 함께)");
    }
    return;
  }

  console.log("");
  const hash = await hashPassword(requirePassword());
  const today = new Date().toISOString().slice(0, 10);

  for (const spec of toCreate) {
    await execute(
      `INSERT INTO users (email, password_hash, nickname, avatar_color, level,
         cert_agency, cert_level, total_dives, bio, phone, joined_at)
       VALUES (?,?,?,?,?,?,?,0,'',?,?)`,
      [spec.email, hash, spec.nickname, AVATAR_COLOR, LEVEL, CERT_AGENCY, CERT_LEVEL, spec.phone ?? null, today],
    );
    console.log(`  ✔ 생성 ${spec.email} (${spec.nickname})`);
  }

  if (resetPassword) {
    for (const { spec, row } of existing) {
      await execute("UPDATE users SET password_hash = ? WHERE id = ?", [hash, row.id]);
      console.log(`  ✔ 비밀번호 재설정 ${spec.email}`);
    }
  }

  // 혹시 등급이 내려가 있으면 올려 둔다 — 어드민에 들어가야 하는 계정이다
  const fixed = await execute(
    `UPDATE users SET level = ? WHERE email IN (${ADMINS.map(() => "?").join(",")}) AND level <> ?`,
    [LEVEL, ...ADMINS.map((a) => a.email), LEVEL],
  );
  if (fixed.affectedRows > 0) console.log(`  ✔ 등급 ${LEVEL} 로 올림 ${fixed.affectedRows}건`);

  console.log("\n=== 결과 ===");
  console.table(
    await query<UserRow>(
      `SELECT id, email, nickname, level, phone FROM users
        WHERE email IN (${ADMINS.map(() => "?").join(",")}) ORDER BY id`,
      ADMINS.map((a) => a.email),
    ),
  );
  console.log(
    "\n넷 다 같은 비밀번호로 만들어졌습니다. 운영 계정이면 각자 바꾸게 하세요.",
  );
}

try {
  await main();
} finally {
  await closePool();
}
