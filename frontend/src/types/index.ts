// 도메인 타입 정의 — backend/src/types.ts 와 동일한 형태를 유지할 것

export type CertAgency = "PADI" | "SSI" | "NAUI" | "CMAS" | "SDI" | "KUDA";

export type MemberLevel = "새싹" | "물방울" | "파도" | "산호" | "고래" | "운영진";

export interface User {
  id: number;
  nickname: string;
  email: string;
  avatarColor: string; // 아바타 대체용 배경색
  level: MemberLevel;
  certAgency: CertAgency;
  certLevel: string; // 예: "Advanced Open Water"
  totalDives: number;
  joinedAt: string; // ISO date
  bio?: string;
}

export type BoardType = "list" | "gallery" | "qna";

/**
 * 글 작성 방식.
 * - editor: WYSIWYG 에디터 (서식·표·본문 중간 이미지)
 * - photo : 사진 업로더 + 글 (배달앱 후기처럼 단순하게)
 *
 * 저장 포맷은 둘 다 ProseMirror JSON 으로 같다 — 읽기·앱·검색을 갈라놓지 않기 위해서다.
 */
export type WriteMode = "editor" | "photo";

export interface BoardGroup {
  id: number;
  name: string;
  boards: Board[];
}

/**
 * 목록에 뿌릴 글.
 *
 * 작성자를 글에 실어 보낸다. 예전에는 화면에서 id 로 회원을 찾았는데,
 * 그 조회가 mock 을 보고 있어서 **실제로 가입한 사람이 쓴 글이 섞이면 목록이 통째로 죽었다**.
 * 목록 API 가 이미 작성자를 함께 내려주므로 그 값을 그대로 쓴다.
 */
export type ListPost = Post & { author?: PostAuthor | null };

/** 목록에 표시되는 작성자 정보 */
export type PostAuthor = Pick<User, "id" | "nickname" | "avatarColor" | "level">;

export interface Board {
  id: number;
  slug: string;
  name: string;
  description: string;
  type: BoardType;
  /** 없으면 editor 로 본다 */
  writeMode?: WriteMode;
  /** 사진을 고화질로 보관할지 */
  highQuality?: boolean;
  categories?: string[]; // 말머리
  icon?: string;
  /** 최근 하루 안에 새 글이 올라왔는지 — 메뉴의 N 배지용 */
  hasNewPost?: boolean;
}

export interface Post {
  id: number;
  boardSlug: string;
  /** 게시판 이름 — 여러 게시판이 섞인 목록(전체글·검색·내 글)에서 쓴다 */
  boardName?: string;
  category?: string;
  title: string;
  /** 평문 — 목록 미리보기·검색용 */
  content: string;
  /** 정본 — ProseMirror JSON (에디터로 쓴 글에만) */
  contentJson?: unknown;
  /** contentJson 에서 서버가 파생·살균한 HTML — 읽기 화면은 이걸 쓴다 */
  contentHtml?: string;
  authorId: number;
  createdAt: string;
  views: number;
  likes: number;
  commentCount: number;
  isNotice?: boolean;
  hasImage?: boolean;
  /** 목록 썸네일 — 본문 첫 이미지 (없으면 thumbColor 로 대체) */
  thumbnailUrl?: string;
  /** 본문 이미지 개수 — 목록의 "+3" 배지용 */
  imageCount?: number;
  thumbColor?: string; // 갤러리형 썸네일 대체 그라디언트 키
  price?: number; // 장터
  tradeStatus?: "판매중" | "예약중" | "판매완료";
}

export interface Comment {
  id: number;
  postId: number;
  authorId: number;
  content: string;
  createdAt: string;
  likes: number;
  parentId?: number;
}

export type Region = "동해" | "남해" | "제주" | "서해" | "해외";
export type Difficulty = "초급" | "중급" | "상급";

export interface DivePoint {
  id: number;
  name: string;
  region: Region;
  area: string; // 예: 강원 고성
  country: string;
  difficulty: Difficulty;
  depthMin: number;
  depthMax: number;
  visibility: string; // 예: "10~20m"
  waterTemp: { month: number; temp: number }[];
  bestSeason: string;
  entryType: ("비치" | "보트")[];
  marineLife: string[];
  description: string;
  rating: number;
  reviewCount: number;
  lat: number;
  lng: number;
  gradient: string; // 대표 이미지 대체 그라디언트 키
  shops: string[];
}

export interface DiveLog {
  id: number;
  userId: number;
  diveNo: number;
  date: string;
  pointId: number;
  pointName: string;
  maxDepth: number;
  avgDepth: number;
  bottomTime: number; // 분
  waterTemp: number;
  visibility: number; // m
  suit: string;
  weight: number; // kg
  tankStart: number; // bar
  tankEnd: number;
  buddy?: string;
  sightings: string[];
  memo: string;
  rating: number;
}

export interface Tour {
  id: number;
  title: string;
  type: "번개" | "정기투어" | "해외투어" | "교육";
  pointName: string;
  region: Region;
  startDate: string;
  endDate: string;
  hostId: number;
  capacity: number;
  joined: number;
  price: number;
  minCert: string;
  status: "모집중" | "마감임박" | "마감";
  description: string;
}

export interface SeaCondition {
  area: string;
  waveHeight: number;
  waterTemp: number;
  wind: number;
  status: "좋음" | "보통" | "주의" | "나쁨";
}
