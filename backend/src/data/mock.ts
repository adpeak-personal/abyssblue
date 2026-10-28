// 더미데이터 — MySQL 연결 전까지 사용 (frontend/src/data/mock.ts 와 동일 내용, keep in sync)
import type {
  BoardGroup,
  Comment,
  DiveLog,
  DivePoint,
  Post,
  SeaCondition,
  Tour,
  User,
} from "../types.js";

export const CAFE_INFO = {
  name: "어비스 블루",
  slogan: "깊고 푸른 바다를 사랑하는 다이버들",
  memberCount: 48213,
  todayVisitors: 3127,
  since: "2014-06-01",
  manager: "블루매니저",
};

export const users: User[] = [
  { id: 1, nickname: "블루매니저", email: "admin@abyssblue.kr", avatarColor: "#0e7490", level: "운영진", certAgency: "PADI", certLevel: "Course Director", totalDives: 2140, joinedAt: "2014-06-01", bio: "어비스 블루 운영진입니다. 안전다이빙!" },
  { id: 2, nickname: "문어발다이버", email: "octo@test.kr", avatarColor: "#be185d", level: "고래", certAgency: "SSI", certLevel: "Master Diver", totalDives: 612, joinedAt: "2016-03-12" },
  { id: 3, nickname: "고성물범", email: "seal@test.kr", avatarColor: "#4d7c0f", level: "산호", certAgency: "PADI", certLevel: "Rescue Diver", totalDives: 238, joinedAt: "2018-07-21" },
  { id: 4, nickname: "니모찾아삼만리", email: "nemo@test.kr", avatarColor: "#ea580c", level: "파도", certAgency: "PADI", certLevel: "Advanced Open Water", totalDives: 87, joinedAt: "2021-05-02" },
  { id: 5, nickname: "초보버블", email: "bubble@test.kr", avatarColor: "#7c3aed", level: "새싹", certAgency: "SSI", certLevel: "Open Water Diver", totalDives: 9, joinedAt: "2026-07-30" },
  { id: 6, nickname: "만타헌터", email: "manta@test.kr", avatarColor: "#1d4ed8", level: "고래", certAgency: "NAUI", certLevel: "Instructor", totalDives: 1320, joinedAt: "2015-01-09" },
  { id: 7, nickname: "울릉도오징어", email: "squid@test.kr", avatarColor: "#b45309", level: "산호", certAgency: "CMAS", certLevel: "2★ Diver", totalDives: 301, joinedAt: "2017-09-14" },
  { id: 8, nickname: "서귀포해녀손녀", email: "haenyeo@test.kr", avatarColor: "#0f766e", level: "파도", certAgency: "PADI", certLevel: "Advanced Open Water", totalDives: 142, joinedAt: "2020-11-11" },
  { id: 9, nickname: "나이트록스러버", email: "nitrox@test.kr", avatarColor: "#9333ea", level: "산호", certAgency: "SDI", certLevel: "Advanced Nitrox", totalDives: 410, joinedAt: "2019-02-28" },
  { id: 10, nickname: "물속사진관", email: "photo@test.kr", avatarColor: "#db2777", level: "고래", certAgency: "PADI", certLevel: "Master Scuba Diver", totalDives: 780, joinedAt: "2016-08-08" },
];

export const CURRENT_USER_ID = 4;

export const boardGroups: BoardGroup[] = [
  {
    id: 1,
    name: "📢 공지 & 안내",
    boards: [
      { id: 1, slug: "notice", name: "공지사항", description: "운영 공지와 이벤트 안내", type: "list", categories: ["공지", "이벤트", "필독"] },
      { id: 2, slug: "greeting", name: "가입인사", description: "반가워요! 자기소개를 남겨주세요", type: "list" },
    ],
  },
  {
    id: 2,
    name: "🌊 다이빙 이야기",
    boards: [
      { id: 3, slug: "free", name: "자유게시판", description: "다이버들의 자유로운 수다", type: "list", categories: ["잡담", "질문", "정보", "후기"] },
      { id: 4, slug: "review", name: "다이빙 후기", description: "국내·해외 다이빙 트립 후기", type: "list", categories: ["국내", "해외", "리조트", "리브어보드"] },
      { id: 5, slug: "photo", name: "수중사진 갤러리", description: "내가 찍은 바닷속 한 장면", type: "gallery", writeMode: "photo", highQuality: true, categories: ["마크로", "와이드", "영상"] },
      { id: 6, slug: "qna", name: "초보 Q&A", description: "무엇이든 물어보세요, 선배 다이버가 답해드려요", type: "qna", categories: ["교육", "장비", "건강", "여행"] },
    ],
  },
  {
    id: 3,
    name: "🤿 장비 & 장터",
    boards: [
      { id: 7, slug: "gear", name: "장비 리뷰", description: "BCD, 호흡기, 컴퓨터, 슈트 사용기", type: "list", categories: ["호흡기", "BCD", "컴퓨터", "슈트", "카메라"] },
      { id: 8, slug: "market", name: "중고장터", description: "안전거래! 직거래 권장", type: "gallery", writeMode: "photo", categories: ["팝니다", "삽니다", "나눔"] },
    ],
  },
  {
    id: 4,
    name: "🐠 함께해요",
    boards: [
      { id: 9, slug: "buddy", name: "버디 구해요", description: "함께 들어갈 버디를 찾아요", type: "list", categories: ["동해", "남해", "제주", "해외"] },
      { id: 10, slug: "safety", name: "안전 & 사고사례", description: "사고 사례 공유와 안전 수칙", type: "list", categories: ["사례", "수칙", "응급처치"] },
    ],
  },
];

