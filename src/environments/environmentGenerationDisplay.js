import { getEnvironmentImageUrl } from '../utils/resolveMediaUrl'

export const BUILD_STATUS_UI = {
  creating: {
    label: 'Creating...',
    tone: 'creating',
  },
  completed: {
    label: 'Completed',
    tone: 'completed',
  },
  failed: {
    label: 'Failed',
    tone: 'failed',
  },
}

export const IMAGE_STATUS_UI = {
  pending: {
    label: 'Pending',
    tone: 'queued',
  },
  generating: {
    label: 'Creating image...',
    tone: 'creating',
  },
  completed: {
    label: 'Image ready',
    tone: 'completed',
  },
  failed: {
    label: 'Image failed',
    tone: 'failed',
  },
}

export function getBuildStatusUi(status) {
  const key = String(status ?? 'completed').toLowerCase()
  return BUILD_STATUS_UI[key] ?? BUILD_STATUS_UI.completed
}

export function getImageStatusUi(status) {
  const key = String(status ?? 'pending').toLowerCase()
  return IMAGE_STATUS_UI[key] ?? IMAGE_STATUS_UI.pending
}

export function formatTimeOfDay(value) {
  if (!value) return ''
  const normalized = String(value).trim()
  if (!normalized) return ''
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function formatAssetStatus(status) {
  const normalized = String(status ?? 'suggested').toLowerCase()
  if (normalized === 'accepted' || normalized === 'approved') return 'Approved'
  if (normalized === 'suggested') return 'Suggested'
  if (normalized === 'draft') return 'Draft'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function buildEnvironmentRowModel(environment, index = 0) {
  const buildStatusUi = getBuildStatusUi('completed')
  const imageStatus = String(
    environment.imageStatus ?? environment.image_status ?? 'pending'
  ).toLowerCase()
  const imageStatusUi = getImageStatusUi(imageStatus)
  const imageUrl = getEnvironmentImageUrl(environment)

  return {
    id: environment.id,
    name: environment.name ?? 'Unnamed environment',
    type: environment.type ?? '',
    location: environment.location ?? '',
    timeOfDay: formatTimeOfDay(environment.timeOfDay ?? environment.time_of_day),
    mood: environment.mood ?? '',
    imageUrl,
    imageStatus,
    imageStatusLabel: imageStatusUi.label,
    imageStatusTone: imageStatusUi.tone,
    assetStatus: environment.status ?? 'suggested',
    assetStatusLabel: formatAssetStatus(environment.status),
    buildStatus: 'completed',
    statusLabel: buildStatusUi.label,
    statusTone: buildStatusUi.tone,
    canDownloadImage: Boolean(
      environment.imageUrl ?? environment.image_url ?? environment.previewImage
    ),
    gradientIndex: index,
  }
}
