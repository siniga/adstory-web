import { getActiveCharacters } from '../activeProject'

export function getCharacters() {
  return getActiveCharacters()
}

export function findCharacterById(id) {
  return getActiveCharacters().find((character) => String(character.id) === String(id)) ?? null
}

export function filterCharacters(characters, query) {
  const q = query.trim().toLowerCase()
  if (!q) return characters
  return characters.filter(
    (character) =>
      character.name?.toLowerCase().includes(q) ||
      character.role?.toLowerCase().includes(q)
  )
}
