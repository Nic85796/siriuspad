export type CalloutTone = 'note' | 'tip' | 'warning' | 'danger' | 'success'

export interface MarkdownSectionMarkdown {
  type: 'markdown'
  content: string
}

export interface MarkdownSectionCallout {
  type: 'callout'
  tone: CalloutTone
  title: string | null
  content: string
}

export type MarkdownSection = MarkdownSectionMarkdown | MarkdownSectionCallout

interface CalloutDefinition {
  tone: CalloutTone
}

const CALLOUT_ALIASES: Record<string, CalloutDefinition> = {
  NOTE: { tone: 'note' },
  INFO: { tone: 'note' },
  TIP: { tone: 'tip' },
  HINT: { tone: 'tip' },
  WARNING: { tone: 'warning' },
  CAUTION: { tone: 'warning' },
  IMPORTANT: { tone: 'warning' },
  BUG: { tone: 'danger' },
  DANGER: { tone: 'danger' },
  ERROR: { tone: 'danger' },
  SUCCESS: { tone: 'success' },
  DONE: { tone: 'success' },
}

const CALLOUT_START_PATTERN = /^\s*>\s*\[!([A-Z]+)\](?:\s+(.*))?\s*$/
const CALLOUT_LINE_PATTERN = /^\s*>\s?(.*)$/

function resolveCallout(marker: string) {
  return CALLOUT_ALIASES[marker.toUpperCase()] ?? null
}

function pushMarkdownSection(
  sections: MarkdownSection[],
  lines: string[],
) {
  const content = lines.join('\n').trim()

  if (!content) {
    return
  }

  sections.push({
    type: 'markdown',
    content,
  })
}

export function splitMarkdownSections(content: string): MarkdownSection[] {
  const lines = content.split(/\r?\n/)
  const sections: MarkdownSection[] = []
  let markdownBuffer: string[] = []
  let index = 0

  while (index < lines.length) {
    const currentLine = lines[index]
    const startMatch = currentLine.match(CALLOUT_START_PATTERN)

    if (!startMatch) {
      markdownBuffer.push(currentLine)
      index += 1
      continue
    }

    const callout = resolveCallout(startMatch[1])
    if (!callout) {
      markdownBuffer.push(currentLine)
      index += 1
      continue
    }

    pushMarkdownSection(sections, markdownBuffer)
    markdownBuffer = []

    const bodyLines: string[] = []
    const explicitTitle = startMatch[2]?.trim() || null
    index += 1

    while (index < lines.length) {
      const line = lines[index]

      if (!line.trim()) {
        bodyLines.push('')
        index += 1
        continue
      }

      const lineMatch = line.match(CALLOUT_LINE_PATTERN)
      if (!lineMatch) {
        break
      }

      bodyLines.push(lineMatch[1])
      index += 1
    }

    sections.push({
      type: 'callout',
      tone: callout.tone,
      title: explicitTitle,
      content: bodyLines.join('\n').trim(),
    })
  }

  pushMarkdownSection(sections, markdownBuffer)
  return sections
}

export function buildCalloutTemplate(tone: CalloutTone) {
  const templates: Record<CalloutTone, string> = {
    note: '> [!NOTE] Contexto\n> Resuma aqui uma observação importante da nota.\n',
    tip: '> [!TIP] Dica rápida\n> Guarde aqui um atalho, comando ou insight útil.\n',
    warning: '> [!WARNING] Atenção\n> Descreva algo que exige cuidado antes de seguir.\n',
    danger: '> [!BUG] Ponto crítico\n> Registre impacto, suspeita e próximo passo.\n',
    success: '> [!SUCCESS] Conclusão\n> Marque aqui algo que já foi validado.\n',
  }

  return templates[tone]
}
