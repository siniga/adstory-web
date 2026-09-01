export const DEFAULT_VISUAL_STYLE = 'cinematic_realistic'

export const VISUAL_STYLES = [
  {
    label: 'Cinematic Realistic',
    value: 'cinematic_realistic',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #0f172a 100%)',
  },
  {
    label: 'Commercial Advertising',
    value: 'commercial_advertising',
    gradient: 'linear-gradient(135deg, #78350f 0%, #b45309 55%, #1c1917 100%)',
  },
  {
    label: 'Documentary',
    value: 'documentary',
    gradient: 'linear-gradient(135deg, #374151 0%, #6b7280 55%, #111827 100%)',
  },
  {
    label: 'Storyboard Sketch',
    value: 'storyboard_sketch',
    gradient: 'linear-gradient(135deg, #fafafa 0%, #d4d4d8 55%, #71717a 100%)',
  },
  {
    label: 'Cartoon',
    value: 'cartoon',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 55%, #06b6d4 100%)',
  },
  {
    label: 'Anime',
    value: 'anime',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #ec4899 55%, #1e1b4b 100%)',
  },
  {
    label: 'Luxury Brand',
    value: 'luxury_brand',
    gradient: 'linear-gradient(135deg, #292524 0%, #78716c 55%, #0c0a09 100%)',
  },
  {
    label: 'Music Video',
    value: 'music_video',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #db2777 55%, #0f172a 100%)',
  },
]

function toStyleSlug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Accepts either a slug (`cinematic_realistic`) or a stored label
 * (`Cinematic Realistic`) and always returns a known style value.
 */
export function normalizeVisualStyle(value) {
  if (value == null || String(value).trim() === '') {
    return DEFAULT_VISUAL_STYLE
  }

  const trimmed = String(value).trim()
  const exactValue = VISUAL_STYLES.find((style) => style.value === trimmed)
  if (exactValue) {
    return exactValue.value
  }

  const byLabel = VISUAL_STYLES.find(
    (style) => style.label.toLowerCase() === trimmed.toLowerCase()
  )
  if (byLabel) {
    return byLabel.value
  }

  const slug = toStyleSlug(trimmed)
  const bySlug = VISUAL_STYLES.find((style) => style.value === slug)
  if (bySlug) {
    return bySlug.value
  }

  return DEFAULT_VISUAL_STYLE
}

export function getVisualStyleLabel(value) {
  const normalized = normalizeVisualStyle(value)
  return VISUAL_STYLES.find((style) => style.value === normalized)?.label ?? normalized
}