export const allBoards = boardGroups.flatMap((g) => g.boards);

const d = (daysAgo: number, h = 10, m = 0) => {
  const base = new Date("2026-09-15T12:00:00+09:00");
  base.setDate(base.getDate() - daysAgo);
  base.setHours(h, m);
  return base.toISOString();
};

export const posts: Post[] = [
  // 공지
  { id: 1, boardSlug: "notice", category: "필독", title: "어비스 블루 커뮤니티 이용 규칙 (2026 개정판)", content: "안녕하세요, 어비스 블루 운영진입니다.\n\n커뮤니티를 쾌적하게 이용하기 위한 규칙을 개정했습니다.\n\n1. 상업적 홍보글은 제휴 게시판에만 작성해주세요.\n2. 사고사례 게시판에서는 비난보다 원인 분석과 배움에 집중해주세요.\n3. 중고장터 거래 시 안전거래를 권장합니다.\n\n즐거운 다이빙 되세요!", authorId: 1, createdAt: d(30), views: 15230, likes: 412, commentCount: 88, isNotice: true },
  { id: 2, boardSlug: "notice", category: "이벤트", title: "🎉 가을 수중사진 콘테스트 개최! (상품: 수중카메라 하우징)", content: "9월 한 달간 수중사진 갤러리에 #가을콘테스트 태그를 달고 사진을 올려주세요.", authorId: 1, createdAt: d(5), views: 8421, likes: 356, commentCount: 64, isNotice: true },
  { id: 3, boardSlug: "notice", category: "공지", title: "10월 정기 투어 – 울진 나곡 · 고성 공현진 신청 안내", content: "정기 투어 신청은 투어/모집 메뉴에서 받습니다.", authorId: 1, createdAt: d(2), views: 3120, likes: 98, commentCount: 21, isNotice: true },

  // 자유
  { id: 11, boardSlug: "free", category: "잡담", title: "주말에 고성 다녀왔는데 시야 25m 나왔어요 ㄷㄷ", content: "진짜 오랜만에 동해 시야 대박이었습니다. 수온은 21도 정도였고 5mm로 충분했어요.", authorId: 3, createdAt: d(0, 9, 12), views: 832, likes: 47, commentCount: 23, hasImage: true },
  { id: 12, boardSlug: "free", category: "질문", title: "나이트록스 자격증 따면 확실히 덜 피곤한가요?", content: "하루 3~4깡 하면 너무 피곤해서요. 체감 차이 있는지 궁금합니다.", authorId: 4, createdAt: d(0, 8, 40), views: 512, likes: 12, commentCount: 31 },
  { id: 13, boardSlug: "free", category: "정보", title: "2026 추석 연휴 제주 다이빙샵 예약 현황 정리", content: "샵별로 전화 돌려서 정리해봤습니다. 서귀포 쪽은 거의 마감이에요.", authorId: 8, createdAt: d(1, 21, 5), views: 2240, likes: 132, commentCount: 45 },
  { id: 14, boardSlug: "free", category: "잡담", title: "다이빙 끝나고 먹는 라면이 세상에서 제일 맛있음", content: "인정하시면 추천 ㅋㅋ", authorId: 2, createdAt: d(1, 18, 30), views: 1402, likes: 210, commentCount: 67, hasImage: true },
  { id: 15, boardSlug: "free", category: "후기", title: "첫 드라이슈트 입수 후기 (feat. 물 샘)", content: "목씰 사이즈 조절 실패로 목으로 물이... 교훈 공유합니다.", authorId: 9, createdAt: d(2, 15, 0), views: 980, likes: 58, commentCount: 19 },
  { id: 16, boardSlug: "free", category: "질문", title: "귀 압평형이 한쪽만 안 될 때 어떻게 하시나요", content: "오른쪽 귀만 유독 안 뚫려서 하강이 너무 느려요.", authorId: 5, createdAt: d(3, 11, 20), views: 745, likes: 9, commentCount: 28 },
  { id: 17, boardSlug: "free", category: "잡담", title: "바다거북이랑 10분 동안 같이 수영함 🐢", content: "모알보알에서 만난 친구. 영상 갤러리에도 올렸어요.", authorId: 6, createdAt: d(3, 9, 0), views: 1890, likes: 176, commentCount: 34, hasImage: true },
  { id: 18, boardSlug: "free", category: "정보", title: "수중 쓰레기 줍기(비치클린) 10월 행사 같이 해요", content: "부산 영도 쪽에서 진행합니다. 장비 대여 가능.", authorId: 4, createdAt: d(4, 14, 0), views: 610, likes: 72, commentCount: 15 },

  // 후기
  { id: 21, boardSlug: "review", category: "해외", title: "필리핀 아닐라오 4박 5일 마크로 천국 후기 (사진 多)", content: "누디브랜치만 40종 넘게 본 것 같아요. 샵 정보와 비용 정리했습니다.", authorId: 10, createdAt: d(1, 10, 0), views: 3210, likes: 245, commentCount: 52, hasImage: true },
  { id: 22, boardSlug: "review", category: "국내", title: "울릉도 3일 다이빙 – 가두봉, 관음도 포인트 후기", content: "수온 22도, 시야 15~20m. 파도 때문에 하루는 날렸습니다.", authorId: 7, createdAt: d(2, 20, 0), views: 1780, likes: 121, commentCount: 29, hasImage: true },
  { id: 23, boardSlug: "review", category: "리브어보드", title: "몰디브 리브어보드 7박 – 만타, 고래상어 다 봤습니다", content: "남 아리 아톨에서 고래상어를 드디어! 비용과 준비물 공유해요.", authorId: 6, createdAt: d(6, 13, 0), views: 5420, likes: 398, commentCount: 87, hasImage: true },
  { id: 24, boardSlug: "review", category: "국내", title: "제주 문섬 새끼섬 연산호 군락 여전히 예쁘네요", content: "9월 초 문섬 다녀왔습니다. 조류 조금 있었지만 연산호 최고.", authorId: 8, createdAt: d(7, 16, 0), views: 1320, likes: 96, commentCount: 18, hasImage: true },

  // 사진 갤러리
  { id: 31, boardSlug: "photo", category: "마크로", title: "갯민숭달팽이 3종 세트", content: "아닐라오에서 60mm 마크로로 촬영", authorId: 10, createdAt: d(0, 7, 0), views: 640, likes: 88, commentCount: 12, hasImage: true, thumbColor: "coral" },
  { id: 32, boardSlug: "photo", category: "와이드", title: "문섬 연산호 숲", content: "#가을콘테스트", authorId: 8, createdAt: d(1, 12, 0), views: 910, likes: 130, commentCount: 20, hasImage: true, thumbColor: "reef" },
  { id: 33, boardSlug: "photo", category: "와이드", title: "만타 레이 머리 위로 지나갈 때", content: "#가을콘테스트", authorId: 6, createdAt: d(2, 8, 0), views: 1540, likes: 221, commentCount: 31, hasImage: true, thumbColor: "deep" },
  { id: 34, boardSlug: "photo", category: "마크로", title: "동해 청베도라치 표정 보세요 ㅋㅋ", content: "고성 공현진", authorId: 3, createdAt: d(2, 19, 0), views: 820, likes: 104, commentCount: 17, hasImage: true, thumbColor: "kelp" },
  { id: 35, boardSlug: "photo", category: "영상", title: "바다거북 브리딩 영상", content: "모알보알", authorId: 6, createdAt: d(3, 9, 30), views: 1210, likes: 150, commentCount: 22, hasImage: true, thumbColor: "lagoon" },
  { id: 36, boardSlug: "photo", category: "와이드", title: "울릉도 가두봉 수중 절벽", content: "#가을콘테스트", authorId: 7, createdAt: d(4, 17, 0), views: 700, likes: 79, commentCount: 9, hasImage: true, thumbColor: "abyss" },
  { id: 37, boardSlug: "photo", category: "마크로", title: "흰동가리 가족사진", content: "", authorId: 4, createdAt: d(5, 11, 0), views: 530, likes: 66, commentCount: 8, hasImage: true, thumbColor: "sunset" },
  { id: 38, boardSlug: "photo", category: "와이드", title: "세노테 빛내림", content: "멕시코 도스오호스", authorId: 2, createdAt: d(6, 14, 0), views: 1980, likes: 260, commentCount: 40, hasImage: true, thumbColor: "light" },

  // Q&A
  { id: 41, boardSlug: "qna", category: "교육", title: "오픈워터 따고 어드밴스 바로 가도 될까요?", content: "오픈워터 4깡 했습니다. 바로 어드밴스 가는게 좋을지 경험 쌓고 갈지 고민이에요.", authorId: 5, createdAt: d(0, 10, 5), views: 380, likes: 6, commentCount: 14 },
  { id: 42, boardSlug: "qna", category: "장비", title: "첫 다이브 컴퓨터 추천 부탁드려요 (30만원대)", content: "손목형으로 생각중입니다.", authorId: 5, createdAt: d(1, 22, 0), views: 920, likes: 11, commentCount: 26 },
  { id: 43, boardSlug: "qna", category: "건강", title: "감기 기운 있을 때 다이빙 해도 되나요?", content: "다음주 투어인데 코가 조금 막혀요.", authorId: 4, createdAt: d(2, 9, 0), views: 610, likes: 4, commentCount: 18 },
  { id: 44, boardSlug: "qna", category: "여행", title: "비행기 타기 전 몇 시간 쉬어야 하나요?", content: "마지막 다이빙 후 다음날 오전 비행기입니다.", authorId: 5, createdAt: d(4, 13, 0), views: 1120, likes: 20, commentCount: 22 },

  // 장비 리뷰
  { id: 51, boardSlug: "gear", category: "컴퓨터", title: "Shearwater Peregrine TX 6개월 사용기", content: "화면 밝기, 배터리, 무선 공기압 연동까지 정리했습니다.", authorId: 9, createdAt: d(1, 16, 0), views: 1650, likes: 88, commentCount: 24, hasImage: true },
  { id: 52, boardSlug: "gear", category: "슈트", title: "국내 동해용 반건식 7mm vs 드라이 고민 끝낸 이야기", content: "결론은 드라이. 이유를 적어봅니다.", authorId: 3, createdAt: d(3, 20, 0), views: 1340, likes: 70, commentCount: 38 },
  { id: 53, boardSlug: "gear", category: "호흡기", title: "호흡기 오버홀 주기, 샵마다 다른 이유", content: "", authorId: 1, createdAt: d(8, 10, 0), views: 2100, likes: 115, commentCount: 19 },

  // 장터
  { id: 61, boardSlug: "market", category: "팝니다", title: "[팝니다] 아쿠아렁 BCD S사이즈 (20회 사용)", content: "상태 최상, 직거래 서울", authorId: 2, createdAt: d(0, 11, 0), views: 210, likes: 3, commentCount: 5, hasImage: true, thumbColor: "deep", price: 350000, tradeStatus: "판매중" },
  { id: 62, boardSlug: "market", category: "팝니다", title: "[팝니다] 올림푸스 TG-7 + 하우징 풀세트", content: "", authorId: 10, createdAt: d(1, 9, 0), views: 540, likes: 12, commentCount: 9, hasImage: true, thumbColor: "lagoon", price: 780000, tradeStatus: "예약중" },
  { id: 63, boardSlug: "market", category: "삽니다", title: "[삽니다] 여성용 핀 250mm 구합니다", content: "", authorId: 5, createdAt: d(1, 15, 0), views: 120, likes: 0, commentCount: 2, thumbColor: "coral", price: 0, tradeStatus: "판매중" },
  { id: 64, boardSlug: "market", category: "나눔", title: "[나눔] 5mm 웻슈트 L 사이즈 무료나눔", content: "택배비만 부담해주세요", authorId: 7, createdAt: d(2, 10, 0), views: 480, likes: 25, commentCount: 14, hasImage: true, thumbColor: "kelp", price: 0, tradeStatus: "판매완료" },
  { id: 65, boardSlug: "market", category: "팝니다", title: "[팝니다] 가민 디센트 Mk2i + 트랜스미터", content: "", authorId: 9, createdAt: d(3, 18, 0), views: 690, likes: 8, commentCount: 11, hasImage: true, thumbColor: "abyss", price: 950000, tradeStatus: "판매중" },
  { id: 66, boardSlug: "market", category: "팝니다", title: "[팝니다] 스쿠버프로 MK25/S600 호흡기", content: "오버홀 완료", authorId: 6, createdAt: d(5, 12, 0), views: 350, likes: 5, commentCount: 6, hasImage: true, thumbColor: "reef", price: 620000, tradeStatus: "판매중" },

  // 버디
  { id: 71, boardSlug: "buddy", category: "동해", title: "9/20(토) 양양 기사문 펀다이빙 버디 2명 구해요", content: "AOW 이상, 50깡 이상이면 좋겠어요", authorId: 3, createdAt: d(0, 13, 0), views: 190, likes: 4, commentCount: 7 },
  { id: 72, boardSlug: "buddy", category: "제주", title: "추석 연휴 서귀포 3일 같이 다니실 분", content: "", authorId: 8, createdAt: d(1, 19, 0), views: 340, likes: 9, commentCount: 12 },
  { id: 73, boardSlug: "buddy", category: "해외", title: "11월 코모도 리브어보드 1자리 양도/동행", content: "", authorId: 6, createdAt: d(2, 12, 0), views: 520, likes: 15, commentCount: 10 },

  // 안전
  { id: 81, boardSlug: "safety", category: "사례", title: "[사례공유] 급상승으로 인한 감압병 의심 – 챔버 치료 후기", content: "경각심을 위해 공유합니다. 상승 속도 꼭 지키세요.", authorId: 9, createdAt: d(4, 9, 0), views: 4210, likes: 302, commentCount: 56 },
  { id: 82, boardSlug: "safety", category: "수칙", title: "조류 다이빙 시 SMB 전개 요령 정리", content: "", authorId: 1, createdAt: d(9, 10, 0), views: 2890, likes: 188, commentCount: 23 },
  { id: 83, boardSlug: "safety", category: "응급처치", title: "국내 고압산소 챔버 운영 병원 목록 (2026)", content: "", authorId: 1, createdAt: d(12, 10, 0), views: 6120, likes: 510, commentCount: 31 },

  // 가입인사
  { id: 91, boardSlug: "greeting", title: "오픈워터 막 딴 새싹입니다! 잘 부탁드려요 🌱", content: "경기도 사는 초보입니다. 많이 배우겠습니다!", authorId: 5, createdAt: d(0, 12, 0), views: 88, likes: 21, commentCount: 16 },
  { id: 92, boardSlug: "greeting", title: "부산 다이버 가입했습니다", content: "", authorId: 4, createdAt: d(3, 12, 0), views: 64, likes: 12, commentCount: 9 },
];

