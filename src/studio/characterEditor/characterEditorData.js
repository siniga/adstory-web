export const EDITOR_SECTIONS = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'face', label: 'Face' },
  { id: 'hair', label: 'Hair' },
  { id: 'wardrobe', label: 'Wardrobe' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'pose', label: 'Pose' },
  { id: 'expression', label: 'Expression' },
  { id: 'consistency', label: 'Consistency' },
]

export const APPLY_SCOPE_OPTIONS = [
  { id: 'currentShot', label: 'Current Shot' },
  { id: 'currentScene', label: 'Current Scene' },
  { id: 'selectedScenes', label: 'Selected Scenes' },
  { id: 'entireProject', label: 'Entire Project' },
]

export const SKIN_TONE_SWATCHES = [
  '#FDEBD0',
  '#E0AC69',
  '#C68642',
  '#8D5524',
  '#5C3317',
  '#3B2219',
]

export const HAIR_COLOR_PRESETS = [
  { id: 'black', label: 'Black', color: '#1a1a1a' },
  { id: 'brown', label: 'Brown', color: '#5c4033' },
  { id: 'blonde', label: 'Blonde', color: '#d4a574' },
  { id: 'grey', label: 'Grey', color: '#9ca3af' },
  { id: 'red', label: 'Red', color: '#b45309' },
]

export function createEditorStateFromCharacter(character) {
  const skinTone = mapSkinTone(character.appearance.skinTone)
  const hairColor = mapHairColor(character.appearance.hairColor)
  const hairStyle = mapHairStyle(character.appearance.hairStyle)

  return {
    gender: character.appearance.gender,
    age: Number.parseInt(character.appearance.age, 10) || 30,
    bodyType: character.appearance.bodyType,
    skinTone,
    eyeShape: 'Almond',
    eyeColor: 'Brown',
    noseStyle: 'Straight',
    beardStyle: 'None',
    mustacheStyle: 'None',
    hairStyle,
    hairColor,
    shirt: mapWardrobeItem(character.wardrobe.shirt, 'shirt'),
    pants: mapWardrobeItem(character.wardrobe.pants, 'pants'),
    shoes: mapWardrobeItem(character.wardrobe.shoes, 'shoes'),
    jacket: 'None',
    dress: 'None',
    hat: mapAccessory(character.accessories.hat, 'Hat'),
    watch: mapAccessory(character.accessories.watch, 'Watch'),
    necklace: mapAccessory(character.accessories.necklace, 'Necklace'),
    glasses: mapAccessory(character.accessories.glasses, 'Glasses'),
    ring: 'None',
    bag: 'None',
    pose: 'Standing',
    expression: 'Neutral',
    consistency: {
      keepFace: character.consistency.keepFace,
      keepHair: character.consistency.keepHair,
      keepClothing: character.consistency.keepOutfit,
      keepAccessories: character.consistency.keepAccessories,
      keepBodyType: true,
    },
    applyScope: 'currentShot',
  }
}

function mapSkinTone(value) {
  const normalized = String(value).toLowerCase()
  if (normalized.includes('light') || normalized.includes('fair')) return SKIN_TONE_SWATCHES[0]
  if (normalized.includes('warm')) return SKIN_TONE_SWATCHES[2]
  if (normalized.includes('medium')) return SKIN_TONE_SWATCHES[2]
  if (normalized.includes('dark')) return SKIN_TONE_SWATCHES[4]
  return SKIN_TONE_SWATCHES[3]
}

function mapHairColor(value) {
  const normalized = String(value).toLowerCase()
  if (normalized.includes('black')) return 'Black'
  if (normalized.includes('blonde')) return 'Blonde'
  if (normalized.includes('grey') || normalized.includes('gray')) return 'Grey'
  if (normalized.includes('red')) return 'Red'
  return 'Brown'
}

function mapHairStyle(value) {
  const normalized = String(value).toLowerCase()
  if (normalized.includes('bald')) return 'Bald'
  if (normalized.includes('braid')) return 'Braided'
  if (normalized.includes('curl')) return 'Curly'
  if (normalized.includes('long')) return 'Long'
  return 'Short'
}

function mapWardrobeItem(value, slot) {
  const normalized = String(value).toLowerCase()
  if (slot === 'shirt') {
    if (normalized.includes('flannel')) return 'Flannel'
    if (normalized.includes('linen') || normalized.includes('blue')) return 'Linen'
    if (normalized.includes('blouse') || normalized.includes('white')) return 'White Oxford'
    return 'T-Shirt'
  }
  if (slot === 'pants') {
    if (normalized.includes('denim') || normalized.includes('indigo')) return 'Denim'
    if (normalized.includes('black')) return 'Black'
    if (normalized.includes('cargo')) return 'Cargo'
    return 'Khaki'
  }
  if (slot === 'shoes') {
    if (normalized.includes('boot')) return 'Boots'
    if (normalized.includes('sandal') || normalized.includes('barefoot')) return 'Sandals'
    if (normalized.includes('loafer')) return 'Loafers'
    return 'Sneakers'
  }
  return 'None'
}

function mapAccessory(value, equippedLabel) {
  return value === 'None' || !value ? 'None' : equippedLabel
}
