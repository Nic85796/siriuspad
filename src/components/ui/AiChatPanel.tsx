import {
  Bot,
  Send,
  X,
  Trash2,
  Loader2,
  ChevronDown,
  Plus,
  PenLine,
  List,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  SquareTerminal,
  Globe,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  type ChatMessage,
  type ToolCall,
  type ToolDefinition,
  sendGroqAgentMessage,
} from "@/lib/groq";
import { searchWeb, readWebpage } from "@/lib/browser";
import type { Note, NoteMetadata } from "@/types";
import { useSettingsStore } from "@/store/settings";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeNote: Note | null;
  availableNotes: NoteMetadata[];
  noteDirectory: string | null;
  onCreateNote: (title: string, content: string) => Promise<void>;
  onWriteToActiveNote: (content: string, mode: "replace" | "append") => void;
  onEditNote: (noteId: string, content: string, mode: "replace" | "append") => Promise<void>;
}

type ToolStatus = "running" | "done" | "error";

interface ToolActionItem {
  kind: "tool_action";
  id: string;
  toolName: string;
  label: string;
  status: ToolStatus;
}

interface TextItem {
  kind: "user" | "assistant";
  id: string;
  content: string;
}

type DisplayItem = TextItem | ToolActionItem;

// ─── Tool definitions ────────────────────────────────────────────────────────

const NOTE_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "create_note",
      description:
        "Creates a new note with the given title and full markdown content. Use this when the user asks to create a new note, document, article, or guide.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the note" },
          content: {
            type: "string",
            description: "Full markdown content. Write complete, well-structured content.",
          },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_to_active_note",
      description:
        "Writes or updates content in the currently open note. Use 'replace' to overwrite, 'append' to add to the end.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Markdown content to write" },
          mode: {
            type: "string",
            enum: ["replace", "append"],
            description: "'replace' overwrites, 'append' adds to the end.",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_note",
      description:
        "Edits an existing note by ID. Use list_notes first to get the IDs. Can replace or append content.",
      parameters: {
        type: "object",
        properties: {
          note_id: { type: "string", description: "Note ID from list_notes" },
          content: { type: "string", description: "Markdown content to write" },
          mode: {
            type: "string",
            enum: ["replace", "append"],
            description: "'replace' overwrites, 'append' adds to the end.",
          },
        },
        required: ["note_id", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_notes",
      description: "Returns all available notes with titles and IDs.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "run_terminal_command",
      description:
        "Runs a shell command in the integrated terminal and returns the output. Use this to check git status, run scripts, install packages, read files, list directories, etc. IMPORTANT: do not run interactive commands that wait for user input.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The shell command to execute, e.g. 'ls -la', 'git log --oneline -5', 'npm --version'",
          },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Searches the web for recent information using DuckDuckGo. Use this to fact-check, find documentation, or find recent news.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_webpage",
      description: "Reads a webpage given its URL and extracts its main text content. Useful after search_web to get details from a page.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Full URL of the webpage to read" },
        },
        required: ["url"],
      },
    },
  },
];

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are SiriusAI, an intelligent agent inside SiriusPad — a developer-focused Markdown note-taking app.

Capabilities:
- Answer questions and help with writing, coding, and ideas
- Create new notes (use create_note)
- Edit the currently open note (use write_to_active_note)
- Edit any note by ID (use edit_note — get IDs with list_notes first)
- List all notes (use list_notes)
- Run shell commands in the integrated terminal (use run_terminal_command)
- Search the internet for real-time information (use search_web)
- Read full web articles and pages (use read_webpage)

