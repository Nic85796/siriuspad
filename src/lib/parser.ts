import { v4 as uuidv4 } from 'uuid'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

import { DEFAULT_WORKSPACE_ID } from '@/lib/constants'
import type { Note, NoteMetadata } from '@/types'

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const VARIABLE_PATTERN = /\{\{([A-Z0-9_]+)\}\}/g

function cleanTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return []
  }

  return tags
    .map((tag) => `${tag}`.trim())
    .filter(Boolean)
    .filter((tag, index, array) => array.indexOf(tag) === index)
}

export function buildExcerpt(content: string, maxLength = 140) {
  const normalized = content.replace(/\s+/g, ' ').trim()

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

export function createEmptyNote(
  workspace = DEFAULT_WORKSPACE_ID,
  overrides: Partial<Note> = {},
): Note {
  const now = new Date().toISOString()

  return {
    id: overrides.id ?? uuidv4(),
    title: overrides.title?.trim() || 'Untitled note',
    workspace: overrides.workspace?.trim() || workspace,
    language: overrides.language?.trim() || 'markdown',
    tags: cleanTags(overrides.tags),
    created_at: overrides.created_at ?? now,
    updated_at: overrides.updated_at ?? now,
    pinned: overrides.pinned ?? false,
    content: overrides.content ?? '',
  }
}

export function normalizeNote(input: Partial<Note>): Note {
  const base = createEmptyNote(input.workspace ?? DEFAULT_WORKSPACE_ID, input)

  return {
    ...base,
    title: input.title?.trim() || base.title,
    workspace: input.workspace?.trim() || base.workspace,
    language: input.language?.trim() || base.language,
    tags: cleanTags(input.tags),
    created_at: input.created_at ?? base.created_at,
    updated_at: input.updated_at ?? base.updated_at,
    content: input.content ?? base.content,
    pinned: input.pinned ?? base.pinned,
  }
}

export function toMetadata(note: Note): NoteMetadata {
  return {
    id: note.id,
    title: note.title,
    workspace: note.workspace,
    language: note.language,
    tags: [...note.tags],
    created_at: note.created_at,
    updated_at: note.updated_at,
    pinned: note.pinned,
    excerpt: buildExcerpt(note.content),
  }
}

export function parseNoteFile(fileContent: string, defaults: Partial<Note> = {}) {
  const match = fileContent.match(FRONTMATTER_PATTERN)

  if (!match) {
    return normalizeNote({
      ...defaults,
      content: fileContent,
    })
  }

  try {
    const frontmatter = (parseYaml(match[1]) ?? {}) as Partial<Note>
    const body = fileContent.slice(match[0].length)

    return normalizeNote({
      ...defaults,
      ...frontmatter,
      content: body,
    })
  } catch {
    return normalizeNote({
      ...defaults,
      content: fileContent,
    })
  }
}

export function stringifyNote(note: Note) {
  const normalized = normalizeNote(note)
  const frontmatter = stringifyYaml({
    id: normalized.id,
    title: normalized.title,
    workspace: normalized.workspace,
    language: normalized.language,
    tags: normalized.tags,
    created_at: normalized.created_at,
    updated_at: normalized.updated_at,
    pinned: normalized.pinned,
  }).trimEnd()

  const content = normalized.content.replace(/^\n+/, '')

  return `---\n${frontmatter}\n---\n\n${content}`
}

export function replaceVariables(
  content: string,
  variables: Record<string, string>,
) {
  return content.replace(VARIABLE_PATTERN, (_, name: string) => {
    return variables[name] ?? `{{${name}}}`
  })
}

export function collectTags(notes: Array<Pick<NoteMetadata, 'tags'>>) {
  return Array.from(
    new Set(notes.flatMap((note) => note.tags.map((tag) => tag.trim()))),
  )
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
}

export function sortNotes(notes: NoteMetadata[]) {
  return [...notes].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1
    }

    return (
      new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    )
  })
}
