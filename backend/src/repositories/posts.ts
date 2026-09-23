// 게시글/댓글 저장소 — 현재는 인메모리 mock 배열 사용. MySQL 전환 시 이 파일만 교체.
import { comments, posts } from "../data/mock.js";
import type { Comment, Post } from "../types.js";

export interface PostListQuery {
  boardSlug: string;
  page: number;
  size: number;
  category?: string;
  q?: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt);

export function listPostsByBoard(query: PostListQuery): Paged<Post> {
  const { boardSlug, page, size, category, q } = query;
  const keyword = q?.trim().toLowerCase();

  let filtered = posts.filter((p) => p.boardSlug === boardSlug);
  if (category) filtered = filtered.filter((p) => p.category === category);
  if (keyword) {
    filtered = filtered.filter(
      (p) => p.title.toLowerCase().includes(keyword) || p.content.toLowerCase().includes(keyword),
    );
  }

  filtered.sort(byNewest);

  // 공지 게시판에서만 공지글을 상단 고정
  if (boardSlug === "notice") {
    filtered = [...filtered.filter((p) => p.isNotice), ...filtered.filter((p) => !p.isNotice)];
  }

  const start = (page - 1) * size;
  return { items: filtered.slice(start, start + size), total: filtered.length, page, size };
}

export function listPopularPosts(limit: number): Post[] {
  return posts
    .filter((p) => !p.isNotice)
    .sort((a, b) => b.likes + b.views - (a.likes + a.views))
    .slice(0, limit);
}

export function findPostById(id: number): Post | undefined {
  return posts.find((p) => p.id === id);
}

export function createPost(data: Omit<Post, "id" | "createdAt" | "views" | "likes" | "commentCount">): Post {
  const post: Post = {
    ...data,
    id: posts.reduce((max, p) => Math.max(max, p.id), 0) + 1,
    createdAt: new Date().toISOString(),
    views: 0,
    likes: 0,
    commentCount: 0,
  };
  posts.push(post);
  return post;
}

export function listCommentsByPost(postId: number): Comment[] {
  return comments
    .filter((c) => c.postId === postId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function findCommentById(id: number): Comment | undefined {
  return comments.find((c) => c.id === id);
}

export function createComment(data: Omit<Comment, "id" | "createdAt" | "likes">): Comment {
  const comment: Comment = {
    ...data,
    id: comments.reduce((max, c) => Math.max(max, c.id), 0) + 1,
    createdAt: new Date().toISOString(),
    likes: 0,
  };
  comments.push(comment);
  const post = findPostById(data.postId);
  if (post) post.commentCount += 1;
  return comment;
}
