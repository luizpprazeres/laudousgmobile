"use client";

import dynamic from "next/dynamic";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-white">
      <div className="font-mono text-xs text-stone-400">carregando editor…</div>
    </div>
  ),
});

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "12px",
    backgroundColor: "#ffffff",
  },
  ".cm-scroller": {
    fontFamily:
      "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace",
    lineHeight: "1.55",
    padding: "16px 0",
  },
  ".cm-gutters": {
    backgroundColor: "#fafaf9",
    borderRight: "1px solid #f5f5f4",
    color: "#a8a29e",
    paddingRight: "8px",
  },
  ".cm-activeLine": { backgroundColor: "#fafaf9" },
  ".cm-activeLineGutter": { backgroundColor: "#f5f5f4" },
  ".cm-cursor": { borderLeftColor: "#059669", borderLeftWidth: "2px" },
  ".cm-selectionBackground, ::selection": { backgroundColor: "#D1FAE5 !important" },
});

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function MarkdownEditor({ value, onChange }: Props) {
  return (
    <div className="flex-1 overflow-hidden bg-white">
      <CodeMirror
        basicSetup={{
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          foldGutter: false,
          lineNumbers: true,
          tabSize: 2,
        }}
        extensions={[markdown(), editorTheme, EditorView.lineWrapping]}
        height="100%"
        onChange={onChange}
        style={{ height: "100%" }}
        value={value}
      />
    </div>
  );
}
