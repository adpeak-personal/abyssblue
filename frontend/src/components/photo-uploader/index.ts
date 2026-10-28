// 사진 업로더 모듈 공개 API — 다른 프로젝트로 옮길 때 이 폴더만 복사하면 된다.
// 외부 의존: react / @dnd-kit/* / lucide-react / tailwind 클래스.
// 프로젝트별로 다른 건 `uploadImage` prop 하나로 주입한다.
export { PhotoUploader } from "./PhotoUploader";
export { ACCEPTED_IMAGE_TYPES } from "./types";
export type { PhotoItem, PhotoUploaderProps, UploadImage, UploadedImage } from "./types";
