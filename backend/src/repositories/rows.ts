// DB 행(snake_case) → 도메인 타입(camelCase) 변환.
//
// 매핑을 여기 모아두면 저장소마다 흩어지지 않고, 컬럼이 바뀔 때 한 곳만 고치면 된다.
import type { RowDataPacket } from "mysql2";
import { DB_TIMEZONE } from "../db/pool.js";
import type {
  Board,
  CertAgency,
  Comment,
  DiveLog,
  DivePoint,
  Difficulty,
  MemberLevel,
  Post,
  Region,
  SocialProvider,
  Tour,
  User,
} from "../types.js";
import type { PublicUser } from "./users.js";

/** DATETIME(문자열) → ISO. 풀이 dateStrings 라 "2026-10-08 15:04:05" 로 들어온다 */
/**
 * DATETIME → ISO 문자열.
 *
 * MySQL 이 주는 "2026-10-09 18:33:09" 는 KST 시각인데 오프셋이 없다.
 * 예전에는 여기에 "Z"(UTC)를 붙여서 내보냈고, 그러면 브라우저가 9시간 뒤로 읽어
 * 방금 쓴 글이 미래 시각이 됐다. 실제 타임존을 붙여야 한다.
 */
export const toIso = (v: string | Date) => {
  if (typeof v !== "string") return v.toISOString();
  // 이미 오프셋이 붙어 있으면 그대로 둔다
  if (/[Z+]|\d-\d\d:\d\d$/.test(v.slice(10))) return v.replace(" ", "T");
  return v.replace(" ", "T") + DB_TIMEZONE;
};

/** DATE 컬럼은 날짜만 */
export const toDate = (v: string | Date) =>
  typeof v === "string" ? v.slice(0, 10) : v.toISOString().slice(0, 10);

/** MySQL JSON 컬럼 — 드라이버가 이미 파싱해 주지만 문자열로 올 때도 있다 */
export function parseJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

const bool = (v: unknown) => v === 1 || v === true;

// ---------------------------------------------------------------------------

export interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  phone: string | null;
  provider: SocialProvider | null;
  provider_id: string | null;
  last_login_at: string | null;
  nickname: string;
  avatar_color: string;
  level: MemberLevel;
  cert_agency: CertAgency;
  cert_level: string;
  total_dives: number;
  joined_at: string;
  bio: string | null;
}

export const toUser = (r: UserRow): User => ({
  id: r.id,
  email: r.email,
  nickname: r.nickname,
  avatarColor: r.avatar_color,
  level: r.level,
  certAgency: r.cert_agency,
  certLevel: r.cert_level,
  phone: r.phone ?? undefined,
  provider: r.provider ?? undefined,
  providerId: r.provider_id ?? undefined,
  passwordHash: r.password_hash,
  totalDives: r.total_dives,
  joinedAt: toDate(r.joined_at),
  bio: r.bio ?? undefined,
});

/** 목록 조인에서 붙여 온 작성자 컬럼 (a_ 접두) */
export interface AuthorCols {
  a_id: number | null;
  a_nickname: string | null;
  a_avatar_color: string | null;
  a_level: MemberLevel | null;
  a_cert_agency: CertAgency | null;
  a_cert_level: string | null;
  a_total_dives: number | null;
  a_joined_at: string | null;
  a_bio: string | null;
}

/** 조인 결과에서 공개 작성자 정보를 꺼낸다 */
export function toAuthor(r: AuthorCols): PublicUser | null {
  if (r.a_id == null) return null;
  return {
    id: r.a_id,
    nickname: r.a_nickname ?? "",
    avatarColor: r.a_avatar_color ?? "#888",
    level: r.a_level ?? "새싹",
    certAgency: r.a_cert_agency ?? "PADI",
    certLevel: r.a_cert_level ?? "",
    totalDives: r.a_total_dives ?? 0,
    joinedAt: r.a_joined_at ? toDate(r.a_joined_at) : "",
    bio: r.a_bio ?? undefined,
  };
}

