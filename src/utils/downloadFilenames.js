export function slugifyAssetName(name) {
  const slug = String(name ?? 'asset')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'asset'
}

export function characterHeroFilename(name) {
  return `character-${slugifyAssetName(name)}-hero.png`
}

export function characterReferencesFilename(name) {
  return `character-${slugifyAssetName(name)}-references.zip`
}

export function environmentImageFilename(name) {
  return `environment-${slugifyAssetName(name)}.png`
}
