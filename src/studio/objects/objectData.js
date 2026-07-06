import { getActiveObjects } from '../activeProject'

export const OBJECT_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'vehicle', label: 'Vehicles' },
  { id: 'prop', label: 'Props' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'tool', label: 'Tools' },
  { id: 'other', label: 'Other' },
]

export function getObjects() {
  return getActiveObjects()
}

export function findObjectById(id) {
  return getActiveObjects().find((object) => String(object.id) === String(id)) ?? null
}

export function filterObjects(objects, query, categoryId = 'all') {
  let result = objects

  if (categoryId !== 'all') {
    result = result.filter((object) => object.category === categoryId)
  }

  const q = query.trim().toLowerCase()
  if (!q) return result

  return result.filter(
    (object) =>
      object.name?.toLowerCase().includes(q) ||
      object.categoryLabel?.toLowerCase().includes(q) ||
      object.description?.toLowerCase().includes(q)
  )
}
