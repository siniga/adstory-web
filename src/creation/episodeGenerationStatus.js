import { isGenerationInProgress, isGenerationTerminal, PROJECT_GEN_STATUS } from './aiGenerationStatus'

export const EPISODE_STATUS = {
  DRAFT: 'draft',
  PLANNED: 'planned',
  SCENES_GENERATING: 'scenes_generating',
  SCENES_COMPLETED: 'scenes_completed',
  SHOTS_GENERATING: 'shots_generating',
  SHOTS_COMPLETED: 'shots_completed',
  FAILED: 'failed',
}

export function mapAdstoryEpisode(episode = {}) {
  return {
    id: episode.id,
    projectId: episode.adstory_project_id ?? episode.projectId ?? null,
    episodeNumber: episode.episode_number ?? episode.episodeNumber ?? 0,
    title: episode.title ?? '',
    summary: episode.summary ?? '',
    estimatedSceneCount: episode.estimated_scene_count ?? episode.estimatedSceneCount ?? 0,
    startSceneNumber: episode.start_scene_number ?? episode.startSceneNumber ?? null,
    endSceneNumber: episode.end_scene_number ?? episode.endSceneNumber ?? null,
    status: episode.status ?? EPISODE_STATUS.DRAFT,
    sceneGenerationStatus: episode.scene_generation_status ?? episode.sceneGenerationStatus ?? null,
    sceneGenerationError: episode.scene_generation_error ?? episode.sceneGenerationError ?? null,
    shotGenerationStatus: episode.shot_generation_status ?? episode.shotGenerationStatus ?? null,
    shotGenerationError: episode.shot_generation_error ?? episode.shotGenerationError ?? null,
    sceneCount: episode.scene_count ?? episode.sceneCount ?? 0,
    shotCount: episode.shot_count ?? episode.shotCount ?? 0,
    meta: episode.meta ?? {},
  }
}

export function mapAdstoryEpisodes(episodes = []) {
  return episodes.map(mapAdstoryEpisode)
}

export function episodeSceneRangeLabel(episode) {
  const start = episode.startSceneNumber
  const end = episode.endSceneNumber
  if (start != null && end != null) return `${start}–${end}`
  if (episode.estimatedSceneCount) return `~${episode.estimatedSceneCount} scenes`
  return '—'
}

export function episodeDurationEstimate(episode) {
  const count = episode.sceneCount || episode.estimatedSceneCount || 0
  if (!count) return null
  const minutes = Math.max(1, Math.round(count * 1.5))
  return `~${minutes} min`
}

export function isEpisodeSceneGenerationActive(episode) {
  return (
    episode?.status === EPISODE_STATUS.SCENES_GENERATING ||
    episode?.sceneGenerationStatus === 'generating' ||
    isGenerationInProgress(episode?.sceneGenerationStatus)
  )
}

export function isEpisodeSceneGenerationComplete(episode) {
  return (
    episode?.sceneGenerationStatus === 'completed' ||
    episode?.status === EPISODE_STATUS.SCENES_COMPLETED ||
    episode?.status === EPISODE_STATUS.SHOTS_GENERATING ||
    episode?.status === EPISODE_STATUS.SHOTS_COMPLETED ||
    (episode?.sceneCount > 0 &&
      episode?.estimatedSceneCount > 0 &&
      episode.sceneCount >= episode.estimatedSceneCount)
  )
}

export function isEpisodeShotGenerationActive(episode) {
  return (
    episode?.status === EPISODE_STATUS.SHOTS_GENERATING ||
    episode?.shotGenerationStatus === 'generating' ||
    isGenerationInProgress(episode?.shotGenerationStatus)
  )
}

export function isEpisodeShotGenerationComplete(episode) {
  return (
    episode?.shotGenerationStatus === 'completed' ||
    episode?.status === EPISODE_STATUS.SHOTS_COMPLETED
  )
}

export function isEpisodeSceneGenerationFailed(episode) {
  return (
    episode?.sceneGenerationStatus === 'failed' ||
    (episode?.status === EPISODE_STATUS.FAILED && Boolean(episode?.sceneGenerationError))
  )
}

export function mergeEpisodeRecord(existing, incoming) {
  if (!existing) return incoming
  if (!incoming) return existing

  return {
    ...existing,
    ...incoming,
    id: existing.id ?? incoming.id,
    sceneGenerationStatus: incoming.sceneGenerationStatus ?? existing.sceneGenerationStatus,
    shotGenerationStatus: incoming.shotGenerationStatus ?? existing.shotGenerationStatus,
    sceneCount: Math.max(existing.sceneCount ?? 0, incoming.sceneCount ?? 0),
    shotCount: Math.max(existing.shotCount ?? 0, incoming.shotCount ?? 0),
  }
}

export function mergeEpisodes(current = [], incoming = []) {
  if (!incoming.length) return current

  return incoming.map((incomingEpisode) => {
    const existing = current.find(
      (episode) =>
        (incomingEpisode.id != null && String(episode.id) === String(incomingEpisode.id)) ||
        episode.episodeNumber === incomingEpisode.episodeNumber
    )
    return mergeEpisodeRecord(existing, incomingEpisode)
  })
}

