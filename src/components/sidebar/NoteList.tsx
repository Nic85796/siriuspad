import { formatDistanceToNow } from "date-fns";
import { Pin, Plus, Tag, Trash2, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { withAlpha } from "@/lib/color";
import { getDateFnsLocale } from "@/lib/date";
import { PriorityDot } from "@/components/ui/PriorityDot";
import { TagPill } from "@/components/ui/TagPill";
import type { NoteMetadata } from "@/types";

interface NoteListItemProps {
  note: NoteMetadata;
  index: number;
  isActive: boolean;
  activeTag: string | null;
  onOpenNote: (id: string) => Promise<void>;
  onTogglePinNote: (id: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onTagClick: (tag: string | null) => void;
  onContextMenu: (x: number, y: number) => void;
}

const NoteListItem = React.memo(({
  note,
  index,
  isActive,
  activeTag,
  onOpenNote,
  onTogglePinNote,
  onDeleteNote,
  onTagClick,
  onContextMenu,
}: NoteListItemProps) => {
  const { t, i18n } = useTranslation();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0]?.clientX ?? null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentX = e.targetTouches[0]?.clientX ?? 0;
    const delta = currentX - touchStart;
    setSwipeOffset(Math.max(-100, Math.min(100, delta)));
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 60) {
      void onTogglePinNote(note.id);
    } else if (swipeOffset < -60) {
      void onDeleteNote(note.id);
    }
    setTouchStart(null);
    setSwipeOffset(0);
  };

  return (
    <div className="relative overflow-hidden rounded-md">
      {/* Swipe Action Backgrounds */}
      <div className="absolute inset-0 flex items-center justify-between overflow-hidden rounded-md">
        <div 
          className="flex h-full items-center justify-start bg-yellow px-6 text-white transition-all duration-200"
          style={{ 
            width: swipeOffset > 0 ? `${Math.abs(swipeOffset)}px` : '0px',
            opacity: swipeOffset > 20 ? 1 : 0
          }}
        >
          <Pin 
            size={18} 
            fill="currentColor" 
            className={swipeOffset > 60 ? 'scale-125 transition-transform' : 'scale-100 transition-transform'} 
          />
        </div>
        <div 
          className="flex h-full items-center justify-end bg-red px-6 text-white transition-all duration-200"
          style={{ 
            width: swipeOffset < 0 ? `${Math.abs(swipeOffset)}px` : '0px',
            opacity: swipeOffset < -20 ? 1 : 0
          }}
        >
          <Trash2 
            size={18} 
            className={swipeOffset < -60 ? 'scale-125 transition-transform' : 'scale-100 transition-transform'}
          />
        </div>
      </div>

      <button
        type="button"
        className={`motion-fade-up surface-hover relative z-10 w-full overflow-hidden rounded-md border px-3 py-3 text-left transition-all ${
          touchStart === null ? 'duration-300 ease-out' : 'duration-0'
        } ${
          isActive ? "border-focus bg-elevated" : "border-border bg-surface hover:border-focus hover:bg-hover"
        }`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          boxShadow: note.color ? `inset 2px 0 0 ${note.color}` : undefined,
          backgroundImage: withAlpha(note.color, isActive ? 0.11 : 0.06)
            ? `linear-gradient(180deg, ${withAlpha(note.color, isActive ? 0.11 : 0.06)}, transparent 80%)`
            : undefined,
          animationDelay: `${Math.min(index * 28, 180)}ms`,
        }}
        onClick={() => swipeOffset === 0 && onOpenNote(note.id)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onContextMenu(event.clientX, event.clientY);
        }}
      >
        <span className={`absolute inset-y-0 left-0 w-0.5 ${isActive ? "bg-accent" : "bg-transparent"}`} />
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {note.color && (
                <span className="h-2 w-2 shrink-0 rounded-full border border-border" style={{ backgroundColor: note.color }} />
              )}
              <p className="truncate text-[12px] font-medium text-text-primary">
                {note.title || t("common.untitled")}
              </p>
            </div>
          </div>
          {note.pinned && <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow" />}
        </div>

        <div className="mt-2 flex items-center gap-2 text-[10px] text-text-secondary">
          <PriorityDot priority={note.priority} />
          {note.tags[0] && (
            <TagPill
              tag={note.tags[0]}
              compact
              active={activeTag === note.tags[0]}
              onClick={() => onTagClick(activeTag === note.tags[0] ? null : note.tags[0])}
            />
          )}
          <span className="truncate">
            {formatDistanceToNow(new Date(note.updated_at), {
              addSuffix: true,
              locale: getDateFnsLocale(i18n.language),
            })}
          </span>
        </div>
      </button>
    </div>
  );
});

