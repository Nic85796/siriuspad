import i18n from '@/i18n'
import type { Note } from '@/types'

function sanitizeFilename(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function resolveExtension(language: string) {
  switch (language) {
    case 'python':
    case 'python3':
      return 'py'
    case 'javascript':
    case 'node':
      return 'js'
    case 'bash':
    case 'sh':
      return 'sh'
    case 'ruby':
      return 'rb'
    case 'go':
      return 'go'
    case 'rust':
      return 'rs'
    case 'html':
      return 'html'
    case 'css':
      return 'css'
    case 'json':
      return 'json'
    default:
      return 'md'
  }
}

export async function exportNoteToGist(
  note: Note,
  token: string,
  isPublic: boolean,
) {
  if (!token.trim()) {
    throw new Error(i18n.t('gist.tokenRequired'))
  }

  const extension = resolveExtension(note.language)
  const basename = sanitizeFilename(note.title) || note.id
  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: `SiriusPad note: ${note.title}`,
      public: isPublic,
      files: {
        [`${basename}.${extension}`]: {
          content: note.content,
        },
      },
    }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null

    throw new Error(payload?.message ?? i18n.t('gist.createFailed'))
  }

  const payload = (await response.json()) as { html_url: string }
  return payload.html_url
}
