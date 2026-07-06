export const COMPOSITION_PRESETS = [
  { id: 'rule_of_thirds', label: 'Rule of Thirds' },
  { id: 'center_framing', label: 'Center Framing' },
  { id: 'symmetrical', label: 'Symmetrical' },
  { id: 'leading_lines', label: 'Leading Lines' },
  { id: 'close_up_focus', label: 'Close-up Focus' },
  { id: 'wide_establishing', label: 'Wide Establishing' },
  { id: 'over_the_shoulder', label: 'Over-the-Shoulder' },
  { id: 'pov', label: 'POV' },
]

export const CINEMATOGRAPHY_PRESETS = [
  { id: 'wide_shot', label: 'Wide Shot' },
  { id: 'medium_shot', label: 'Medium Shot' },
  { id: 'close_up', label: 'Close Up' },
  { id: 'low_angle', label: 'Low Angle' },
  { id: 'high_angle', label: 'High Angle' },
  { id: 'eye_level', label: 'Eye Level' },
  { id: 'tracking_shot', label: 'Tracking Shot' },
  { id: 'static_shot', label: 'Static Shot' },
  { id: 'handheld', label: 'Handheld' },
  { id: 'drone_shot', label: 'Drone Shot' },
]

export const LIGHTING_PRESETS = [
  { id: 'natural_light', label: 'Natural Light' },
  { id: 'soft_light', label: 'Soft Light' },
  { id: 'hard_light', label: 'Hard Light' },
  { id: 'backlight', label: 'Backlight' },
  { id: 'high_contrast', label: 'High Contrast' },
  { id: 'low_key', label: 'Low Key' },
  { id: 'golden_hour', label: 'Golden Hour' },
  { id: 'night', label: 'Night' },
  { id: 'dramatic_shadows', label: 'Dramatic Shadows' },
]

export const STORYBOARD_SETTINGS_TABS = [
  { id: 'composition', label: 'Composition' },
  { id: 'cinematography', label: 'Cinematography' },
  { id: 'lighting', label: 'Lighting & Mood' },
  { id: 'characters', label: 'Characters' },
  { id: 'environment', label: 'Environment' },
  { id: 'director', label: 'Director' },
  { id: 'versions', label: 'Image Versions' },
]

export function resolvePresetOption(preset, options = []) {
  if (!preset) return null
  if (typeof preset === 'string') {
    return options.find((item) => item.id === preset || item.label === preset) ?? null
  }
  if (preset.id) {
    return options.find((item) => item.id === preset.id) ?? preset
  }
  if (preset.label) {
    return options.find((item) => item.label === preset.label) ?? preset
  }
  return null
}

export function presetToPayload(option) {
  if (!option) return null
  return { id: option.id, label: option.label }
}
