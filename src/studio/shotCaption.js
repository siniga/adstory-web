export function getShotCaption(shot) {
  const title = shot?.label?.trim() || (shot?.id ? `Shot ${shot.id}` : 'Shot')
  const subtitle = shot?.description?.trim() || shot?.notes?.trim() || ''

  return { title, subtitle }
}
