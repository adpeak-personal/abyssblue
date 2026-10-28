-- =====================================================================
-- 어비스 블루 대표 시드 데이터 (전체 mock 데이터 중 일부)
-- 적용: mysql -u root -p abyssblue < src/db/seed.sql  (schema.sql 적용 후)
-- 비밀번호 해시는 개발용 placeholder 입니다. 실제 로그인 구현 시 bcrypt 해시로 교체하세요.
-- =====================================================================

USE abyssblue;
SET NAMES utf8mb4;

-- 회원
INSERT INTO users (id, email, password_hash, nickname, avatar_color, level, cert_agency, cert_level, total_dives, bio, joined_at) VALUES
  (1, 'admin@abyssblue.kr', '$2b$10$DEV_PLACEHOLDER_HASH_REPLACE_ME', '블루매니저',     '#0e7490', '운영진', 'PADI', 'Course Director',     2140, '제주', '어비스 블루 운영진입니다. 안전다이빙!', '2014-06-01'),
  (3, 'seal@test.kr',     '$2b$10$DEV_PLACEHOLDER_HASH_REPLACE_ME', '고성물범',       '#4d7c0f', '산호',   'PADI', 'Rescue Diver',         238, '강원', NULL, '2018-07-21'),
  (4, 'nemo@test.kr',     '$2b$10$DEV_PLACEHOLDER_HASH_REPLACE_ME', '니모찾아삼만리', '#ea580c', '파도',   'PADI', 'Advanced Open Water',   87, '부산', NULL, '2021-05-02'),
  (5, 'bubble@test.kr',   '$2b$10$DEV_PLACEHOLDER_HASH_REPLACE_ME', '초보버블',       '#7c3aed', '새싹',   'SSI',  'Open Water Diver',       9, '경기', NULL, '2026-07-30');

-- 게시판 그룹 / 게시판
INSERT INTO board_groups (id, name, sort_order) VALUES
  (1, '📢 어비스 블루 공지', 1),
  (2, '🌊 다이빙 이야기', 2);

-- write_mode: 'photo' 는 에디터 없이 사진 업로더로 쓰는 게시판
-- high_quality: 사진이 콘텐츠인 게시판만 (용량을 훨씬 많이 쓴다)
-- write_mode: 'photo' 는 에디터 없이 사진 업로더로 쓰는 게시판
-- high_quality: 사진이 콘텐츠인 게시판만 (용량을 훨씬 많이 쓴다)
INSERT INTO boards (id, group_id, slug, name, description, type, write_mode, high_quality, categories, sort_order) VALUES
  (1, 1, 'notice', '공지사항',    '카페 운영 공지와 이벤트 안내',                  'list',    'editor', 0, JSON_ARRAY('공지','이벤트','필독'), 1),
  (2, 1, 'greeting', '가입인사',  '반가워요! 자기소개를 남겨주세요',                'list',    'editor', 0, NULL, 2),
  (3, 2, 'free', '자유게시판',    '다이버들의 자유로운 수다',                      'list',    'editor', 0, JSON_ARRAY('잡담','질문','정보','후기'), 1),
  (4, 2, 'review', '다이빙 후기', '국내·해외 다이빙 트립 후기',                    'list',    'editor', 0, JSON_ARRAY('국내','해외','리조트','리브어보드'), 2),
  (5, 2, 'photo', '수중사진 갤러리', '내가 찍은 바닷속 한 장면',                   'gallery', 'photo',  1, JSON_ARRAY('마크로','와이드','영상'), 3),
  (6, 2, 'qna', '초보 Q&A',       '무엇이든 물어보세요, 선배 다이버가 답해드려요',  'qna',     'editor', 0, JSON_ARRAY('교육','장비','건강','여행'), 4),
  (8, 2, 'market', '중고장터',    '안전거래! 직거래 권장',                         'gallery', 'photo',  0, JSON_ARRAY('팝니다','삽니다','나눔'), 5);

-- 게시글
INSERT INTO posts (id, board_id, author_id, category, title, content, views, likes, comment_count, is_notice, has_image, created_at) VALUES
  (1,  1, 1, '필독', '어비스 블루 카페 이용 규칙 (2026 개정판)', '안녕하세요, 어비스 블루 운영진입니다.\n\n카페를 쾌적하게 이용하기 위한 규칙을 개정했습니다.', 15230, 412, 88, 1, 0, '2026-08-16 10:00:00'),
  (11, 3, 3, '잡담', '주말에 고성 다녀왔는데 시야 25m 나왔어요 ㄷㄷ', '진짜 오랜만에 동해 시야 대박이었습니다. 수온은 21도 정도였고 5mm로 충분했어요.', 832, 47, 2, 0, 1, '2026-09-15 09:12:00'),
  (12, 3, 4, '질문', '나이트록스 자격증 따면 확실히 덜 피곤한가요?', '하루 3~4깡 하면 너무 피곤해서요. 체감 차이 있는지 궁금합니다.', 512, 12, 0, 0, 0, '2026-09-15 08:40:00'),
  (41, 6, 5, '교육', '오픈워터 따고 어드밴스 바로 가도 될까요?', '오픈워터 4깡 했습니다. 바로 어드밴스 가는게 좋을지 경험 쌓고 갈지 고민이에요.', 380, 6, 0, 0, 0, '2026-09-15 10:05:00');

