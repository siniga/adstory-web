export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Just now'

  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'Just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes === 1) return '1 minute ago'
  if (minutes < 60) return `${minutes} minutes ago`

  const hours = Math.floor(minutes / 60)
  if (hours === 1) return '1 hour ago'
  return `${hours} hours ago`
}

export function createDefaultAssignmentTimestamps(shotIds, offsetMs = 2 * 60 * 1000) {
  const now = Date.now()
  return Object.fromEntries(shotIds.map((id) => [id, now - offsetMs]))
}
