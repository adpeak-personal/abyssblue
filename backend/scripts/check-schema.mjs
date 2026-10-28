// 에디터 스키마가 프론트와 어긋나지 않았는지 검사한다.
//
// 두 파일이 다르면 웹에서 쓴 노드가 서버 변환에서 조용히 사라진다.
// 첫 줄의 "상대 파일을 가리키는 주석"만 다른 게 정상이므로 그 줄은 비교에서 뺀다.
//
// 프론트가 없는 환경(도커 빌드 등)에서는 건너뛴다.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.join(here, "../src/lib/editor-schema.ts");
const FRONTEND = path.join(here, "../../frontend/src/components/editor/schema.ts");

/**
 * 비교용 정규화.
 * - CRLF/LF 차이는 무시한다 (Windows 와 CI 가 섞이면 헛경보가 난다)
 * - 서로를 가리키는 첫 줄 주석은 다를 수밖에 없으므로 제외
 * - 줄 끝 공백과 파일 끝 빈 줄도 무시
 */
const normalize = (text) =>
  text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !line.startsWith("// ⚠️ 이 파일은"))
    .map((line) => line.trimEnd())
    .join("\n")
    .trimEnd();

const read = async (p) => {
  try {
    return await readFile(p, "utf8");
  } catch {
    return null;
  }
};

const [backend, frontend] = await Promise.all([read(BACKEND), read(FRONTEND)]);

if (!frontend) {
  console.log("⏭  프론트 스키마를 찾을 수 없어 건너뜁니다:", FRONTEND);
  process.exit(0);
}
if (!backend) {
  console.error("❌ 백엔드 스키마가 없습니다:", BACKEND);
  process.exit(1);
}

if (normalize(backend) !== normalize(frontend)) {
  console.error("❌ 에디터 스키마가 프론트와 다릅니다.");
  console.error("   backend : " + BACKEND);
  console.error("   frontend: " + FRONTEND);
  console.error("   한쪽만 고치면 웹에서 쓴 노드가 서버 변환에서 사라집니다. 양쪽을 맞춰주세요.");
  process.exit(1);
}

console.log("✅ 에디터 스키마 동기화 확인");
