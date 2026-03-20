function expandHex(color: string) {
  const normalized = color.trim().replace('#', '')

  if (normalized.length === 3) {
    return normalized
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
  }

  if (normalized.length === 6) {
    return normalized
  }

  return null
}

export function hexToRgb(color?: string | null) {
  if (!color) {
    return null
  }

  const hex = expandHex(color)
  if (!hex) {
    return null
  }

  const value = Number.parseInt(hex, 16)

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

export function withAlpha(color?: string | null, alpha = 1) {
  const rgb = hexToRgb(color)
  if (!rgb) {
    return undefined
  }

  const safeAlpha = Math.min(1, Math.max(0, alpha))
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`
}
