export const EDITOR_SECTIONS = [
  { id: 'identity', label: 'Identity' },
  { id: 'material', label: 'Material' },
  { id: 'color', label: 'Color' },
  { id: 'condition', label: 'Condition' },
  { id: 'scale', label: 'Scale' },
  { id: 'style', label: 'Style' },
  { id: 'replacement', label: 'Replacement' },
  { id: 'consistency', label: 'Consistency' },
]

export const COLOR_PRESETS = [
  { id: 'Brown', label: 'Brown', color: '#5c4033' },
  { id: 'Black', label: 'Black', color: '#1a1a1a' },
  { id: 'White', label: 'White', color: '#f5f5f5' },
  { id: 'Grey', label: 'Grey', color: '#6b7280' },
  { id: 'Blue', label: 'Blue', color: '#2563eb' },
  { id: 'Red', label: 'Red', color: '#dc2626' },
  { id: 'Gold', label: 'Gold', color: '#d97706' },
  { id: 'Teal', label: 'Teal', color: '#0d9488' },
]

export function createEditorStateFromObject(object) {
  return {
    name: object.name,
    category: object.categoryLabel,
    description: object.description,
    material: mapMaterial(object.material),
    primaryColor: mapColor(object.primaryColor),
    secondaryColor: mapColor(object.secondaryColor),
    accentColor: 'Gold',
    condition: mapCondition(object.condition),
    scale: mapScale(object.scale),
    style: 'Realistic',
    replacementSearch: '',
    replacementSelection: null,
    consistency: {
      keepShape: object.consistency.keepShape,
      keepMaterial: object.consistency.keepMaterial,
      keepColor: object.consistency.keepColor,
      keepScale: object.consistency.keepScale,
      keepStyle: true,
    },
    applyScope: 'currentShot',
  }
}

function mapMaterial(value) {
  const options = ['Wood', 'Metal', 'Plastic', 'Glass', 'Fabric', 'Stone', 'Mixed']
  const match = options.find((option) => String(value).toLowerCase().includes(option.toLowerCase()))
  return match ?? 'Mixed'
}

function mapCondition(value) {
  const normalized = String(value).toLowerCase()
  if (normalized.includes('luxury')) return 'Luxury'
  if (normalized.includes('broken')) return 'Broken'
  if (normalized.includes('weathered')) return 'Weathered'
  if (normalized.includes('old')) return 'Old'
  if (normalized.includes('new')) return 'New'
  return 'Used'
}

function mapScale(value) {
  const normalized = String(value).toLowerCase()
  if (normalized.includes('tiny')) return 'Tiny'
  if (normalized.includes('small')) return 'Small'
  if (normalized.includes('medium')) return 'Medium'
  if (normalized.includes('massive')) return 'Massive'
  if (normalized.includes('large')) return 'Large'
  return 'Medium'
}

function mapColor(value) {
  const normalized = String(value).toLowerCase()
  if (normalized.includes('black')) return 'Black'
  if (normalized.includes('white') || normalized.includes('ceramic')) return 'White'
  if (normalized.includes('blue')) return 'Blue'
  if (normalized.includes('red') || normalized.includes('rust')) return 'Red'
  if (normalized.includes('gold') || normalized.includes('brass') || normalized.includes('amber')) return 'Gold'
  if (normalized.includes('teal') || normalized.includes('green')) return 'Teal'
  if (normalized.includes('grey') || normalized.includes('gray') || normalized.includes('hemp')) return 'Grey'
  if (normalized.includes('brown') || normalized.includes('oak') || normalized.includes('walnut') || normalized.includes('wood')) {
    return 'Brown'
  }
  return 'Brown'
}
