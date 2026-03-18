import { useState } from 'react'

import { FONT_OPTIONS } from '@/lib/constants'
import { Modal } from '@/components/ui/Modal'
import type { Settings, Workspace } from '@/types'

interface SettingsModalProps {
  open: boolean
  settings: Settings
  workspaces: Workspace[]
  onClose: () => void
  onUpdate: (patch: Partial<Settings>) => Promise<void>
  onSetVariable: (key: string, value: string) => Promise<void>
  onRemoveVariable: (key: string) => Promise<void>
  onResetSection: (
    section: 'editor' | 'appearance' | 'variables' | 'integrations' | 'shortcuts',
  ) => Promise<void>
}

function Section({
  title,
  description,
  onReset,
  children,
}: React.PropsWithChildren<{
  title: string
  description: string
  onReset: () => Promise<void>
}>) {
  return (
    <section className="border-b border-border px-6 py-5 last:border-b-0">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="mt-1 text-xs text-text-secondary">{description}</p>
        </div>
        <button
          type="button"
          className="rounded-md border border-border px-2.5 py-1 text-[11px] uppercase tracking-wide text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
          onClick={() => void onReset()}
        >
          Reset
        </button>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  description,
  children,
}: React.PropsWithChildren<{
  label: string
  description?: string
}>) {
  return (
    <label className="grid gap-2">
      <div>
        <span className="text-sm font-medium text-text-primary">{label}</span>
        {description ? (
          <p className="mt-1 text-xs text-text-secondary">{description}</p>
        ) : null}
      </div>
      {children}
    </label>
  )
}

function controlClassName() {
  return 'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-focus'
}

export function SettingsModal({
  open,
  settings,
  workspaces,
  onClose,
  onUpdate,
  onSetVariable,
  onRemoveVariable,
  onResetSection,
}: SettingsModalProps) {
  const [variableKey, setVariableKey] = useState('')
  const [variableValue, setVariableValue] = useState('')

  return (
    <Modal open={open} onClose={onClose} title="Settings" widthClassName="max-w-5xl">
      <Section
        title="Editor"
        description="Font, wrapping, autosave, and editor ergonomics."
        onReset={() => onResetSection('editor')}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Font size">
            <input
              className={controlClassName()}
              type="number"
              min={12}
              max={20}
              value={settings.fontSize}
              onChange={(event) =>
                void onUpdate({ fontSize: Number(event.target.value) })
              }
            />
          </Field>
          <Field label="Tab size">
            <select
              className={controlClassName()}
              value={settings.tabSize}
              onChange={(event) =>
                void onUpdate({ tabSize: Number(event.target.value) as 2 | 4 })
              }
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
            </select>
          </Field>
          <Field label="Word wrap">
            <button
              type="button"
              className={`${controlClassName()} text-left`}
              onClick={() => void onUpdate({ wordWrap: !settings.wordWrap })}
            >
              {settings.wordWrap ? 'Enabled' : 'Disabled'}
            </button>
          </Field>
          <Field label="Line numbers">
            <button
              type="button"
              className={`${controlClassName()} text-left`}
              onClick={() =>
                void onUpdate({ showLineNumbers: !settings.showLineNumbers })
              }
            >
              {settings.showLineNumbers ? 'Visible' : 'Hidden'}
            </button>
          </Field>
          <Field label="Autosave">
            <button
              type="button"
              className={`${controlClassName()} text-left`}
              onClick={() => void onUpdate({ autosave: !settings.autosave })}
            >
              {settings.autosave ? 'Enabled' : 'Disabled'}
            </button>
          </Field>
          <Field label="Autosave delay (ms)">
            <input
              className={controlClassName()}
              type="number"
              min={250}
              max={5000}
              step={50}
              value={settings.autosaveDelay}
              onChange={(event) =>
                void onUpdate({ autosaveDelay: Number(event.target.value) })
              }
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Appearance"
        description="SiriusPad stays dark only, but you can adjust the editor font."
        onReset={() => onResetSection('appearance')}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Theme">
            <input className={controlClassName()} value="dark" disabled />
          </Field>
          <Field label="Font family">
            <select
              className={controlClassName()}
              value={settings.fontFamily}
              onChange={(event) =>
                void onUpdate({ fontFamily: event.target.value })
              }
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section
        title="Shortcuts"
        description="Local shortcuts are active inside the app. Global palette is bound to Ctrl+Shift+K when available."
        onReset={() => onResetSection('shortcuts')}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {[
            'Ctrl+N - New note',
            'Ctrl+K - Command palette',
            'Ctrl+F - Focus search',
            'Ctrl+S - Save',
            'Ctrl+Enter - Run snippet',
            'Ctrl+W - Close note',
            'Ctrl+, - Open settings',
            'Ctrl+Shift+C - Copy with variables',
            'Ctrl+Shift+G - Export Gist',
            'Ctrl+D - Duplicate note',
            'Ctrl+Shift+P - Pin or unpin',
            'Alt+1..9 - Switch workspace',
          ].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-secondary"
            >
              {item}
            </div>
          ))}
        </div>
        <Field
          label="Default workspace"
          description="New notes use this workspace unless you create them inside another filter."
        >
          <select
            className={controlClassName()}
            value={settings.defaultWorkspace}
            onChange={(event) =>
              void onUpdate({ defaultWorkspace: event.target.value })
            }
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section
        title="Global Variables"
        description="These are substituted in snippets, copies, and exports."
        onReset={() => onResetSection('variables')}
      >
        <div className="grid gap-3">
          {Object.entries(settings.variables).length ? (
            Object.entries(settings.variables).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-text-primary">{key}</p>
                  <p className="truncate text-xs text-text-secondary">{value}</p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
                  onClick={() => void onRemoveVariable(key)}
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-text-secondary">
              No global variables yet.
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            className={controlClassName()}
            placeholder="API_URL"
            value={variableKey}
            onChange={(event) => setVariableKey(event.target.value.toUpperCase())}
          />
          <input
            className={controlClassName()}
            placeholder="https://api.example.com"
            value={variableValue}
            onChange={(event) => setVariableValue(event.target.value)}
          />
          <button
            type="button"
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary transition hover:border-focus hover:bg-hover"
            onClick={() => {
              if (!variableKey.trim()) {
                return
              }

              void onSetVariable(variableKey.trim(), variableValue)
              setVariableKey('')
              setVariableValue('')
            }}
          >
            Add
          </button>
        </div>
      </Section>

      <Section
        title="Integrations"
        description="GitHub Gist export uses a token with the gist scope."
        onReset={() => onResetSection('integrations')}
      >
        <Field
          label="GitHub token"
          description="Stored locally in SiriusPad's Tauri store."
        >
          <input
            className={controlClassName()}
            type="password"
            placeholder="ghp_..."
            value={settings.githubToken}
            onChange={(event) =>
              void onUpdate({ githubToken: event.target.value })
            }
          />
        </Field>
      </Section>
    </Modal>
  )
}
