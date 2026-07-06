import {
  CINEMATOGRAPHY_PRESETS,
  COMPOSITION_PRESETS,
  LIGHTING_PRESETS,
  resolvePresetOption,
} from './storyboardPresets'

function slugify(text) {
  return (
    String(text ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'custom'
  )
}

export function mapDirectorSuggestions(apiData = {}) {
  const director = apiData.director ?? apiData

  return {
    composition: {
      name: director.composition?.name ?? '',
      reason: director.composition?.reason ?? '',
    },
    camera: {
      shot_size: director.camera?.shot_size ?? '',
      angle: director.camera?.angle ?? '',
      movement: director.camera?.movement ?? '',
      lens: director.camera?.lens ?? '',
      reason: director.camera?.reason ?? '',
    },
    lighting: {
      style: director.lighting?.style ?? '',
      reason: director.lighting?.reason ?? '',
    },
    mood: director.mood ?? '',
    color_palette: director.color_palette ?? '',
    notes: director.notes ?? '',
    updated_prompt: director.updated_prompt ?? '',
  }
}

export function presetFromSuggestion(name, options = []) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return null

  const match = resolvePresetOption(trimmed, options)
  if (match) return match

  return { id: slugify(trimmed), label: trimmed }
}

export function resolveCinematographyFromCamera(camera = {}) {
  const candidates = [camera.angle, camera.movement, camera.shot_size, camera.lens].filter(Boolean)

  for (const candidate of candidates) {
    const match = resolvePresetOption(candidate, CINEMATOGRAPHY_PRESETS)
    if (match) return match
  }

  const label = candidates[0]
  return label ? presetFromSuggestion(label, CINEMATOGRAPHY_PRESETS) : null
}

export function formatCameraDisplay(camera = {}) {
  const parts = [camera.shot_size, camera.angle, camera.movement, camera.lens].filter(Boolean)
  return parts.join(' · ') || '—'
}

export function formatDirectorReasoning(suggestions = {}) {
  const parts = [
    suggestions.composition?.reason,
    suggestions.camera?.reason,
    suggestions.lighting?.reason,
    suggestions.notes,
  ].filter((part) => String(part ?? '').trim())

  return parts.join('\n\n')
}

export function applyDirectorSuggestionsToLocalSettings(
  suggestions = {},
  existingStoryboardSettings = {}
) {
  return {
    compositionPreset: presetFromSuggestion(suggestions.composition?.name, COMPOSITION_PRESETS),
    cinematographyPreset: resolveCinematographyFromCamera(suggestions.camera),
    lightingPreset: presetFromSuggestion(suggestions.lighting?.style, LIGHTING_PRESETS),
    storyboardSettings: {
      ...existingStoryboardSettings,
      mood: suggestions.mood || existingStoryboardSettings.mood || '',
      color_palette: suggestions.color_palette || existingStoryboardSettings.color_palette || '',
      updated_prompt:
        suggestions.updated_prompt || existingStoryboardSettings.updated_prompt || '',
      director_notes: suggestions.notes || existingStoryboardSettings.director_notes || '',
      reasoning: formatDirectorReasoning(suggestions),
    },
  }
}
