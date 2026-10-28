// 에디터 모듈 공개 API — 다른 프로젝트로 옮길 때 이 폴더만 복사하면 된다.
// 외부 의존은 react / @tiptap/* / lucide-react / tailwind 클래스뿐이고,
// 프로젝트별로 다른 건 `uploadImage` prop 하나로 주입한다.
export { RichEditor } from "./RichEditor";
export { schemaExtensions, ResizableImage, ALIGNABLE_TYPES } from "./schema";
export type { RichEditorProps, UploadImage, UploadedImage } from "./types";
