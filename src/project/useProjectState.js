import { useCallback, useEffect, useState } from 'react'
import { deriveProjectName } from '../services/generation/mapToStudio'
import {
  buildFrameGroups,
  mapApiCharacter,
  mapApiCharacters,
  mapApiEnvironment,
  mapApiObject,
  mapApiEnvironments,
  mapApiObjects,
  applyRegeneratedShotToProject,
  mapApiResponseToProjectState,
} from '../services/api/mapApiProject'
import * as projectApi from '../services/projectApi'
import { generateShotsFromScenes, getProjectCharacters, getProjectEnvironments, getProjectScenes, getProjectShots, mapAdstoryScenes, saveProjectCharactersBulk, saveProjectEnvironmentsBulk, saveProjectScenesBulk, saveProjectShotsBulk, validateScript, validateScreenplay, applyStoryboardSettingsToStudioShot, applyShotImageApiResponse, approveShotImage, deleteShotImage, deriveShotFieldsFromImages, generateShotImage, mergeAdstoryShotUpdate, updateShotStoryboardSettings } from '../services/adstoryApi'
import { resolveMediaUrl } from '../utils/resolveMediaUrl'
import { getVisualStyleLabel, normalizeVisualStyle } from '../config/visualStyles'
import { formatUserFriendlyError } from '../utils/userFriendlyErrors'
import { createEmptyProject } from './projectModel'
import { loadProject, saveProject } from './projectStorage'
import { setActiveStudioProject } from '../studio/activeProject'
import { extractShotCandidatesPayload } from '../studio/shotCandidates'
import { normalizeShotReviewStatus } from '../studio/shotReviewStatus'

function patchStudioShotFromImageResponse(existingShot, data = {}) {
  if (data.shot) {
    return applyStoryboardSettingsToStudioShot(existingShot, data.shot)
  }

  const images = Array.isArray(data.images) ? data.images : []
  if (!images.length) return existingShot

  const derived = deriveShotFieldsFromImages(existingShot, images)
  const imageUrl = derived.image_url ?? ''

  return {
    ...existingShot,
    shot_images: derived.shot_images,
    image_url: imageUrl,
    imageUrl: imageUrl,
    previewImage: imageUrl ? resolveMediaUrl(imageUrl) : null,
    imageStatus: derived.image_status ?? existingShot.imageStatus,
    image_status: derived.image_status,
  }
}

function applyShotImageResponseToProject(project, shotApiId, data = {}) {
  const id = String(shotApiId)

  const nextStudioScenes = (project.studioScenes ?? []).map((scene) => ({
    ...scene,
    shots: (scene.shots ?? []).map((shot) =>
      String(shot.apiId) === id ? patchStudioShotFromImageResponse(shot, data) : shot
    ),
  }))

  const nextShotGroups = (project.shotGroups ?? []).map((group) => ({
    ...group,
    shots: (group.shots ?? []).map((shot) =>
      String(shot.apiId) === id ? applyShotImageApiResponse(shot, data) : shot
    ),
  }))

  return {
    ...project,
    studioScenes: nextStudioScenes,
    shotGroups: nextShotGroups,
  }
}

function syncActiveStudio(project) {
  if (project.studioScenes?.length && project.status?.shots === 'done') {
    setActiveStudioProject({
      scenes: project.studioScenes,
      projectName: project.name,
      characters: project.characters ?? [],
      environments: project.environments ?? [],
      objects: project.objects ?? [],
    })
  }
}

