import { getActiveEnvironments } from '../activeProject'

export function getEnvironments() {
  return getActiveEnvironments()
}

export function findEnvironmentById(id) {
  return getActiveEnvironments().find((environment) => String(environment.id) === String(id)) ?? null
}

export function filterEnvironments(environments, query) {
  const q = query.trim().toLowerCase()
  if (!q) return environments
  return environments.filter(
    (environment) =>
      environment.name?.toLowerCase().includes(q) ||
      environment.type?.toLowerCase().includes(q) ||
      environment.mood?.toLowerCase().includes(q) ||
      environment.location?.toLowerCase().includes(q)
  )
}