export function hasProjectEpisodes(episodes = []) {
  return episodes.length > 0
}

export function allEpisodesScenesComplete(episodes = []) {
  return (
    episodes.length > 0 &&
    episodes.every((episode) => isEpisodeSceneGenerationComplete(episode))
  )
}

export function allEpisodesShotsComplete(episodes = []) {
  return (
    episodes.length > 0 &&
    episodes.every((episode) => isEpisodeShotGenerationComplete(episode))
  )
}

export function shouldStopEpisodeScenePolling(progress, episode) {
  if (!progress) return false

  const total = progress.total ?? 0
  const completed = progress.completed ?? 0
  const failed = progress.failed ?? 0

  if (total > 0 && completed + failed >= total) {
    return true
  }

  if (progress.progress_percent >= 100) {
    return true
  }

  const mappedEpisode = progress.episode ? mapAdstoryEpisode(progress.episode) : episode
  return isEpisodeSceneGenerationComplete(mappedEpisode)
}

export function shouldStopEpisodeShotPolling(progress, episode) {
  if (!progress) return false

  const total = progress.total_scenes ?? progress.total ?? 0
  const completed = progress.completed_scenes ?? progress.completed ?? 0
  const failed = progress.failed_scenes ?? progress.failed ?? 0

  if (total > 0 && completed + failed >= total) {
    return true
  }

  if (progress.progress_percent >= 100) {
    return true
  }

  const mappedEpisode = progress.episode ? mapAdstoryEpisode(progress.episode) : episode
  return isEpisodeShotGenerationComplete(mappedEpisode)
}

export function mapEpisodeSceneProgress(data = {}, episode = null) {
  const mappedEpisode = data.episode ? mapAdstoryEpisode(data.episode) : episode
  const total = data.total ?? 0
  const completed = data.completed ?? 0
  const failed = data.failed ?? 0

  const generatingScene =
    (data.scenes ?? []).find(
      (scene) => scene.status === 'generating' || scene.status === 'pending'
    ) ?? null

  return {
    status:
      mappedEpisode?.sceneGenerationStatus ??
      (shouldStopEpisodeScenePolling(data, mappedEpisode)
        ? failed > 0
          ? PROJECT_GEN_STATUS.COMPLETED_WITH_ERRORS
          : PROJECT_GEN_STATUS.COMPLETED
        : isEpisodeSceneGenerationActive(mappedEpisode)
          ? PROJECT_GEN_STATUS.RUNNING
          : PROJECT_GEN_STATUS.IDLE),
    total,
    completed,
    failed,
    remaining: data.remaining ?? Math.max(0, total - completed - failed),
    progress_percent: data.progress_percent ?? 0,
    estimated_remaining_seconds: data.estimated_remaining ?? data.estimated_remaining_seconds ?? null,
    currentScene: generatingScene,
    scenes: data.scenes ?? [],
    episode: mappedEpisode,
    started: data.started ?? null,
  }
}

export function mapEpisodeShotProgress(data = {}, episode = null) {
  const mappedEpisode = data.episode ? mapAdstoryEpisode(data.episode) : episode
  const total = data.total_scenes ?? data.total ?? 0
  const completed = data.completed_scenes ?? data.completed ?? 0
  const failed = data.failed_scenes ?? data.failed ?? 0

  const generatingScene =
    (data.scenes ?? []).find((scene) => scene.shot_generation_status === 'generating') ?? null

  return {
    status:
      mappedEpisode?.shotGenerationStatus ??
      (shouldStopEpisodeShotPolling(data, mappedEpisode)
        ? failed > 0
          ? PROJECT_GEN_STATUS.COMPLETED_WITH_ERRORS
          : PROJECT_GEN_STATUS.COMPLETED
        : isEpisodeShotGenerationActive(mappedEpisode)
          ? PROJECT_GEN_STATUS.RUNNING
          : PROJECT_GEN_STATUS.IDLE),
    total,
    completed,
    failed,
    remaining: data.remaining_scenes ?? data.remaining ?? Math.max(0, total - completed - failed),
    progress_percent: data.progress_percent ?? 0,
    estimated_remaining_seconds: data.estimated_remaining ?? data.estimated_remaining_seconds ?? null,
    currentScene: generatingScene,
    scenes: data.scenes ?? [],
    episode: mappedEpisode,
    started: data.started ?? null,
  }
}

export function getEpisodeSceneStatusLabel(episode) {
  if (isEpisodeSceneGenerationFailed(episode)) return 'Failed'
  if (isEpisodeSceneGenerationActive(episode)) return 'Generating'
  if (isEpisodeSceneGenerationComplete(episode)) return 'Completed'
  return 'Not Generated'
}

export function getEpisodeShotStatusLabel(episode) {
  if (episode?.shotGenerationStatus === 'failed') return 'Failed'
  if (isEpisodeShotGenerationActive(episode)) return 'Generating'
  if (isEpisodeShotGenerationComplete(episode)) return 'Completed'
  if (!isEpisodeSceneGenerationComplete(episode)) return 'Waiting'
  return 'Not Generated'
}

export function isGenerationTerminalStatus(status) {
  return isGenerationTerminal(status)
}