export const comments: Comment[] = [
  { id: 1, postId: 11, authorId: 2, content: "와 부럽네요 ㅠㅠ 저번주엔 5m였는데", createdAt: d(0, 9, 30), likes: 5 },
  { id: 2, postId: 11, authorId: 3, content: "타이밍 운이 좋았던 것 같아요!", createdAt: d(0, 9, 45), likes: 2, parentId: 1 },
  { id: 3, postId: 11, authorId: 7, content: "어느 샵으로 가셨나요? 이번주 가보려구요", createdAt: d(0, 10, 2), likes: 1 },
  { id: 4, postId: 11, authorId: 5, content: "시야 25m는 어떤 느낌일까요... 부럽습니다 🥹", createdAt: d(0, 10, 40), likes: 3 },
  { id: 5, postId: 12, authorId: 9, content: "개인차 있지만 저는 확실히 체감됐어요. 반복 다이빙할 때 특히요.", createdAt: d(0, 9, 10), likes: 14 },
  { id: 6, postId: 12, authorId: 1, content: "피로감은 수분 섭취, 수면도 크게 영향 줍니다. 나이트록스는 무감압 한계 늘리는 게 주 목적이에요.", createdAt: d(0, 9, 20), likes: 22 },
  { id: 7, postId: 41, authorId: 6, content: "바로 가셔도 됩니다. 다만 중성부력은 꼭 따로 연습하세요!", createdAt: d(0, 11, 0), likes: 8 },
  { id: 8, postId: 41, authorId: 2, content: "어드밴스 교육 자체가 경험 쌓는 과정이라 추천해요", createdAt: d(0, 11, 30), likes: 4 },
];

