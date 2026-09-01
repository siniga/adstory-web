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
    return String(existing.image_url ?? existing.imageUrl).trim()
  }

  return ''
}

function pickImageStatus(existing, incoming, imageUrl) {
  const existingStatus = existing?.image_status ?? existing?.imageStatus ?? 'none'
  const incomingStatus = incoming?.image_status ?? incoming?.imageStatus

  if (incomingStatus === 'failed') {
    return 'failed'
  }

  if (imageUrl) {
    return COMPLETED_IMAGE_STATUS
  }

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

  if (incomingStatus === 'generating' || incomingStatus === 'queued') {
    return incomingStatus
  }

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
    imageUrl,
    image_status: imageStatus,
    imageStatus,
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

export function shotImageFieldsChanged(before = {}, after = {}) {
  const beforeUrl = String(before.image_url ?? before.imageUrl ?? '').trim()
  const afterUrl = String(after.image_url ?? after.imageUrl ?? '').trim()
  if (beforeUrl !== afterUrl) return true

  const beforeStatus = before.image_status ?? before.imageStatus ?? 'none'
  const afterStatus = after.image_status ?? after.imageStatus ?? 'none'
  if (beforeStatus !== afterStatus) return true

  const beforeError = before.generation_error ?? before.generationError ?? null
  const afterError = after.generation_error ?? after.generationError ?? null
  return String(beforeError ?? '') !== String(afterError ?? '')
}

export function progressShotsNeedPatch(existingShots = [], progressShots = []) {
  if (!progressShots.length) return false

  const existingById = new Map(existingShots.map((shot) => [shotKey(shot), shot]))

  return progressShots.some((incoming) => {
    const mapped = normalizeIncomingShot(incoming)
    const existing = existingById.get(shotKey(mapped))
    if (!existing) return true
    const merged = mergeShotImageFields(existing, mapped)
    return shotImageFieldsChanged(existing, merged)
  })
}

export function mergeSceneShotsFromLoader(existingShots = [], incomingShots = [], sceneId) {
  if (!incomingShots.length) return existingShots.length ? existingShots : incomingShots

  const prevSceneId = existingShots[0]?.sceneApiId ?? existingShots[0]?.scene_api_id
  if (
    prevSceneId != null &&
    sceneId != null &&
    String(prevSceneId) !== String(sceneId)
  ) {
    return incomingShots
  }

  // API scene load is authoritative — replace the scene shot list.
  return incomingShots.map((incoming) => {
    const mapped = normalizeIncomingShot(incoming)
    const existing = existingShots.find(
      (shot) => shotKey(shot) === shotKey(mapped)
    )
    return existing ? mergeShotPreservingImages(existing, mapped) : mapped
  })
}