-- 댓글 (대댓글 포함)
INSERT INTO comments (id, post_id, author_id, parent_id, content, likes, created_at) VALUES
  (1, 11, 4, NULL, '와 부럽네요 ㅠㅠ 저번주엔 5m였는데', 5, '2026-09-15 09:30:00'),
  (2, 11, 3, 1,    '타이밍 운이 좋았던 것 같아요!',       2, '2026-09-15 09:45:00');

INSERT INTO post_likes (post_id, user_id) VALUES
  (11, 4), (11, 5), (1, 3);

-- 다이빙 포인트
INSERT INTO dive_points (id, name, region, area, country, difficulty, depth_min, depth_max, visibility, best_season, entry_types, marine_life, shops, description, rating, review_count, lat, lng, gradient) VALUES
  (1, '문섬 새끼섬', '제주', '서귀포', '대한민국', '중급', 5, 35, '10~25m', '7월 ~ 11월',
     JSON_ARRAY('보트'), JSON_ARRAY('연산호','자리돔','쏠배감펭','갯민숭달팽이','파랑돔'), JSON_ARRAY('서귀포 블루샵','문섬다이브','제주씨월드'),
     '국내 최고의 연산호 군락지. 수중 절벽을 따라 형형색색의 연산호가 펼쳐지며, 조류가 있는 날이 많아 중급 이상에게 추천합니다.', 4.8, 312, 33.227000, 126.567000, 'reef'),
  (2, '공현진 방파제', '동해', '강원 고성', '대한민국', '초급', 3, 18, '5~25m', '8월 ~ 10월',
     JSON_ARRAY('비치','보트'), JSON_ARRAY('청베도라치','멍게','우럭','해송','군소'), JSON_ARRAY('고성다이브센터','공현진스쿠버'),
     '교육과 펀다이빙 모두 좋은 동해 대표 포인트. 가을철 시야가 좋고 다양한 마크로 생물을 만날 수 있습니다.', 4.5, 488, 38.357000, 128.515000, 'kelp');

INSERT INTO dive_point_water_temps (point_id, month, temp) VALUES
  (1, 1, 14), (1, 2, 14), (1, 3, 15), (1, 4, 16), (1, 5, 18), (1, 6, 21),
  (1, 7, 24), (1, 8, 26), (1, 9, 25), (1, 10, 22), (1, 11, 19), (1, 12, 16),
  (2, 1, 8),  (2, 2, 7),  (2, 3, 8),  (2, 4, 10), (2, 5, 13), (2, 6, 16),
  (2, 7, 19), (2, 8, 22), (2, 9, 21), (2, 10, 18), (2, 11, 14), (2, 12, 11);

-- 다이브 로그
INSERT INTO dive_logs (id, user_id, dive_no, dive_date, point_id, point_name, max_depth, avg_depth, bottom_time, water_temp, visibility, suit, weight, tank_start, tank_end, buddy, memo, rating) VALUES
  (1, 4, 87, '2026-09-13', 2, '공현진 방파제', 17.4, 11.2, 48, 21, 20, '5mm 웻슈트', 6, 200, 60, '고성물범', '시야 최고. 청베도라치 사진 성공!', 5),
  (3, 4, 85, '2026-08-24', 1, '문섬 새끼섬',   26.8, 16.5, 41, 25, 15, '3mm 웻슈트', 4, 200, 50, NULL,       '조류가 조금 있었지만 연산호 군락 장관', 5);

INSERT INTO dive_log_sightings (log_id, species) VALUES
  (1, '청베도라치'), (1, '멍게'), (1, '군소'),
  (3, '연산호'), (3, '쏠배감펭'), (3, '자리돔');

-- 투어
INSERT INTO tours (id, host_id, title, type, point_name, region, start_date, end_date, capacity, joined, price, min_cert, status, description) VALUES
  (1, 1, '10월 정기투어 – 울진 나곡 1박 2일', '정기투어', '울진 나곡',   '동해', '2026-10-10', '2026-10-11', 16, 2, 280000, '오픈워터', '모집중',   '4깡 + 숙박 + 식사 포함. 장비 렌탈 별도.'),
  (2, 3, '이번주 토요일 양양 기사문 번개',   '번개',     '양양 기사문', '동해', '2026-09-20', '2026-09-20',  6, 1, 120000, '어드밴스', '마감임박', '현장 N빵. 카풀 가능(서울 출발 2자리).');

INSERT INTO tour_participants (tour_id, user_id, status) VALUES
  (1, 4, '확정'), (1, 5, '신청'), (2, 4, '확정');
