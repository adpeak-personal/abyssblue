-- 설정 데이터 (게시판·다이브 포인트)
-- npm run db:export-config 로 만든다 — 직접 고치지 말 것
-- 뽑은 시각: 2026-10-28T07:30:38.528Z
--
-- 적용:  mysql -u root -p abyssblue < deploy/seed-config.sql
-- schema.sql 을 먼저 적용한 뒤에 넣는다.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- board_groups (4건)
DELETE FROM `board_groups`;
INSERT INTO `board_groups` (`id`, `name`, `sort_order`) VALUES (1, '📢 공지 & 안내', 1);
INSERT INTO `board_groups` (`id`, `name`, `sort_order`) VALUES (2, '🌊 다이빙 이야기', 2);
INSERT INTO `board_groups` (`id`, `name`, `sort_order`) VALUES (3, '🤿 장비 & 장터', 3);
INSERT INTO `board_groups` (`id`, `name`, `sort_order`) VALUES (4, '🐠 함께해요', 4);

-- boards (10건)
DELETE FROM `boards`;
INSERT INTO `boards` (`id`, `group_id`, `slug`, `name`, `description`, `type`, `write_mode`, `high_quality`, `categories`, `icon`, `sort_order`) VALUES (1, 1, 'notice', '공지사항', '운영 공지와 이벤트 안내', 'list', 'editor', 0, '[\"공지\",\"이벤트\",\"필독\"]', NULL, 1);
INSERT INTO `boards` (`id`, `group_id`, `slug`, `name`, `description`, `type`, `write_mode`, `high_quality`, `categories`, `icon`, `sort_order`) VALUES (2, 1, 'greeting', '가입인사', '반가워요! 자기소개를 남겨주세요', 'list', 'editor', 0, NULL, NULL, 2);
INSERT INTO `boards` (`id`, `group_id`, `slug`, `name`, `description`, `type`, `write_mode`, `high_quality`, `categories`, `icon`, `sort_order`) VALUES (3, 2, 'free', '자유게시판', '다이버들의 자유로운 수다', 'list', 'editor', 0, '[\"잡담\",\"질문\",\"정보\",\"후기\"]', NULL, 1);
INSERT INTO `boards` (`id`, `group_id`, `slug`, `name`, `description`, `type`, `write_mode`, `high_quality`, `categories`, `icon`, `sort_order`) VALUES (4, 2, 'review', '다이빙 후기', '국내·해외 다이빙 트립 후기', 'list', 'editor', 0, '[\"국내\",\"해외\",\"리조트\",\"리브어보드\"]', NULL, 2);
INSERT INTO `boards` (`id`, `group_id`, `slug`, `name`, `description`, `type`, `write_mode`, `high_quality`, `categories`, `icon`, `sort_order`) VALUES (5, 2, 'photo', '수중사진 갤러리', '내가 찍은 바닷속 한 장면', 'gallery', 'photo', 1, '[\"마크로\",\"와이드\",\"영상\"]', NULL, 3);
INSERT INTO `boards` (`id`, `group_id`, `slug`, `name`, `description`, `type`, `write_mode`, `high_quality`, `categories`, `icon`, `sort_order`) VALUES (6, 2, 'qna', '초보 Q&A', '무엇이든 물어보세요, 선배 다이버가 답해드려요', 'qna', 'editor', 0, '[\"교육\",\"장비\",\"건강\",\"여행\"]', NULL, 4);
INSERT INTO `boards` (`id`, `group_id`, `slug`, `name`, `description`, `type`, `write_mode`, `high_quality`, `categories`, `icon`, `sort_order`) VALUES (7, 3, 'gear', '장비 리뷰', 'BCD, 호흡기, 컴퓨터, 슈트 사용기', 'list', 'editor', 0, '[\"호흡기\",\"BCD\",\"컴퓨터\",\"슈트\",\"카메라\"]', NULL, 1);
INSERT INTO `boards` (`id`, `group_id`, `slug`, `name`, `description`, `type`, `write_mode`, `high_quality`, `categories`, `icon`, `sort_order`) VALUES (8, 3, 'market', '중고장터', '안전거래! 직거래 권장', 'gallery', 'photo', 0, '[\"팝니다\",\"삽니다\",\"나눔\"]', NULL, 2);
INSERT INTO `boards` (`id`, `group_id`, `slug`, `name`, `description`, `type`, `write_mode`, `high_quality`, `categories`, `icon`, `sort_order`) VALUES (9, 4, 'buddy', '버디 구해요', '함께 들어갈 버디를 찾아요', 'list', 'editor', 0, '[\"동해\",\"남해\",\"제주\",\"해외\"]', NULL, 1);
INSERT INTO `boards` (`id`, `group_id`, `slug`, `name`, `description`, `type`, `write_mode`, `high_quality`, `categories`, `icon`, `sort_order`) VALUES (10, 4, 'safety', '안전 & 사고사례', '사고 사례 공유와 안전 수칙', 'list', 'editor', 0, '[\"사례\",\"수칙\",\"응급처치\"]', NULL, 2);

