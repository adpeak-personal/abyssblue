// 회원 관리 (운영진) + 신고 접수·처리 + 알림 + 내 프로필 수정.
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { idParamSchema, notFound, optionalQuery } from "../lib/http.js";
import { LEVEL_RULES } from "../lib/levels.js";
import {
  findMember,
  listMembers,
  releaseExpiredSuspensions,
  setLevel,
  setStatus,
  type MemberStatus,
} from "../repositories/members.js";
import { getActivity, refreshAllLevels } from "../repositories/levels.js";
import {
  countPending,
  createReport,
  handleReport,
  listReports,
  REPORT_REASONS,
  type ReportStatus,
} from "../repositories/reports.js";
import {
  countUnread,
  listNotifications,
  markRead,
  notify,
} from "../repositories/notifications.js";
import {
  findCommentById,
  findPostById,
  listPostsForAdmin,
  moveToBoard,
  restorePost,
  setNotice,
  softDeletePost,
  SEARCH_SCOPES,
  type SearchScope,
} from "../repositories/posts.js";
import { unlinkUploadsOfPost } from "../repositories/uploads.js";
import { forResponse } from "./posts.js";
import { findUserById, findUserByNickname, updateProfile } from "../repositories/users.js";

const LEVELS = ["새싹", "물방울", "파도", "산호", "고래", "운영진"] as const;
const STATUSES = ["활동", "정지", "탈퇴"] as const;

const memberQuerySchema = z.object({
  q: optionalQuery(z.string()),
  level: optionalQuery(z.enum(LEVELS)),
  status: optionalQuery(z.enum(STATUSES)),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(30),
});

const levelSchema = z.object({ level: z.enum(LEVELS) });

const statusSchema = z.object({
  status: z.enum(STATUSES),
  /** 정지일 때만 의미가 있다. 없으면 무기한 */
  days: z.number().int().min(1).max(3650).optional(),
  reason: z.string().trim().max(200).optional(),
});

const adminPostQuerySchema = z.object({
  boardSlug: optionalQuery(z.string()),
  q: optionalQuery(z.string()),
  scope: optionalQuery(z.enum(SEARCH_SCOPES as [SearchScope, ...SearchScope[]])),
  includeDeleted: optionalQuery(z.coerce.boolean()),
  onlyNotice: optionalQuery(z.coerce.boolean()),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(30),
});

const reportSchema = z.object({
  targetType: z.enum(["post", "comment", "user"]),
  targetId: z.number().int().positive(),
  reason: z.enum(REPORT_REASONS),
  detail: z.string().trim().max(500).optional(),
});

const reportQuerySchema = z.object({
  status: optionalQuery(z.enum(["접수", "처리완료", "반려"])),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(30),
});

const handleSchema = z.object({
  status: z.enum(["처리완료", "반려"]),
  memo: z.string().trim().max(300).optional(),
});

const profileSchema = z.object({
  nickname: z.string().trim().min(2).max(20).optional(),
  certAgency: z.enum(["PADI", "SSI", "NAUI", "CMAS", "SDI", "KUDA"]).optional(),
  certLevel: z.string().trim().min(1).max(100).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "색상은 #rrggbb 형식이어야 합니다.")
    .optional(),
});

