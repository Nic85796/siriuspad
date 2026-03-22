import { formatDistanceToNow } from "date-fns";
import { Pin, Calendar, Tag, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getDateFnsLocale } from "@/lib/date";
import { withAlpha } from "@/lib/color";
import { PriorityDot } from "@/components/ui/PriorityDot";
import type { NoteMetadata } from "@/types";

interface GridViewProps {
  notes: NoteMetadata[];
  onOpenNote: (noteId: string) => Promise<void>;
  onCreateNote: () => Promise<void>;
}

export function GridView({ notes, onOpenNote, onCreateNote }: GridViewProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex-1 overflow-y-auto bg-base/50 p-6 lg:p-10">
      <header className="mb-10 flex flex-col gap-2">
        <div className="flex items-center gap-3 text-accent">
            <Layers className="h-6 w-6" />
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">
              {t("sidebar.notes")}
            </h1>
        </div>
        <p className="text-sm text-text-secondary opacity-70">
          {t("sidebar.allNotesSummary", { count: notes.length })}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            className="group relative flex flex-col h-[280px] overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
            onClick={() => void onOpenNote(note.id)}
            style={{
                backgroundImage: note.color 
                    ? `linear-gradient(180deg, ${withAlpha(note.color, 0.08)}, transparent 40%)` 
                    : undefined
            }}
          >
            {/* Header / Meta */}
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <div className="flex items-center gap-2 overflow-hidden">
                <PriorityDot priority={note.priority} />
                <span className="truncate text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  {note.workspace}
                </span>
              </div>
              {note.pinned && (
                <Pin className="h-3.5 w-3.5 text-yellow" />
              )}
            </div>

            {/* Content Preview */}
            <div className="flex-1 overflow-hidden px-4 py-4 text-left">
              <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                {note.title || t("common.untitled")}
              </h3>
              <p className="line-clamp-6 text-xs leading-relaxed text-text-secondary opacity-60">
                {note.excerpt || t("sidebar.noNotes")}
              </p>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center gap-3 border-t border-border/50 bg-base/20 px-4 py-3">
              <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(note.updated_at), {
                    addSuffix: true,
                    locale: getDateFnsLocale(i18n.language),
                  })}
                </span>
              </div>
              {note.tags[0] && (
                <div className="flex items-center gap-1.5 text-[10px] text-accent/70">
                  <Tag className="h-3 w-3" />
                  <span className="truncate max-w-[80px]">{note.tags[0]}</span>
                </div>
              )}
            </div>

            {/* Hover Decor */}
            <div 
                className="absolute inset-x-0 bottom-0 h-1 scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100" 
                style={{ backgroundColor: note.color || undefined }}
            />
          </button>
        ))}

        {/* Create Card */}
        <button
          type="button"
          className="flex h-[280px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-base/20 transition-all hover:bg-base/40 hover:border-accent/40 text-text-muted hover:text-accent"
          onClick={() => void onCreateNote()}
        >
          <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-border/40 text-current">
                <Layers className="h-6 w-6 opacity-40" />
              </div>
              <span className="text-sm font-medium">{t("sidebar.newNote")}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
