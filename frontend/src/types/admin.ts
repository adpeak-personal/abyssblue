// 어드민 API 응답 타입 — backend/src/routes/admin.ts 와 형태를 맞출 것
import type { Board, BoardGroup, BoardType, User } from "./index";

export type PublicUser = Omit<User, "email">;

export interface AdminStats {
  totals: {
    users: number;
    posts: number;
    comments: number;
    boards: number;
    uploadFiles: number;
    uploadBytes: number;
  };
  recent7d: { posts: number; comments: number; users: number };
  byBoard: { slug: string; name: string; type: BoardType; postCount: number }[];
  recentPosts: {
    id: number;
    boardSlug: string;
    title: string;
    createdAt: string;
    commentCount: number;
    author?: PublicUser;
  }[];
  recentUsers: PublicUser[];
}

export type AdminBoard = Board & { postCount: number };
export type AdminBoardGroup = Omit<BoardGroup, "boards"> & { boards: AdminBoard[] };