export const divePoints: DivePoint[] = [
  {
    id: 1, name: "문섬 새끼섬", region: "제주", area: "서귀포", country: "대한민국", difficulty: "중급",
    depthMin: 5, depthMax: 35, visibility: "10~25m",
    waterTemp: [14, 14, 15, 16, 18, 21, 24, 26, 25, 22, 19, 16].map((t, i) => ({ month: i + 1, temp: t })),
    bestSeason: "7월 ~ 11월", entryType: ["보트"],
    marineLife: ["연산호", "자리돔", "쏠배감펭", "갯민숭달팽이", "파랑돔"],
    description: "국내 최고의 연산호 군락지. 수중 절벽을 따라 형형색색의 연산호가 펼쳐지며, 조류가 있는 날이 많아 중급 이상에게 추천합니다.",
    rating: 4.8, reviewCount: 312, lat: 33.227, lng: 126.567, gradient: "reef",
    shops: ["서귀포 블루샵", "문섬다이브", "제주씨월드"],
  },
  {
    id: 2, name: "공현진 방파제", region: "동해", area: "강원 고성", country: "대한민국", difficulty: "초급",
    depthMin: 3, depthMax: 18, visibility: "5~25m",
    waterTemp: [8, 7, 8, 10, 13, 16, 19, 22, 21, 18, 14, 11].map((t, i) => ({ month: i + 1, temp: t })),
    bestSeason: "8월 ~ 10월", entryType: ["비치", "보트"],
    marineLife: ["청베도라치", "멍게", "우럭", "해송", "군소"],
    description: "교육과 펀다이빙 모두 좋은 동해 대표 포인트. 가을철 시야가 좋고 다양한 마크로 생물을 만날 수 있습니다.",
    rating: 4.5, reviewCount: 488, lat: 38.357, lng: 128.515, gradient: "kelp",
    shops: ["고성다이브센터", "공현진스쿠버"],
  },
  {
    id: 3, name: "가두봉", region: "동해", area: "경북 울릉", country: "대한민국", difficulty: "중급",
    depthMin: 5, depthMax: 40, visibility: "15~30m",
    waterTemp: [11, 10, 11, 12, 15, 18, 22, 25, 24, 20, 16, 13].map((t, i) => ({ month: i + 1, temp: t })),
    bestSeason: "8월 ~ 10월", entryType: ["보트"],
    marineLife: ["돌돔", "혹돔", "해송", "부채뿔산호"],
    description: "울릉도의 청정 바다. 수직 절벽과 거대한 수중 암반 지형, 뛰어난 시야가 매력적인 포인트입니다.",
    rating: 4.7, reviewCount: 156, lat: 37.48, lng: 130.91, gradient: "abyss",
    shops: ["울릉스쿠버", "독도다이브"],
  },
  {
    id: 4, name: "홍도 바위섬", region: "남해", area: "경남 통영", country: "대한민국", difficulty: "상급",
    depthMin: 10, depthMax: 45, visibility: "8~20m",
    waterTemp: [12, 11, 12, 14, 17, 20, 23, 25, 24, 21, 17, 14].map((t, i) => ({ month: i + 1, temp: t })),
    bestSeason: "9월 ~ 11월", entryType: ["보트"],
    marineLife: ["방어떼", "부시리", "연산호", "해면"],
    description: "강한 조류와 대물 회유어종으로 유명한 상급자 포인트. 드리프트 다이빙 경험이 필요합니다.",
    rating: 4.6, reviewCount: 94, lat: 34.62, lng: 128.56, gradient: "deep",
    shops: ["통영마린", "남해블루"],
  },
  {
    id: 5, name: "모알보알 사디나 월", region: "해외", area: "세부", country: "필리핀", difficulty: "초급",
    depthMin: 3, depthMax: 30, visibility: "20~40m",
    waterTemp: [26, 26, 27, 28, 29, 29, 29, 29, 29, 28, 28, 27].map((t, i) => ({ month: i + 1, temp: t })),
    bestSeason: "연중 (11월~5월 최적)", entryType: ["비치", "보트"],
    marineLife: ["정어리떼", "바다거북", "갯민숭달팽이", "잭피시"],
    description: "수백만 마리의 정어리떼 사디나런으로 유명. 비치에서 바로 입수 가능하고 바다거북을 자주 만납니다.",
    rating: 4.9, reviewCount: 1024, lat: 9.95, lng: 123.37, gradient: "lagoon",
    shops: ["모알보알 코리안샵", "세부블루워터"],
  },
  {
    id: 6, name: "아닐라오 트윈락", region: "해외", area: "바탕가스", country: "필리핀", difficulty: "초급",
    depthMin: 5, depthMax: 25, visibility: "10~25m",
    waterTemp: [25, 25, 26, 28, 29, 29, 29, 28, 28, 28, 27, 26].map((t, i) => ({ month: i + 1, temp: t })),
    bestSeason: "10월 ~ 5월", entryType: ["보트"],
    marineLife: ["누디브랜치", "프로그피시", "고스트파이프피시", "만다린피시"],
    description: "마크로 촬영의 성지. 작고 신기한 생물을 찾는 재미가 있는 포인트로 수중사진가들에게 인기입니다.",
    rating: 4.7, reviewCount: 540, lat: 13.76, lng: 120.92, gradient: "coral",
    shops: ["아닐라오 다이브리조트"],
  },
  {
    id: 7, name: "섶섬", region: "제주", area: "서귀포", country: "대한민국", difficulty: "중급",
    depthMin: 5, depthMax: 30, visibility: "10~20m",
    waterTemp: [14, 14, 15, 16, 18, 21, 24, 26, 25, 22, 19, 16].map((t, i) => ({ month: i + 1, temp: t })),
    bestSeason: "6월 ~ 11월", entryType: ["보트"],
    marineLife: ["파랑돔", "주걱치", "쥐치", "연산호"],
    description: "문섬과 함께 서귀포를 대표하는 포인트. 수중 동굴과 아치 지형이 인상적입니다.",
    rating: 4.6, reviewCount: 201, lat: 33.232, lng: 126.605, gradient: "sunset",
    shops: ["서귀포 블루샵", "섶섬다이브"],
  },
  {
    id: 8, name: "시밀란 엘리펀트헤드락", region: "해외", area: "푸켓", country: "태국", difficulty: "상급",
    depthMin: 8, depthMax: 40, visibility: "20~35m",
    waterTemp: [28, 28, 29, 29, 29, 29, 28, 28, 28, 28, 28, 28].map((t, i) => ({ month: i + 1, temp: t })),
    bestSeason: "11월 ~ 4월", entryType: ["보트"],
    marineLife: ["만타", "레오파드상어", "바라쿠다", "거북"],
    description: "거대한 화강암 바위 사이를 통과하는 스윔스루 지형. 조류가 강해 경험이 필요합니다.",
    rating: 4.8, reviewCount: 388, lat: 8.65, lng: 97.64, gradient: "light",
    shops: ["시밀란 리브어보드"],
  },
];

