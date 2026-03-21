import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";
import { getWorkspaceIcon } from "@/lib/icons";
import { getWorkspaceDisplayName } from "@/lib/workspaceLabel";
import type { Workspace } from "@/types";

interface WorkspaceTreeProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (workspaceId: string | null) => void;
  onCreateWorkspace: () => Promise<void>;
  onRenameWorkspace: (workspaceId: string) => Promise<void>;
  onDeleteWorkspace: (workspaceId: string) => Promise<void>;
  onCycleWorkspaceColor: (workspaceId: string) => Promise<void>;
  onCycleWorkspaceIcon: (workspaceId: string) => Promise<void>;
}

interface ContextMenuState {
  workspaceId: string;
  x: number;
  y: number;
}

export function WorkspaceTree({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onCycleWorkspaceColor,
  onCycleWorkspaceIcon,
}: WorkspaceTreeProps) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const menuWidth = 176;
  const menuHeight = 172;

  useEffect(() => {
    if (!menu) {
      return;
    }

    const closeMenu = () => setMenu(null);
    window.addEventListener("click", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
    };
  }, [menu]);

  const runMenuAction = (action: () => Promise<void>) => {
    setMenu(null);
    void action();
  };

  const menuPosition = menu
    ? {
        left:
          typeof window === "undefined"
            ? menu.x
            : Math.max(
                12,
                Math.min(menu.x, window.innerWidth - menuWidth - 12),
              ),
        top:
          typeof window === "undefined"
            ? menu.y
            : Math.max(
                12,
                Math.min(menu.y, window.innerHeight - menuHeight - 12),
              ),
      }
    : null;

  return (
    <>
      <section className="relative border-b border-border px-3 py-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("sidebar.workspaces")}
          </h2>
          <button
            type="button"
            className="rounded-md border border-border bg-elevated p-1.5 text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
            onClick={() => void onCreateWorkspace()}
            title={t("sidebar.newWorkspace")}
            aria-label={t("sidebar.newWorkspace")}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {workspaces.length <= 1 ? (
          <p className="mb-2 text-xs leading-5 text-text-secondary">
            {t("sidebar.workspaceHint")}
          </p>
        ) : null}

        <button
          type="button"
          className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[12px] transition ${
            activeWorkspaceId === null
              ? "bg-elevated text-text-primary"
              : "text-text-secondary hover:bg-hover hover:text-text-primary"
          }`}
          onClick={() => onSelectWorkspace(null)}
          title={t("common.allNotes")}
        >
          <span className="h-2 w-2 rounded-full bg-text-muted" />
          <span>{t("common.allNotes")}</span>
        </button>

        <div className="grid gap-1">
          {workspaces.map((workspace) => {
            const Icon = getWorkspaceIcon(workspace.icon);
            const isActive = workspace.id === activeWorkspaceId;
            const displayName = getWorkspaceDisplayName(workspace, t);

            return (
              <button
                key={workspace.id}
                type="button"
                className={`flex items-center gap-2 rounded-md px-2 py-2 text-left text-[12px] transition ${
                  isActive
                    ? "bg-elevated text-text-primary"
                    : "text-text-secondary hover:bg-hover hover:text-text-primary"
                }`}
                onClick={() => onSelectWorkspace(workspace.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setMenu({
                    workspaceId: workspace.id,
                    x: event.clientX,
                    y: event.clientY,
                  });
                }}
                title={t("workspace.select", { name: displayName })}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: workspace.color }}
                />
                <Icon className="h-4 w-4" />
                <span className="truncate">{displayName}</span>
              </button>
            );
          })}
        </div>
      </section>

      {menu && menuPosition
        ? createPortal(
            <div
              className="fixed z-[120] w-44 rounded-lg border border-border bg-elevated p-1 shadow-[0_12px_32px_var(--shadow-soft)]"
              style={menuPosition}
            >
              <button
                type="button"
                className="workspace-menu-item"
                onClick={() =>
                  runMenuAction(() => onRenameWorkspace(menu.workspaceId))
                }
              >
                {t("common.rename")}
              </button>
              <button
                type="button"
                className="workspace-menu-item"
                onClick={() =>
                  runMenuAction(() => onCycleWorkspaceColor(menu.workspaceId))
                }
              >
                {t("workspace.nextColor")}
              </button>
              <button
                type="button"
                className="workspace-menu-item"
                onClick={() =>
                  runMenuAction(() => onCycleWorkspaceIcon(menu.workspaceId))
                }
              >
                {t("workspace.nextIcon")}
              </button>
              {menu.workspaceId !== DEFAULT_WORKSPACE_ID ? (
                <button
                  type="button"
                  className="workspace-menu-item text-red hover:bg-red/10"
                  onClick={() =>
                    runMenuAction(() => onDeleteWorkspace(menu.workspaceId))
                  }
                >
                  {t("common.delete")}
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
