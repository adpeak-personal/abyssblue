// 사용자 저장소 (MySQL)
import { execute, query, queryOne } from "../db/pool.js";
import type { SocialProvider, User } from "../types.js";
import { toUser, type UserRow } from "./rows.js";

/** 이메일을 제외한 공개 사용자 정보 */
export type PublicUser = Omit<User, "email" | "phone" | "passwordHash" | "provider" | "providerId">;

/** 응답에 나가면 안 되는 필드를 떼어낸다 */
export function toPublicUser(user: User): PublicUser {
  const {
    email: _email,
    phone: _phone,
    passwordHash: _hash,
    provider: _provider,
    providerId: _providerId,
    ...rest
  } = user;
  return rest;
}

const SELECT = "SELECT * FROM users";

export async function findUserById(id: number): Promise<User | undefined> {
  const row = await queryOne<UserRow>(`${SELECT} WHERE id = ?`, [id]);
  return row ? toUser(row) : undefined;
}

export async function findPublicUserById(id: number): Promise<PublicUser | null> {
  const user = await findUserById(id);
  return user ? toPublicUser(user) : null;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const row = await queryOne<UserRow>(`${SELECT} WHERE email = ?`, [email.trim().toLowerCase()]);
  return row ? toUser(row) : undefined;
}

/** 여러 명을 한 번에 — 목록에 작성자/주최자를 붙일 때 쓴다 (N+1 방지) */
export async function findPublicUsersByIds(ids: number[]): Promise<Map<number, PublicUser>> {
  const map = new Map<number, PublicUser>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return map;

  const rows = await query<UserRow>(
    `${SELECT} WHERE id IN (${unique.map(() => "?").join(",")})`,
    unique,
  );
  for (const r of rows) map.set(r.id, toPublicUser(toUser(r)));
  return map;
}

export async function findUserByNickname(nickname: string): Promise<User | undefined> {
  const row = await queryOne<UserRow>(`${SELECT} WHERE nickname = ?`, [nickname]);
  return row ? toUser(row) : undefined;
}

export async function listUsers(): Promise<User[]> {
  const rows = await query<UserRow>(`${SELECT} ORDER BY id`);
  return rows.map(toUser);
}

export async function createUser(data: Omit<User, "id">): Promise<User> {
  const { insertId } = await execute(
    `INSERT INTO users (email, password_hash, phone, nickname, avatar_color, level,
       cert_agency, cert_level, total_dives, bio, joined_at, provider, provider_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      data.email.trim().toLowerCase(),
      data.passwordHash ?? "",
      data.phone ?? null,
      data.nickname,
      data.avatarColor,
      data.level,
      data.certAgency,
      data.certLevel,
      data.totalDives,
      data.bio ?? "",
      data.joinedAt.slice(0, 10),
      data.provider ?? null,
      data.providerId ?? null,
    ],
  );
  const created = await findUserById(insertId);
  if (!created) throw new Error("사용자 생성 후 조회에 실패했습니다.");
  return created;
}

/** 소셜 계정으로 로그인한 사람 찾기 */
export async function findUserByProvider(
  provider: SocialProvider,
  providerId: string,
): Promise<User | undefined> {
  const row = await queryOne<UserRow>(`${SELECT} WHERE provider = ? AND provider_id = ?`, [
    provider,
    providerId,
  ]);
  return row ? toUser(row) : undefined;
}

/**
 * 기존 계정에 소셜 계정을 연결한다.
 *
 * 이메일로 이미 가입한 사람이 나중에 카카오로 들어오면 새 계정을 만드는 대신 묶는다 —
 * 그래야 글·댓글이 두 계정으로 갈리지 않는다.
 */
export async function linkProvider(id: number, provider: SocialProvider, providerId: string) {
  await execute("UPDATE users SET provider = ?, provider_id = ? WHERE id = ?", [
    provider,
    providerId,
    id,
  ]);
}

export interface ProfilePatch {
  nickname?: string;
  certAgency?: User["certAgency"];
  certLevel?: string;
  bio?: string;
  avatarColor?: string;
}

/** 본인이 고칠 수 있는 항목만 — 등급·상태는 운영진 전용이라 여기 없다 */
export async function updateProfile(id: number, patch: ProfilePatch): Promise<User | undefined> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const put = (col: string, v: unknown) => {
    sets.push(`${col} = ?`);
    params.push(v);
  };

  if (patch.nickname !== undefined) put("nickname", patch.nickname);
  if (patch.certAgency !== undefined) put("cert_agency", patch.certAgency);
  if (patch.certLevel !== undefined) put("cert_level", patch.certLevel);
  if (patch.bio !== undefined) put("bio", patch.bio);
  if (patch.avatarColor !== undefined) put("avatar_color", patch.avatarColor);

  if (sets.length === 0) return findUserById(id);

  params.push(id);
  await execute(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params);
  return findUserById(id);
}

export async function updatePasswordHash(id: number, hash: string) {
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [hash, id]);
}

export async function touchLastLogin(id: number) {
  await execute("UPDATE users SET last_login_at = NOW() WHERE id = ?", [id]);
}
