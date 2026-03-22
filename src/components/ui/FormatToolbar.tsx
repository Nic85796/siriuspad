/**
 * FormatToolbar — Discord-like floating formatting toolbar
 * Appears above selected text in the editor with Markdown formatting actions.
 *
 * Formats supported:
 *   **bold**, *italic*, _italic_, __underline__, ~~strikethrough~~,
 *   ||spoiler||, `inline code`, > blockquote, ```code block```
 */

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Quote,
  Code2,
  EyeOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { EditorView } from "@codemirror/view";

// ─── Types ─────────────────────────────────────────────

interface FormatAction {
  id: string;
  label: string;
  icon: typeof Bold;
  title: string;
  wrap?: [string, string]; // wrap selection with prefix + suffix
  line?: string;           // prefix the whole paragraph
}

// ─── Format definitions ────────────────────────────────

const FORMAT_ACTIONS: FormatAction[] = [
  {
    id: "bold",
    label: "B",
    icon: Bold,
    title: "Negrito (**bold**)",
    wrap: ["**", "**"],
  },
  {
    id: "italic",
    label: "I",
    icon: Italic,
    title: "Itálico (*italic*)",
    wrap: ["*", "*"],
  },
  {
    id: "underline",
    label: "U",
    icon: Underline,
    title: "Sublinhado (__underline__)",
    wrap: ["__", "__"],
  },
  {
    id: "strikethrough",
    label: "S",
    icon: Strikethrough,
    title: "Tachado (~~strike~~)",
    wrap: ["~~", "~~"],
  },
  {
    id: "spoiler",
    label: "||",
    icon: EyeOff,
    title: "Spoiler (||spoiler||)",
    wrap: ["||", "||"],
  },
  {
    id: "code",
    label: "`",
    icon: Code,
    title: "Código inline (`code`)",
    wrap: ["`", "`"],
  },
  {
    id: "codeblock",
    label: "</>",
    icon: Code2,
    title: "Bloco de código (```code```)",
    wrap: ["```\n", "\n```"],
  },
  {
    id: "quote",
    label: ">",
    icon: Quote,
    title: "Citação (> blockquote)",
    line: "> ",
  },
];

// ─── Apply format to CodeMirror selection ─────────────────

function applyFormat(view: EditorView, action: FormatAction) {
  const { state } = view;
  const { selection } = state;
  const mainRange = selection.main;
  const selectedText = state.sliceDoc(mainRange.from, mainRange.to);

  if (!selectedText) return;

  let newText: string;
  const newFrom = mainRange.from;
  let newTo: number;

  if (action.wrap) {
    const [pre, suf] = action.wrap;

    // Toggle: if already wrapped, unwrap
    if (selectedText.startsWith(pre) && selectedText.endsWith(suf)) {
      newText = selectedText.slice(pre.length, selectedText.length - suf.length);
    } else {
      newText = `${pre}${selectedText}${suf}`;
    }
    newTo = newFrom + newText.length;
  } else if (action.line) {
    const pre = action.line;
    newText = selectedText.startsWith(pre)
      ? selectedText.slice(pre.length)
      : `${pre}${selectedText}`;
    newTo = newFrom + newText.length;
  } else {
    return;
  }

  view.dispatch({
    changes: { from: mainRange.from, to: mainRange.to, insert: newText },
    selection: { anchor: newFrom, head: newTo },
  });

  view.focus();
}

// ─── Component ─────────────────────────────────────────

interface FormatToolbarProps {
  editorView: EditorView | null;
  /** The DOM container that wraps the CodeMirror editor */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface ToolbarPosition {
  x: number;
  y: number;
}

export function FormatToolbar({ editorView, containerRef }: FormatToolbarProps) {
  const [pos, setPos] = useState<ToolbarPosition | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  };

  const hide = useCallback(() => {
    setPos(null);
    setSelectedText("");
  }, []);