interface NoteListProps {
  notes: NoteMetadata[];
  totalNotes: number;
  activeNoteId: string | null;
  activeTag: string | null;
  onOpenNote: (noteId: string) => Promise<void>;
  onDuplicateNote: (noteId: string) => Promise<void>;
  onTogglePinNote: (noteId: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onCreateNote: () => Promise<void>;
  onTagClick: (tag: string | null) => void;
}

interface ContextMenuState {
  note: NoteMetadata;
  x: number;
  y: number;
}

export function NoteList({
  notes,
  totalNotes,
  activeNoteId,
  activeTag,
  onOpenNote,
  onDuplicateNote,
  onTogglePinNote,
  onDeleteNote,
  onCreateNote,
  onTagClick,
}: NoteListProps) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    if (!menu) return;
    const closeMenu = () => setMenu(null);
    const closeOnEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);

  // Notas ocultas por filtro de tag ativo
  const isFilterActive = !!activeTag;
  const hasHiddenNotes = isFilterActive && notes.length === 0 && totalNotes > 0;

  return (
    <>
      <section className="min-h-0 flex-1 overflow-y-auto px-3 py-3 scrollbar-technical">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("sidebar.notes")}
            </h2>
            {/* Badge de filtro ativo com botão de limpar */}
            {isFilterActive && (
              <button
                type="button"
                className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] text-accent transition hover:bg-accent/20"
                onClick={() => onTagClick(null)}
                title="Limpar filtro de tag"
              >
                <Tag className="h-2.5 w-2.5" />
                <span className="max-w-[80px] truncate">{activeTag}</span>
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            className="interactive-lift rounded-md border border-border bg-elevated p-1.5 text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
            onClick={() => void onCreateNote()}
            title={t("sidebar.newNote")}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid gap-2 overflow-hidden">
          {notes.map((note, index) => (
            <NoteListItem
              key={note.id}
              note={note}
              index={index}
              isActive={note.id === activeNoteId}
              activeTag={activeTag}
              onOpenNote={onOpenNote}
              onTogglePinNote={onTogglePinNote}
              onDeleteNote={onDeleteNote}
              onTagClick={onTagClick}
              onContextMenu={(x, y) => setMenu({ note, x, y })}
            />
          ))}

          {/* Estado vazio: notas ocultas por filtro de tag */}
          {hasHiddenNotes && (
            <div className="rounded-md border border-dashed border-accent/40 bg-accent/5 px-3 py-4 text-sm text-text-secondary">
              <div className="flex items-center gap-2 text-accent">
                <Tag className="h-3.5 w-3.5 shrink-0" />
                <p className="text-[12px] font-medium">
                  Filtrando por <span className="font-semibold">#{activeTag}</span>
                </p>
              </div>
              <p className="mt-1 text-[11px] text-text-muted">
                {totalNotes} nota{totalNotes !== 1 ? 's' : ''} oculta{totalNotes !== 1 ? 's' : ''} neste espaço.
              </p>
              <button
                type="button"
                className="mt-3 flex items-center gap-1.5 rounded-md border border-border bg-elevated px-3 py-2 text-[12px] font-medium text-text-primary transition hover:border-focus hover:bg-hover"
                onClick={() => onTagClick(null)}
              >
                <X className="h-3 w-3" />
                Limpar filtro e ver todas
              </button>
            </div>
          )}

          {/* Estado vazio: sem notas de verdade */}
          {!notes.length && !hasHiddenNotes && (
            <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-text-secondary">
              <p>{t("sidebar.noNotes")}</p>
              <button
                type="button"
                className="mt-3 rounded-md border border-border bg-elevated px-3 py-2 text-sm font-medium text-text-primary transition hover:border-focus hover:bg-hover"
                onClick={() => void onCreateNote()}
              >
                {t("sidebar.newNote")}
              </button>
            </div>
          )}
        </div>
      </section>

      {menu && createPortal(
        <div
          className="fixed z-[120] w-52 rounded-md border border-border bg-elevated p-1 shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
          style={{
            left: Math.max(12, Math.min(menu.x, window.innerWidth - 220)),
            top: Math.max(12, Math.min(menu.y, window.innerHeight - 200)),
          }}
        >
          <button type="button" className="workspace-menu-item" onClick={() => { setMenu(null); void onOpenNote(menu.note.id); }}>
            {t("common.open")}
          </button>
          <button type="button" className="workspace-menu-item" onClick={() => { setMenu(null); void onDuplicateNote(menu.note.id); }}>
            {t("commands.duplicateNote")}
          </button>
          <button type="button" className="workspace-menu-item" onClick={() => { setMenu(null); void onTogglePinNote(menu.note.id); }}>
            {menu.note.pinned ? t("commands.unpinNote") : t("commands.pinNote")}
          </button>
          <div className="my-1 h-px bg-border/50" />
          <button type="button" className="workspace-menu-item text-red hover:bg-red/10" onClick={() => { setMenu(null); void onDeleteNote(menu.note.id); }}>
            {t("common.delete")}
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