export const diveLogs: DiveLog[] = (([
  { id: 1, userId: 4, diveNo: 87, date: "2026-09-13", pointId: 2, pointName: "공현진 방파제", maxDepth: 17.4, avgDepth: 11.2, bottomTime: 48, waterTemp: 21, visibility: 20, suit: "5mm 웻슈트", weight: 6, tankStart: 200, tankEnd: 60, buddy: "고성물범", sightings: ["청베도라치", "멍게", "군소"], memo: "시야 최고. 청베도라치 사진 성공!", rating: 5 },
  { id: 2, userId: 4, diveNo: 86, date: "2026-09-13", pointId: 2, pointName: "공현진 방파제", maxDepth: 14.1, avgDepth: 9.8, bottomTime: 52, waterTemp: 21, visibility: 18, suit: "5mm 웻슈트", weight: 6, tankStart: 200, tankEnd: 70, buddy: "고성물범", sightings: ["우럭", "해송"], memo: "", rating: 4 },
  { id: 3, userId: 4, diveNo: 85, date: "2026-08-24", pointId: 1, pointName: "문섬 새끼섬", maxDepth: 26.8, avgDepth: 16.5, bottomTime: 41, waterTemp: 25, visibility: 15, suit: "3mm 웻슈트", weight: 4, tankStart: 200, tankEnd: 50, buddy: "서귀포해녀손녀", sightings: ["연산호", "쏠배감펭", "자리돔"], memo: "조류가 조금 있었지만 연산호 군락 장관", rating: 5 },
  { id: 4, userId: 4, diveNo: 84, date: "2026-08-24", pointId: 7, pointName: "섶섬", maxDepth: 21.3, avgDepth: 13.0, bottomTime: 45, waterTemp: 25, visibility: 12, suit: "3mm 웻슈트", weight: 4, tankStart: 200, tankEnd: 60, buddy: "서귀포해녀손녀", sightings: ["파랑돔", "주걱치"], memo: "아치 지형 통과", rating: 4 },
  { id: 5, userId: 4, diveNo: 83, date: "2026-07-05", pointId: 5, pointName: "모알보알 사디나 월", maxDepth: 18.0, avgDepth: 10.2, bottomTime: 58, waterTemp: 29, visibility: 30, suit: "3mm 숏티", weight: 3, tankStart: 200, tankEnd: 70, buddy: "만타헌터", sightings: ["정어리떼", "바다거북"], memo: "정어리 토네이도 속으로!", rating: 5 },
  { id: 6, userId: 4, diveNo: 82, date: "2026-07-04", pointId: 5, pointName: "모알보알 사디나 월", maxDepth: 22.5, avgDepth: 12.4, bottomTime: 50, waterTemp: 29, visibility: 28, suit: "3mm 숏티", weight: 3, tankStart: 200, tankEnd: 60, buddy: "만타헌터", sightings: ["바다거북", "잭피시"], memo: "", rating: 4 },
  { id: 7, userId: 4, diveNo: 81, date: "2026-06-14", pointId: 3, pointName: "가두봉", maxDepth: 29.9, avgDepth: 17.8, bottomTime: 38, waterTemp: 18, visibility: 25, suit: "드라이슈트", weight: 10, tankStart: 200, tankEnd: 50, buddy: "울릉도오징어", sightings: ["돌돔", "해송"], memo: "첫 울릉도. 수직 절벽 압도적", rating: 5 },
] as Omit<DiveLog, "isPublic">[]).map((l) => ({ ...l, isPublic: true })));

