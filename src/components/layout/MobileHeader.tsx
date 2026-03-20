import {
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
}: MobileHeaderProps) {
  const { t } = useTranslation();

  const buttonClassName =
    "inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-[#161616] text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary";

  const activeButtonClassName =
    "inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#2d2060] bg-[rgba(124,58,237,0.12)] text-text-primary transition hover:border-[#4a3590] hover:bg-[rgba(124,58,237,0.18)]";

  return (
    <header
      className="relative z-10 border-b border-border bg-[#0f0f0f] px-3 pb-3"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
      }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={sidebarOpen ? activeButtonClassName : buttonClassName}
          onClick={onToggleSidebar}
          title={t("sidebar.notes")}
          aria-label={t("sidebar.notes")}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1 px-1">
          <div className="truncate text-base font-semibold tracking-wide text-text-primary">
            {title}
          </div>
          <div className="truncate text-[11px] uppercase tracking-[0.16em] text-text-muted">
            {t("app.name")}
          </div>
        </div>

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
          onClick={onOpenSettings}
          title={t("titlebar.settings")}
          aria-label={t("titlebar.settings")}
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        className="mt-3 flex h-10 w-full items-center gap-2 rounded-md border border-border bg-[#111111] px-3 text-sm text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
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
