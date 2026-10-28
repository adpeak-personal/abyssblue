// 시드로 넣은 회원들에게 개발용 비밀번호를 지정한다.
//
//   npm run db:devpw            기본 비밀번호(abyss1234) 적용
//   npm run db:devpw -- 비번     직접 지정
//
// ⚠️ 개발 전용. 운영 DB 에서 절대 실행하지 말 것.
import "dotenv/config";
import type { RowDataPacket } from "mysql2";
import { closePool, execute, query } from "../src/db/pool.js";
import { hashPassword } from "../src/lib/password.js";

if (process.env.NODE_ENV === "production") {
  console.error("❌ 운영 환경에서는 실행할 수 없습니다.");
  process.exit(1);
}

const password = process.argv[2] ?? "abyss1234";

interface Row extends RowDataPacket {
  id: number;
  email: string;
  nickname: string;
  level: string;
}

const users = await query<Row>(
  "SELECT id, email, nickname, level FROM users WHERE password_hash = '' ORDER BY id",
);

if (users.length === 0) {
  console.log("비밀번호가 없는 계정이 없습니다.");
} else {
  // 같은 비밀번호라도 해시는 계정마다 다르다 (salt 가 매번 달라서)
  for (const u of users) {
    await execute("UPDATE users SET password_hash = ? WHERE id = ?", [
      await hashPassword(password),
      u.id,
    ]);
  }
  console.log(`✅ ${users.length}개 계정에 개발용 비밀번호를 설정했습니다: "${password}"\n`);
  for (const u of users) {
    const tag = u.level === "운영진" ? "  ← 운영진 (어드민 접근 가능)" : "";
    console.log(`   ${u.email.padEnd(28)} ${u.nickname}${tag}`);
  }
}

await closePool();
