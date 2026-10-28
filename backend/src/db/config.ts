// MySQL 접속 설정.
//
// 두 가지 방식을 지원한다:
//   1) DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME  ← 권장
//   2) DATABASE_URL=mysql://user:pass@host:port/db
//
// 1번을 권하는 이유: 비밀번호에 # @ : / 같은 문자가 있으면 URL 방식은 깨진다.
// (특히 `#` 은 URL 프래그먼트 시작이라 뒤가 통째로 잘린다.)
// 개별 변수로 주면 인코딩을 신경 쓸 필요가 없다.
import type { ConnectionOptions } from "mysql2/promise";

export class DbConfigError extends Error {}

export function getDbConfig(env: NodeJS.ProcessEnv = process.env): ConnectionOptions {
  // 개별 변수가 하나라도 있으면 그쪽을 쓴다 — 비밀번호를 날것 그대로 넣을 수 있다
  if (env.DB_HOST || env.DB_USER || env.DB_NAME) {
    if (!env.DB_NAME) throw new DbConfigError("DB_NAME 이 없습니다.");
    return {
      host: env.DB_HOST ?? "localhost",
      port: Number(env.DB_PORT ?? 3306),
      user: env.DB_USER ?? "root",
      password: env.DB_PASSWORD ?? "",
      database: env.DB_NAME,
      charset: "utf8mb4",
    };
  }

  const url = env.DATABASE_URL;
  if (!url) {
    throw new DbConfigError(
      "DB 설정이 없습니다. backend/.env 에 DB_HOST/DB_USER/DB_PASSWORD/DB_NAME 또는 DATABASE_URL 을 넣어주세요.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new DbConfigError("DATABASE_URL 형식이 올바르지 않습니다.");
  }

  const password = decodeURIComponent(parsed.password);
  const database = parsed.pathname.replace(/^\//, "");
  if (!database) throw new DbConfigError("DATABASE_URL 에 DB 이름이 없습니다.");

  // `#` 을 인코딩하지 않으면 URL 파서가 뒤를 fragment 로 잘라낸다 — 조용히 틀린 비밀번호가 된다
  if (parsed.hash) {
    throw new DbConfigError(
      "DATABASE_URL 에 '#' 이 인코딩되지 않은 채 들어 있습니다. " +
        "비밀번호의 '#' 은 %23 으로 바꾸거나, DB_PASSWORD 변수를 쓰세요.",
    );
  }

  return {
    host: parsed.hostname || "localhost",
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username) || "root",
    password,
    database,
    charset: "utf8mb4",
  };
}

/** 로그용 — 비밀번호는 절대 찍지 않는다 */
export function describeTarget(config: ConnectionOptions) {
  return `${config.user}@${config.host}:${config.port}/${config.database}`;
}