export const memberRoutes: FastifyPluginAsync = async (app) => {
  // ── 운영진: 회원 관리 ────────────────────────────────────────────────
  app.get("/admin/members", { onRequest: app.requireAdmin }, async (req) => {
    // 목록을 열 때 기간이 지난 정지를 먼저 풀어 준다 —
    // 따로 돌리는 작업을 만드는 것보다 단순하고, 운영진이 보는 값이 항상 최신이 된다
    await releaseExpiredSuspensions();
    return listMembers(memberQuerySchema.parse(req.query));
  });

  app.get("/admin/members/:id", { onRequest: app.requireAdmin }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const member = await findMember(id);
    if (!member) return notFound(reply, "회원을 찾을 수 없습니다.");
    return { ...member, activity: await getActivity(id) };
  });

  app.patch("/admin/members/:id/level", { onRequest: app.requireAdmin }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const { level } = levelSchema.parse(req.body);

    const member = await findMember(id);
    if (!member) return notFound(reply, "회원을 찾을 수 없습니다.");

    await setLevel(id, level);
    void notify({
      userId: id,
      type: "운영",
      message: `등급이 ${level} 로 변경되었습니다.`,
      link: "/mypage",
    }).catch(() => {});

    return findMember(id);
  });

  app.patch("/admin/members/:id/status", { onRequest: app.requireAdmin }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const body = statusSchema.parse(req.body);

    const member = await findMember(id);
    if (!member) return notFound(reply, "회원을 찾을 수 없습니다.");

    // 마지막 운영진까지 막아 버리면 아무도 어드민에 못 들어온다
    if (member.level === "운영진" && body.status !== "활동") {
      return reply.code(400).send({ message: "운영진은 먼저 등급을 내린 뒤 처리해 주세요." });
    }
    if (member.id === req.authUser!.id) {
      return reply.code(400).send({ message: "본인 계정은 변경할 수 없습니다." });
    }

    await setStatus(id, body);
    if (body.status !== "활동") {
      void notify({
        userId: id,
        type: "운영",
        message:
          body.status === "정지"
            ? `계정이 정지되었습니다.${body.reason ? ` (${body.reason})` : ""}`
            : "계정이 탈퇴 처리되었습니다.",
        link: "/",
      }).catch(() => {});
    }

    return findMember(id);
  });

  /** 승급 규칙과 전체 재계산 — 규칙을 바꿨을 때 한 번에 맞춘다 */
  app.get("/admin/levels", { onRequest: app.requireAdmin }, async () => ({
    rules: LEVEL_RULES.map((r) => ({ level: r.level, label: r.label })),
  }));

  app.post("/admin/levels/refresh", { onRequest: app.requireAdmin }, async () => {
    const promotions = await refreshAllLevels();
    for (const p of promotions) {
      void notify({
        userId: p.userId,
        type: "운영",
        message: `축하합니다! 등급이 ${p.to} 로 올라갔어요.`,
        link: "/mypage",
      }).catch(() => {});
    }
    return { promoted: promotions.length, promotions };
  });

  // ── 운영진: 게시글 관리 ──────────────────────────────────────────────
  app.get("/admin/posts", { onRequest: app.requireAdmin }, async (req) => {
    const q = adminPostQuerySchema.parse(req.query);
    const paged = await listPostsForAdmin(q);
    return { ...paged, items: paged.items.map(forResponse) };
  });

  /** 공지 지정·해제 — 글쓴이는 할 수 없고 운영진만 */
  app.patch("/admin/posts/:id/notice", { onRequest: app.requireAdmin }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const { isNotice } = z.object({ isNotice: z.boolean() }).parse(req.body);
    if (!(await setNotice(id, isNotice))) return notFound(reply, "게시글을 찾을 수 없습니다.");
    return { ok: true, isNotice };
  });

  /** 게시판 이동 — 엉뚱한 게시판에 올라온 글을 옮긴다 */
  app.patch("/admin/posts/:id/board", { onRequest: app.requireAdmin }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const { boardSlug } = z.object({ boardSlug: z.string().min(1) }).parse(req.body);
    if (!(await moveToBoard(id, boardSlug))) {
      return notFound(reply, "게시글 또는 게시판을 찾을 수 없습니다.");
    }
    return { ok: true, boardSlug };
  });

  /** 운영진 삭제 — 글쓴이에게 알린다 (갑자기 사라지면 당황스럽다) */
  app.delete("/admin/posts/:id", { onRequest: app.requireAdmin }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const { reason } = z.object({ reason: z.string().trim().max(200).optional() }).parse(
      req.body ?? {},
    );

    const post = await findPostById(id);
    if (!post) return notFound(reply, "게시글을 찾을 수 없습니다.");

    await softDeletePost(id);
    await unlinkUploadsOfPost(id);

    if (post.authorId !== req.authUser!.id) {
      void notify({
        userId: post.authorId,
        type: "운영",
        message: `운영진이 회원님의 글을 삭제했습니다: ${post.title}${reason ? ` (${reason})` : ""}`,
        link: "/mypage",
      }).catch(() => {});
    }
    return reply.code(204).send();
  });

  /** 되살리기 — 실수로 지웠거나 신고가 반려됐을 때 */
  app.post("/admin/posts/:id/restore", { onRequest: app.requireAdmin }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    if (!(await restorePost(id))) return notFound(reply, "되살릴 글을 찾을 수 없습니다.");
    return { ok: true };
  });

  // ── 신고 ────────────────────────────────────────────────────────────
  app.post("/reports", { onRequest: app.requireAuth }, async (req, reply) => {
    const body = reportSchema.parse(req.body);
    const reporterId = req.authUser!.id;

    // 있는 대상인지, 자기 것을 신고하는 건 아닌지 확인한다
    let ownerId: number | undefined;
    if (body.targetType === "post") ownerId = (await findPostById(body.targetId))?.authorId;
    else if (body.targetType === "comment") ownerId = (await findCommentById(body.targetId))?.authorId;
    else ownerId = (await findUserById(body.targetId))?.id;

    if (ownerId === undefined) return notFound(reply, "신고 대상을 찾을 수 없습니다.");
    if (ownerId === reporterId) {
      return reply.code(400).send({ message: "본인의 글은 신고할 수 없습니다." });
    }

    const created = await createReport({ ...body, reporterId });
    if (!created) return reply.code(409).send({ message: "이미 신고한 대상입니다." });

    return reply.code(201).send({ ok: true });
  });

  app.get("/admin/reports", { onRequest: app.requireAdmin }, async (req) => {
    const { status, page, size } = reportQuerySchema.parse(req.query);
    return listReports(status as ReportStatus | undefined, page, size);
  });

  app.get("/admin/reports/pending", { onRequest: app.requireAdmin }, async () => ({
    pending: await countPending(),
  }));

  app.patch("/admin/reports/:id", { onRequest: app.requireAdmin }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const { status, memo } = handleSchema.parse(req.body);
    const ok = await handleReport(id, status, req.authUser!.id, memo);
    if (!ok) return notFound(reply, "신고를 찾을 수 없습니다.");
    return { ok: true };
  });

  // ── 알림 ────────────────────────────────────────────────────────────
  app.get("/me/notifications", { onRequest: app.requireAuth }, async (req) => {
    const userId = req.authUser!.id;
    const [items, unread] = await Promise.all([listNotifications(userId), countUnread(userId)]);
    return { items, unread };
  });

  /** 헤더 뱃지용 — 목록까지 받아올 필요가 없다 */
  app.get("/me/notifications/unread", { onRequest: app.requireAuth }, async (req) => ({
    unread: await countUnread(req.authUser!.id),
  }));

  app.post("/me/notifications/read", { onRequest: app.requireAuth }, async (req) => {
    const { id } = z.object({ id: z.number().int().positive().optional() }).parse(req.body ?? {});
    return { read: await markRead(req.authUser!.id, id) };
  });

  // ── 내 프로필 ───────────────────────────────────────────────────────
  app.patch("/me/profile", { onRequest: app.requireAuth }, async (req, reply) => {
    const body = profileSchema.parse(req.body);
    const userId = req.authUser!.id;

    if (body.nickname) {
      const taken = await findUserByNickname(body.nickname);
      if (taken && taken.id !== userId) {
        return reply.code(409).send({ message: "이미 사용 중인 닉네임입니다." });
      }
    }

    const updated = await updateProfile(userId, body);
    if (!updated) return notFound(reply, "회원을 찾을 수 없습니다.");

    // 닉네임이 바뀌면 토큰에 담긴 값도 갱신해야 헤더 표시가 따라온다
    if (body.nickname) {
      app.issueToken(reply, {
        id: updated.id,
        nickname: updated.nickname,
        level: updated.level,
      });
    }
    return updated;
  });
};

export type { MemberStatus };
