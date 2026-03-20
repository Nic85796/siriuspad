import { format } from "date-fns";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { withAlpha } from "@/lib/color";
import { getDateFnsLocale } from "@/lib/date";
import { NOTE_COLOR_SWATCHES } from "@/lib/constants";
import { PriorityDot } from "@/components/ui/PriorityDot";
import { TagPill } from "@/components/ui/TagPill";
import type { Note, NoteMetadata } from "@/types";

interface RightPanelProps {
  note: Note | null;
  notes: NoteMetadata[];
  activeTag: string | null;
  onTagClick: (tag: string | null) => void;
  onColorSelect: (color?: string) => void;
  mobile?: boolean;
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
  return "mb-4 rounded-lg border border-border bg-[#111111] p-3";
}

function panelInputClassName() {
  return "h-9 w-full rounded-md border border-border bg-[#101010] px-3 text-sm text-text-primary outline-none placeholder:text-text-muted transition focus:border-focus";
}

export function RightPanel({
  note,
  notes,
  activeTag,
  onTagClick,
  onColorSelect,
  mobile = false,
}: RightPanelProps) {
  const { t, i18n } = useTranslation();
  const [customColor, setCustomColor] = useState(
    note?.color ?? NOTE_COLOR_SWATCHES[4],
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

  return (
    <aside
      className={`${
        mobile
          ? "motion-fade-up flex h-[72vh] w-full flex-col rounded-t-[12px] border border-b-0 border-border bg-[#0f0f0f]"
          : "motion-slide-right flex h-full w-[288px] shrink-0 flex-col border-l border-border bg-[#0f0f0f]"
      }`}
      style={
        mobile
          ? {
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }
          : undefined
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
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
          <p className="mb-3 text-xs leading-6 text-text-secondary">
            {note
              ? t("rightPanel.noteToolsHint")
              : t("rightPanel.noteToolsEmpty")}
          </p>

          {note ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-border bg-[#0f0f0f] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-text-secondary">
                  {t("note.priorityLabel")}:{" "}
                  {t(`priority.${note.priority ?? "media"}`)}
                </span>
                <span className="rounded-md border border-border bg-[#0f0f0f] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-text-secondary">
                  {t("note.languageLabel")}: {note.language}
                </span>
              </div>

              <div className="mb-3 rounded-md border border-border bg-[#0f0f0f] px-3 py-2">
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

              <div className="mb-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">
                    {t("note.colorLabel")}
                  </p>
                  <span className="rounded-md border border-border bg-[#0f0f0f] px-2 py-1 text-[10px] text-text-secondary">
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
                <div className="flex items-center gap-2 rounded-md border border-border bg-[#0f0f0f] px-2 py-2">
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
                    className={`${panelInputClassName()} h-8 px-2.5 text-[12px]`}
                    placeholder="#7c3aed"
                    value={customColor}
                    onChange={(event) => setCustomColor(event.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-md border border-border bg-[#161616] px-3 py-2 text-xs text-text-primary transition hover:border-focus hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="rounded-md border border-border bg-[#101010] px-3 py-2 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
                    onClick={() => onColorSelect(undefined)}
                  >
                    {t("rightPanel.clearColor")}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-[#0f0f0f] px-3 py-4 text-sm text-text-secondary">
              {t("rightPanel.noteToolsEmpty")}
            </div>
          )}
        </section>

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

        <section
          className="motion-fade-up mb-5"
          style={{ animationDelay: "190ms" }}
        >
          <h2 className={sectionTitleClassName()}>{t("rightPanel.info")}</h2>
          <div className="grid gap-2 rounded-md border border-border bg-[#111111] p-3 text-xs text-text-secondary">
            <div className="flex items-center justify-between gap-3">
              <span>{t("rightPanel.createdAt")}</span>
              <span className="text-right text-text-primary">
                {note
                  ? format(new Date(note.created_at), "dd/MM/yyyy HH:mm", {
                      locale: getDateFnsLocale(i18n.language),
                    })
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{t("rightPanel.words")}</span>
              <span className="text-text-primary">
                {note ? wordCount(note.content) : 0}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{t("note.priorityLabel")}</span>
              <PriorityDot
                priority={note?.priority}
                label={note ? t(`priority.${note.priority ?? "media"}`) : "—"}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{t("note.checklistTitle")}</span>
              <span className="text-text-primary">
                {checklistDoneCount}/{checklist.length}
              </span>
            </div>
          </div>
        </section>

        <section className="motion-fade-up" style={{ animationDelay: "240ms" }}>
          <h2 className={sectionTitleClassName()}>
            {t("rightPanel.shortcuts")}
          </h2>
          <div className="grid gap-2 rounded-md border border-border bg-[#111111] p-3 text-[11px] text-text-secondary">
            {[
              { key: "Ctrl+N", label: t("commands.newNote") },
              { key: "Ctrl+S", label: t("common.save") },
              { key: "Ctrl+K", label: t("commands.commandPalette") },
              { key: "Ctrl+F", label: t("titlebar.search") },
              { key: "Ctrl+`", label: t("terminal.toggle") },
              { key: "Ctrl+Enter", label: t("terminal.run") },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-md border border-transparent bg-[#0f0f0f] px-2.5 py-2"
              >
                <span className="rounded-md border border-border bg-[#161616] px-2 py-1 text-text-primary">
                  {item.key}
                </span>
                <span className="text-right">{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