export const tours: Tour[] = [
  { id: 1, title: "10월 정기투어 – 울진 나곡 1박 2일", type: "정기투어", pointName: "울진 나곡", region: "동해", startDate: "2026-10-10", endDate: "2026-10-11", hostId: 1, capacity: 16, joined: 12, price: 280000, minCert: "오픈워터", status: "모집중", description: "4깡 + 숙박 + 식사 포함. 장비 렌탈 별도." },
  { id: 2, title: "이번주 토요일 양양 기사문 번개", type: "번개", pointName: "양양 기사문", region: "동해", startDate: "2026-09-20", endDate: "2026-09-20", hostId: 3, capacity: 6, joined: 5, price: 120000, minCert: "어드밴스", status: "마감임박", description: "현장 N빵. 카풀 가능(서울 출발 2자리)." },
  { id: 3, title: "11월 코모도 리브어보드 7박", type: "해외투어", pointName: "코모도 국립공원", region: "해외", startDate: "2026-11-14", endDate: "2026-11-21", hostId: 6, capacity: 12, joined: 12, price: 3400000, minCert: "어드밴스 + 50로그", status: "마감", description: "만타 포인트, 조류 강함. 대기자 신청만 가능." },
  { id: 4, title: "나이트록스 스페셜티 주말반", type: "교육", pointName: "서울 잠실 수영장 + 고성", region: "동해", startDate: "2026-09-27", endDate: "2026-09-28", hostId: 9, capacity: 8, joined: 3, price: 350000, minCert: "오픈워터", status: "모집중", description: "이론 + 개방수역 2깡. 교재비 포함." },
  { id: 5, title: "추석 연휴 제주 서귀포 3박 4일", type: "정기투어", pointName: "문섬 · 섶섬 · 범섬", region: "제주", startDate: "2026-10-03", endDate: "2026-10-06", hostId: 8, capacity: 10, joined: 8, price: 690000, minCert: "오픈워터 + 20로그", status: "마감임박", description: "보트 6깡, 숙소 포함. 항공 개별." },
  { id: 6, title: "통영 홍도 드리프트 다이빙 번개", type: "번개", pointName: "통영 홍도", region: "남해", startDate: "2026-10-18", endDate: "2026-10-18", hostId: 4, capacity: 8, joined: 2, price: 150000, minCert: "어드밴스 + 딥", status: "모집중", description: "조류 경험자 우대. SMB 필수 지참." },
];

export const seaConditions: SeaCondition[] = [
  { area: "강원 고성", waveHeight: 0.5, waterTemp: 21, wind: 3, status: "좋음" },
  { area: "경북 울릉", waveHeight: 1.2, waterTemp: 22, wind: 6, status: "보통" },
  { area: "경남 통영", waveHeight: 0.8, waterTemp: 24, wind: 4, status: "좋음" },
  { area: "제주 서귀포", waveHeight: 1.8, waterTemp: 25, wind: 9, status: "주의" },
];

export const popularTags = ["#가을콘테스트", "#고성시야", "#나이트록스", "#드라이슈트", "#첫로그", "#연산호", "#장비추천", "#버디구함"];
