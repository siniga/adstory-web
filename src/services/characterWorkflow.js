export const CHARACTER_STATUS_LABELS = {
  suggested: 'Suggested',
  accepted: 'Accepted',
  skipped: 'Skipped',
  modified: 'Modified',
}

export function getCharacterStatusLabel(status) {
  return CHARACTER_STATUS_LABELS[status] ?? 'Suggested'
}

export function isCharacterAcceptedForContinue(character) {
  return character.status === 'accepted' || character.status === 'modified'
}

export function canContinueToStudio(characters, skipCharactersForNow) {
  if (skipCharactersForNow) return true
  return characters.some(isCharacterAcceptedForContinue)
}

export function unwrapCharacterResponse(response) {
  return response?.data ?? response
}

export function buildCharacterUpdatePayload(character, form) {
  return {
    name: form.name.trim(),
    role: form.role.trim() || null,
    description: form.description.trim() || null,
    appearance: {
      age_range: character.ageRange ?? null,
      gender: character.gender ?? null,
      personality: character.personality ?? null,
      physical: form.appearance.trim() || null,
      clothing: form.clothing.trim() || null,
      importance: character.importance ?? 'supporting',
    },
    meta: form.notes.trim() ? { notes: form.notes.trim() } : null,
  }
}
