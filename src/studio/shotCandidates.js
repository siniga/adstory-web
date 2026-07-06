import { resolveMediaUrl } from '../utils/resolveMediaUrl'

const CANDIDATE_LABELS = {
  front_view: 'Front View',
  front: 'Front View',
  back_view: 'Back View',
  back: 'Back View',
}

const CANDIDATE_VIEW_ORDER = {
  front_view: 0,
  front: 0,
  back_view: 1,
  back: 1,
}

const CANDIDATE_CAMERA_DIRECTIONS = {
  front_view: 'Front-facing',
  front: 'Front-facing',
  back_view: 'Back-facing',
  back: 'Back-facing',
}

const CANDIDATE_SLOT_LABELS = ['Candidate A', 'Candidate B']

export function getCandidateCameraDirection(viewType, fallbackLabel) {
  if (fallbackLabel) return fallbackLabel

  const key = String(viewType ?? '')
    .trim()
    .toLowerCase()
  return CANDIDATE_CAMERA_DIRECTIONS[key] ?? 'Camera direction'
}

export function getCandidateSlotLabel(index) {
  return CANDIDATE_SLOT_LABELS[index] ?? `Candidate ${index + 1}`
}

export function getCandidateLabel(viewType, fallbackLabel) {
  if (fallbackLabel) return fallbackLabel

  const key = String(viewType ?? '')
    .trim()
    .toLowerCase()
  return CANDIDATE_LABELS[key] ?? 'Shot Version'
}

export function normalizeShotCandidate(candidate) {
  if (!candidate || candidate.id == null) return null

  const viewType =
    candidate.version_type ??
    candidate.view_type ??
    candidate.viewType ??
    candidate.type ??
    null
  const label = getCandidateLabel(viewType, candidate.label ?? candidate.name)

  return {
    id: candidate.id,
    label,
    viewType,
    imageUrl: candidate.image_url ?? candidate.imageUrl ?? null,
    updatedAt: candidate.updated_at ?? candidate.updatedAt ?? candidate.id,
  }
}

export function normalizeShotCandidates(rawCandidates = []) {
  if (!Array.isArray(rawCandidates)) return []

  return rawCandidates
    .map(normalizeShotCandidate)
    .filter(Boolean)
    .sort((a, b) => {
      const orderA = CANDIDATE_VIEW_ORDER[String(a.viewType ?? '').toLowerCase()] ?? 99
      const orderB = CANDIDATE_VIEW_ORDER[String(b.viewType ?? '').toLowerCase()] ?? 99
      return orderA - orderB || String(a.label).localeCompare(String(b.label))
    })
}

export function extractShotCandidatesPayload(response) {
  const data = response?.data ?? response
  const candidates =
    data?.candidates ??
    data?.shot_candidates ??
    response?.candidates ??
    (Array.isArray(data) ? data : [])

  return normalizeShotCandidates(candidates)
}

export function resolveCandidateImageSrc(candidate) {
  if (!candidate) return null

  const baseUrl = resolveMediaUrl(candidate.image_url ?? candidate.imageUrl)
  if (!baseUrl) return null

  const updatedAt = candidate.updated_at ?? candidate.updatedAt
  if (updatedAt == null || updatedAt === '') return baseUrl

  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}v=${encodeURIComponent(String(updatedAt))}`
}
