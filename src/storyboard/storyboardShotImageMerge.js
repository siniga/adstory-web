import { mapAdstoryShot } from '../services/adstoryApi'

const IN_FLIGHT_IMAGE_STATUSES = new Set(['queued', 'generating', 'pending'])
const COMPLETED_IMAGE_STATUS = 'completed'

function shotKey(shot) {
  return String(shot?.apiId ?? shot?.id ?? '')
}

function hasImageUrl(shot) {
  const url = shot?.image_url ?? shot?.imageUrl
  return url != null && String(url).trim() !== ''
}

function normalizeIncomingShot(incoming) {
  return incoming?.apiId != null ? incoming : mapAdstoryShot(incoming)
}

function pickImageUrl(existing, incoming) {
  if (hasImageUrl(incoming)) {
    if (!hasImageUrl(existing)) {
      console.log('[Storyboard] shot image loaded', {
        shotId: incoming?.apiId ?? incoming?.id,
      })
    }
    return String(incoming.image_url ?? incoming.imageUrl).trim()
  }

  if (hasImageUrl(existing)) {
    console.log('[Storyboard] blocked image_url overwrite', {
      shotId: existing?.apiId ?? existing?.id,
    })
    return String(existing.image_url ?? existing.imageUrl).trim()
  }

  return ''
}

function pickImageStatus(existing, incoming, imageUrl) {
  const existingStatus = existing?.image_status ?? existing?.imageStatus ?? 'none'
  const incomingStatus = incoming?.image_status ?? incoming?.imageStatus

  if (
    existingStatus === COMPLETED_IMAGE_STATUS &&
    incomingStatus &&
    IN_FLIGHT_IMAGE_STATUSES.has(incomingStatus)
  ) {
    console.log('[Storyboard] blocked completed status downgrade', {
      shotId: existing?.apiId ?? existing?.id,
      incomingStatus,
    })
    return COMPLETED_IMAGE_STATUS
  }

  if (
    incomingStatus === 'failed' ||
    incomingStatus === 'generating' ||
    incomingStatus === 'queued'
  ) {
    return incomingStatus
  }

  if (imageUrl) return COMPLETED_IMAGE_STATUS
  if (incomingStatus) return incomingStatus
  return existingStatus
}

function pickGenerationError(existing, incoming) {
  const incomingError = incoming?.generation_error ?? incoming?.generationError
  if (incomingError != null && String(incomingError).trim()) {
    return incomingError
  }
  return existing?.generation_error ?? existing?.generationError ?? null
}

function pickImagePrompt(existing, incoming) {
  const incomingPrompt = incoming?.image_prompt ?? incoming?.imagePrompt
  if (incomingPrompt != null && String(incomingPrompt).trim()) {
    return incomingPrompt
  }
  return existing?.image_prompt ?? existing?.imagePrompt ?? ''
}

export function mergeShotImageFields(existing, incoming) {
  if (!existing) return normalizeIncomingShot(incoming)
  if (!incoming) return existing

  const mapped = normalizeIncomingShot(incoming)
  const imageUrl = pickImageUrl(existing, mapped)
  const imageStatus = pickImageStatus(existing, mapped, imageUrl)

  return {
    ...existing,
    image_url: imageUrl,
    image_status: imageStatus,
    image_prompt: pickImagePrompt(existing, mapped),
    generation_error: pickGenerationError(existing, mapped),
    updated_at: mapped.updated_at ?? existing.updated_at,
    shot_images: mapped.shot_images?.length ? mapped.shot_images : existing.shot_images,
    approved_image: mapped.approved_image ?? existing.approved_image,
  }
}

export function mergeShotPreservingImages(existing, incoming, { imageOnly = false } = {}) {
  if (!existing) return normalizeIncomingShot(incoming)
  if (!incoming) return existing

  const mapped = normalizeIncomingShot(incoming)
  const imageFields = mergeShotImageFields(existing, mapped)

  if (imageOnly) {
    return imageFields
  }

  return {
    ...existing,
    ...mapped,
    ...imageFields,
    id: existing.id ?? mapped.id,
    apiId: mapped.apiId ?? existing.apiId,
  }
}

export function mergeShotsPreservingImages(
  existingShots = [],
  incomingShots = [],
  { imageOnly = false, replaceAll = false } = {}
) {
  if (!incomingShots.length) return existingShots

  const existingById = new Map(existingShots.map((shot) => [shotKey(shot), shot]))
  const incomingMapped = incomingShots.map((shot) => normalizeIncomingShot(shot))
  const incomingById = new Map(incomingMapped.map((shot) => [shotKey(shot), shot]))

  if (replaceAll) {
    return incomingMapped.map((incoming) => {
      const existing = existingById.get(shotKey(incoming))
      return existing
        ? mergeShotPreservingImages(existing, incoming, { imageOnly })
        : incoming
    })
  }

  const patched = existingShots.map((shot) => {
    const patch = incomingById.get(shotKey(shot))
    if (!patch) return shot
    return mergeShotPreservingImages(shot, patch, { imageOnly })
  })

  for (const incoming of incomingMapped) {
    const key = shotKey(incoming)
    if (!existingById.has(key)) {
      patched.push(incoming)
    }
  }

  return patched
}

/** Image-generation progress: patch only image-related fields on existing shots. */
export function patchStoryboardShotsFromProgress(existingShots = [], progressShots = []) {
  return mergeShotsPreservingImages(existingShots, progressShots, { imageOnly: true })
}

export function mergeSceneShotsFromLoader(existingShots = [], incomingShots = [], sceneId) {
  if (!incomingShots.length) return incomingShots

  const prevSceneId = existingShots[0]?.sceneApiId ?? existingShots[0]?.scene_api_id
  if (
    prevSceneId != null &&
    sceneId != null &&
    String(prevSceneId) !== String(sceneId)
  ) {
    return incomingShots
  }

  return mergeShotsPreservingImages(existingShots, incomingShots, { replaceAll: true })
}
