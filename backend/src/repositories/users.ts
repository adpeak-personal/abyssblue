// 사용자 저장소 — 현재는 인메모리 mock 배열 사용. MySQL 전환 시 이 파일만 교체.
import { users } from "../data/mock.js";
import type { User } from "../types.js";

/** 이메일을 제외한 공개 사용자 정보 */
export type PublicUser = Omit<User, "email">;

export function toPublicUser(user: User): PublicUser {
  const { email: _email, ...rest } = user;
  return rest;
}

export function findUserById(id: number): User | undefined {
  return users.find((u) => u.id === id);
}

export function findPublicUserById(id: number): PublicUser | null {
  const user = findUserById(id);
  return user ? toPublicUser(user) : null;
}

export function findUserByEmail(email: string): User | undefined {
  const target = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === target);
}

export function findUserByNickname(nickname: string): User | undefined {
  return users.find((u) => u.nickname === nickname);
}

export function createUser(data: Omit<User, "id">): User {
  const user: User = { id: nextId(), ...data };
  users.push(user);
  return user;
}

function nextId(): number {
  return users.reduce((max, u) => Math.max(max, u.id), 0) + 1;
}
