import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { EXECUTABLE_LANGUAGES } from "@/lib/constants";
import { NoteEditor, NoteEditorHeader } from "@/components/editor/NoteEditor";
import { Terminal } from "@/components/editor/Terminal";
import type {
  AppPlatform,
  CursorInfo,
  Note,
  RunResult,
  Settings,
  Workspace,
} from "@/types";

interface EditorPaneProps {
  platform: AppPlatform;
  note: Note | null;
  noteDirectory: string | null;
  settings: Settings;
  workspaces: Workspace[];
  allTags: string[];
  findReplaceNonce: number;
  toggleTerminalNonce: number;
  runner: {
    result: RunResult | null;
    running: boolean;
    timeoutSeconds: number;
    lastRun: {
      id: string;
      label: string;
      language: string;
      source: "note" | "block";
    } | null;
    run: () => Promise<void>;
    runSnippet: (input: {
      code: string;
      language: string;
      label?: string;
      source?: "note" | "block";
      cwd?: string | null;
    }) => Promise<void>;
    clear: () => void;
    setTimeoutSeconds: (value: number) => void;
  };
  onNoteChange: (patch: Partial<Note>) => void;
  onContentChange: (value: string) => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
  onTogglePin: () => Promise<void>;
  onCreateNote: () => Promise<void>;
  onCursorChange: (cursorInfo: CursorInfo) => void;
  onOpenFindReplace: () => void;
  onOpenHistory: () => void;
}

export function EditorPane({
  platform,
  note,
  noteDirectory,
  settings,
  workspaces,
  allTags,
  findReplaceNonce,
  toggleTerminalNonce,
  runner,
  onNoteChange,
  onContentChange,
  onSave,
  onDelete,
  onTogglePin,
  onCreateNote,
  onCursorChange,
  onOpenFindReplace,
  onOpenHistory,
}: EditorPaneProps) {
  const { t } = useTranslation();
  const isMobile = platform === "android" || platform === "ios";
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(280);

  useEffect(() => {
    if (!toggleTerminalNonce) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTerminalOpen((current) => !current);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toggleTerminalNonce]);

  useEffect(() => {
    if (!runner.running && !runner.result) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTerminalOpen(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [runner.result, runner.running]);

  if (!note) {
    return (
      <main className="motion-fade-in flex min-h-0 flex-1 items-center justify-center bg-base">
        <div className="motion-pop max-w-md rounded-lg border border-dashed border-border bg-[#111111] px-6 py-10 text-center">
          <p className="text-sm font-semibold text-text-primary">
            {t("note.noActive")}
          </p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {t("note.noActiveDescription")}
          </p>
          <button
            type="button"
            className="mt-5 rounded-md border border-border bg-[#161616] px-4 py-2 text-sm font-medium text-text-primary transition hover:border-focus hover:bg-hover"
            onClick={() => void onCreateNote()}
          >
            {t("note.createFirstAction")}
          </button>
        </div>
      </main>
    );
  }

  const canRunSnippet =
    !isMobile && EXECUTABLE_LANGUAGES.has(note.language.toLowerCase());

  return (
    <main className="motion-fade-in flex min-h-0 flex-1 flex-col bg-base">
      <NoteEditorHeader
        note={note}
        workspaces={workspaces}
        allTags={allTags}
        compact={isMobile}
        onChange={onNoteChange}
        onDelete={onDelete}
        onTogglePin={onTogglePin}
        onOpenFindReplace={onOpenFindReplace}
        onOpenHistory={onOpenHistory}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#111111]">
          <NoteEditor
            noteId={note.id}
            value={note.content}
            accentColor={note.color}
            compact={isMobile}
            settings={settings}
            findReplaceNonce={findReplaceNonce}
            onChange={onContentChange}
            onSave={onSave}
            onRun={async () => {
              if (isMobile) {
                return;
              }
              setTerminalOpen(true);
              await runner.run();
            }}
            onCursorChange={onCursorChange}
          />
        </div>
      </div>

      {!isMobile ? (
        <Terminal
          platform={platform}
          noteDirectory={noteDirectory}
          open={terminalOpen}
          height={terminalHeight}
          canRunSnippet={canRunSnippet}
          seedCommand={null}
          runner={runner}
          onOpenChange={setTerminalOpen}
          onHeightChange={setTerminalHeight}
        />
      ) : null}
    </main>
  );
}
