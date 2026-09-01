import { API_URL } from '../config/api'

export function resolveMediaUrl(url) {
  if (url == null) return null

  const trimmed = String(url).trim()
  if (!trimmed) return null

  if (trimmed.startsWith('/storage/')) {
    return `${API_URL}${trimmed}`
  }

  try {
    const parsed = new URL(trimmed, API_URL)

    if (parsed.pathname.startsWith('/storage/')) {
      const relative = `${parsed.pathname}${parsed.search}${parsed.hash}`
      // In dev, serve storage through the Vite proxy (same origin as the app).
      if (import.meta.env.DEV) {
        return relative
      }
      return `${API_URL}${relative}`
    }
  } catch {
    return trimmed
  }

  return trimmed
}

function appendCacheBust(url, cacheKey) {
  if (!url) return null
  if (cacheKey == null || cacheKey === '') return url

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${encodeURIComponent(String(cacheKey))}`
}

export function getShotImageCacheKey(shot) {
  if (!shot || typeof shot !== 'object') return null

  const url = shot.image_url ?? shot.imageUrl
  if (url != null && String(url).trim()) {
    const fileName = String(url).split('/').pop()?.split('?')[0]
    if (fileName) return fileName
  }

  return shot.imageVersion ?? shot.imageUpdatedAt ?? shot.updated_at ?? shot.image_version ?? null
}

export function getShotDisplayImageUrl(shot) {
  if (!shot) return null

  const url = resolveMediaUrl(shot.image_url ?? shot.imageUrl)
  if (url) {
    return appendCacheBust(url, getShotImageCacheKey(shot))
  }

  const versions = shot.shot_images ?? []
  const latestCompleted = [...versions]
    .filter((version) => version.status === 'completed' && (version.image_url || version.thumbnail_url))
    .sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0))[0]

  if (!latestCompleted) return null

  return getShotVersionImageUrl(latestCompleted)
}

export function getApprovedShotImageUrl(shot) {
  if (!shot) return null

  const approved = shot.approved_image
  const url = resolveMediaUrl(
    approved?.image_url ?? approved?.thumbnail_url ?? shot.image_url ?? shot.imageUrl
  )
  if (!url) return null

  const cacheKey = approved?.updated_at ?? shot.updated_at ?? Date.now()
  return appendCacheBust(url, cacheKey)
}

export function getShotVersionImageUrl(version) {
  if (!version) return null

  const url = resolveMediaUrl(version.image_url ?? version.thumbnail_url)
  if (!url) return null

  return appendCacheBust(url, version.updated_at ?? version.created_at ?? Date.now())
}

export function resolveShotImageSrc(shotOrUrl, cacheKey) {
  if (shotOrUrl && typeof shotOrUrl === 'object') {
    const shot = shotOrUrl
    const baseUrl = resolveMediaUrl(shot.imageUrl ?? shot.previewImage ?? shot.image_url)
    return appendCacheBust(baseUrl, getShotImageCacheKey(shot))
  }

  return appendCacheBust(resolveMediaUrl(shotOrUrl), cacheKey)
}

export function buildReferenceImageSrc(ref) {
  const rawUrl = ref?.image_url ?? ref?.imageUrl ?? ref?.url
  if (!rawUrl) return null

  const baseUrl = resolveMediaUrl(rawUrl)
  if (!baseUrl) return null

  const cacheKey = ref.updated_at ?? ref.updatedAt ?? Date.now()
  return `${baseUrl}?v=${encodeURIComponent(String(cacheKey))}`
}

export function getReferenceImageUrl(reference) {
  if (!reference) return null
  return buildReferenceImageSrc(reference)
}

export function getCharacterImageUrl(character) {
  if (!character) return null

  const url = resolveMediaUrl(
    character.image_url ?? character.heroImageUrl ?? character.hero_image_url
  )
  if (!url) return null

  const cacheKey =
    character.updatedAt ??
    character.updated_at ??
    character.heroImageUpdatedAt ??
    character.hero_image_updated_at ??
    Date.now()

  return `${url}?v=${encodeURIComponent(String(cacheKey))}`
}

export function getCostumeImageUrl(character) {
  if (!character) return null

  const assets = Array.isArray(character.assets) ? character.assets : []
  const costumeAsset =
    assets.find((asset) => asset.asset_type === 'costume' && asset.image_url) ?? null

  const url = resolveMediaUrl(character.costume_image_url ?? costumeAsset?.image_url)
  if (!url) return null

  const cacheKey =
    costumeAsset?.updated_at ??
    character.updatedAt ??
    character.updated_at ??
    Date.now()

  return `${url}?v=${encodeURIComponent(String(cacheKey))}`
}

export function getEnvironmentImageUrl(environment) {
  if (!environment) return null

  const assets = Array.isArray(environment.assets) ? environment.assets : []
  const primaryAsset =
    assets.find((asset) => asset.is_primary && asset.image_url) ??
    assets.find((asset) => asset.image_url) ??
    null

  const url = resolveMediaUrl(
    environment.imageUrl ??
      environment.image_url ??
      environment.previewImage ??
      environment.reference_image_url ??
      primaryAsset?.image_url
  )
  if (!url) return null

  const cacheKey =
    environment.updatedAt ??
    environment.updated_at ??
    primaryAsset?.updated_at ??
    Date.now()

  return `${url}?v=${encodeURIComponent(String(cacheKey))}`
}

export function getHeroImageUrl(character) {
  return getCharacterImageUrl(character)
}

export function buildMediaThumbStyle(previewImage, gradient, options = {}) {
  const imageSrc =
    previewImage != null && String(previewImage).includes('?v=')
      ? previewImage
      : resolveMediaUrl(previewImage)

  if (imageSrc) {
    return {
      backgroundImage: `url(${imageSrc})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      ...options,
    }
  }

  return { background: gradient, ...options }
}
