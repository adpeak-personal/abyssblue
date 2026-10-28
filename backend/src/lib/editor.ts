// 본문(ProseMirror JSON) → HTML / 평문 변환
//
// 스키마 자체는 editor-schema.ts 에 있고 프론트와 동일해야 한다.
// `npm run check:schema` 가 두 파일을 비교한다.
import { generateText, type JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html";
import sanitizeHtml from "sanitize-html";
import { schemaExtensions } from "./editor-schema.js";
import { publicUrl, toKey, toRelativeIfOurs } from "./storage.js";

export const editorExtensions = schemaExtensions;


/**
 * 살균 정책 — 위 확장들이 만들어내는 태그만 남긴다.
 * 스키마로 이미 한 번 걸러지지만, href/src 의 javascript: 같은 건 따로 막아야 한다.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "s", "u", "code", "pre",
    "h2", "h3", "blockquote", "hr",
    "ul", "ol", "li",
    "a", "img",
    "table", "tbody", "thead", "tr", "th", "td", "colgroup", "col",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    // data-width: 크기 조절 결과(%), style: 폭과 정렬
    img: ["src", "alt", "title", "width", "height", "class", "style", "data-width"],
    p: ["style"],
    h2: ["style"],
    h3: ["style"],
    th: ["colspan", "rowspan", "colwidth", "style"],
    td: ["colspan", "rowspan", "colwidth", "style"],
    col: ["style"],
    table: ["class"],
  },
  // http/https/mailto 외의 스킴(javascript:, data: 등)은 제거
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  // 상대경로(로컬 저장소)와 CDN 절대주소를 모두 허용한다
  // 상대경로 허용 — 업로드 이미지는 "/uploads/..." 로 저장된다
  allowProtocolRelative: false,
  allowedStyles: {
    img: { width: [/^\d{1,3}(\.\d+)?%$/], "text-align": [/^(left|center|right|justify)$/] },
    p: { "text-align": [/^(left|center|right|justify)$/] },
    h2: { "text-align": [/^(left|center|right|justify)$/] },
    h3: { "text-align": [/^(left|center|right|justify)$/] },
    "*": { width: [/^\d+(?:px|%)$/], "min-width": [/^\d+px$/] },
  },
  transformTags: {
    // 외부 링크는 항상 새 탭 + 리퍼러 차단
    a: sanitizeHtml.simpleTransform("a", { rel: "nofollow noopener noreferrer", target: "_blank" }),
  },
};

export class InvalidContentError extends Error {}

/**
 * 우리가 저장한 이미지 경로인지 — `/2026/10/12/<uuid>.webp` 형태.
 *
 * 날짜 폴더(`/일`)는 나중에 들어왔다. 그 전에 올라간 파일은 `/2026/10/<uuid>.webp` 로
 * 남아 있으므로 둘 다 받아야 한다 — 안 그러면 예전 글의 이미지가 "남의 이미지" 로
 * 취급돼 썸네일도, HTML 의 CDN 주소 변환도 안 된다.
 *
 * 외부 URL(http…)도 본문에는 들어올 수 있지만 썸네일로는 쓰지 않는다.
 */
const OWN_IMAGE = /^\/\d{4}\/\d{2}(\/\d{2})?\/[0-9a-f-]{36}(_\w+)?\.\w+$/i;

export const isOwnImage = (src: unknown): src is string =>
  typeof src === "string" && OWN_IMAGE.test(src);

/** 문서를 훑어 본문 이미지 경로를 등장 순서대로 모은다 (목록 썸네일용) */
export function collectImages(doc: JSONContent): string[] {
  const found: string[] = [];
  const walk = (node: JSONContent) => {
    if (node.type === "image" && isOwnImage(node.attrs?.src)) found.push(node.attrs.src);
    node.content?.forEach(walk);
  };
  walk(doc);
  return found;
}

/**
 * 저장 전 정규화 — 이미지 src 에서 우리 도메인을 떼어낸다.
 *
 * 업로드 응답은 에디터가 바로 띄울 수 있게 전체 URL 을 주므로, 클라이언트가 보내는
 * 본문에는 CDN 주소가 들어 있다. 정본에는 경로만 남겨야 CDN 도메인 교체가 자유롭다.
 */
export function normalizeImages(doc: JSONContent): JSONContent {
  if (doc.type === "image" && typeof doc.attrs?.src === "string") {
    return { ...doc, attrs: { ...doc.attrs, src: toRelativeIfOurs(doc.attrs.src) } };
  }
  if (!doc.content) return doc;
  return { ...doc, content: doc.content.map(normalizeImages) };
}

/**
 * HTML 을 만들기 전에 이미지 경로를 전체 URL 로 바꾼다.
 *
 * 정본(content_json)에는 도메인 없는 경로만 남기고, 파생 HTML 에만 CDN 주소를 박는다.
 * 그래야 CDN 도메인이 바뀌어도 HTML 만 다시 만들면 되고 본문은 안 건드린다.
 */
export function withAbsoluteImages(doc: JSONContent): JSONContent {
  if (doc.type === "image" && isOwnImage(doc.attrs?.src)) {
    return { ...doc, attrs: { ...doc.attrs, src: publicUrl(toKey(doc.attrs.src)) } };
  }
  if (!doc.content) return doc;
  return { ...doc, content: doc.content.map(withAbsoluteImages) };
}

/** ProseMirror JSON → { html(살균됨), text(검색·목록 미리보기용) } */
export function renderContent(doc: JSONContent) {
  let html: string;
  let text: string;
  try {
    html = generateHTML(withAbsoluteImages(doc), editorExtensions);
    text = generateText(doc, editorExtensions);
  } catch {
    // 스키마에 맞지 않는 문서 — 클라이언트 잘못이므로 400 으로 돌려준다
    throw new InvalidContentError("본문 형식이 올바르지 않습니다.");
  }
  return { html: sanitizeHtml(html, SANITIZE_OPTIONS), text: text.trim() };
}

