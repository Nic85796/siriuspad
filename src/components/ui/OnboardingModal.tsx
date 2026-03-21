import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { PriorityDot } from "@/components/ui/PriorityDot";
import { TagPill } from "@/components/ui/TagPill";
import type { AppPlatform } from "@/types";

interface OnboardingModalProps {
  platform: AppPlatform;
  onComplete: () => void;
}

const STEPS = [
  { id: "welcome", icon: "◆", visual: "welcome" },
  { id: "notes", icon: "≡", visual: "notes" },
  { id: "tags", icon: "#", visual: "tags" },
  { id: "terminal", icon: ">_", visual: "terminal" },
  { id: "command", icon: "⌘", visual: "command" },
  { id: "project", icon: "▣", visual: "project" },
  { id: "shortcuts", icon: "⌨", visual: "shortcuts" },
  { id: "practice", icon: "▤", visual: "practice" },
  { id: "ready", icon: "✓", visual: "ready" },
] as const;

function StepVisual({
  step,
  shortcuts,
  isMobile,
}: {
  step: (typeof STEPS)[number];
  shortcuts: Array<{ key: string; label: string }>;
  isMobile: boolean;
}) {
  const { t } = useTranslation();

  switch (step.visual) {
    case "notes":
      return (
        <div className="grid gap-3 rounded-lg border border-border bg-[#0f0f0f] p-4">
          <div className="rounded-md border border-border bg-[#111111] p-3">
            <div className="mb-1 text-xs text-text-secondary">
              {t("onboarding.visuals.notesTitle")}
            </div>
            <div className="text-sm text-text-primary">
              {t("onboarding.visuals.notesBody")}
            </div>
          </div>
          <div className="rounded-md border border-border bg-[#111111] p-3">
            <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-text-muted">
              {t("note.checklistTitle")}
            </div>
            <div className="grid gap-2 text-xs">
              {[
                t("onboarding.visuals.notesChecklist1"),
                t("onboarding.visuals.notesChecklist2"),
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-md border border-border bg-[#0f0f0f] px-3 py-2 text-text-primary"
                >
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                      index === 0
                        ? "border-[#2d2060] bg-[rgba(124,58,237,0.12)] text-[#c4b5fd]"
                        : "border-border bg-[#111111] text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-[#2d2060] bg-[rgba(124,58,237,0.08)] p-3">
            <div className="mb-1 text-[11px] uppercase tracking-[0.16em] text-[#c4b5fd]">
              &gt; [!TIP]
            </div>
            <div className="text-sm text-text-primary">
              {t("onboarding.visuals.notesCalloutTitle")}
            </div>
            <div className="mt-1 text-xs leading-6 text-text-secondary">
              {t("onboarding.visuals.notesCalloutBody")}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <TagPill tag="bug" compact />
            <TagPill tag="deploy" compact />
            <TagPill tag="api" compact />
          </div>
        </div>
      );
    case "tags":
      return (
        <div className="grid gap-3 rounded-lg border border-border bg-[#0f0f0f] p-4">
          <div className="flex flex-wrap gap-2">
            <TagPill tag="bug" />
            <TagPill tag="urgente" />
            <TagPill tag="feat" />
            <TagPill tag="idea" />
          </div>
          <div className="flex flex-wrap gap-2">
            <PriorityDot priority="urgente" label={t("priority.urgente")} />
            <PriorityDot priority="alta" label={t("priority.alta")} />
            <PriorityDot priority="media" label={t("priority.media")} />
          </div>
        </div>
      );
    case "terminal":
      return (
        <div className="grid gap-3 rounded-lg border border-border bg-[#0f0f0f] p-4 font-mono text-xs">
          <div className="rounded-md border border-[#2d2060] bg-[rgba(124,58,237,0.12)] p-3">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#c4b5fd]">
              {t("terminal.terminal")}
            </div>
            <div className="mt-2 text-text-primary">cmd.exe / bash</div>
            <div className="mt-1 text-text-secondary">
              {t("terminal.noteFolder")} ~/siriuspad/notes/fix-janela
            </div>
          </div>
          <div className="rounded-md border border-border bg-[#111111] p-3">
            <div className="text-text-secondary">
              ~/siriuspad/notes/fix-janela $ npm run dev
            </div>
            <div className="mt-2 text-[#34d399]">VITE ready in 412ms</div>
          </div>
          <div className="rounded-md border border-border bg-[#111111] p-3">
            <div className="mb-1 text-text-secondary">
              {t("onboarding.visuals.terminalSnippetLabel")}
            </div>
            <div className="text-[#34d399]">
              console.log('teste') -&gt; teste
            </div>
          </div>
          <div className="rounded-md border border-border bg-[#111111] p-3">
            <div className="mb-1 text-text-secondary">
              {t("onboarding.visuals.terminalCommandLabel")}
            </div>
            <div className="text-text-primary">ls</div>
            <div className="mt-2 text-[#34d399]">fix-janela.md</div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {["Ctrl+`", "Enter", "Ctrl+C", "Ctrl+Enter"].map((shortcut) => (
              <span
                key={shortcut}
                className="rounded-md border border-border bg-[#111111] px-2 py-1 text-text-secondary"
              >
                {shortcut}
              </span>
            ))}
          </div>
        </div>
      );
    case "project":
      return (
        <div className="grid gap-3 rounded-lg border border-border bg-[#0f0f0f] p-4 text-xs sm:grid-cols-2">
          {[
            t("onboarding.visuals.projectPoint1"),
            t("onboarding.visuals.projectPoint2"),
            t("onboarding.visuals.projectPoint3"),
            t("onboarding.visuals.projectPoint4"),
          ].map((text) => (
            <div
              key={text}
              className="rounded-md border border-border bg-[#111111] px-3 py-3 text-text-secondary"
            >
              {text}
            </div>
          ))}
        </div>
      );
    case "command":
      return (
        <div className="grid gap-2 rounded-lg border border-border bg-[#0f0f0f] p-4 text-xs">
          {[
            {
              label: t("commands.newNote"),
              shortcut: "Ctrl+N",
            },
            {
              label: t("commands.findReplace"),
              shortcut: "Ctrl+H",
            },
            {
              label: t("commands.zoomIn"),
              shortcut: "Ctrl++",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-[#111111] px-3 py-2"
            >
              <span className="text-text-primary">{item.label}</span>
              <span className="rounded-md border border-border bg-[#161616] px-2 py-1 text-[11px] text-text-secondary">
                {item.shortcut}
              </span>
            </div>
          ))}
        </div>
      );
    case "shortcuts":
      return (
        <div className="grid gap-2 rounded-lg border border-border bg-[#0f0f0f] p-4 text-xs sm:grid-cols-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-[#111111] px-3 py-2"
            >
              <span className="text-text-primary">{shortcut.key}</span>
              <span className="text-text-secondary">{shortcut.label}</span>
            </div>
          ))}
        </div>
      );
    case "practice":
      return (
        <div className="grid gap-3 rounded-lg border border-border bg-[#0f0f0f] p-4 text-xs sm:grid-cols-2">
          {[
            {
              step: "01",
              title: t("onboarding.visuals.practiceStep1Title"),
              body: t("onboarding.visuals.practiceStep1Body"),
            },
            {
              step: "02",
              title: t("onboarding.visuals.practiceStep2Title"),
              body: t("onboarding.visuals.practiceStep2Body"),
            },
            {
              step: "03",
              title: t("onboarding.visuals.practiceStep3Title"),
              body: t("onboarding.visuals.practiceStep3Body"),
            },
            {
              step: "04",
              title: t("onboarding.visuals.practiceStep4Title"),
              body: t("onboarding.visuals.practiceStep4Body"),
            },
          ]
            .filter((item) => !isMobile || item.step !== "04")
            .map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-3 rounded-md border border-border bg-[#111111] px-3 py-3"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#2d2060] bg-[rgba(124,58,237,0.12)] text-[11px] font-semibold text-[#c4b5fd]">
                  {item.step}
                </span>
                <div className="min-w-0">
                  <div className="text-sm text-text-primary">{item.title}</div>
                  <div className="mt-1 leading-6 text-text-secondary">
                    {item.body}
                  </div>
                </div>
              </div>
            ))}
          <div className="rounded-md border border-[#2d2060] bg-[rgba(124,58,237,0.08)] px-3 py-3 text-xs leading-6 text-text-secondary sm:col-span-2">
            {t("onboarding.visuals.practiceFooter")}
          </div>
        </div>
      );
    case "welcome":
      return (
        <div className="grid gap-3 rounded-lg border border-border bg-[#0f0f0f] p-4 text-sm text-text-secondary">
          <div className="rounded-md border border-[#2d2060] bg-[rgba(124,58,237,0.12)] px-3 py-3 text-text-primary">
            {t("onboarding.visuals.welcomeBadge")}
          </div>
          <div className="grid gap-2 text-xs">
            <div>{t("onboarding.visuals.welcomePoint1")}</div>
            <div>{t("onboarding.visuals.welcomePoint2")}</div>
            <div>{t("onboarding.visuals.welcomePoint3")}</div>
            <div>{t("onboarding.visuals.welcomePoint4")}</div>
          </div>
        </div>
      );
    default:
      return (
        <div className="grid gap-3 rounded-lg border border-border bg-[#0f0f0f] p-4 text-sm text-text-secondary">
          <div className="rounded-md border border-[#2d2060] bg-[rgba(124,58,237,0.12)] px-3 py-3 text-text-primary">
            {t("onboarding.visuals.readyBadge")}
          </div>
          <div className="text-xs leading-6">
            {t("onboarding.visuals.readyHint")}
          </div>
          <div className="grid gap-2 text-xs">
            <div>{t("onboarding.visuals.readyPoint1")}</div>
            <div>{t("onboarding.visuals.readyPoint2")}</div>
            <div>{t("onboarding.visuals.readyPoint3")}</div>
          </div>
        </div>
      );
  }
}