/** 작성자 조인에 쓰는 SELECT 조각 — 모든 목록 쿼리가 같은 별칭을 쓰게 */
export const AUTHOR_COLUMNS = `
  u.id AS a_id, u.nickname AS a_nickname, u.avatar_color AS a_avatar_color,
  u.level AS a_level, u.cert_agency AS a_cert_agency, u.cert_level AS a_cert_level,
  u.total_dives AS a_total_dives, u.joined_at AS a_joined_at, u.bio AS a_bio`;

// ---------------------------------------------------------------------------

export interface BoardRow extends RowDataPacket {
  id: number;
  group_id: number;
  slug: string;
  name: string;
  description: string;
  type: Board["type"];
  write_mode: "editor" | "photo";
  high_quality: number;
  categories: unknown;
  icon: string | null;
  /** 목록 조회에서만 채워진다 */
  has_new_post?: number | null;
}

export const toBoard = (r: BoardRow): Board => {
  const categories = parseJson<string[] | null>(r.categories, null);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    type: r.type,
    writeMode: r.write_mode,
    highQuality: bool(r.high_quality) || undefined,
    categories: categories?.length ? categories : undefined,
    icon: r.icon ?? undefined,
    hasNewPost: bool(r.has_new_post) || undefined,
  };
};

// ---------------------------------------------------------------------------

export interface PostRow extends RowDataPacket, Partial<AuthorCols> {
  id: number;
  board_slug: string;
  board_name?: string | null;
  /** 운영 화면은 삭제한 글도 보여 준다 */
  deleted_at?: string | null;
  author_id: number;
  category: string | null;
  title: string;
  content: string;
  content_json: unknown;
  content_html: string | null;
  thumbnail_url: string | null;
  image_count: number;
  views: number;
  likes: number;
  comment_count: number;
  is_notice: number;
  has_image: number;
  thumb_color: string | null;
  price: number | null;
  trade_status: Post["tradeStatus"] | null;
  created_at: string;
}

export const toPost = (r: PostRow): Post => ({
  id: r.id,
  boardSlug: r.board_slug,
  boardName: r.board_name ?? undefined,
  category: r.category ?? undefined,
  title: r.title,
  content: r.content,
  contentJson: parseJson<unknown>(r.content_json, undefined),
  contentHtml: r.content_html ?? undefined,
  thumbnailUrl: r.thumbnail_url ?? undefined,
  imageCount: r.image_count || undefined,
  authorId: r.author_id,
  createdAt: toIso(r.created_at),
  views: r.views,
  likes: r.likes,
  commentCount: r.comment_count,
  isNotice: bool(r.is_notice) || undefined,
  hasImage: bool(r.has_image) || undefined,
  thumbColor: r.thumb_color ?? undefined,
  price: r.price ?? undefined,
  tradeStatus: r.trade_status ?? undefined,
});

export interface CommentRow extends RowDataPacket, Partial<AuthorCols> {
  id: number;
  post_id: number;
  author_id: number;
  parent_id: number | null;
  content: string;
  likes: number;
  created_at: string;
}

export const toComment = (r: CommentRow): Comment => ({
  id: r.id,
  postId: r.post_id,
  authorId: r.author_id,
  parentId: r.parent_id ?? undefined,
  content: r.content,
  likes: r.likes,
  createdAt: toIso(r.created_at),
});

// ---------------------------------------------------------------------------

export interface PointRow extends RowDataPacket {
  id: number;
  name: string;
  region: Region;
  area: string;
  country: string;
  difficulty: Difficulty;
  depth_min: string | number;
  depth_max: string | number;
  visibility: string;
  best_season: string;
  entry_types: unknown;
  marine_life: unknown;
  shops: unknown;
  description: string;
  rating: string | number;
  review_count: number;
  lat: string | number;
  lng: string | number;
  gradient: string;
}

