import { Check, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { withAlpha } from "@/lib/color";
import { NOTE_COLOR_SWATCHES } from "@/lib/constants";
import type { ChecklistItem, Note } from "@/types";

type CalloutTone = "note" | "tip" | "warning";

interface NoteBlocksProps {
  note: Note;
  onNoteChange: (patch: Partial<Note>) => void;
  onInsertCallout: (input: {
    tone: CalloutTone;
    title?: string;
    color?: string;
  }) => void;
  embedded?: boolean;
}

const DEFAULT_CALLOUT_COLOR = "#7c3aed";

function createChecklistItem(text: string): ChecklistItem {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    done: false,
  };
}

function panelInputClassName() {
  return "h-9 w-full rounded-md border border-border bg-base px-3 text-sm text-text-primary outline-none placeholder:text-text-muted transition focus:border-focus";
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

export function NoteBlocks({
  note,
  onNoteChange,
  onInsertCallout,
  embedded = false,
}: NoteBlocksProps) {
  const { t } = useTranslation();
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [calloutModalOpen, setCalloutModalOpen] = useState(false);
  const [calloutTitle, setCalloutTitle] = useState("");
  const [calloutTone, setCalloutTone] = useState<CalloutTone>("note");
  const [calloutColor, setCalloutColor] = useState(
    note.color ?? DEFAULT_CALLOUT_COLOR,
  );

  const checklist = note.checklist ?? [];
  const checklistDoneCount = checklist.filter((item) => item.done).length;
  const sectionTint = note.color ? withAlpha(note.color, 0.08) : undefined;
  const normalizedCalloutColor = normalizeHexColor(calloutColor);

  const updateChecklist = (nextChecklist: ChecklistItem[]) => {
    onNoteChange({ checklist: nextChecklist });
  };

  const addChecklistItem = () => {
    const text = newChecklistItem.trim();
    if (!text) {
      return;
    }

    updateChecklist([...checklist, createChecklistItem(text)]);
    setNewChecklistItem("");
  };

  const openCalloutModal = () => {
    setCalloutTitle("");
    setCalloutTone("note");
    setCalloutColor(note.color ?? DEFAULT_CALLOUT_COLOR);
    setCalloutModalOpen(true);
  };

  const closeCalloutModal = () => {
    setCalloutModalOpen(false);
  };

  const submitCallout = () => {
    onInsertCallout({
      tone: calloutTone,
      title: calloutTitle.trim() || undefined,
      color: normalizedCalloutColor ?? undefined,
    });
    setCalloutModalOpen(false);
    setCalloutTitle("");
  };

  const calloutModal =
    calloutModalOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
            style={{
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
            }}
            onMouseDown={closeCalloutModal}
          >
            <div
              className="w-full max-w-md rounded-[12px] border border-border bg-elevated"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="border-b border-border px-5 py-4">
                <h3 className="text-sm font-semibold text-text-primary">
                  {t("note.calloutModalTitle")}
                </h3>
                <p className="mt-1 text-xs leading-6 text-text-secondary">
                  {t("note.calloutModalHint")}
                </p>
              </div>

              <div className="grid gap-4 px-5 py-4">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("note.calloutTypeLabel")}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ["note", t("note.calloutNote")],
                      ["tip", t("note.calloutTip")],
                      ["warning", t("note.calloutWarning")],
                    ] as const).map(([tone, label]) => (
                      <button
                        key={tone}
                        type="button"
                        className={`rounded-md border px-3 py-2 text-sm transition ${
                          calloutTone === tone
                            ? "border-[#2d2060] bg-[rgba(124,58,237,0.12)] text-text-primary"
                            : "border-border bg-base text-text-secondary hover:border-focus hover:bg-hover hover:text-text-primary"
                        }`}
                        onClick={() => setCalloutTone(tone)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("note.calloutTitleLabel")}
                  </p>
                  <input
                    className={panelInputClassName()}
                    placeholder={t("rightPanel.calloutTitlePlaceholder")}
                    value={calloutTitle}
                    onChange={(event) => setCalloutTitle(event.target.value)}
                  />
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("note.calloutColorLabel")}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {NOTE_COLOR_SWATCHES.map((swatch) => {
                      const selected = normalizedCalloutColor === swatch;

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
                          onClick={() => setCalloutColor(swatch)}
                          aria-label={`${t("note.calloutColorLabel")}: ${swatch}`}
                        />
                      );
                    })}
                  </div>

                  <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-base px-2 py-2">
                    <input
                      type="color"
                      className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
                      value={normalizedCalloutColor ?? DEFAULT_CALLOUT_COLOR}
                      onChange={(event) => setCalloutColor(event.target.value)}
                      aria-label={t("note.calloutColorLabel")}
                    />
                    <input
                      className={`${panelInputClassName()} h-8 px-2.5 text-[12px]`}
                      placeholder="#7c3aed"
                      value={calloutColor}
                      onChange={(event) => setCalloutColor(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                <button
                  type="button"
                  className="rounded-md border border-border bg-base px-3 py-2 text-sm text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
                  onClick={closeCalloutModal}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-accent/40 bg-accent/15 px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-accent/20"
                  onClick={submitCallout}
                >
                  {t("note.calloutAddAction")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <section
        className={embedded ? "min-w-0 overflow-hidden" : "min-w-0 overflow-hidden bg-surface px-4 pb-4 pt-3"}
        style={{
          backgroundImage:
            !embedded && sectionTint
              ? `linear-gradient(180deg, ${sectionTint}, transparent 78%)`
              : undefined,
        }}
      >
        {!expanded ? (
          <button
            type="button"
            className={`interactive-lift flex w-full min-w-0 gap-3 rounded-lg border border-border bg-surface px-3 py-3 text-left transition hover:border-focus hover:bg-hover ${
              embedded
                ? "flex-col items-stretch"
                : "items-center justify-between"
            }`}
            onClick={() => setExpanded(true)}
            title={t("common.open")}
            aria-label={t("common.open")}
          >
            <div className="min-w-0">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("note.blocksTitle")}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
                <span className="rounded-md border border-border bg-base px-2 py-1">
                  {t("note.checklistTitle")} {checklistDoneCount}/{checklist.length}
                </span>
                <span className="rounded-md border border-border bg-base px-2 py-1">
                  {t("note.calloutsTitle")}
                </span>
              </div>
            </div>
            <span
              className={`inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-elevated px-3 text-[11px] text-text-primary ${
                embedded ? "self-end" : ""
              }`}
            >
              <ChevronDown className="h-3.5 w-3.5" />
              {t("common.open")}
            </span>
          </button>
        ) : (
          <>
            <div
              className={`flex min-w-0 gap-3 ${
                embedded
                  ? "flex-col items-stretch"
                  : "flex-wrap items-center justify-between"
              }`}
            >
              <div className="min-w-0">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("note.blocksTitle")}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
                  <span className="rounded-md border border-border bg-surface px-2 py-1">
                    {t("note.checklistTitle")} {checklistDoneCount}/{checklist.length}
                  </span>
                  <span className="rounded-md border border-border bg-surface px-2 py-1">
                    {t("note.calloutsTitle")}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={`interactive-lift inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border bg-elevated px-3 text-[11px] text-text-primary transition hover:border-focus hover:bg-hover ${
                  embedded ? "self-end" : ""
                }`}
                onClick={() => setExpanded((current) => !current)}
                title={expanded ? t("common.close") : t("common.open")}
                aria-label={expanded ? t("common.close") : t("common.open")}
              >
                {expanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {expanded ? t("common.close") : t("common.open")}
              </button>
            </div>

            <div
              className={
                embedded
                  ? "mt-3 min-w-0 overflow-hidden"
                  : "mt-3 min-w-0 max-h-[360px] overflow-y-auto pr-1"
              }
            >
              <div className={embedded ? "grid min-w-0 gap-3" : "grid min-w-0 gap-3 xl:grid-cols-2"}>
                <div className="motion-fade-up surface-hover min-w-0 overflow-hidden rounded-lg border border-border bg-surface p-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">
                        {t("note.checklistTitle")}
                      </h3>
                      <p className="mt-1 text-xs leading-6 text-text-secondary">
                        {t("note.checklistHint")}
                      </p>
                    </div>
                    <span
                      className="rounded-md border px-2 py-1 text-[11px] text-text-primary"
                      style={{
                        borderColor: note.color ?? "var(--border)",
                        backgroundColor: withAlpha(note.color, 0.14) ?? "#161616",
                      }}
                    >
                      {checklistDoneCount}/{checklist.length}
                    </span>
                  </div>

                  {checklist.length ? (
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        className="rounded-md border border-border bg-base px-3 py-2 text-xs text-text-secondary transition hover:border-[#4a2020] hover:bg-[#2d1515] hover:text-[#f87171]"
                        onClick={() => updateChecklist([])}
                      >
                        {t("note.checklistClear")}
                      </button>
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    {checklist.length ? (
                      checklist.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 rounded-md border border-border bg-base px-2 py-2 transition hover:border-focus"
                        >
                          <button
                            type="button"
                            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                              item.done
                                ? "border-transparent text-black"
                                : "border-border bg-surface text-transparent hover:border-focus"
                            }`}
                            style={{
                              backgroundColor: item.done
                                ? note.color ?? "var(--accent)"
                                : undefined,
                            }}
                            onClick={() =>
                              updateChecklist(
                                checklist.map((entry) =>
                                  entry.id === item.id
                                    ? { ...entry, done: !entry.done }
                                    : entry,
                                ),
                              )
                            }
                            aria-label={
                              item.done
                                ? t("note.checklistMarkPending")
                                : t("note.checklistMarkDone")
                            }
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>

                          <input
                            className={`min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted ${
                              item.done
                                ? "text-text-secondary line-through"
                                : "text-text-primary"
                            }`}
                            value={item.text}
                            onChange={(event) =>
                              updateChecklist(
                                checklist.map((entry) =>
                                  entry.id === item.id
                                    ? { ...entry, text: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                            placeholder={t("note.checklistPlaceholder")}
                          />

                          <button
                            type="button"
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-secondary transition hover:border-[#4a2020] hover:bg-[#2d1515] hover:text-[#f87171]"
                            onClick={() =>
                              updateChecklist(
                                checklist.filter((entry) => entry.id !== item.id),
                              )
                            }
                            aria-label={t("note.checklistRemove")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-md border border-dashed border-border bg-base px-3 py-4 text-sm text-text-secondary">
                        {t("note.checklistEmpty")}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      className={panelInputClassName()}
                      placeholder={t("note.checklistPlaceholder")}
                      value={newChecklistItem}
                      onChange={(event) => setNewChecklistItem(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addChecklistItem();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="interactive-lift inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-elevated px-3 text-sm text-text-primary transition hover:border-focus hover:bg-hover"
                      onClick={addChecklistItem}
                    >
                      <Plus className="h-4 w-4" />
                      {t("note.checklistAdd")}
                    </button>
                  </div>
                </div>

                <div
                  className="motion-fade-up surface-hover min-w-0 overflow-hidden rounded-lg border border-border bg-surface p-3"
                  style={{ animationDelay: "70ms" }}
                >
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {t("note.calloutsTitle")}
                    </h3>
                    <p className="mt-1 text-xs leading-6 text-text-secondary">
                      {t("note.calloutsHint")}
                    </p>
                  </div>

                  <div className="mb-3 rounded-md border border-border bg-base px-3 py-3 text-xs leading-6 text-text-secondary [overflow-wrap:anywhere]">
                    {t("note.calloutsFooter")}
                  </div>

                  <button
                    type="button"
                    className="interactive-lift inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-md border border-border bg-elevated px-3 text-sm text-text-primary transition hover:border-focus hover:bg-hover"
                    onClick={openCalloutModal}
                  >
                    <Plus className="h-4 w-4" />
                    {t("note.calloutAddAction")}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
      {calloutModal}
    </>
  );
}