export function useProjectState({ syncToStore } = {}) {
  const [project, setProject] = useState(() => loadProject())
  const [generating, setGenerating] = useState(false)
  const [generatingSceneIds, setGeneratingSceneIds] = useState({})
  const [regeneratingShotApiId, setRegeneratingShotApiId] = useState(null)
  const [selectingShotCandidateId, setSelectingShotCandidateId] = useState(null)
  const [error, setError] = useState(null)

  const reportError = useCallback((err, fallback = 'Something went wrong') => {
    const raw = err instanceof Error ? err.message : String(err ?? fallback)
    setError(formatUserFriendlyError(raw))
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const persist = useCallback((next, { syncToStore: shouldSyncToStore = true } = {}) => {
    const saved = saveProject(next)
    setProject(saved)
    syncActiveStudio(saved)
    if (shouldSyncToStore) {
      syncToStore?.(saved)
    }
    return saved
  }, [syncToStore])

  const persistLocalOnly = useCallback((next) => persist(next, { syncToStore: false }), [persist])

  useEffect(() => {
    syncActiveStudio(project)
  }, [project.studioScenes, project.name, project.status?.shots])

  const selectProject = useCallback(
    async (projectId) => {
      setError(null)
      const cached = loadProject()
      const baseProject =
        cached.projectId != null && String(cached.projectId) === String(projectId)
          ? cached
          : createEmptyProject()
      const apiProject = await projectApi.getProject(projectId)
      const next = mapApiResponseToProjectState(baseProject, apiProject)
      persist({ ...next, projectId })
      return next
    },
    [persist]
  )

  const exitProject = useCallback(() => {
    setError(null)
    setActiveStudioProject({ reset: true })
    persist(createEmptyProject())
  }, [persist])

  const deleteProject = useCallback(
    async (projectId) => {
      await projectApi.deleteProject(projectId)
      if (String(project.projectId) === String(projectId)) {
        exitProject()
      }
    },
    [exitProject, project.projectId]
  )

  const updateStory = useCallback(
    (story) => {
      persist({ ...project, story, name: deriveProjectName(story) })
    },
    [persist, project]
  )

  const saveStoryToBackend = useCallback(
    async ({ story, visualStyle, title }) => {
      if (!project.projectId) {
        throw new Error('Open a project before saving your story.')
      }

      const trimmedStory = story?.trim() ?? ''
      const apiProject = await projectApi.updateProject(project.projectId, {
        story: trimmedStory,
        style: visualStyle,
        title: title ?? deriveProjectName(trimmedStory),
      })

      const next = mapApiResponseToProjectState(
        {
          ...project,
          story: trimmedStory,
          name: title ?? deriveProjectName(trimmedStory),
          visualStyle,
        },
        apiProject,
        {
          statusOverrides: {
            story: 'ready',
          },
        }
      )

      persist(next)
      return next
    },
    [persist, project]
  )

  const refreshAdstoryProject = useCallback(async () => {
    const current = loadProject()
    if (!current.projectId) {
      return current
    }

    const apiProject = await projectApi.getProject(current.projectId)
    const next = mapApiResponseToProjectState(current, apiProject)
    persist(next)
    return next
  }, [persist])

  const saveScriptToBackend = useCallback(
    async ({ script }) => {
      if (!project.projectId) {
        throw new Error('Open a project before saving your script.')
      }

      const trimmedScript = script?.trim() ?? ''
      const validationError = validateScript(trimmedScript)
      if (validationError) {
        throw new Error(validationError)
      }

      const apiProject = await projectApi.updateProject(project.projectId, {
        script: trimmedScript,
      })

      const next = mapApiResponseToProjectState(
        {
          ...project,
          script: trimmedScript,
        },
        apiProject,
        {
          statusOverrides: {
            script: 'done',
          },
        }
      )

      persist(next)
      return next
    },
    [persist, project]
  )

  const saveScreenplayToBackend = useCallback(
    async ({ screenplay }) => {
      if (!project.projectId) {
        throw new Error('Open a project before saving your screenplay.')
      }

      const trimmedScreenplay = screenplay?.trim() ?? ''
      const validationError = validateScreenplay(trimmedScreenplay)
      if (validationError) {
        throw new Error(validationError)
      }

      const apiProject = await projectApi.updateProject(project.projectId, {
        screenplay: trimmedScreenplay,
      })

      const next = mapApiResponseToProjectState(
        {
          ...project,
          screenplay: trimmedScreenplay,
        },
        apiProject,
        {
          statusOverrides: {
            screenplay: 'done',
          },
        }
      )

      persist(next)
      return next
    },
    [persist, project]
  )

  const refreshProjectScenes = useCallback(async () => {
    const current = loadProject()
    if (!current.projectId) {
      return { scenes: current.scenes ?? [], project: current }
    }

    const scenes = await getProjectScenes(current.projectId)
    const next = {
      ...current,
      scenes,
      status: {
        ...current.status,
        scenes: scenes.length > 0 ? 'done' : current.status?.scenes ?? 'idle',
      },
    }

    persist(next)
    return { scenes, project: next }
  }, [persist])

  const saveScenesToBackend = useCallback(
    async ({ scenes, visualStyle }) => {
      if (!project.projectId) {
        throw new Error('Open a project before saving scenes.')
      }

      const savedScenes = await saveProjectScenesBulk(project.projectId, scenes, {
        visual_style: visualStyle ?? getVisualStyleLabel(project.visualStyle),
      })

      const next = {
        ...project,
        scenes: savedScenes,
        status: {
          ...project.status,
          scenes: savedScenes.length > 0 ? 'done' : project.status?.scenes ?? 'idle',
        },
      }

      persist(next)
      return { scenes: savedScenes, project: next }
    },
    [persist, project]
  )

  const refreshProjectShots = useCallback(async () => {
    const current = loadProject()
    if (!current.projectId) {
      return { shotGroups: current.shotGroups ?? [], project: current }
    }

    let scenes = current.scenes ?? []
    if (scenes.length === 0) {
      scenes = await getProjectScenes(current.projectId)
    }

    const { shotGroups } = await getProjectShots(current.projectId, scenes)
    const next = {
      ...current,
      scenes,
      shotGroups,
      status: {
        ...current.status,
        scenes: scenes.length > 0 ? 'done' : current.status?.scenes ?? 'idle',
        shots: shotGroups.length > 0 ? 'done' : current.status?.shots ?? 'idle',
      },
    }

    persist(next)
    return { shotGroups, project: next }
  }, [persist])

  const saveShotsToBackend = useCallback(
    async ({ shotGroups, scenes }) => {
      if (!project.projectId) {
        throw new Error('Open a project before saving shots.')
      }

      const projectScenes = scenes ?? project.scenes ?? []
      const savedShotGroups = await saveProjectShotsBulk(
        project.projectId,
        shotGroups,
        projectScenes
      )

      const next = {
        ...project,
        scenes: projectScenes,
        shotGroups: savedShotGroups,
        status: {
          ...project.status,
          scenes: projectScenes.length > 0 ? 'done' : project.status?.scenes ?? 'idle',
          shots: savedShotGroups.length > 0 ? 'done' : project.status?.shots ?? 'idle',
        },
      }

      persist(next)
      return { shotGroups: savedShotGroups, project: next }
    },
    [persist, project]
  )

  const refreshProjectCharacters = useCallback(async () => {
    const current = loadProject()
    if (!current.projectId) {
      return { characters: current.characters ?? [], project: current }
    }

    const characters = await getProjectCharacters(current.projectId)
    const next = {
      ...current,
      characters,
      status: {
        ...current.status,
        characters: characters.length > 0 ? 'done' : current.status?.characters ?? 'idle',
      },
    }

    persist(next)
    return { characters, project: next }
  }, [persist])

  const saveCharactersToBackend = useCallback(
    async ({ characters }) => {
      if (!project.projectId) {
        throw new Error('Open a project before saving characters.')
      }

      const savedCharacters = await saveProjectCharactersBulk(project.projectId, characters)

      const next = {
        ...project,
        characters: savedCharacters,
        status: {
          ...project.status,
          characters: savedCharacters.length > 0 ? 'done' : project.status?.characters ?? 'idle',
        },
      }

      persist(next)
      return { characters: savedCharacters, project: next }
    },
    [persist, project]
  )

  const saveEnvironmentsToBackend = useCallback(
    async ({ environments }) => {
      if (!project.projectId) {
        throw new Error('Open a project before saving environments.')
      }

      const savedEnvironments = await saveProjectEnvironmentsBulk(project.projectId, environments)

      const next = {
        ...project,
        environments: savedEnvironments,
        status: {
          ...project.status,
          environments:
            savedEnvironments.length > 0 ? 'done' : project.status?.environments ?? 'idle',
        },
      }

      persist(next)
      return { environments: savedEnvironments, project: next }
    },
    [persist, project]
  )

  const updateVisualStyle = useCallback(
    async (visualStyle) => {
      const normalizedStyle = normalizeVisualStyle(visualStyle)
      const next = { ...project, visualStyle: normalizedStyle }
      persist(next)

      if (!project.projectId) {
        return
      }

      try {
        const apiProject = await projectApi.updateProject(project.projectId, {
          style: getVisualStyleLabel(normalizedStyle),
        })
        persist(
          mapApiResponseToProjectState(
            { ...next, visualStyle: normalizedStyle },
            apiProject
          )
        )
      } catch (err) {
        persist(next)
        throw err
      }
    },
    [persist, project]
  )

  const runStep = useCallback(
    async (stepId, snapshot) => {
      setGenerating(true)
      setError(null)
      const source = snapshot ?? project

      try {
        let apiProject
        let workingSource = source

        if (stepId === 'script') {
          if (!source.projectId) {
            throw new Error('Open a project before generating a script.')
          }

          const trimmedStory = source.story?.trim() ?? ''
          if (!trimmedStory) {
            throw new Error('Story is required')
          }

          const result = await projectApi.generateScript({
            story: trimmedStory,
            style: getVisualStyleLabel(source.visualStyle),
            project_id: source.projectId,
          })

          const script = result.script
          let next = {
            ...source,
            story: trimmedStory,
            name: source.name || deriveProjectName(trimmedStory),
            script,
            status: {
              ...source.status,
              story: 'ready',
              script: 'done',
            },
          }

          if (result.project) {
            next = mapApiResponseToProjectState(next, result.project, {
              statusOverrides: {
                story: 'ready',
                script: 'done',
              },
            })
          }

          persist(next)
          return next
        } else if (stepId === 'screenplay') {
          if (!source.projectId) {
            throw new Error('Open a project before generating a screenplay.')
          }

          const trimmedStory = source.story?.trim() ?? ''
          if (!trimmedStory) {
            throw new Error('Story is required')
          }

          const result = await projectApi.generateScreenplay({
            story: trimmedStory,
            style: getVisualStyleLabel(source.visualStyle),
            project_id: source.projectId,
          })

          const screenplay = result.screenplay
          let next = {
            ...source,
            story: trimmedStory,
            screenplay,
            status: {
              ...source.status,
              story: 'ready',
              screenplay: 'done',
            },
          }

          if (result.project) {
            next = mapApiResponseToProjectState(next, result.project, {
              statusOverrides: {
                story: 'ready',
                screenplay: 'done',
              },
            })
          }

          persist(next)
          return next
        } else if (stepId === 'scenes' || stepId === 'sceneboard') {
          if (!source.projectId) {
            throw new Error('Open a project before generating scenes.')
          }

          const trimmedScreenplay = source.screenplay?.trim() ?? ''
          const validationError = validateScreenplay(trimmedScreenplay)
          if (validationError) {
            throw new Error(validationError)
          }

          const result = await projectApi.generateScenes({
            screenplay: trimmedScreenplay,
            style: source.style ?? getVisualStyleLabel(source.visualStyle),
            project_id: source.projectId,
          })

          const scenes = mapAdstoryScenes(result.scenes ?? result.project?.scenes ?? [])
          let next = {
            ...source,
            screenplay: trimmedScreenplay,
            scenes,
            status: {
              ...source.status,
              screenplay: 'done',
              scenes: 'done',
              sceneboard: 'done',
            },
          }

          if (result.project) {
            next = mapApiResponseToProjectState(next, result.project, {
              statusOverrides: {
                screenplay: 'done',
                scenes: 'done',
                sceneboard: 'done',
              },
            })
            if (scenes.length > 0) {
              next.scenes = scenes
            }
          }

          persist(next)
          return next
        } else if (stepId === 'shots') {
          if (!source.projectId) {
            throw new Error('Open a project before generating shots.')
          }

          const scenes = source.scenes ?? []
          const result = await generateShotsFromScenes({
            scenes,
            style: source.style ?? getVisualStyleLabel(source.visualStyle),
            project_id: source.projectId,
          })

          const shotGroups = result.shotGroups ?? []
          let next = {
            ...source,
            scenes,
            shotGroups,
            status: {
              ...source.status,
              scenes: 'done',
              shots: 'done',
            },
          }

          if (result.project) {
            next = mapApiResponseToProjectState(next, result.project, {
              statusOverrides: {
                scenes: 'done',
                shots: 'done',
              },
            })
            next.scenes = scenes
            next.shotGroups = shotGroups
          }

          persist(next)
          return next
        } else if (stepId === 'frames') {
          const frameGroups = buildFrameGroups(source.shotGroups ?? [], source.scenes ?? [])
          const next = {
            ...source,
            frameGroups,
            status: {
              ...source.status,
              frames: 'done',
            },
          }
          persist(next)
          return next
        } else {
          throw new Error(`Unknown generation step: ${stepId}`)
        }

        const next = mapApiResponseToProjectState(workingSource, apiProject)
        persist(next)
        return next
      } catch (err) {
        reportError(err)
        throw err
      } finally {
        setGenerating(false)
      }
    },
    [persist, project]
  )

  const generateSceneImages = useCallback(
    async (sceneApiId) => {
      if (!project.projectId || !sceneApiId) {
        throw new Error('Open a project before generating scene images.')
      }

      setGeneratingSceneIds((prev) => ({ ...prev, [String(sceneApiId)]: true }))
      setError(null)

      try {
        await projectApi.generateSceneImages(sceneApiId)
        const apiProject = await projectApi.getProject(project.projectId)
        const next = mapApiResponseToProjectState(project, apiProject)
        persist(next)
        return next
      } catch (err) {
        reportError(err, 'Image generation failed')
        throw err
      } finally {
        setGeneratingSceneIds((prev) => ({ ...prev, [String(sceneApiId)]: false }))
      }
    },
    [persist, project]
  )

  const generateStoryboardForProject = useCallback(async () => {
    let latest = project

    for (const scene of project.studioScenes ?? []) {
      if (!scene.apiId) continue
      latest = await generateSceneImages(scene.apiId)
    }

    return latest
  }, [generateSceneImages, project])

  const applySelectedShotImage = useCallback(
    async (shotApiId, shotPayload) => {
      const withImmediateImage = applyRegeneratedShotToProject(project, shotApiId, shotPayload)
      persist(withImmediateImage)

      const apiProject = await projectApi.getProject(project.projectId)
      const next = mapApiResponseToProjectState(withImmediateImage, apiProject)
      persist(next)
      return next
    },
    [persist, project]
  )

  const selectShotCandidate = useCallback(
    async (shotApiId, candidateId) => {
      if (!project.projectId || !shotApiId || candidateId == null) {
        throw new Error('Open a project before selecting a shot version.')
      }

      setSelectingShotCandidateId(String(shotApiId))

      try {
        const updatedShot = await projectApi.selectShotCandidate(shotApiId, candidateId)
        return await applySelectedShotImage(shotApiId, updatedShot)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Shot version selection failed'
        throw new Error(message)
      } finally {
        setSelectingShotCandidateId(null)
      }
    },
    [applySelectedShotImage, project.projectId]
  )

  const regenerateShotCandidates = useCallback(
    async (shotApiId) => {
      if (!project.projectId || !shotApiId) {
        throw new Error('Open a project before regenerating shot options.')
      }

      const response = await projectApi.generateShotCandidates(shotApiId)
      const candidates = extractShotCandidatesPayload(response)

      if (candidates.length === 0) {
        throw new Error('No shot versions were generated.')
      }

      return candidates
    },
    [project.projectId]
  )

  const generateStoryboardCandidatesForScene = useCallback(
    async (sceneApiId) => {
      const scene = (project.studioScenes ?? []).find(
        (item) => String(item.apiId) === String(sceneApiId)
      )

      if (!scene) {
        throw new Error('Scene not found.')
      }

      const results = {}

      for (const shot of scene.shots ?? []) {
        if (!shot.apiId) continue
        results[String(shot.apiId)] = await regenerateShotCandidates(shot.apiId)
      }

      return results
    },
    [project.studioScenes, regenerateShotCandidates]
  )

  const generateStoryboardCandidatesForProject = useCallback(async () => {
    const results = {}

    for (const scene of project.studioScenes ?? []) {
      for (const shot of scene.shots ?? []) {
        if (!shot.apiId) continue
        results[String(shot.apiId)] = await regenerateShotCandidates(shot.apiId)
      }
    }

    return results
  }, [project.studioScenes, regenerateShotCandidates])

  const regenerateShotImage = useCallback(
    async (shotApiId) => {
      if (!project.projectId || !shotApiId) {
        throw new Error('Open a project before regenerating a shot image.')
      }

      setRegeneratingShotApiId(String(shotApiId))

      try {
        const response = await projectApi.generateShotCandidates(shotApiId)
        const candidates = extractShotCandidatesPayload(response)

        if (candidates.length === 0) {
          throw new Error('No shot versions were generated.')
        }

        if (candidates.length === 1) {
          await selectShotCandidate(shotApiId, candidates[0].id)
          return { autoSelected: true, shotApiId: String(shotApiId) }
        }

        return {
          requiresSelection: true,
          shotApiId: String(shotApiId),
          candidates,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Image regeneration failed'
        throw new Error(message)
      } finally {
        setRegeneratingShotApiId(null)
      }
    },
    [project.projectId, selectShotCandidate]
  )

  const saveShotDetails = useCallback(
    async (shotApiId, payload) => {
      if (!project.projectId || !shotApiId) {
        throw new Error('Open a project before saving shot details.')
      }

      await projectApi.updateShot(shotApiId, payload)
      const apiProject = await projectApi.getProject(project.projectId)
      const next = mapApiResponseToProjectState(project, apiProject)
      persist(next)
      return next
    },
    [persist, project]
  )

  const updateShotReviewStatus = useCallback(
    async (shotKey, reviewStatus) => {
      const normalized = normalizeShotReviewStatus(reviewStatus)
      const key = String(shotKey)
      const nextReviewStatuses = {
        ...(project.shotReviewStatuses ?? {}),
        [key]: normalized,
      }

      const nextStudioScenes = (project.studioScenes ?? []).map((scene) => ({
        ...scene,
        shots: scene.shots.map((shot) =>
          String(shot.apiId ?? shot.id) === key ? { ...shot, reviewStatus: normalized } : shot
        ),
      }))

      const matchedShot = nextStudioScenes.flatMap((scene) => scene.shots).find(
        (shot) => String(shot.apiId ?? shot.id) === key
      )
      const shotApiId = matchedShot?.apiId

      let next = {
        ...project,
        shotReviewStatuses: nextReviewStatuses,
        studioScenes: nextStudioScenes,
      }

      persist(next)

      if (project.projectId && shotApiId) {
        try {
          await projectApi.updateShot(shotApiId, { review_status: normalized })
          const apiProject = await projectApi.getProject(project.projectId)
          next = mapApiResponseToProjectState(
            { ...next, shotReviewStatuses: nextReviewStatuses },
            apiProject
          )
          next.shotReviewStatuses = {
            ...(next.shotReviewStatuses ?? {}),
            ...nextReviewStatuses,
          }
          persist(next)
        } catch {
          // Local review status is already saved.
        }
      }

      return next
    },
    [persist, project]
  )

  const suggestCharacters = useCallback(
    async ({ force = false } = {}) => {
      if (!project.projectId) {
        throw new Error('Open a project before suggesting characters.')
      }

      setError(null)

      try {
        const result = await projectApi.suggestCharacters(project.projectId, { force })
        const characters = mapApiCharacters(result.characters)
        persist({ ...project, characters })
        return { characters, source: result.source }
      } catch (err) {
        reportError(err, 'Character suggestion failed')
        throw err
      }
    },
    [persist, project]
  )

  const generateCharacters = useCallback(async () => {
    if (!project.projectId) {
      throw new Error('Open a project before generating characters.')
    }

    setError(null)

    try {
      const result = await projectApi.generateCharacters({ project_id: project.projectId })
      const next = mapApiResponseToProjectState(project, result.project ?? result)
      persist(next)
      return next.characters
    } catch (err) {
      reportError(err, 'Character generation failed')
      throw err
    }
  }, [persist, project])

  const suggestEnvironments = useCallback(
    async ({ force = false } = {}) => {
      if (!project.projectId) {
        throw new Error('Open a project before suggesting environments.')
      }

      setError(null)

      try {
        const result = await projectApi.suggestEnvironments(project.projectId, { force })
        const environments = mapApiEnvironments(result.environments)
        persist({ ...project, environments })
        return { environments, source: result.source }
      } catch (err) {
        reportError(err, 'Environment suggestion failed')
        throw err
      }
    },
    [persist, project]
  )

  const refreshProjectEnvironments = useCallback(async () => {
    const current = loadProject()
    if (!current.projectId) {
      return { environments: current.environments ?? [], project: current }
    }

    setError(null)

    try {
      const apiProject = await projectApi.getProject(current.projectId)
      let next = mapApiResponseToProjectState(current, apiProject)

      if ((next.environments?.length ?? 0) === 0) {
        const fromEndpoint = await getProjectEnvironments(current.projectId)
        if (fromEndpoint.length > 0) {
          next = {
            ...next,
            environments: fromEndpoint,
            status: {
              ...next.status,
              environments: 'done',
            },
          }
        }
      }

      persist(next)
      return { environments: next.environments ?? [], project: next }
    } catch (err) {
      reportError(err, 'Failed to refresh environments')
      throw err
    }
  }, [persist, reportError])

  const completeCharactersStep = useCallback(() => {
    const next = {
      ...project,
      status: {
        ...project.status,
        characters: 'done',
      },
    }
    persist(next)
    return next
  }, [persist, project])

  const completeEnvironmentsStep = useCallback(() => {
    const next = {
      ...project,
      status: {
        ...project.status,
        environments: 'done',
      },
    }
    persist(next)
    return next
  }, [persist, project])

  const suggestObjects = useCallback(
    async ({ force = false } = {}) => {
      if (!project.projectId) {
        throw new Error('Open a project before suggesting objects.')
      }

      setError(null)

      try {
        const result = await projectApi.suggestObjects(project.projectId, { force })
        const objects = mapApiObjects(result.objects)
        persist({ ...project, objects })
        return { objects, source: result.source }
      } catch (err) {
        reportError(err, 'Object suggestion failed')
        throw err
      }
    },
    [persist, project]
  )

  const refreshProjectObjects = useCallback(async () => {
    if (!project.projectId) {
      return project.objects
    }

    setError(null)

    try {
      const apiProject = await projectApi.getProject(project.projectId)
      const next = mapApiResponseToProjectState(project, apiProject)
      persist(next)
      return next.objects
    } catch (err) {
      reportError(err, 'Failed to refresh objects')
      throw err
    }
  }, [persist, project])

  const completeObjectsStep = useCallback(() => {
    const next = {
      ...project,
      status: {
        ...project.status,
        objects: 'done',
      },
    }
    persist(next)
    return next
  }, [persist, project])

  const refreshProject = useCallback(async () => {
    if (!project.projectId) {
      return project
    }

    setError(null)

    try {
      const apiProject = await projectApi.getProject(project.projectId)
      const next = mapApiResponseToProjectState(project, apiProject)
      persist(next)
      return next
    } catch (err) {
      reportError(err, 'Failed to refresh project')
      throw err
    }
  }, [persist, project])

  const assignAssetsToShots = useCallback(async ({ force = false } = {}) => {
    if (!project.projectId) {
      throw new Error('Open a project before assigning assets to shots.')
    }

    setError(null)

    try {
      await projectApi.assignAssetsToShots(project.projectId, { force })
      const apiProject = await projectApi.getProject(project.projectId)
      const next = mapApiResponseToProjectState(project, apiProject)
      persist(next)
      return next
    } catch (err) {
      reportError(err, 'Asset assignment failed')
      throw err
    }
  }, [persist, project])

  const replaceProjectCharacters = useCallback(
    (incomingCharacters) => {
      setProject((current) => {
        const next = { ...current, characters: mapApiCharacters(incomingCharacters) }
        const saved = saveProject(next)
        syncActiveStudio(saved)
        return saved
      })
    },
    []
  )

  const replaceProjectEnvironments = useCallback((incomingEnvironments) => {
    setProject((current) => {
      const next = { ...current, environments: mapApiEnvironments(incomingEnvironments) }
      const saved = saveProject(next)
      syncActiveStudio(saved)
      return saved
    })
  }, [])

  const replaceProjectCharacter = useCallback(
    (updated) => {
      const mapped = mapApiCharacter(updated)
      const characters = project.characters.map((character) =>
        String(character.id) === String(mapped.id) ? mapped : character
      )
      persist({ ...project, characters })
      return mapped
    },
    [persist, project]
  )

  const replaceProjectEnvironment = useCallback(
    (updated) => {
      const mapped = mapApiEnvironment(updated)
      const environments = project.environments.map((environment) =>
        environment.id === mapped.id ? mapped : environment
      )
      persist({ ...project, environments })
      return mapped
    },
    [persist, project]
  )

  const replaceProjectObject = useCallback(
    (updated) => {
      const mapped = mapApiObject(updated)
      const objects = project.objects.map((object) =>
        object.id === mapped.id ? mapped : object
      )
      persist({ ...project, objects })
      return mapped
    },
    [persist, project]
  )

  const saveShotStoryboardSettings = useCallback(
    async (shotApiId, payload) => {
      if (!project.projectId || !shotApiId) {
        throw new Error('Open a project before saving storyboard settings.')
      }

      const { shot } = await updateShotStoryboardSettings(project.projectId, shotApiId, payload)
      if (!shot) {
        throw new Error('Failed to save storyboard settings.')
      }

      const next = applyShotImageResponseToProject(project, shotApiId, { shot })
      persist(next)
      return { shot, project: next }
    },
    [persist, project]
  )

  const generateStoryboardShotImage = useCallback(
    async (shotApiId, settingsPayload) => {
      if (!project.projectId || !shotApiId) {
        throw new Error('Open a project before generating a shot image.')
      }

      await updateShotStoryboardSettings(project.projectId, shotApiId, settingsPayload)
      const result = await generateShotImage(project.projectId, shotApiId)

      if (!result.shot) {
        throw new Error('Failed to generate shot image.')
      }

      const next = applyShotImageResponseToProject(project, shotApiId, result)
      persist(next)
      return { ...result, project: next }
    },
    [persist, project]
  )

  const approveStoryboardShotImage = useCallback(
    async (shotApiId, imageId) => {
      if (!project.projectId || !shotApiId) {
        throw new Error('Open a project before approving a shot image.')
      }
      if (imageId == null) {
        throw new Error('Image id is required.')
      }

      const result = await approveShotImage(project.projectId, shotApiId, imageId)
      const next = applyShotImageResponseToProject(project, shotApiId, result)
      persist(next)
      return { ...result, project: next }
    },
    [persist, project]
  )

  const deleteStoryboardShotImage = useCallback(
    async (shotApiId, imageId) => {
      if (!project.projectId || !shotApiId) {
        throw new Error('Open a project before deleting a shot image.')
      }
      if (imageId == null) {
        throw new Error('Image id is required.')
      }

      const result = await deleteShotImage(project.projectId, shotApiId, imageId)
      const next = applyShotImageResponseToProject(project, shotApiId, { images: result.images })
      persist(next)
      return { ...result, project: next }
    },
    [persist, project]
  )

  const resetProject = useCallback(() => {
    exitProject()
  }, [exitProject])

  return {
    project,
    generating,
    generatingSceneIds,
    regeneratingShotApiId,
    selectingShotCandidateId,
    error,
    clearError,
    updateStory,
    saveStoryToBackend,
    saveScriptToBackend,
    saveScreenplayToBackend,
    saveScenesToBackend,
    saveShotsToBackend,
    saveCharactersToBackend,
    saveEnvironmentsToBackend,
    refreshAdstoryProject,
    refreshProjectScenes,
    refreshProjectShots,
    updateVisualStyle,
    runStep,
    resetProject,
    persist,
    persistLocalOnly,
    selectProject,
    exitProject,
    deleteProject,
    generateSceneImages,
    generateStoryboardForProject,
    regenerateShotImage,
    regenerateShotCandidates,
    generateStoryboardCandidatesForScene,
    generateStoryboardCandidatesForProject,
    selectShotCandidate,
    saveShotDetails,
    saveShotStoryboardSettings,
    generateStoryboardShotImage,
    approveStoryboardShotImage,
    deleteStoryboardShotImage,
    updateShotReviewStatus,
    suggestCharacters,
    generateCharacters,
    suggestEnvironments,
    refreshProjectCharacters,
    refreshProjectEnvironments,
    completeCharactersStep,
    completeEnvironmentsStep,
    suggestObjects,
    refreshProjectObjects,
    completeObjectsStep,
    assignAssetsToShots,
    refreshProject,
    replaceProjectCharacters,
    replaceProjectCharacter,
    replaceProjectEnvironments,
    replaceProjectEnvironment,
    replaceProjectObject,
  }
}