Rules:
- When writing note content, produce rich, complete Markdown with headings, lists, and code blocks
- If you need to search or add an image, DO NOT use search_web. Use our native AI image generator inline! Format: ![Alt Text](https://image.pollinations.ai/prompt/english-prompt-here?nologo=true) (Replace spaces with hyphens in the URL)
- 🧠 AGENTIC REASONING: Before making ANY tool call, you MUST think out loud! Use a blockquote starting with "> 🤔 Pensando:" to explain your logic, plan your steps, and evaluate alternatives.
- After using a tool, always give a short confirmation message
- Be concise and friendly
- Write in the same language as the user
- For run_terminal_command: show the output to the user and explain what it means`;

// ─── Label helpers ────────────────────────────────────────────────────────────

const TOOL_META: Record<string, { icon: typeof Plus; running: string; done: string }> = {
  create_note: {
    icon: Plus,
    running: (args: Record<string, unknown>) => `Criando nota: "${String(args.title ?? "...")}"`,
    done: (args: Record<string, unknown>) => `Nota criada: "${String(args.title ?? "")}"`,
  } as never,
  write_to_active_note: {
    icon: PenLine,
    running: (args: Record<string, unknown>) =>
      args.mode === "append" ? "Adicionando à nota..." : "Escrevendo na nota...",
    done: (args: Record<string, unknown>) =>
      args.mode === "append" ? "Conteúdo adicionado ✓" : "Nota atualizada ✓",
  } as never,
  edit_note: {
    icon: PenLine,
    running: (args: Record<string, unknown>) =>
      args.mode === "append" ? "Adicionando à nota..." : "Editando nota...",
    done: () => "Nota editada ✓",
  } as never,
  list_notes: {
    icon: List,
    running: () => "Listando notas...",
    done: () => "Notas listadas ✓",
  } as never,
  run_terminal_command: {
    icon: SquareTerminal,
    running: (args: Record<string, unknown>) => `Terminal: ${String(args.command ?? "...").slice(0, 40)}`,
    done: (args: Record<string, unknown>) => `Executado: ${String(args.command ?? "").slice(0, 40)} ✓`,
  } as never,
  search_web: {
    icon: Search,
    running: (args: Record<string, unknown>) => `Pesquisando na web: "${String(args.query ?? "...")}"`,
    done: () => `Pesquisa concluída ✓`,
  } as never,
  read_webpage: {
    icon: Globe,
    running: (args: Record<string, unknown>) => `Lendo página: ${String(args.url ?? "...").slice(0, 40)}`,
    done: () => `Página lida ✓`,
  } as never,
};

function getLabel(name: string, args: Record<string, unknown>, status: "running" | "done") {
  const meta = TOOL_META[name];
  if (!meta) return status === "running" ? `Executando ${name}…` : `${name} ✓`;
  const fn = status === "running" ? meta.running : meta.done;
  return (fn as unknown as (a: Record<string, unknown>) => string)(args);
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: Plus, text: "Criar uma nota sobre React hooks" },
  { icon: PenLine, text: "Escrever um resumo na minha nota" },
  { icon: List, text: "Quais notas eu tenho?" },
  { icon: SquareTerminal, text: "git status no terminal" },
];

// ─── Terminal helpers ─────────────────────────────────────────────────────────

/** Strip ANSI escape codes from terminal output */
function stripAnsi(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").replace(/\r/g, "");
}

/** Unique sentinel used to detect command completion */
const SENTINEL = "##SIRIUSAI_TERMINAL_DONE_" + Math.random().toString(36).slice(2) + "##";

interface TerminalSessionInfo {
  sessionId: string;
  shell: string;
}
interface TerminalDataPayload {
  sessionId: string;
  data: string;
}

/**
 * Runs a shell command via a temporary PTY session and returns clean output.
 * Uses a sentinel echo to know when the command finished.
 */
async function runTerminalCommand(
  command: string,
  cwd: string | null | undefined,
): Promise<string> {
  const session = await invoke<TerminalSessionInfo>("terminal_create_session", {
    cwd: cwd ?? null,
    cols: 120,
    rows: 30,
  });

  const { sessionId } = session;
  let output = "";
  let unlisten: (() => void) | undefined;
  let resolved = false;

  const result = await new Promise<string>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(output || "(timeout — no output received)");
      }
    }, 30_000);

    listen<TerminalDataPayload>("terminal://data", (event) => {
      if (event.payload.sessionId !== sessionId) return;
      const chunk = stripAnsi(event.payload.data);
      output += chunk;

      if (output.includes(SENTINEL)) {
        // Extract everything before the sentinel
        const beforeSentinel = output.split(SENTINEL)[0];
        // Remove the echoed command itself (first line) and empty lines at start/end
        const lines = beforeSentinel.split("\n");
        // Drop first line if it looks like our echo command
        const isCommandEcho = lines[0]?.includes("echo") || lines[0]?.trim() === command;
        const clean = (isCommandEcho ? lines.slice(1) : lines).join("\n").trim();
        if (!resolved) {
          resolved = true;
          window.clearTimeout(timeout);
          resolve(clean || "(no output)");
        }
      }
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(reject);

    // Small delay so listener is set up before we write
    window.setTimeout(async () => {
      try {
        await invoke("terminal_write", { sessionId, data: `${command}\n` });
        // Wait for command to finish, then print sentinel
        await new Promise((r) => window.setTimeout(r, 200));
        await invoke("terminal_write", { sessionId, data: `echo ${SENTINEL}\n` });
      } catch (err) {
        reject(err);
      }
    }, 300);
  });

  unlisten?.();
  await invoke("terminal_close_session", { sessionId }).catch(() => {});
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AiChatPanel({
  open,
  onOpenChange,
  activeNote,
  availableNotes,
  noteDirectory,
  onCreateNote,
  onWriteToActiveNote,
  onEditNote,
}: AiChatPanelProps) {
  const [apiMessages, setApiMessages] = useState<ChatMessage[]>([]);
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const apiMessagesRef = useRef<ChatMessage[]>([]);
  apiMessagesRef.current = apiMessages;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayItems, open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fn = () => setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
    el.addEventListener("scroll", fn);
    return () => el.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    if (open) {
      void initAndLoadHistory();
    }
  }, [open]);

  const initAndLoadHistory = async () => {
    // Disabled until a generic database sync or local persistence is implemented
    return;
  };

  const saveChatMessage = async (role: string, content: string) => {
    // Disabled SQL saving to fix build errors
    void role
    void content
    return crypto.randomUUID();
  };

  const executeTool = async (
    toolCall: ToolCall,
    actionId: string,
    args: Record<string, unknown>,
  ): Promise<string> => {
    const name = toolCall.function.name;
    try {
      if (name === "create_note") {
        const title = String(args.title ?? "Nova nota");
        await onCreateNote(title, String(args.content ?? ""));
        return `Note "${title}" created successfully.`;
      }
      if (name === "write_to_active_note") {
        if (!activeNote) return "Error: No note is open.";
        const mode = args.mode === "append" ? "append" : "replace";
        onWriteToActiveNote(String(args.content ?? ""), mode);
        return `Note "${activeNote.title || "Untitled"}" updated (${mode}).`;
      }
      if (name === "edit_note") {
        const noteId = String(args.note_id ?? "");
        if (!noteId) return "Error: note_id required.";
        const mode = args.mode === "append" ? "append" : "replace";
        const note = availableNotes.find((n) => n.id === noteId);
        await onEditNote(noteId, String(args.content ?? ""), mode);
        return `Note "${note?.title || noteId}" edited (${mode}).`;
      }
      if (name === "list_notes") {
        if (!availableNotes.length) return "No notes found.";
        return availableNotes
          .map((n, i) => `${i + 1}. "${n.title || "Untitled"}" (id: ${n.id})`)
          .join("\n");
      }
      if (name === "run_terminal_command") {
        const command = String(args.command ?? "").trim();
        if (!command) return "Error: command is required.";
        const output = await runTerminalCommand(command, noteDirectory);
        return `Command: ${command}\n\nOutput:\n${output}`;
      }
      if (name === "search_web") {
        const query = String(args.query ?? "").trim();
        if (!query) return "Error: query is required.";
        const output = await searchWeb(query);
        return output;
      }
      if (name === "read_webpage") {
        const url = String(args.url ?? "").trim();
        if (!url) return "Error: url is required.";
        const output = await readWebpage(url);
        return output;
      }
      return `Unknown tool: ${name}`;
    } catch (err) {
      setDisplayItems((prev) =>
        prev.map((item) =>
          item.id === actionId ? { ...item, status: "error" as const } : item,
        ),
      );
      throw err;
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput("");
    setLoading(true);

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const savedId = await saveChatMessage("user", trimmed);
    const userMsgId = savedId || crypto.randomUUID();
    setDisplayItems((prev) => [...prev, { kind: "user", id: userMsgId, content: trimmed }]);

    const systemMessages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
    if (activeNote?.content) {
      systemMessages.push({
        role: "system",
        content: `Active note — "${activeNote.title || "Untitled"}":\n\n${activeNote.content.slice(0, 16000)}`,
      });
    }

    let current: ChatMessage[] = [...apiMessagesRef.current];
    // Keep only the last 4 messages to guarantee we never hit the 6000 TPM limit
    if (current.length > 4) {
      current = current.slice(current.length - 4);
    }
    current.push(userMsg);

    try {
      const settings = useSettingsStore.getState().settings;
      const baseUrl = settings.aiBaseUrl || "https://api.groq.com/openai/v1";
      const modelId = settings.aiModel || "llama-3.1-8b-instant";
      const apiKey = settings.aiApiKey || "ollama";

      for (let i = 0; i < 6; i++) {
        const result = await sendGroqAgentMessage(
          baseUrl,
          apiKey,
          modelId,
          [...systemMessages, ...current],
          NOTE_TOOLS,
        );

        if (!result.tool_calls?.length) {
          const content = result.content ?? "";
          current = [...current, { role: "assistant", content }];
          setApiMessages(current);
          const savedId = await saveChatMessage("assistant", content);
          const assistantMsgId = savedId || crypto.randomUUID();
          setDisplayItems((prev) => [
            ...prev,
            { kind: "assistant", id: assistantMsgId, content },
          ]);
          break;
        }

        current = [...current, { role: "assistant", content: result.content ?? null, tool_calls: result.tool_calls }];

        for (const toolCall of result.tool_calls) {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>; } catch { /* */ }

          const actionId = crypto.randomUUID();
          setDisplayItems((prev) => [
            ...prev,
            {
              kind: "tool_action",
              id: actionId,
              toolName: toolCall.function.name,
              label: getLabel(toolCall.function.name, args, "running"),
              status: "running",
            },
          ]);

          let toolResult: string;
          try {
            toolResult = await executeTool(toolCall, actionId, args);
            setDisplayItems((prev) =>
              prev.map((item) =>
                item.id === actionId
                  ? { ...item, status: "done" as const, label: getLabel(toolCall.function.name, args, "done") }
                  : item,
              ),
            );
          } catch (err) {
            toolResult = `Error: ${err instanceof Error ? err.message : String(err)}`;
          }

          current = [
            ...current,
            { role: "tool", content: toolResult, tool_call_id: toolCall.id, name: toolCall.function.name },
          ];
        }
      }
      setApiMessages(current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setApiMessages(current);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
  };

  if (!open) return null;

  const hasItems = displayItems.length > 0;
  const isThinking = loading && !displayItems.some(
    (i) => i.kind === "tool_action" && (i as ToolActionItem).status === "running",
  );

  return (
    <>
      {/* Dim backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="fixed inset-y-0 right-0 z-[90] flex w-[420px] max-w-[96vw] flex-col bg-surface shadow-[0_0_80px_rgba(0,0,0,0.5)] motion-slide-right"
        role="dialog"
        aria-label="SiriusAI"
      >
        {/* ── Header ── */}
        <div
          className="relative flex shrink-0 items-center gap-3 border-b border-border px-4 py-3"
          style={{
            background: "linear-gradient(135deg, var(--bg-surface) 0%, color-mix(in srgb, var(--accent) 8%, var(--bg-surface)) 100%)",
          }}
        >
          {/* Glow dot */}
          <div className="absolute left-0 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-2xl" />

          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/40 bg-accent/15 shadow-[0_0_12px_rgba(var(--accent-rgb,124,58,237),0.3)]">
            <Bot className="h-4 w-4 text-accent" />
          </div>

          <div className="relative min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-text-primary">SiriusAI</p>
              <Sparkles className="h-3 w-3 text-accent opacity-70" />
            </div>
            <p className="text-[10px] text-text-muted">Agent · llama-3.3-70b</p>
          </div>

          <div className="relative flex items-center gap-1">
            {hasItems && (
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition hover:bg-hover hover:text-text-secondary"
                onClick={() => { setDisplayItems([]); setApiMessages([]); setError(null); }}
                title="Limpar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              className="rounded-lg p-2 text-text-muted transition hover:bg-hover hover:text-text-primary"
              onClick={() => onOpenChange(false)}
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
          {!hasItems ? (
            /* Empty state */
            <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10"
                style={{ boxShadow: "0 0 32px color-mix(in srgb, var(--accent) 20%, transparent)" }}
              >
                <Bot className="h-7 w-7 text-accent" />
              </div>
              <div>
                <p className="text-base font-semibold text-text-primary">SiriusAI Agent</p>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">
                  Crio notas, escrevo conteúdo e respondo qualquer pergunta.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2">
                {SUGGESTIONS.map(({ icon: Icon, text }) => (
                  <button
                    key={text}
                    type="button"
                    className="flex items-center gap-3 rounded-xl border border-border bg-base px-4 py-2.5 text-left text-xs text-text-secondary transition hover:border-accent/30 hover:bg-accent/5 hover:text-text-primary"
                    onClick={() => { setInput(text); textareaRef.current?.focus(); }}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1 px-4 py-4">
              {displayItems.map((item, idx) => {
                /* User bubble */
                if (item.kind === "user") {
                  return (
                    <div key={item.id} className={`flex justify-end ${idx > 0 ? "mt-3" : ""}`}>
                      <div
                        className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed text-text-primary"
                        style={{
                          background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 25%, var(--bg-base)), color-mix(in srgb, var(--accent) 15%, var(--bg-base)))",
                          border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                        }}
                      >
                        <p className="whitespace-pre-wrap">{item.content}</p>
                      </div>
                    </div>
                  );
                }

                /* Assistant bubble */
                if (item.kind === "assistant") {
                  return (
                    <div key={item.id} className={`flex gap-2.5 ${idx > 0 ? "mt-3" : ""}`}>
                      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10">
                        <Bot className="h-3.5 w-3.5 text-accent" />
                      </div>
                      <div
                        className="max-w-[86%] rounded-2xl rounded-tl-md border border-border px-4 py-2.5 text-sm leading-relaxed text-text-primary"
                        style={{ background: "var(--bg-base)" }}
                      >
                        <div className="prose-ai prose-sm">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              blockquote: ({ children, ...props }) => (
                                <blockquote
                                  className="my-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-[13px] italic leading-relaxed text-text-secondary/80 shadow-inner"
                                  {...props}
                                >
                                  {children}
                                </blockquote>
                              ),
                              img: ({ src, alt, ...props }) => {
                                const safeSrc = src ? encodeURI(decodeURI(src)) : undefined;
                                return (
                                  <img
                                    src={safeSrc}
                                    alt={alt}
                                    className="my-3 max-h-[300px] w-auto rounded-lg border border-border/50 object-contain shadow-sm"
                                    {...props}
                                  />
                                );
                              },
                            }}
                          >
                            {item.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  );
                }

                /* Tool action card */
                if (item.kind === "tool_action") {
                  const isRunning = item.status === "running";
                  const isDone = item.status === "done";
                  const Icon = TOOL_META[item.toolName]?.icon ?? Bot;
                  return (
                    <div key={item.id} className="my-1 flex gap-2.5 pl-8">
                      <div
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all duration-300 ${
                          isRunning
                            ? "border border-accent/25 bg-accent/8 text-text-secondary"
                            : isDone
                              ? "border border-emerald-500/25 bg-emerald-500/8 text-emerald-400"
                              : "border border-red/25 bg-red/8 text-red"
                        }`}
                      >
                        {isRunning ? (
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" />
                        ) : isDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <Icon className="h-3.5 w-3.5 shrink-0 opacity-50" />
                        <span className="truncate font-medium">{item.label}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })}

              {/* Thinking bubble */}
              {isThinking && (
                <div className="mt-3 flex gap-2.5">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10">
                    <Bot className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-border bg-base px-4 py-2.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-xl border border-red/25 bg-red/8 px-4 py-2.5 text-xs text-red">
                  <span className="font-semibold">Erro: </span>{error}
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Scroll to bottom */}
        {showScrollBtn && (
          <button
            type="button"
            className="absolute bottom-[86px] right-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-text-secondary shadow-lg transition hover:bg-hover"
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}

        {/* ── Input ── */}
        <div className="shrink-0 border-t border-border bg-surface p-3">
          {activeNote && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-base px-3 py-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                style={{ boxShadow: "0 0 6px var(--accent)" }}
              />
              <span className="min-w-0 truncate text-[11px] text-text-muted">
                Nota ativa: <span className="text-text-secondary">{activeNote.title || "Sem título"}</span>
              </span>
            </div>
          )}

          <div className="flex items-end gap-2 rounded-xl border border-border bg-base px-3 py-2 transition-colors focus-within:border-accent/50">
            <textarea
              ref={textareaRef}
              className="min-h-[32px] flex-1 resize-none bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
              placeholder="Pergunte algo ou peça para criar uma nota…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white shadow-sm transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || loading}
            >
              {loading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Send className="h-3.5 w-3.5" />
              }
            </button>
          </div>

          <p className="mt-2 text-center text-[10px] text-text-muted">
            Enter envia · Shift+Enter nova linha · Groq AI
          </p>
        </div>
      </aside>
    </>
  );
}
