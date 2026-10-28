import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ALIGNABLE_TYPES } from "../schema";

/** 자동 정렬에서 제외할 부모 — 표 셀 */
const CELL_TYPES = new Set(["tableCell", "tableHeader"]);

export interface StickyAlignStorage {
  /** 마지막으로 고른 정렬. 기본값(왼쪽)이면 null */
  last: string | null;
}

declare module "@tiptap/core" {
  interface Storage {
    stickyAlign: StickyAlignStorage;
  }
}

/**
 * 정렬 고정.
 *
 * 툴바에서 고른 정렬을 기억해 두고, 그 뒤에 새로 생기는 **빈 블록**에 같은 정렬을 붙인다.
 * 이미지를 넣으면 뒤에 빈 문단이 자동으로 따라붙는데(trailingNode), 그 문단은
 * 기존 문단을 쪼갠 게 아니라 새로 만들어진 것이라 정렬을 물려받지 못했다.
 *
 * 내용이 있는 블록은 절대 건드리지 않는다 — 남이 쓴 글의 정렬을 멋대로 바꾸면 안 된다.
 * 되돌리기 기록에도 남기지 않는다(addToHistory: false). 사용자가 한 동작이 아니라
 * 따라붙는 보정이라, undo 를 눌렀을 때 정렬만 한 번 풀리면 이상하기 때문이다.
 *
 * 스키마가 아니라 편집 동작이라서 schema.ts 에 넣지 않는다 (서버는 필요 없다).
 */
export const StickyAlign = Extension.create({
  name: "stickyAlign",

  addStorage(): StickyAlignStorage {
    return { last: null };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    const types = new Set(ALIGNABLE_TYPES);

    return [
      new Plugin({
        key: new PluginKey("stickyAlign"),
        appendTransaction: (transactions, _oldState, newState) => {
          const align = storage.last;
          if (!align) return null;
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const tr = newState.tr;
          let changed = false;

          newState.doc.descendants((node, pos, parent) => {
            if (!types.has(node.type.name)) return;
            // 표 셀은 제외 — 표를 넣을 때 빈 셀이 전부 끌려가면 곤란하다.
            // 셀을 직접 골라서 정렬하는 건 툴바로 그대로 된다.
            if (parent && CELL_TYPES.has(parent.type.name)) return;
            // 비어 있고 아직 정렬이 없는 블록만 — 내용이 있으면 손대지 않는다
            if (node.content.size > 0) return;
            if (node.attrs.textAlign) return;

            tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign: align });
            changed = true;
          });

          if (!changed) return null;
          return tr.setMeta("addToHistory", false);
        },
      }),
    ];
  },
});

/** 툴바에서 정렬을 고를 때 호출 — 기본값(왼쪽)이면 고정을 해제한다 */
export function rememberAlign(storage: StickyAlignStorage, align: string) {
  storage.last = align === "left" ? null : align;
}
