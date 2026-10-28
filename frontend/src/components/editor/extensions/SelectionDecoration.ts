import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * 범위 선택에 걸린 이미지·구분선에 선택 표시를 붙인다.
 *
 * 브라우저는 글자만 칠해 준다. 이미지처럼 글자가 아닌 노드는 범위 안에 들어 있어도
 * 아무 표시가 없어서, 전체 선택(Ctrl+A)을 해도 이미지만 선택이 안 된 것처럼 보였다.
 *
 * ProseMirror 가 기본으로 주는 `ProseMirror-selectednode` 는 노드 하나를 콕 집어
 * 선택했을 때(클릭)만 붙는다. 범위 선택은 따로 그려 줘야 한다.
 */
export const SelectionDecoration = Extension.create({
  name: "selectionDecoration",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("selectionDecoration"),
        props: {
          decorations(state) {
            const { selection } = state;
            if (selection.empty) return null;
            // 이미지를 클릭해 하나만 고른 경우는 ProseMirror 가 이미 표시해 주고
            // 크기 조절 핸들도 뜬다 — 덮개까지 씌우면 핸들이 가려진다
            if (selection instanceof NodeSelection) return null;

            const { from, to } = selection;

            const decorations: Decoration[] = [];
            state.doc.nodesBetween(from, to, (node, pos) => {
              // 글자와 문단은 브라우저가 알아서 칠한다. 이미지·구분선처럼
              // 안에 글자가 없는 노드만 손으로 표시한다.
              if (!node.isLeaf || node.isText) return true;
              // 일부만 걸친 건 제외 — 온전히 들어온 것만 선택으로 본다
              if (pos >= from && pos + node.nodeSize <= to) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, { class: "is-range-selected" }),
                );
              }
              return true;
            });

            return decorations.length ? DecorationSet.create(state.doc, decorations) : null;
          },
        },
      }),
    ];
  },
});
