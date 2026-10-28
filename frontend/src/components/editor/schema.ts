// ⚠️ 이 파일은 backend/src/lib/editor-schema.ts 와 내용이 같아야 한다.
//    서버가 같은 스키마로 JSON → HTML 을 만들기 때문에, 한쪽만 고치면
//    웹에서 쓴 노드가 서버에서 조용히 사라진다.
//    backend 의 `npm run check:schema` 가 두 파일을 비교해 어긋나면 실패시킨다.
//
// React/DOM 에 의존하는 코드를 여기에 넣지 말 것 — 서버(Node)에서도 그대로 불린다.
import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";

/** 본문에서 정렬을 적용할 노드들 — 이미지가 포함돼야 이미지도 정렬된다 */
export const ALIGNABLE_TYPES = ["heading", "paragraph", "image"];

/**
 * 크기·정렬 속성을 가진 이미지 노드.
 *
 * width 는 "화면 폭 대비 %" 로 저장한다. px 로 저장하면 모바일이나
 * 앱 WebView 처럼 폭이 다른 환경에서 잘리기 때문이다.
 */
export const MIN_IMAGE_WIDTH = 10;
export const MAX_IMAGE_WIDTH = 100;

/**
 * 폭 값 정규화.
 *
 * contentJson 은 클라이언트가 그대로 보내는 값이라 숫자라는 보장이 없다.
 * 문자열·객체·범위 밖 숫자는 전부 버린다 — 걸러내지 않으면 공격자가 넣은
 * 문자열이 그대로 HTML 속성에 실려 나간다.
 */
export function normalizeImageWidth(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < MIN_IMAGE_WIDTH || rounded > MAX_IMAGE_WIDTH) return null;
  return rounded;
}

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null as number | null,
        parseHTML: (element) => normalizeImageWidth(element.getAttribute("data-width")),
        renderHTML: (attributes) => {
          const width = normalizeImageWidth(attributes.width);
          if (!width) return {};
          return { "data-width": String(width), style: `width:${width}%` };
        },
      },
    };
  },
});

/**
 * 에디터 확장 목록 (스키마).
 * 클라이언트는 여기에 NodeView·Placeholder 를 덧붙여 쓴다.
 */
export const schemaExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: {
      openOnClick: false,
      autolink: true,
      protocols: ["http", "https"],
      HTMLAttributes: { rel: "nofollow noopener noreferrer", target: "_blank" },
    },
  }),
  ResizableImage,
  TableKit.configure({ table: { resizable: true, HTMLAttributes: { class: "editor-table" } } }),
  TextAlign.configure({ types: ALIGNABLE_TYPES }),
];