/** DECIMAL 은 드라이버가 문자열로 준다 — 도메인 타입이 number 라 변환 */
const num = (v: string | number) => (typeof v === "number" ? v : Number(v));

export const toPoint = (r: PointRow, waterTemp: DivePoint["waterTemp"]): DivePoint => ({
  id: r.id,
  name: r.name,
  region: r.region,
  area: r.area,
  country: r.country,
  difficulty: r.difficulty,
  depthMin: num(r.depth_min),
  depthMax: num(r.depth_max),
  visibility: r.visibility,
  bestSeason: r.best_season,
  entryType: parseJson<DivePoint["entryType"]>(r.entry_types, []),
  marineLife: parseJson<string[]>(r.marine_life, []),
  shops: parseJson<string[]>(r.shops, []),
  description: r.description,
  rating: num(r.rating),
  reviewCount: r.review_count,
  lat: num(r.lat),
  lng: num(r.lng),
  gradient: r.gradient,
  waterTemp,
});

export interface LogRow extends RowDataPacket {
  id: number;
  user_id: number;
  dive_no: number;
  dive_date: string;
  point_id: number | null;
  point_name: string;
  max_depth: string | number;
  avg_depth: string | number;
  bottom_time: number;
  water_temp: string | number;
  visibility: string | number;
  suit: string;
  weight: string | number;
  tank_start: number;
  tank_end: number;
  buddy: string | null;
  dive_time: string | null;
  entry_type: DiveLog["entryType"] | null;
  current: DiveLog["current"] | null;
  weather: DiveLog["weather"] | null;
  waves: DiveLog["waves"] | null;
  tank: string | null;
  is_public: number;
  memo: string;
  rating: number;
}

export const toLog = (r: LogRow, sightings: string[]): DiveLog => ({
  id: r.id,
  userId: r.user_id,
  diveNo: r.dive_no,
  date: toDate(r.dive_date),
  // 스키마상 포인트는 지워질 수 있어(ON DELETE SET NULL) NULL 이 올 수 있다.
  // 도메인 타입은 number 라 0 으로 둔다 — point_name 이 비정규화돼 있어 표시에는 지장 없다.
  pointId: r.point_id ?? 0,
  pointName: r.point_name,
  maxDepth: num(r.max_depth),
  avgDepth: num(r.avg_depth),
  bottomTime: r.bottom_time,
  waterTemp: num(r.water_temp),
  visibility: num(r.visibility),
  suit: r.suit,
  weight: num(r.weight),
  tankStart: r.tank_start,
  tankEnd: r.tank_end,
  buddy: r.buddy ?? undefined,
  // TIME 은 "10:30:00" 으로 오는데 화면은 분까지만 쓴다
  diveTime: r.dive_time ? String(r.dive_time).slice(0, 5) : undefined,
  entryType: r.entry_type ?? undefined,
  current: r.current ?? undefined,
  weather: r.weather ?? undefined,
  waves: r.waves ?? undefined,
  tank: r.tank ?? undefined,
  isPublic: bool(r.is_public),
  memo: r.memo,
  rating: r.rating,
  sightings,
});

export interface TourRow extends RowDataPacket {
  id: number;
  host_id: number;
  title: string;
  type: Tour["type"];
  point_name: string;
  region: Region;
  start_date: string;
  end_date: string;
  capacity: number;
  joined: number;
  price: number;
  min_cert: string;
  status: Tour["status"];
  description: string;
}

export const toTour = (r: TourRow): Tour => ({
  id: r.id,
  hostId: r.host_id,
  title: r.title,
  type: r.type,
  pointName: r.point_name,
  region: r.region,
  startDate: toDate(r.start_date),
  endDate: toDate(r.end_date),
  capacity: r.capacity,
  joined: r.joined,
  price: r.price,
  minCert: r.min_cert,
  status: r.status,
  description: r.description,
});