-- dive_points (8건)
DELETE FROM `dive_points`;
INSERT INTO `dive_points` (`id`, `name`, `region`, `area`, `country`, `difficulty`, `depth_min`, `depth_max`, `visibility`, `best_season`, `entry_types`, `marine_life`, `shops`, `description`, `rating`, `review_count`, `lat`, `lng`, `gradient`, `created_at`, `updated_at`) VALUES (1, '문섬 새끼섬', '제주', '서귀포', '대한민국', '중급', '5.0', '35.0', '10~25m', '7월 ~ 11월', '[\"보트\"]', '[\"연산호\",\"자리돔\",\"쏠배감펭\",\"갯민숭달팽이\",\"파랑돔\"]', '[\"서귀포 블루샵\",\"문섬다이브\",\"제주씨월드\"]', '국내 최고의 연산호 군락지. 수중 절벽을 따라 형형색색의 연산호가 펼쳐지며, 조류가 있는 날이 많아 중급 이상에게 추천합니다.', '4.8', 312, '33.227000', '126.567000', 'reef', '2026-10-08 15:47:53', '2026-10-08 15:47:53');
INSERT INTO `dive_points` (`id`, `name`, `region`, `area`, `country`, `difficulty`, `depth_min`, `depth_max`, `visibility`, `best_season`, `entry_types`, `marine_life`, `shops`, `description`, `rating`, `review_count`, `lat`, `lng`, `gradient`, `created_at`, `updated_at`) VALUES (2, '공현진 방파제', '동해', '강원 고성', '대한민국', '초급', '3.0', '18.0', '5~25m', '8월 ~ 10월', '[\"비치\",\"보트\"]', '[\"청베도라치\",\"멍게\",\"우럭\",\"해송\",\"군소\"]', '[\"고성다이브센터\",\"공현진스쿠버\"]', '교육과 펀다이빙 모두 좋은 동해 대표 포인트. 가을철 시야가 좋고 다양한 마크로 생물을 만날 수 있습니다.', '4.5', 488, '38.357000', '128.515000', 'kelp', '2026-10-08 15:47:53', '2026-10-08 15:47:53');
INSERT INTO `dive_points` (`id`, `name`, `region`, `area`, `country`, `difficulty`, `depth_min`, `depth_max`, `visibility`, `best_season`, `entry_types`, `marine_life`, `shops`, `description`, `rating`, `review_count`, `lat`, `lng`, `gradient`, `created_at`, `updated_at`) VALUES (3, '가두봉', '동해', '경북 울릉', '대한민국', '중급', '5.0', '40.0', '15~30m', '8월 ~ 10월', '[\"보트\"]', '[\"돌돔\",\"혹돔\",\"해송\",\"부채뿔산호\"]', '[\"울릉스쿠버\",\"독도다이브\"]', '울릉도의 청정 바다. 수직 절벽과 거대한 수중 암반 지형, 뛰어난 시야가 매력적인 포인트입니다.', '4.7', 156, '37.480000', '130.910000', 'abyss', '2026-10-08 15:47:53', '2026-10-08 15:47:53');
INSERT INTO `dive_points` (`id`, `name`, `region`, `area`, `country`, `difficulty`, `depth_min`, `depth_max`, `visibility`, `best_season`, `entry_types`, `marine_life`, `shops`, `description`, `rating`, `review_count`, `lat`, `lng`, `gradient`, `created_at`, `updated_at`) VALUES (4, '홍도 바위섬', '남해', '경남 통영', '대한민국', '상급', '10.0', '45.0', '8~20m', '9월 ~ 11월', '[\"보트\"]', '[\"방어떼\",\"부시리\",\"연산호\",\"해면\"]', '[\"통영마린\",\"남해블루\"]', '강한 조류와 대물 회유어종으로 유명한 상급자 포인트. 드리프트 다이빙 경험이 필요합니다.', '4.6', 94, '34.620000', '128.560000', 'deep', '2026-10-08 15:47:53', '2026-10-08 15:47:53');
INSERT INTO `dive_points` (`id`, `name`, `region`, `area`, `country`, `difficulty`, `depth_min`, `depth_max`, `visibility`, `best_season`, `entry_types`, `marine_life`, `shops`, `description`, `rating`, `review_count`, `lat`, `lng`, `gradient`, `created_at`, `updated_at`) VALUES (5, '모알보알 사디나 월', '해외', '세부', '필리핀', '초급', '3.0', '30.0', '20~40m', '연중 (11월~5월 최적)', '[\"비치\",\"보트\"]', '[\"정어리떼\",\"바다거북\",\"갯민숭달팽이\",\"잭피시\"]', '[\"모알보알 코리안샵\",\"세부블루워터\"]', '수백만 마리의 정어리떼 사디나런으로 유명. 비치에서 바로 입수 가능하고 바다거북을 자주 만납니다.', '4.9', 1024, '9.950000', '123.370000', 'lagoon', '2026-10-08 15:47:53', '2026-10-08 15:47:53');
INSERT INTO `dive_points` (`id`, `name`, `region`, `area`, `country`, `difficulty`, `depth_min`, `depth_max`, `visibility`, `best_season`, `entry_types`, `marine_life`, `shops`, `description`, `rating`, `review_count`, `lat`, `lng`, `gradient`, `created_at`, `updated_at`) VALUES (6, '아닐라오 트윈락', '해외', '바탕가스', '필리핀', '초급', '5.0', '25.0', '10~25m', '10월 ~ 5월', '[\"보트\"]', '[\"누디브랜치\",\"프로그피시\",\"고스트파이프피시\",\"만다린피시\"]', '[\"아닐라오 다이브리조트\"]', '마크로 촬영의 성지. 작고 신기한 생물을 찾는 재미가 있는 포인트로 수중사진가들에게 인기입니다.', '4.7', 540, '13.760000', '120.920000', 'coral', '2026-10-08 15:47:53', '2026-10-08 15:47:53');
INSERT INTO `dive_points` (`id`, `name`, `region`, `area`, `country`, `difficulty`, `depth_min`, `depth_max`, `visibility`, `best_season`, `entry_types`, `marine_life`, `shops`, `description`, `rating`, `review_count`, `lat`, `lng`, `gradient`, `created_at`, `updated_at`) VALUES (7, '섶섬', '제주', '서귀포', '대한민국', '중급', '5.0', '30.0', '10~20m', '6월 ~ 11월', '[\"보트\"]', '[\"파랑돔\",\"주걱치\",\"쥐치\",\"연산호\"]', '[\"서귀포 블루샵\",\"섶섬다이브\"]', '문섬과 함께 서귀포를 대표하는 포인트. 수중 동굴과 아치 지형이 인상적입니다.', '4.6', 201, '33.232000', '126.605000', 'sunset', '2026-10-08 15:47:53', '2026-10-08 15:47:53');
INSERT INTO `dive_points` (`id`, `name`, `region`, `area`, `country`, `difficulty`, `depth_min`, `depth_max`, `visibility`, `best_season`, `entry_types`, `marine_life`, `shops`, `description`, `rating`, `review_count`, `lat`, `lng`, `gradient`, `created_at`, `updated_at`) VALUES (8, '시밀란 엘리펀트헤드락', '해외', '푸켓', '태국', '상급', '8.0', '40.0', '20~35m', '11월 ~ 4월', '[\"보트\"]', '[\"만타\",\"레오파드상어\",\"바라쿠다\",\"거북\"]', '[\"시밀란 리브어보드\"]', '거대한 화강암 바위 사이를 통과하는 스윔스루 지형. 조류가 강해 경험이 필요합니다.', '4.8', 388, '8.650000', '97.640000', 'light', '2026-10-08 15:47:53', '2026-10-08 15:47:53');