  const updateToolbar = useCallback(() => {
    if (!editorView) return;

    const { state } = editorView;
    const range = state.selection.main;

    if (range.empty) {
      hide();
      return;
    }

    const text = state.sliceDoc(range.from, range.to);
    if (!text.trim()) {
      hide();
      return;
    }

    setSelectedText(text);

    // Get screen coords of the selection start
    const domCoords = editorView.coordsAtPos(range.from);
    const domCoordsEnd = editorView.coordsAtPos(range.to);
    if (!domCoords || !domCoordsEnd) return;

    // Average of start and end for centering
    const midX = (domCoords.left + domCoordsEnd.right) / 2;
    const topY = domCoords.top;

    setPos({ x: midX, y: topY });
  }, [editorView, hide]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onUp = () => {
      clearHideTimeout();
      // Small delay to let CM finish updating selection
      hideTimeoutRef.current = setTimeout(updateToolbar, 60);
    };

    container.addEventListener("mouseup", onUp);
    container.addEventListener("keyup", onUp);

    return () => {
      container.removeEventListener("mouseup", onUp);
      container.removeEventListener("keyup", onUp);
      clearHideTimeout();
    };
  }, [containerRef, updateToolbar]);

  // Hide on click outside toolbar + editor
  useEffect(() => {
    const onMousedown = (e: MouseEvent) => {
      if (toolbarRef.current?.contains(e.target as Node)) return;
      hide();
    };
    document.addEventListener("mousedown", onMousedown);
    return () => document.removeEventListener("mousedown", onMousedown);
  }, [hide]);

  // Hide on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hide]);

  if (!pos || !selectedText) return null;

  const TOOLBAR_H = 40;
  const TOOLBAR_W = FORMAT_ACTIONS.length * 36 + 12;
  const OFFSET = 10;

  // Position above the selection, centered, clamped to viewport
  const left = Math.max(8, Math.min(pos.x - TOOLBAR_W / 2, window.innerWidth - TOOLBAR_W - 8));
  const top = pos.y - TOOLBAR_H - OFFSET;

  return createPortal(
    <div
      ref={toolbarRef}
      className="fixed z-[200] flex items-center gap-0.5 rounded-xl border border-border bg-elevated px-1.5 py-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      style={{
        left,
        top: Math.max(OFFSET, top),
        backdropFilter: "blur(8px)",
      }}
      onMouseDown={(e) => e.preventDefault()} // don't steal focus
    >
      {FORMAT_ACTIONS.map((action) => {
        const Icon = action.icon;
        const showDivider = action.id === "codeblock" || action.id === "quote";
      return (
          <div key={action.id} className="flex items-center">
            {showDivider && (
              <div className="mx-1 h-5 w-px shrink-0 rounded-full bg-border" />
            )}
            <button
              type="button"
              title={action.title}
              className="flex h-7 w-8 items-center justify-center rounded-lg text-text-secondary transition hover:bg-hover hover:text-text-primary"
              style={{
                fontFamily:
                  action.id === "code" || action.id === "spoiler" || action.id === "codeblock"
                    ? "monospace"
                    : undefined,
                fontSize:
                  action.id === "code" ? "13px"
                  : action.id === "codeblock" ? "9px"
                  : action.id === "spoiler" ? "11px"
                  : undefined,
                fontWeight:
                  action.id === "bold" ? 700
                  : action.id === "italic" ? undefined
                  : undefined,
                fontStyle: action.id === "italic" ? "italic" : undefined,
              }}
              onClick={() => {
                if (editorView) applyFormat(editorView, action);
                hide();
              }}
            >
              {action.id === "bold" ||
              action.id === "italic" ||
              action.id === "underline" ||
              action.id === "strikethrough" ||
              action.id === "quote" ? (
                <Icon className="h-3.5 w-3.5" />
              ) : (
                <span>{action.label}</span>
              )}
            </button>
          </div>
        );
      })}

      {/* Arrow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 border-x-[6px] border-t-[6px] border-x-transparent border-t-elevated"
        style={{ bottom: -6 }}
      />
    </div>,
    document.body,
  );
}
