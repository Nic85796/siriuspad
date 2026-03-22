import {
  BrainCircuit,
  PanelLeftOpen,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface MobileHeaderProps {
  title: string;
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  onToggleSidebar: () => void;
  onToggleInspector: () => void;
  onCreateNote: () => void;
  onFocusSearch: () => void;
  onOpenSettings: () => void;
  onOpenAssistant: () => void;
}

export function MobileHeader({
  title,
  sidebarOpen,
  inspectorOpen,
  onToggleSidebar,
  onToggleInspector,
  onCreateNote,
  onFocusSearch,
  onOpenSettings,
  onOpenAssistant,
}: MobileHeaderProps) {
  const { t } = useTranslation();

  const buttonClassName =
    "inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-elevated text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary";

  const activeButtonClassName =
    "inline-flex h-11 w-11 items-center justify-center rounded-md border border-accent/35 bg-accent/10 text-text-primary transition hover:border-accent/50 hover:bg-accent/15";

  return (
    <header
      className="relative z-10 shrink-0 border-b border-border bg-surface px-3 pb-3"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.85rem)",
        paddingLeft: "calc(env(safe-area-inset-left, 0px) + 0.75rem)",
        paddingRight: "calc(env(safe-area-inset-right, 0px) + 0.75rem)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          className={sidebarOpen ? activeButtonClassName : buttonClassName}
          onClick={onToggleSidebar}
          title={t("sidebar.notes")}
          aria-label={t("sidebar.notes")}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1 self-center px-1">
          <div className="truncate text-[15px] font-semibold tracking-wide text-text-primary">
            {title}
          </div>
          <div className="mt-1 truncate text-[10px] uppercase tracking-[0.16em] text-text-muted">
            {t("app.name")}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className={buttonClassName}
            onClick={onCreateNote}
            title={t("sidebar.newNote")}
            aria-label={t("sidebar.newNote")}
          >
            <Plus className="h-4 w-4" />
          </button>

          <button
            type="button"
            className={inspectorOpen ? activeButtonClassName : buttonClassName}
            onClick={onToggleInspector}
            title={t("rightPanel.noteTools")}
            aria-label={t("rightPanel.noteTools")}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          <button
            type="button"
            className={buttonClassName}
            onClick={onOpenAssistant}
            title={t("titlebar.assistant")}
            aria-label={t("titlebar.assistant")}
          >
            <BrainCircuit className="h-4 w-4" />
          </button>

          <button
            type="button"
            className={buttonClassName}
            onClick={onOpenSettings}
            title={t("titlebar.settings")}
            aria-label={t("titlebar.settings")}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        className="mt-3 flex h-11 w-full items-center gap-2 rounded-md border border-border bg-base px-3 text-sm text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
        onClick={onFocusSearch}
        title={t("titlebar.search")}
        aria-label={t("titlebar.search")}
      >
        <Search className="h-4 w-4" />
        <span className="truncate">{t("titlebar.search")}</span>
      </button>
    </header>
  );
}
