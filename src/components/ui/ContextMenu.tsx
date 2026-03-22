import { useEffect, useRef } from "react";
import { 
  type LucideIcon,
  Copy, 
  Scissors, 
  Clipboard, 
  CheckSquare, 
  Trash2,
  Share2
} from "lucide-react";
import { useTranslation } from "react-i18next";

type ContextMenuAction =
  | "copy"
  | "cut"
  | "paste"
  | "selectAll"
  | "exportGist"
  | "delete";

export interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: ContextMenuAction) => void;
}

interface MenuItemProps {
  icon?: LucideIcon;
  label: string;
  shortcut?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function MenuItem({
  icon: Icon,
  label,
  shortcut,
  onClick,
  danger,
  disabled,
}: MenuItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex w-full items-center justify-between px-3 py-2 text-xs transition-all duration-200 ${
        disabled
          ? "cursor-not-allowed opacity-30"
          : "hover:bg-accent/10 hover:text-accent"
      } ${
        danger
          ? "text-red hover:bg-red/10 hover:text-red"
          : "text-text-primary"
      }`}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) {
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-2.5">
        {Icon ? <Icon className="h-4 w-4 opacity-70" /> : null}
        <span className="font-medium">{label}</span>
      </div>
      {shortcut ? (
        <span className="font-mono text-[10px] uppercase opacity-40">
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}

export function ContextMenu({ x, y, onClose, onAction }: ContextMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  return (
    <div
      ref={menuRef}
      className="fixed z-[1000] w-52 overflow-hidden rounded-xl border border-border/40 bg-surface/90 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150"
      style={{ left: adjustedX, top: adjustedY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex flex-col py-1.5">
        {/* Editing Actions */}
        <MenuItem 
            icon={Scissors} 
            label={t("common.cut")} 
            shortcut="Ctrl+X" 
            onClick={() => onAction("cut")} 
        />
        <MenuItem 
            icon={Copy} 
            label={t("common.copy")} 
            shortcut="Ctrl+C" 
            onClick={() => onAction("copy")} 
        />
        <MenuItem 
            icon={Clipboard} 
            label={t("common.paste")} 
            shortcut="Ctrl+V" 
            onClick={() => onAction("paste")} 
        />
        <MenuItem 
            icon={CheckSquare} 
            label={t("common.selectAll")} 
            shortcut="Ctrl+A" 
            onClick={() => onAction("selectAll")} 
        />

        <div className="my-1.5 h-px bg-border/40" />

        {/* Global/File Actions */}
        <MenuItem 
            icon={Share2} 
            label={t("commands.exportGist")} 
            onClick={() => onAction("exportGist")} 
        />
        <MenuItem 
            icon={Trash2} 
            label={t("common.delete")} 
            danger 
            onClick={() => onAction("delete")} 
        />
      </div>
    </div>
  );
}
