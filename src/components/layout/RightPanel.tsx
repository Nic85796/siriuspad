import { Info, Palette, PencilLine, Tags, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { withAlpha } from "@/lib/color";
import { getDateFnsLocale } from "@/lib/date";
import { NOTE_COLOR_SWATCHES } from "@/lib/constants";
import { NoteBlocks } from "@/components/editor/NoteBlocks";
import { PriorityDot } from "@/components/ui/PriorityDot";
import { TagPill } from "@/components/ui/TagPill";
import type { ChecklistItem, Note, NoteMetadata } from "@/types";

const RIGHT_PANEL_WIDTH_KEY = "siriuspad:right-panel-width:v1";
const RIGHT_PANEL_MIN_WIDTH = 220;
const RIGHT_PANEL_MAX_WIDTH = 480;

interface RightPanelProps {
  note: Note | null;
  notes: NoteMetadata[];
  activeTag: string | null;
  onTagClick: (tag: string | null) => void;
  onNoteChange: (patch: Partial<Note>) => void;
  onRenameNote: () => void;
  onColorSelect: (color?: string) => void;
  onInsertCallout: (input: {
    tone: "note" | "tip" | "warning";
    title?: string;
    color?: string;
  }) => void;
  mobile?: boolean;
}

function clampPanelWidth(value: number) {
  return Math.min(RIGHT_PANEL_MAX_WIDTH, Math.max(RIGHT_PANEL_MIN_WIDTH, value));
}

function wordCount(content: string) {
  return content.trim() ? content.trim().split(/\s+/).length : 0;
}

function normalizeHexColor(value: string) {
  const normalized = value.trim().replace(/[^#0-9a-f]/gi, "");

  if (!normalized) {
    return null;
  }

  const withHash = normalized.startsWith("#") ? normalized : `#${normalized}`;
  const shortHex = /^#([0-9a-f]{3})$/i;
  const longHex = /^#([0-9a-f]{6})$/i;

  if (longHex.test(withHash)) {
    return withHash.toLowerCase();
  }

  const shortMatch = withHash.match(shortHex);
  if (!shortMatch) {
    return null;
  }

  return `#${shortMatch[1]
    .split("")
    .map((char) => `${char}${char}`)
    .join("")
    .toLowerCase()}`;
}

function sectionTitleClassName() {
  return "mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted";
}

function sectionCardClassName() {
  return "mb-4 rounded-lg border border-border bg-surface p-3";
}

function panelInputClassName() {
  return "h-9 w-full rounded-md border border-border bg-base px-3 text-sm text-text-primary outline-none placeholder:text-text-muted transition focus:border-focus";
}

export function RightPanel({
  note,
  notes,
  activeTag,
  onTagClick,
  onNoteChange,
  onRenameNote,
  onColorSelect,
  onInsertCallout,
  mobile = false,
}: RightPanelProps) {
  const { t, i18n } = useTranslation();
  const [mobileSection, setMobileSection] = useState<"tools" | "tags" | "info">(
    "tools",
  );
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window === "undefined") {
      return 288;
    }

    const storedValue = Number(window.localStorage.getItem(RIGHT_PANEL_WIDTH_KEY));
    return Number.isFinite(storedValue)
      ? clampPanelWidth(storedValue)
      : 288;
  });
  const [customColor, setCustomColor] = useState(
    note?.color ?? NOTE_COLOR_SWATCHES[4],
  );
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );
  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();

    notes.forEach((item) => {
      item.tags.forEach((tag) => {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      });
    });

    return Array.from(map.entries()).sort((left, right) =>
      left[0].localeCompare(right[0]),
    );
  }, [notes]);

  const checklist = note?.checklist ?? [];
  const checklistDoneCount = checklist.filter((item) => item.done).length;
  const normalizedCustomColor = normalizeHexColor(customColor);
  const sectionTint = note?.color ? withAlpha(note.color, 0.08) : undefined;
  const shortcuts = [
    { key: "Ctrl+N", label: t("commands.newNote") },
    { key: "Ctrl+S", label: t("common.save") },
    { key: "Ctrl+K", label: t("commands.commandPalette") },
    { key: "Ctrl+F", label: t("titlebar.search") },
    { key: "Ctrl+`", label: t("terminal.toggle") },
    { key: "Ctrl+Enter", label: t("terminal.run") },
  ];

  const updateChecklist = (nextChecklist: ChecklistItem[]) => {
    onNoteChange({
      checklist: nextChecklist,
    });
  };

  useEffect(() => {
    if (mobile || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(RIGHT_PANEL_WIDTH_KEY, String(panelWidth));
  }, [mobile, panelWidth]);

  useEffect(() => {
    if (mobile) {
      return;
    }

    const handlePointerMove = (event: MouseEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) {
        return;
      }

      const delta = resizeState.startX - event.clientX;
      setPanelWidth(clampPanelWidth(resizeState.startWidth + delta));
    };

    const handlePointerUp = () => {
      if (!resizeStateRef.current) {
        return;
      }

      resizeStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [mobile]);

  return (
    <aside
      className={`${
        mobile
          ? "motion-fade-up flex h-[min(78svh,760px)] w-full flex-col overflow-hidden rounded-t-[12px] border border-b-0 border-border bg-surface"
          : "motion-slide-right relative flex h-full shrink-0 flex-col overflow-hidden border-l border-border bg-surface"
      }`}
      style={
        mobile
          ? {
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }
          : {
              width: `${panelWidth}px`,
              minWidth: `${panelWidth}px`,
              maxWidth: `${panelWidth}px`,
            }
      }
    >
      {!mobile ? (
        <button
          type="button"
          className="absolute inset-y-0 left-0 z-20 w-3 -translate-x-1/2 cursor-col-resize bg-transparent"
          onMouseDown={(event) => {
            event.preventDefault();
            resizeStateRef.current = {
              startX: event.clientX,
              startWidth: panelWidth,
            };
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
          aria-label={t("rightPanel.resize")}
          title={t("rightPanel.resize")}
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition group-hover:bg-accent" />
        </button>
      ) : null}

      {mobile ? (
        <div className="border-b border-border px-3 pb-3 pt-2">
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-border" />
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
                {t("rightPanel.noteTools")}
              </p>
              <p className="mt-1 truncate text-sm text-text-primary">
                {note?.title || t("common.untitled")}
              </p>
            </div>
          <div className="flex items-center gap-2 rounded-md border border-border bg-base px-2 py-1 text-[11px] text-text-secondary">
              <span
                className="h-2.5 w-2.5 rounded-full border border-white/10"
                style={{ backgroundColor: note?.color ?? "#2a2a2a" }}
              />
              {note?.color ?? t("common.none")}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "tools" as const, icon: Palette, label: t("rightPanel.noteTools") },
              { key: "tags" as const, icon: Tags, label: t("rightPanel.filterTags") },
              { key: "info" as const, icon: Info, label: t("rightPanel.info") },
            ].map((item) => {
              const active = mobileSection === item.key;
              const Icon = item.icon;

              return (
                <button
                  key={item.key}
                  type="button"
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[11px] transition ${
                    active
                      ? "border-[#2d2060] bg-[rgba(124,58,237,0.12)] text-text-primary"
                      : "border-border bg-base text-text-secondary hover:border-focus hover:bg-hover hover:text-text-primary"
                  }`}
                  onClick={() => setMobileSection(item.key)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3">
        {!mobile || mobileSection === "tools" ? (
        <section
          className={`${sectionCardClassName()} motion-fade-up surface-hover`}
          style={{
            backgroundImage: sectionTint
              ? `linear-gradient(180deg, ${sectionTint}, transparent 85%)`
              : undefined,
            animationDelay: "40ms",
          }}
        >
          <h2 className={sectionTitleClassName()}>
            {t("rightPanel.noteTools")}
          </h2>
          {!mobile ? (
            <p className="mb-3 text-xs leading-6 text-text-secondary">
              {note
                ? t("rightPanel.noteToolsHint")
                : t("rightPanel.noteToolsEmpty")}
            </p>
          ) : null}

          {note ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-border bg-base px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-text-secondary">
                  {t("note.priorityLabel")}:{" "}
                  {t(`priority.${note.priority ?? "media"}`)}
                </span>
                <span className="rounded-md border border-border bg-base px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-text-secondary">
                  {t("note.languageLabel")}: {note.language}
                </span>
              </div>

              <div className="mb-3 rounded-md border border-border bg-base px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/10"
                    style={{ backgroundColor: note.color ?? "#2a2a2a" }}
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">
                      {t("note.titlePlaceholder")}
                    </p>
                    <p className="mt-1 truncate text-sm text-text-primary">
                      {note.title || t("common.untitled")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-3 grid min-w-0 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-md border border-border bg-base px-3 py-2 text-xs text-text-primary transition hover:border-focus hover:bg-hover"
                  onClick={onRenameNote}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  {t("note.renameAction")}
                </button>
                <button
                  type="button"
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-md border border-border bg-base px-3 py-2 text-xs text-text-secondary transition hover:border-[#4a2020] hover:bg-[#2d1515] hover:text-[#f87171] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => updateChecklist([])}
                  disabled={!checklist.length}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("note.checklistClear")}
                </button>
              </div>

              <div className="mb-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">
                    {t("note.colorLabel")}
                  </p>
                  <span className="rounded-md border border-border bg-base px-2 py-1 text-[10px] text-text-secondary">
                    {note.color ?? t("common.none")}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {NOTE_COLOR_SWATCHES.map((swatch) => {
                    const selected = note.color === swatch;

                    return (
                      <button
                        key={swatch}
                        type="button"
                        className={`h-9 rounded-md border transition ${
                          selected
                            ? "border-white/50 ring-1 ring-white/35"
                            : "border-border hover:border-focus"
                        }`}
                        style={{ backgroundColor: swatch }}
                        onClick={() =>
                          onColorSelect(selected ? undefined : swatch)
                        }
                        aria-label={`${t("note.colorLabel")}: ${swatch}`}
                        aria-pressed={selected}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-base px-2 py-2">
                  <input
                    type="color"
                    className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
                    value={normalizedCustomColor ?? "#7c3aed"}
                    onChange={(event) => {
                      setCustomColor(event.target.value);
                      onColorSelect(event.target.value);
                    }}
                    aria-label={t("rightPanel.customColor")}
                  />
                  <input
                    className={`${panelInputClassName()} h-8 min-w-0 flex-1 px-2.5 text-[12px]`}
                    placeholder="#7c3aed"
                    value={customColor}
                    onChange={(event) => setCustomColor(event.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="min-w-[120px] flex-1 rounded-md border border-border bg-elevated px-3 py-2 text-xs text-text-primary transition hover:border-focus hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => {
                      if (normalizedCustomColor) {
                        onColorSelect(normalizedCustomColor);
                      }
                    }}
                    disabled={!normalizedCustomColor}
                  >
                    {t("rightPanel.applyColor")}
                  </button>
                  <button
                    type="button"
                    className="min-w-[92px] rounded-md border border-border bg-base px-3 py-2 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
                    onClick={() => onColorSelect(undefined)}
                  >
                    {t("rightPanel.clearColor")}
                  </button>
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <NoteBlocks
                  note={note}
                  onNoteChange={onNoteChange}
                  onInsertCallout={onInsertCallout}
                  embedded
                />
              </div>
            </>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-base px-3 py-4 text-sm text-text-secondary">
              {t("rightPanel.noteToolsEmpty")}
            </div>
          )}
        </section>
        ) : null}

        {!mobile || mobileSection === "tags" ? (
        <section
          className="motion-fade-up mb-5"
          style={{ animationDelay: "140ms" }}
        >
          <h2 className={sectionTitleClassName()}>
            {t("rightPanel.filterTags")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {tagCounts.length ? (
              tagCounts.map(([tag, count]) => (
                <TagPill
                  key={tag}
                  tag={`${tag} · ${count}`}
                  compact
                  active={activeTag === tag}
                  onClick={() => onTagClick(activeTag === tag ? null : tag)}
                />
              ))
            ) : (
              <p className="text-xs text-text-secondary">
                {t("rightPanel.noTags")}
              </p>
            )}
          </div>
        </section>
        ) : null}

        {!mobile || mobileSection === "info" ? (
        <section
          className="motion-fade-up mb-5"
          style={{ animationDelay: "190ms" }}
        >
          <h2 className={sectionTitleClassName()}>{t("rightPanel.info")}</h2>
          <div className="grid gap-2 rounded-md border border-border bg-surface p-3 text-xs text-text-secondary">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{t("rightPanel.createdAt")}</span>
              <span className="text-right text-text-primary">
                {note
                  ? format(new Date(note.created_at), "dd/MM/yyyy HH:mm", {
                      locale: getDateFnsLocale(i18n.language),
                    })
                  : "—"}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{t("rightPanel.words")}</span>
              <span className="text-text-primary">
                {note ? wordCount(note.content) : 0}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{t("note.priorityLabel")}</span>
              <PriorityDot
                priority={note?.priority}
                label={note ? t(`priority.${note.priority ?? "media"}`) : "—"}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{t("note.checklistTitle")}</span>
              <span className="text-text-primary">
                {checklistDoneCount}/{checklist.length}
              </span>
            </div>
          </div>
        </section>
        ) : null}

        {!mobile ? (
        <section className="motion-fade-up" style={{ animationDelay: "240ms" }}>
          <h2 className={sectionTitleClassName()}>
            {t("rightPanel.shortcuts")}
          </h2>
          <div className="grid gap-2 rounded-md border border-border bg-surface p-3 text-[11px] text-text-secondary">
            {shortcuts.map((item) => (
              <div
                key={item.key}
                className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-md border border-transparent bg-base px-2.5 py-2"
              >
                <span className="rounded-md border border-border bg-elevated px-2 py-1 text-text-primary">
                  {item.key}
                </span>
                <span className="text-right">{item.label}</span>
              </div>
            ))}
          </div>
        </section>
        ) : null}
      </div>
    </aside>
  );
}
