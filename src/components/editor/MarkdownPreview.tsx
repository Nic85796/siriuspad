import { Play } from 'lucide-react'
import { isValidElement } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { useTranslation } from 'react-i18next'

import { withAlpha } from '@/lib/color'
import { splitMarkdownSections, type CalloutTone } from '@/lib/markdownBlocks'

interface MarkdownPreviewProps {
  content: string
  accentColor?: string
  onRunCodeInTerminal?: (payload: {
    code: string
    language: string | null
  }) => void
}

function extractCodeText(children: React.ReactNode): string {
  if (
    isValidElement<{ children?: React.ReactNode }>(children)
  ) {
    const content = children.props.children
    return Array.isArray(content) ? content.join('') : `${content ?? ''}`
  }

  if (Array.isArray(children)) {
    return children.map((child) => `${child ?? ''}`).join('')
  }

  return `${children ?? ''}`
}

function extractCodeLanguage(children: React.ReactNode): string | null {
  const resolveFromClassName = (className?: string) => {
    const match = className?.match(/language-([a-z0-9#+-]+)/i)
    return match?.[1] ?? null
  }

  if (isValidElement<{ className?: string; children?: React.ReactNode }>(children)) {
    return resolveFromClassName(children.props.className)
  }

  if (Array.isArray(children)) {
    for (const child of children) {
      if (
        isValidElement<{ className?: string }>(child) &&
        child.props.className
      ) {
        return resolveFromClassName(child.props.className)
      }
    }
  }

  return null
}

export function MarkdownPreview({
  content,
  accentColor,
  onRunCodeInTerminal,
}: MarkdownPreviewProps) {
  const { t } = useTranslation()
  const sections = splitMarkdownSections(content)

  const calloutPalette: Record<
    CalloutTone,
    { border: string; background: string; badge: string; label: string }
  > = {
    note: {
      border: '#2d2060',
      background: 'rgba(124,58,237,0.08)',
      badge: '#c4b5fd',
      label: t('note.calloutNote'),
    },
    tip: {
      border: '#1a4030',
      background: 'rgba(52,211,153,0.08)',
      badge: '#86efac',
      label: t('note.calloutTip'),
    },
    warning: {
      border: '#4a3010',
      background: 'rgba(251,191,36,0.08)',
      badge: '#fcd34d',
      label: t('note.calloutWarning'),
    },
    danger: {
      border: '#4a2020',
      background: 'rgba(248,113,113,0.08)',
      badge: '#fca5a5',
      label: 'BUG',
    },
    success: {
      border: '#1f3f5b',
      background: 'rgba(96,165,250,0.08)',
      badge: '#93c5fd',
      label: 'SUCCESS',
    },
  }

  const renderMarkdown = (value: string, key: string) => (
    <ReactMarkdown
      key={key}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        h1(props) {
          return <h1 {...props} className="mb-4 text-3xl font-semibold" />
        },
        h2(props) {
          return <h2 {...props} className="mb-3 mt-8 text-2xl font-semibold" />
        },
        h3(props) {
          return <h3 {...props} className="mb-3 mt-6 text-xl font-semibold" />
        },
        p(props) {
          return <p {...props} className="mb-4 text-text-primary" />
        },
        ul(props) {
          return <ul {...props} className="mb-4 list-disc pl-6" />
        },
        ol(props) {
          return <ol {...props} className="mb-4 list-decimal pl-6" />
        },
        li(props) {
          return <li {...props} className="mb-1" />
        },
        input(props) {
          if (props.type === 'checkbox') {
            return (
              <input
                {...props}
                className="mr-2 h-4 w-4 rounded border-border accent-[var(--accent)]"
              />
            )
          }

          return <input {...props} />
        },
        code(props) {
          return (
            <code
              {...props}
              className={`${props.className ?? ''} rounded-md bg-[#161616] px-1.5 py-0.5 text-[0.9em]`}
            />
          )
        },
        pre(props) {
          const code = extractCodeText(props.children).trimEnd()
          const language = extractCodeLanguage(props.children)

          return (
            <div className="relative mb-4 overflow-hidden rounded-lg border border-border bg-[#0f0f0f]">
              {onRunCodeInTerminal && code ? (
                <button
                  type="button"
                  className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-border bg-[#161616] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
                  onClick={() =>
                    onRunCodeInTerminal({
                      code,
                      language,
                    })
                  }
                >
                  <Play className="h-3 w-3" />
                  {t('terminal.run')}
                </button>
              ) : null}
              <pre
                {...props}
                className="overflow-x-auto p-4 pr-24 text-xs"
              />
            </div>
          )
        },
        blockquote(props) {
          return (
            <blockquote
              {...props}
              className="mb-4 border-l-2 border-accent pl-4 text-text-secondary"
            />
          )
        },
        table(props) {
          return (
            <div className="overflow-x-auto">
              <table
                {...props}
                className="min-w-full border-collapse rounded-lg border border-border"
              />
            </div>
          )
        },
        th(props) {
          return (
            <th
              {...props}
              className="border-b border-border bg-[#161616] px-3 py-2 text-left font-medium"
            />
          )
        },
        td(props) {
          return <td {...props} className="border-b border-border px-3 py-2" />
        },
      }}
    >
      {value}
    </ReactMarkdown>
  )

  return (
    <div
      className="h-full overflow-y-auto bg-[#111111] px-6 py-5"
      style={{
        boxShadow: accentColor ? `inset 3px 0 0 ${accentColor}` : undefined,
        backgroundImage: withAlpha(accentColor, 0.05)
          ? `linear-gradient(180deg, ${withAlpha(accentColor, 0.05)}, transparent 55%)`
          : undefined,
      }}
    >
      <div className="max-w-none text-[13px] leading-7 text-text-primary">
        {sections.map((section, index) => {
          if (section.type === 'markdown') {
            return renderMarkdown(section.content, `markdown-${index}`)
          }

          const palette = calloutPalette[section.tone]

          return (
            <div
              key={`callout-${index}`}
              className="mb-4 overflow-hidden rounded-md border"
              style={{
                borderColor: palette.border,
                backgroundColor: palette.background,
                boxShadow: `inset 3px 0 0 ${palette.badge}`,
              }}
            >
              <div className="flex flex-wrap items-center gap-3 border-b border-white/5 px-4 py-3">
                <span
                  className="rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.18em]"
                  style={{
                    borderColor: palette.border,
                    color: palette.badge,
                    backgroundColor: 'rgba(0,0,0,0.18)',
                  }}
                >
                  {palette.label}
                </span>
                <strong className="text-sm font-semibold text-text-primary">
                  {section.title ?? palette.label}
                </strong>
              </div>
              <div className="px-4 py-4">
                {section.content ? renderMarkdown(section.content, `callout-body-${index}`) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
