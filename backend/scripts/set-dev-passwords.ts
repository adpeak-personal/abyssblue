// 비밀번호가 없는 계정(소셜로만 만들어진 계정)에 개발용 비밀번호를 지정한다.
//
//   npm run db:devpw -- 비번           무엇이 바뀌는지 보여주기만
//   npm run db:devpw -- 비번 --yes     실제 적용
//
// 비밀번호에 기본값을 두지 않는다 — 이 저장소는 공개라 소스에 적힌 값은 누구나 읽는다.
//
// ⚠️ 개발 전용. 대상 DB 를 먼저 찍어주니 꼭 확인하고 --yes 를 붙일 것.
//    터널을 열어 두면 127.0.0.1 이 운영 DB 일 수도 있다.
import "dotenv/config";
import type { RowDataPacket } from "mysql2";
import { closePool, execute, query } from "../src/db/pool.js";
import { describeTarget, getDbConfig } from "../src/db/config.js";
import { hashPassword } from "../src/lib/password.js";

if (process.env.NODE_ENV === "production") {
  console.error("❌ 운영 환경에서는 실행할 수 없습니다.");
  process.exit(1);
}

const args = process.argv.slice(2);
const confirmed = args.includes("--yes");
const password = args.find((a) => !a.startsWith("--"));

if (!password) {
  console.error("❌ 비밀번호를 넘겨주세요:  npm run db:devpw -- 비번");
  console.error("   (소스에 기본값을 두지 않습니다 — 이 저장소는 공개입니다)");
  process.exit(1);
}

interface Row extends RowDataPacket {
  id: number;
  email: string;
  nickname: string;
  level: string;
}

console.log(`대상 DB: ${describeTarget(getDbConfig())}\n`);

const users = await query<Row>(
  "SELECT id, email, nickname, level FROM users WHERE password_hash = '' ORDER BY id",
);

if (users.length === 0) {
  console.log("비밀번호가 없는 계정이 없습니다.");
} else {
  for (const u of users) {
    const tag = u.level === "운영진" ? "  ← 운영진 (어드민 접근 가능)" : "";
    console.log(`   ${u.email.padEnd(28)} ${u.nickname}${tag}`);
  }
  console.log("");

  if (!confirmed) {
    console.log(`위 ${users.length}개 계정에 비밀번호를 설정합니다.`);
    console.log("대상 DB 를 확인하고, 맞으면 뒤에 --yes 를 붙여 다시 실행하세요.");
  } else {
    // 같은 비밀번호라도 해시는 계정마다 다르다 (salt 가 매번 달라서)
    for (const u of users) {
      await execute("UPDATE users SET password_hash = ? WHERE id = ?", [
        await hashPassword(password),
        u.id,
      ]);
    }
    console.log(`✅ ${users.length}개 계정에 개발용 비밀번호를 설정했습니다.`);
  }
}

await closePool();
