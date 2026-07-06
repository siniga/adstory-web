import { getCharacterImageUrl, getReferenceImageUrl, resolveMediaUrl } from '../utils/resolveMediaUrl'
import { DEFAULT_ETHNICITY, REFERENCE_POSES } from './assetsLibraryData'
import { readIdentityGenerationStatus } from './characterIdentityGeneration'
import { resolveCharacterDisplayEthnicity } from './characterEthnicity'
import {
  indexCharacterReferencesByType,
  mapHeroImageStatusToReferenceStatus,
} from './characterReferences'

const THUMB_GRADIENTS = [
  'linear-gradient(145deg, #3d2914 0%, #6b4f2a 45%, #8f6b3d 100%)',
  'linear-gradient(145deg, #1e293b 0%, #334155 50%, #475569 100%)',
  'linear-gradient(145deg, #4a1942 0%, #7c3aed 55%, #a78bfa 100%)',
  'linear-gradient(145deg, #134e4a 0%, #0f766e 50%, #14b8a6 100%)',
  'linear-gradient(145deg, #1f2937 0%, #374151 50%, #6b7280 100%)',
]

function thumbGradientForIndex(index) {
  return THUMB_GRADIENTS[index % THUMB_GRADIENTS.length]
}

function mapCharacterProperties(character) {
  return {
    id: character.id,
    assetType: 'character',
    name: character.name ?? '',
    role: character.role ?? '',
    description: character.description ?? '',
    ageRange: character.ageRange ?? '',
    gender: character.gender ?? '',
    ethnicity: character.ethnicity ?? '',
    appearance: character.appearance ?? '',
    skinTone: character.skinTone ?? '',
    hair: character.hair ?? character.appearance ?? '',
    beard: character.beard ?? '',
    build: character.build ?? '',
    height: character.height ?? '',
    clothing: character.clothing ?? '',
    personality: character.personality ?? character.notes ?? '',
    status: character.status ?? 'suggested',
    referenceStatus: character.referenceStatus ?? 'not_started',
  }
}

function mapEnvironmentProperties(environment) {
  return {
    id: environment.id,
    assetType: 'environment',
    name: environment.name ?? '',
    type: environment.type ?? '',
    description: environment.description ?? '',
    location: environment.location ?? '',
    timeOfDay: environment.timeOfDay ?? '',
    weather: environment.weather ?? '',
    mood: environment.mood ?? '',
    lightingStyle: environment.lightingStyle ?? '',
    status: environment.status ?? 'suggested',
    notes: environment.notes ?? '',
  }
}

function mapObjectProperties(object) {
  return {
    id: object.id,
    assetType: 'object',
    name: object.name ?? '',
    category: object.categoryLabel ?? object.category ?? '',
    description: object.description ?? '',
    material: object.material ?? '',
    color: object.primaryColor ?? object.color ?? '',
    condition: object.condition ?? '',
    usedInContext: object.usedInContext ?? object.usedBy ?? '',
    status: object.status ?? 'suggested',
    notes: object.notes ?? '',
  }
}

function buildCharacterGalleryItems(character, gradient) {
  const items = []
  const heroUrl = getCharacterImageUrl(character)
  const referencesByType = indexCharacterReferencesByType(character)
  const heroStatus = mapHeroImageStatusToReferenceStatus(
    character.image_status ??
      character.heroImageStatus ??
      character.hero_image_status ??
      (heroUrl ? 'completed' : 'pending')
  )

  items.push({
    id: 'hero-portrait',
    label: 'Hero Portrait',
    imageUrl: heroUrl,
    gradient,
    status: heroStatus,
    isPose: false,
    showStatusBadge: true,
    referenceType: 'hero_portrait',
  })

  for (const pose of REFERENCE_POSES) {
    const ref = referencesByType[pose.referenceType]
    const imageUrl = ref ? getReferenceImageUrl(ref) : null
    const status = ref?.status ?? (imageUrl ? 'completed' : 'pending')

    items.push({
      id: pose.id,
      label: pose.label,
      referenceType: pose.referenceType,
      imageUrl,
      gradient: pose.gradient,
      status,
      isPose: true,
    })
  }

  return items
}

export function buildCharacterSheetGalleryItems(character, gradient) {
  return buildCharacterGalleryItems(character, gradient)
}

function buildReferenceGalleryItems(previewImage, gradient, label = 'Reference Image') {
  const imageUrl = resolveMediaUrl(previewImage)

  return [
    {
      id: 'reference',
      label,
      imageUrl,
      gradient,
    },
    {
      id: 'reference-alt-1',
      label: 'Alternate Angle',
      imageUrl: null,
      gradient: THUMB_GRADIENTS[1],
    },
    {
      id: 'reference-alt-2',
      label: 'Detail View',
      imageUrl: null,
      gradient: THUMB_GRADIENTS[2],
    },
  ]
}

export function mapCharacterListItem(character, index = 0, projectDefaultEthnicity = DEFAULT_ETHNICITY) {
  const gradient = thumbGradientForIndex(index)

  return {
    id: character.id,
    name: character.name ?? 'Unnamed character',
    role: character.role ?? '',
    ethnicity: resolveCharacterDisplayEthnicity(character, projectDefaultEthnicity),
    description: character.description ?? '',
    status: character.status ?? 'suggested',
    referenceStatus: character.referenceStatus ?? 'not_started',
    heroImageStatus: character.heroImageStatus ?? 'pending',
    identityGenerationStatus: readIdentityGenerationStatus(character),
    updatedAt: character.updatedAt ?? character.updated_at ?? null,
    previewImage: getCharacterImageUrl(character),
    thumbGradient: gradient,
    properties: mapCharacterProperties(character),
    galleryItems: buildCharacterGalleryItems(character, gradient),
  }
}

export function mapEnvironmentListItem(environment, index = 0) {
  const gradient = environment.thumbnailGradient ?? thumbGradientForIndex(index)

  return {
    id: environment.id,
    name: environment.name ?? 'Unnamed environment',
    role: environment.type ?? '',
    description: environment.description ?? '',
    status: environment.status ?? 'suggested',
    previewImage: environment.previewImage ?? resolveMediaUrl(environment.reference_image_url),
    thumbGradient: gradient,
    properties: mapEnvironmentProperties(environment),
    galleryItems: buildReferenceGalleryItems(
      environment.previewImage ?? environment.reference_image_url,
      gradient,
      'Reference Image'
    ),
  }
}

export function mapObjectListItem(object, index = 0) {
  const gradient = object.thumbnailGradient ?? thumbGradientForIndex(index)

  return {
    id: object.id,
    name: object.name ?? 'Unnamed object',
    role: object.categoryLabel ?? object.category ?? '',
    description: object.description ?? '',
    status: object.status ?? 'suggested',
    previewImage: object.previewImage ?? resolveMediaUrl(object.reference_image_url),
    thumbGradient: gradient,
    properties: mapObjectProperties(object),
    galleryItems: buildReferenceGalleryItems(
      object.previewImage ?? object.reference_image_url,
      gradient,
      'Reference Image'
    ),
  }
}

export function mapCharactersForLibrary(characters = [], projectDefaultEthnicity = DEFAULT_ETHNICITY) {
  return characters.map((character, index) =>
    mapCharacterListItem(character, index, projectDefaultEthnicity)
  )
}

export function mapEnvironmentsForLibrary(environments = []) {
  return environments.map(mapEnvironmentListItem)
}

export function mapObjectsForLibrary(objects = []) {
  return objects.map(mapObjectListItem)
}