export function OnboardingModal({
  platform,
  onComplete,
}: OnboardingModalProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const isMobile = platform === "android" || platform === "ios";
  const steps = useMemo(
    () =>
      isMobile
        ? STEPS.filter(
            (step) => step.id !== "terminal" && step.id !== "command",
          )
        : STEPS,
    [isMobile],
  );
  const step = useMemo(() => steps[index], [index, steps]);
  const isLast = index === steps.length - 1;
  const shortcuts = useMemo(
    () =>
      isMobile
        ? [
            { key: t("sidebar.newNote"), label: t("commands.newNote") },
            { key: t("titlebar.search"), label: t("titlebar.search") },
            {
              key: t("rightPanel.noteTools"),
              label: t("rightPanel.noteTools"),
            },
            { key: t("titlebar.settings"), label: t("titlebar.settings") },
          ]
        : [
            { key: "Ctrl+N", label: t("commands.newNote") },
            { key: "Ctrl+S", label: t("common.save") },
            { key: "Ctrl+K", label: t("commands.commandPalette") },
            { key: "Ctrl+F", label: t("titlebar.search") },
            { key: "Ctrl+`", label: t("terminal.toggleTitle") },
            { key: "Ctrl+Enter", label: t("terminal.run") },
          ],
    [isMobile, t],
  );

  return (
    <div className="modal-backdrop fixed inset-0 z-[90] overflow-y-auto bg-black/85">
      <div
        className="flex min-h-full items-start justify-center px-3 sm:items-center sm:px-4"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
        }}
      >
        <div
          className="modal-panel flex max-h-[90dvh] w-full max-w-[560px] flex-col overflow-y-auto rounded-[12px] border border-[#2d2060] bg-[#111111] sm:overflow-hidden"
          style={{
            maxHeight:
              "calc(100svh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 1.5rem)",
          }}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="inline-flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-[#161616] text-sm text-text-primary">
                {step.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {t(`onboarding.steps.${step.id}.title`)}
                </p>
                <p className="text-xs text-text-secondary">
                  {index + 1} / {steps.length}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="text-xs text-text-secondary transition hover:text-text-primary"
              onClick={onComplete}
            >
              {t("onboarding.skip")}
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto px-5 py-5">
            <p className="mb-4 text-sm leading-7 text-text-secondary">
              {t(`onboarding.steps.${step.id}.description`)}
            </p>

            <div className="motion-fade-up">
              <StepVisual
                step={step}
                shortcuts={shortcuts}
                isMobile={isMobile}
              />
            </div>

            <div className="mt-5 flex items-center justify-center gap-2">
              {steps.map((item, dotIndex) => (
                <span
                  key={item.id}
                  className={`h-2 w-2 rounded-full ${
                    dotIndex === index ? "bg-accent" : "bg-[#2a2a2a]"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border px-5 py-4">
            <button
              type="button"
              className="rounded-md border border-border bg-transparent px-3 py-2 text-sm text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary disabled:opacity-40"
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              disabled={index === 0}
            >
              {t("onboarding.prev")}
            </button>

            {isLast ? (
              <button
                type="button"
                className="rounded-md border border-border bg-[#161616] px-3 py-2 text-sm text-text-primary transition hover:border-focus hover:bg-hover"
                onClick={onComplete}
              >
                {t("onboarding.start")}
              </button>
            ) : (
              <button
                type="button"
                className="rounded-md border border-border bg-[#161616] px-3 py-2 text-sm text-text-primary transition hover:border-focus hover:bg-hover"
                onClick={() =>
                  setIndex((current) => Math.min(steps.length - 1, current + 1))
                }
              >
                {t("onboarding.next")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
