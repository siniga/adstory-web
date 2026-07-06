import { BRAND } from '../../config/branding'

const LENS_BY_SIZE = {
  'Extreme Wide': '24mm Wide',
  Wide: '24mm Wide',
  Medium: '50mm Standard',
  'Medium Close Up': '50mm Standard',
  'Close Up': '85mm Portrait',
  'Extreme Close Up': '100mm Macro',
}

export function mapToStudioScenes({ scenes, shotGroups, frameGroups, generatedImages, story }) {
  return scenes.map((scene) => {
    const group = shotGroups.find((g) => g.sceneId === scene.id)
    const shots = (group?.shots ?? []).map((shot) => {
      const frames = frameGroups.find((f) => f.shotId === shot.id)?.frames ?? []
      const totalDuration = frames.reduce((sum, frame) => sum + parseDuration(frame.duration), 0)

      return {
        id: shot.id,
        label: shot.description,
        shotType: `${shot.shotSize} Shot`,
        previewImage: generatedImages[shot.id] ?? null,
        thumbGradient: scene.thumbGradient,
        environment: `${scene.title} — ${scene.location}`,
        lighting: inferLighting(scene.mood),
        notes: shot.description,
        duration: `${totalDuration.toFixed(1)}s`,
        frameCount: Math.max(frames.length * 30, 30),
        description: shot.description,
        imagePrompt: generatedImages[shot.id] ? undefined : null,
        presets: {
          composition: shot.id.endsWith('.1') ? 'Rule of Thirds' : 'Center Frame',
          shotSize: shot.shotSize,
          camera: shot.camera,
          lens: LENS_BY_SIZE[shot.shotSize] ?? '50mm Standard',
          lighting: inferLightingPreset(scene.mood),
          timeOfDay: inferTimeOfDay(scene),
          mood: scene.mood.split(',')[0]?.trim() ?? 'Neutral',
        },
        suggestions: {
          composition: 'Adjust framing in Studio after reviewing generated image.',
          lighting: 'Match lighting to scene mood during refinement.',
          environment: scene.description,
          character: story.slice(0, 80),
        },
      }
    })

    return { id: scene.id, title: scene.title, shots }
  })
}

function parseDuration(value) {
  const num = Number.parseFloat(String(value).replace(/[^\d.]/g, ''))
  return Number.isFinite(num) ? num : 2
}

function inferLighting(mood) {
  if (mood.toLowerCase().includes('mysterious')) return 'Low key, teal underlight'
  if (mood.toLowerCase().includes('epic')) return 'Dawn backlight, soft haze'
  return 'Golden hour, warm backlight'
}

function inferLightingPreset(mood) {
  if (mood.toLowerCase().includes('mysterious')) return 'Low Key'
  if (mood.toLowerCase().includes('epic')) return 'Natural'
  return 'Golden Hour'
}

function inferTimeOfDay(scene) {
  const text = `${scene.title} ${scene.location}`.toLowerCase()
  if (text.includes('night')) return 'Night'
  if (text.includes('dawn')) return 'Sunrise'
  if (text.includes('sunset')) return 'Sunset'
  return 'Sunset'
}

export function deriveProjectName(story) {
  const first = story.split(/[.!?]/)[0]?.trim()
  if (!first || first.length < 8) return BRAND.untitledProjectName
  return first.length > 48 ? `${first.slice(0, 45)}…` : first
}