-- dive_point_water_temps (96건)
DELETE FROM `dive_point_water_temps`;
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (1, 1, '14.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (1, 2, '14.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (1, 3, '15.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (1, 4, '16.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (1, 5, '18.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (1, 6, '21.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (1, 7, '24.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (1, 8, '26.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (1, 9, '25.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (1, 10, '22.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (1, 11, '19.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (1, 12, '16.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (2, 1, '8.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (2, 2, '7.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (2, 3, '8.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (2, 4, '10.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (2, 5, '13.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (2, 6, '16.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (2, 7, '19.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (2, 8, '22.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (2, 9, '21.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (2, 10, '18.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (2, 11, '14.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (2, 12, '11.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (3, 1, '11.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (3, 2, '10.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (3, 3, '11.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (3, 4, '12.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (3, 5, '15.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (3, 6, '18.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (3, 7, '22.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (3, 8, '25.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (3, 9, '24.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (3, 10, '20.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (3, 11, '16.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (3, 12, '13.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (4, 1, '12.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (4, 2, '11.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (4, 3, '12.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (4, 4, '14.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (4, 5, '17.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (4, 6, '20.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (4, 7, '23.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (4, 8, '25.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (4, 9, '24.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (4, 10, '21.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (4, 11, '17.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (4, 12, '14.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (5, 1, '26.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (5, 2, '26.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (5, 3, '27.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (5, 4, '28.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (5, 5, '29.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (5, 6, '29.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (5, 7, '29.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (5, 8, '29.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (5, 9, '29.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (5, 10, '28.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (5, 11, '28.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (5, 12, '27.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (6, 1, '25.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (6, 2, '25.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (6, 3, '26.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (6, 4, '28.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (6, 5, '29.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (6, 6, '29.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (6, 7, '29.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (6, 8, '28.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (6, 9, '28.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (6, 10, '28.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (6, 11, '27.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (6, 12, '26.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (7, 1, '14.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (7, 2, '14.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (7, 3, '15.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (7, 4, '16.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (7, 5, '18.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (7, 6, '21.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (7, 7, '24.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (7, 8, '26.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (7, 9, '25.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (7, 10, '22.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (7, 11, '19.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (7, 12, '16.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (8, 1, '28.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (8, 2, '28.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (8, 3, '29.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (8, 4, '29.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (8, 5, '29.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (8, 6, '29.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (8, 7, '28.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (8, 8, '28.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (8, 9, '28.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (8, 10, '28.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (8, 11, '28.0');
INSERT INTO `dive_point_water_temps` (`point_id`, `month`, `temp`) VALUES (8, 12, '28.0');

SET FOREIGN_KEY_CHECKS = 1;
