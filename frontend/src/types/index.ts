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
  region: string;
  bio?: string;
}

export type BoardType = "list" | "gallery" | "qna";

export interface BoardGroup {
  id: number;
  name: string;
  boards: Board[];
}

export interface Board {
  id: number;
  slug: string;
  name: string;
  description: string;
  type: BoardType;
  categories?: string[]; // 말머리
  icon?: string;
}

export interface Post {
  id: number;
  boardSlug: string;
  category?: string;
  title: string;
  content: string;
  authorId: number;
  createdAt: string;
  views: number;
  likes: number;
  commentCount: number;
  isNotice?: boolean;
  hasImage?: boolean;
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
