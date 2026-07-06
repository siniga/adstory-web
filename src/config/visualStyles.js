export const DEFAULT_VISUAL_STYLE = 'cinematic_realistic'

export const VISUAL_STYLES = [
  { label: 'Cinematic Realistic', value: 'cinematic_realistic', gradient: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%)' },
  { label: 'Commercial Advertising', value: 'commercial_advertising', gradient: 'linear-gradient(145deg, #78350f 0%, #b45309 50%, #1c1917 100%)' },
  { label: 'Documentary', value: 'documentary', gradient: 'linear-gradient(145deg, #374151 0%, #6b7280 50%, #111827 100%)' },
  { label: 'Storyboard Sketch', value: 'storyboard_sketch', gradient: 'linear-gradient(145deg, #fafafa 0%, #d4d4d8 50%, #71717a 100%)' },
  { label: 'Cartoon', value: 'cartoon', gradient: 'linear-gradient(145deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)' },
  { label: 'Anime', value: 'anime', gradient: 'linear-gradient(145deg, #6366f1 0%, #ec4899 50%, #1e1b4b 100%)' },
  { label: 'Luxury Brand', value: 'luxury_brand', gradient: 'linear-gradient(145deg, #292524 0%, #78716c 50%, #0c0a09 100%)' },
  { label: 'Music Video', value: 'music_video', gradient: 'linear-gradient(145deg, #7c3aed 0%, #db2777 50%, #0f172a 100%)' },
]

export function normalizeVisualStyle(value) {
  if (VISUAL_STYLES.some((style) => style.value === value)) {
    return value
  }
  return DEFAULT_VISUAL_STYLE
}

export function getVisualStyleLabel(value) {
  return VISUAL_STYLES.find((style) => style.value === value)?.label ?? value
}
