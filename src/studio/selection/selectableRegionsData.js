/**
 * Selectable regions for canvas asset selection — populated from backend masking output when available.
 * Positions are percentage-based (top, left, width, height) relative to the canvas.
 */

export function getSelectableRegions() {
  return []
}

export function findSelectableRegion(_shotId, regionId) {
  return getSelectableRegions().find((region) => region.id === regionId) ?? null
}

export function getAssetTypeLabel(type) {
  if (type === 'character') return 'Character'
  if (type === 'object') return 'Object'
  if (type === 'environment') return 'Environment'
  return 'Asset'
}

export function getEditActionLabel(type) {
  if (type === 'character') return 'Edit Character'
  if (type === 'object') return 'Edit Object'
  if (type === 'environment') return 'Edit Environment'
  return 'Edit Asset'
}

export function getSelectionBreadcrumbSuffix(region) {
  if (!region) return null
  return `${getAssetTypeLabel(region.type)}: ${region.name}`
}
