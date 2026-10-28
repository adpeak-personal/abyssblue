"use client";

import { useCallback, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { ImagePlus, Loader2 } from "lucide-react";
import { SortablePhoto } from "./SortablePhoto";
import { cn } from "./lib/cn";
import { ACCEPTED_IMAGE_TYPES, type PhotoItem, type PhotoUploaderProps } from "./types";

/**
 * 사진 업로더 — 여러 장 올리고 끌어서 순서를 바꾼다.
 *
 * 에디터 없이 "사진 + 글" 로만 쓰는 게시판용. 첫 장이 대표 사진이다.
 * 프로젝트에 묶이는 건 `uploadImage` 하나뿐이고, 결과는 PhotoItem 배열로만 돌려준다 —
 * 저장 포맷 변환은 이 모듈이 관여하지 않는다.
 */
export function PhotoUploader({
  photos,
  onChange,
  uploadImage,
  maxCount = 30,
  showCaptions = true,
  className,
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const sensors = useSensors(
    // 살짝 끌어야 드래그로 인식 — 탭이 드래그로 먹히지 않게
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => ACCEPTED_IMAGE_TYPES.includes(f.type));
      if (images.length === 0) return;

      const room = maxCount - photos.length;
      if (room <= 0) {
        setError(`사진은 최대 ${maxCount}장까지 올릴 수 있어요.`);
        return;
      }
      const targets = images.slice(0, room);
      setError(images.length > room ? `최대 ${maxCount}장까지라서 ${targets.length}장만 올렸어요.` : null);

      setUploading(targets.length);
      const added: PhotoItem[] = [];
      try {
        for (const file of targets) {
          const { url } = await uploadImage(file);
          added.push({ id: crypto.randomUUID(), url, caption: "" });
          setUploading((n) => n - 1);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "사진을 올리지 못했어요.");
      } finally {
        setUploading(0);
        // 중간에 실패해도 이미 올라간 건 살린다
        if (added.length) onChange([...photos, ...added]);
      }
    },
    [photos, onChange, uploadImage, maxCount],
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = photos.findIndex((p) => p.id === active.id);
    const to = photos.findIndex((p) => p.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(photos, from, to));
  };

  const pick = () => fileInputRef.current?.click();

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void addFiles([...e.dataTransfer.files]);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed p-4 transition",
          dragOver ? "border-ocean-400 bg-ocean-50/50" : "border-gray-200",
        )}
      >
        {photos.length === 0 && uploading === 0 ? (
          <button
            type="button"
            onClick={pick}
            className="flex w-full flex-col items-center gap-2 py-10 text-gray-400 hover:text-ocean-600"
          >
            <ImagePlus size={32} />
            <span className="text-sm font-medium">사진 추가</span>
            <span className="text-xs">끌어다 놓거나 눌러서 선택 · 최대 {maxCount}장</span>
          </button>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((photo, i) => (
                  <SortablePhoto
                    key={photo.id}
                    photo={photo}
                    index={i}
                    showCaption={showCaptions}
                    onRemove={() => onChange(photos.filter((p) => p.id !== photo.id))}
                    onCaption={(caption) =>
                      onChange(photos.map((p) => (p.id === photo.id ? { ...p, caption } : p)))
                    }
                  />
                ))}

                {uploading > 0 && (
                  <li className="flex aspect-square items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400">
                    <span className="flex flex-col items-center gap-1 text-xs">
                      <Loader2 size={20} className="animate-spin" />
                      {uploading}장 올리는 중
                    </span>
                  </li>
                )}

                {photos.length < maxCount && uploading === 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={pick}
                      className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-ocean-400 hover:text-ocean-600"
                    >
                      <ImagePlus size={22} />
                      <span className="text-xs">추가</span>
                    </button>
                  </li>
                )}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        multiple
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = ""; // 같은 파일을 연속으로 고를 수 있게 초기화
          void addFiles(files);
        }}
        className="hidden"
      />

      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
        <span>
          {photos.length} / {maxCount}장
        </span>
        {photos.length > 1 && <span>· 손잡이를 끌어 순서를 바꾸면 첫 장이 대표 사진이 됩니다</span>}
      </p>

      {error && (
        <p role="alert" className="mt-1 text-xs text-coral-500">
          {error}
        </p>
      )}
    </div>
  );
}
