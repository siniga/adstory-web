import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getVisualStyleLabel } from '../config/visualStyles'
import DebugPanel from '../components/DebugPanel'
import { useProjectStore } from '../project/ProjectStoreContext'
import { formatUserFriendlyError } from '../utils/userFriendlyErrors'
import StoryboardBasicView from './components/StoryboardBasicView'
import StoryboardImageGateModal from './components/StoryboardImageGateModal'
import StoryboardEditMenu from './components/StoryboardEditMenu'
import RegenerateStoryboardBanner from './components/RegenerateStoryboardBanner'
import StoryboardShotsPanel from './components/StoryboardShotsPanel'
import StoryboardShotEditor from './components/StoryboardShotEditor'
import StoryboardWorkspaceSceneList from './components/StoryboardWorkspaceSceneList'
import ShotFullscreenViewer from './components/ShotFullscreenViewer'
import ShotRegenerateModal from './components/ShotRegenerateModal'
import ShareStoryboardModal from './components/ShareStoryboardModal'
import { IconShare } from '../studio/icons'
import {
  collectShotLightboxItems,
  findLightboxIndex,
  sceneDisplayLabel,
} from './shotLightbox'
import useStoryboardShotGeneration from './hooks/useStoryboardShotGeneration'
import useStoryboardSceneImageGeneration from './hooks/useStoryboardSceneImageGeneration'
import {
  mergeSceneShotsFromLoader,
  mergeShotPreservingImages,
  mergeShotsPreservingImages,
  patchStoryboardShotsFromProgress,
} from './storyboardShotImageMerge'
import { isStoryboardShotGenerationActive } from './storyboardWorkspaceStatus'
import {
  createDraftFromShot,
  draftToCreatePayload,
  draftToUpdatePayload,
} from './shotEditorModel'
import {
  projectNeedsStoryboardPipeline,
  runStoryboardGenerationPipeline,
  consumeUnifiedPipelineStoryboardDone,
} from './pipeline/runStoryboardGenerationPipeline'
import styles from './ProjectStoryboard.module.css'
import shellStyles from '../app/AppShell.module.css'
import {
  applyShotImageApiResponse,
  createProjectScene,
  createProjectShot,
  deleteProjectShot,
  generateShotImage,
  mapAdstoryShot,
  updateProjectShot,
} from '../services/adstoryApi'
import * as projectApi from '../services/projectApi'

export default function ProjectStoryboardPage({ projectId, onBackToProject }) {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    project,
    storyboardScenes,
    storyboardShots,
    selectedScene,
    selectedShot,
    characters,
    environments,
    setCharacters,
    loadStoryboard,
    loadStoryboardScene,
    setSelectedScene,
    setSelectedShot,
    setStoryboardShots,
    updateStoryboardSceneMeta,
    setStoryboardGenerationProgress,
  } = useProjectStore()

  const [listLoading, setListLoading] = useState(true)
  const [sceneLoading, setSceneLoading] = useState(false)
  const [error, setError] = useState(null)
  const [shotSaving, setShotSaving] = useState(false)
  const [addingScene, setAddingScene] = useState(false)
  const [addingShot, setAddingShot] = useState(false)
  const [generatingShotId, setGeneratingShotId] = useState(null)
  const [shotSaveError, setShotSaveError] = useState(null)
  const [shotSaveMessage, setShotSaveMessage] = useState(null)
  const [mobilePanel, setMobilePanel] = useState('shots')
  const [requestTriggered, setRequestTriggered] = useState(false)
  const [viewMode, setViewMode] = useState('basic')
  const [basicShotsBySceneId, setBasicShotsBySceneId] = useState({})
  const [basicShotsLoading, setBasicShotsLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [imageGateOpen, setImageGateOpen] = useState(false)
  const [fullscreenIndex, setFullscreenIndex] = useState(null)
  const [regenerateShot, setRegenerateShot] = useState(null)
  const [regenerateSceneLabel, setRegenerateSceneLabel] = useState('')
  const [regenerateError, setRegenerateError] = useState(null)
  const [shareOpen, setShareOpen] = useState(false)
  const selectedSceneId = selectedScene?.apiId ?? null
  const selectedShotId = selectedShot?.id ?? selectedShot?.apiId ?? null

  const storyboardLoadKeyRef = useRef(null)
  const sceneLoadCompletedRef = useRef(null)
  const sceneLoadInFlightRef = useRef(null)
  const activeSceneIdRef = useRef(selectedSceneId)
  const pipelineStartedRef = useRef(null)
  const pipelineAbortRef = useRef(null)
  const pendingForceRegenRef = useRef(Boolean(location.state?.regenerateStoryboard))
  const executeStoryboardPipelineRef = useRef(null)

  useEffect(() => {
    activeSceneIdRef.current = selectedSceneId
  }, [selectedSceneId])

  const visualStyle = useMemo(
    () => getVisualStyleLabel(project.visualStyle) || '',
    [project.visualStyle]
  )
  const visualStyleRef = useRef(visualStyle)
  const loadStoryboardRef = useRef(loadStoryboard)
  const loadStoryboardSceneRef = useRef(loadStoryboardScene)
  const updateStoryboardSceneMetaRef = useRef(updateStoryboardSceneMeta)
  const setSelectedSceneRef = useRef(setSelectedScene)
  const setSelectedShotRef = useRef(setSelectedShot)
  const setStoryboardShotsRef = useRef(setStoryboardShots)

  useEffect(() => {
    visualStyleRef.current = visualStyle
  }, [visualStyle])

  useEffect(() => {
    loadStoryboardRef.current = loadStoryboard
    loadStoryboardSceneRef.current = loadStoryboardScene
    updateStoryboardSceneMetaRef.current = updateStoryboardSceneMeta
    setSelectedSceneRef.current = setSelectedScene
    setSelectedShotRef.current = setSelectedShot
    setStoryboardShotsRef.current = setStoryboardShots
  }, [
    loadStoryboard,
    loadStoryboardScene,
    setSelectedScene,
    setSelectedShot,
    setStoryboardShots,
    updateStoryboardSceneMeta,
  ])

  const executeStoryboardPipeline = useCallback(
    async ({ force = false, scenes: incomingScenes } = {}) => {
      if (!projectId) return

      if (pipelineAbortRef.current) {
        pipelineAbortRef.current.abort()
      }

      const pipelineKey = `${projectId}:storyboard-pipeline`
      pipelineStartedRef.current = pipelineKey
      const controller = new AbortController()
      pipelineAbortRef.current = controller
      if (force) setRegenerating(true)
      setError(null)

      try {
        const scenes = incomingScenes ?? (await loadStoryboardRef.current(projectId))
        await runStoryboardGenerationPipeline({
          projectId,
          scenes,
          styleLabel: visualStyleRef.current,
          signal: controller.signal,
          force,
          onPhaseChange: () => {},
          onSceneMeta: (scene) => {
            const id = scene?.apiId ?? scene?.id
            if (id == null) return
            updateStoryboardSceneMetaRef.current?.(id, {
              shotCount: scene.shotCount ?? scene.shot_count,
              shotGenerationStatus:
                scene.shotGenerationStatus ?? scene.shot_generation_status,
              title: scene.title,
            })
          },
          onShots: (sceneId, shots) => {
            const activeId = activeSceneIdRef.current
            if (
              activeId != null &&
              String(activeId) === String(sceneId) &&
              Array.isArray(shots)
            ) {
              setStoryboardShotsRef.current(shots)
            }
          },
        })

        setBasicShotsBySceneId({})
        await loadStoryboardRef.current(projectId)
        const activeId = activeSceneIdRef.current
        if (activeId != null) {
          sceneLoadCompletedRef.current = null
          const sceneResult = await loadStoryboardSceneRef.current(projectId, activeId)
          setStoryboardShotsRef.current(sceneResult?.shots ?? [])
          setSelectedShotRef.current(sceneResult?.shots?.[0] ?? null)
        }
      } catch (err) {
        if (err?.name === 'AbortError') return
        const friendly = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to generate storyboard'
        )
        setError(friendly.message)
        pipelineStartedRef.current = null
      } finally {
        if (pipelineAbortRef.current === controller) {
          pipelineAbortRef.current = null
        }
        if (force) setRegenerating(false)
      }
    },
    [projectId]
  )

  useEffect(() => {
    executeStoryboardPipelineRef.current = executeStoryboardPipeline
  }, [executeStoryboardPipeline])

  useEffect(() => {
    if (!location.state?.regenerateStoryboard) return
    pendingForceRegenRef.current = true
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state?.regenerateStoryboard, navigate])

  useEffect(() => {
    if (!projectId) return undefined

    const loadKey = `${projectId}:storyboard`
    if (storyboardLoadKeyRef.current === loadKey) {
      return undefined
    }
    storyboardLoadKeyRef.current = loadKey

    let cancelled = false
    setRequestTriggered(true)
    setListLoading(true)
    setError(null)

    ;(async () => {
      try {
        const scenes = await loadStoryboardRef.current(projectId)
        if (cancelled) return

        if (scenes.length > 0) {
          setSelectedSceneRef.current((current) => {
            if (
              current?.apiId != null &&
              scenes.some((scene) => String(scene.apiId) === String(current.apiId))
            ) {
              return current
            }
            return scenes[0]
          })
        }

        setListLoading(false)

        const pipelineKey = `${projectId}:storyboard-pipeline`
        if (pendingForceRegenRef.current) {
          pendingForceRegenRef.current = false
          await executeStoryboardPipelineRef.current?.({ force: true, scenes })
          return
        }

        if (pipelineStartedRef.current === pipelineKey) return

        // Unified Story→Storyboard pipeline already finished — don't open a second popup.
        if (consumeUnifiedPipelineStoryboardDone(projectId)) {
          pipelineStartedRef.current = pipelineKey
          return
        }

        let needsPipeline = false
        try {
          needsPipeline = await projectNeedsStoryboardPipeline(projectId, scenes)
        } catch {
          needsPipeline = scenes.some(
            (scene) => (scene.shotCount ?? scene.shot_count ?? 0) <= 0
          )
        }
        if (!needsPipeline || cancelled) return

        await executeStoryboardPipelineRef.current?.({ scenes })
      } catch (err) {
        if (!cancelled) {
          setListLoading(false)
          setError(
            formatUserFriendlyError(
              err instanceof Error ? err.message : 'Failed to load storyboard'
            ).message
          )
        }
      }
    })()

    return () => {
      // Do NOT abort the multi-scene pipeline here — Strict Mode remounts and
      // store callback identity changes used to cancel after the first scene.
      cancelled = true
      if (pipelineStartedRef.current !== `${projectId}:storyboard-pipeline`) {
        storyboardLoadKeyRef.current = null
      }
    }
  }, [projectId])

  useEffect(() => {
    if (viewMode !== 'basic' || !projectId || !storyboardScenes.length) return undefined

    let cancelled = false
    setBasicShotsLoading(true)

    ;(async () => {
      const next = {}
      try {
        const liveProject = await projectApi.getProject(projectId)
        const liveShots = liveProject.shots ?? []
        for (const scene of storyboardScenes) {
          const sceneId = scene.apiId ?? scene.id
          if (sceneId == null) continue
          const sceneShots = liveShots
            .filter((shot) => String(shot.scene_id) === String(sceneId))
            .map((shot, index) =>
              mapAdstoryShot(shot, {
                sceneNumber: scene.scene_number,
                indexInScene: index,
              })
            )
          next[sceneId] = sceneShots
          next[String(sceneId)] = sceneShots
        }
      } catch {
        await Promise.all(
          storyboardScenes.map(async (scene) => {
            const sceneId = scene.apiId ?? scene.id
            if (sceneId == null) return
            try {
              const result = await loadStoryboardScene(projectId, sceneId)
              next[sceneId] = result?.shots ?? []
              next[String(sceneId)] = result?.shots ?? []
            } catch {
              next[sceneId] = []
              next[String(sceneId)] = []
            }
          })
        )
      }

      if (!cancelled) {
        setBasicShotsBySceneId(next)
      }
    })()
      .finally(() => {
        if (!cancelled) setBasicShotsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [loadStoryboardScene, projectId, storyboardScenes, viewMode])

  useEffect(() => {
    if (viewMode !== 'basic' || selectedSceneId == null) return
    setBasicShotsBySceneId((previous) => ({
      ...previous,
      [selectedSceneId]: storyboardShots,
      [String(selectedSceneId)]: storyboardShots,
    }))
  }, [viewMode, selectedSceneId, storyboardShots])

  // Characters and environments are loaded via the global ProjectStore. No need to load them separately.

  useEffect(() => {
    if (!projectId || !selectedSceneId) return undefined

    const loadKey = `${projectId}:${selectedSceneId}`

    if (sceneLoadCompletedRef.current === loadKey) {
      return undefined
    }

    if (sceneLoadInFlightRef.current === loadKey) {
      return undefined
    }

    sceneLoadInFlightRef.current = loadKey

    const requestSceneId = selectedSceneId
    let cancelled = false
    setSceneLoading(true)
    setError(null)

    loadStoryboardScene(projectId, requestSceneId)
      .then((result) => {
        if (cancelled) return
        if (String(requestSceneId) !== String(activeSceneIdRef.current)) return

        const nextShots = result?.shots ?? []
        setStoryboardShots(nextShots)
        setSelectedShot(nextShots[0] ?? null)
        sceneLoadCompletedRef.current = loadKey
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            formatUserFriendlyError(
              err instanceof Error ? err.message : 'Failed to load storyboard scene'
            ).message
          )
        }
      })
      .finally(() => {
        if (sceneLoadInFlightRef.current === loadKey) {
          sceneLoadInFlightRef.current = null
        }
        if (!cancelled) setSceneLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [loadStoryboardScene, projectId, selectedSceneId, setSelectedShot, setStoryboardShots])

  useEffect(() => {
    if (!storyboardScenes.length) return

    setSelectedScene((current) => {
      if (
        current?.apiId != null &&
        storyboardScenes.some((scene) => String(scene.apiId) === String(current.apiId))
      ) {
        return current
      }
      return storyboardScenes[0]
    })
  }, [setSelectedScene, storyboardScenes])

  const handleSelectScene = useCallback(
    (sceneId) => {
      if (String(sceneId) === String(selectedSceneId)) return
      const nextScene =
        storyboardScenes.find((scene) => String(scene.apiId) === String(sceneId)) ?? null
      sceneLoadCompletedRef.current = null
      sceneLoadInFlightRef.current = null
      setSelectedScene(nextScene)
      setSelectedShot(null)
      setMobilePanel('shots')
    },
    [selectedSceneId, setSelectedScene, setSelectedShot, storyboardScenes]
  )

  const handleSelectShot = useCallback(
    (shot) => {
      setSelectedShot(shot)
      setMobilePanel('inspector')
    },
    [setSelectedShot]
  )

  const reloadSceneShotsSafely = useCallback(
    async (sceneId) => {
      if (!projectId || !sceneId) return
      if (String(sceneId) !== String(activeSceneIdRef.current)) return

      const result = await loadStoryboardScene(projectId, sceneId)
      if (String(sceneId) !== String(activeSceneIdRef.current)) return

      const nextShots = result?.shots ?? []
      setStoryboardShots(nextShots)
      setSelectedShot((previous) => {
        if (!previous) return nextShots[0] ?? null
        return (
          nextShots.find((shot) => String(shot.apiId) === String(previous.apiId)) ??
          nextShots[0] ??
          previous
        )
      })
      return nextShots
    },
    [loadStoryboardScene, projectId, setSelectedShot, setStoryboardShots]
  )

  const handleGenerationComplete = useCallback(
    async (sceneId) => {
      const targetSceneId = sceneId ?? selectedSceneId
      if (!targetSceneId) return
      await reloadSceneShotsSafely(targetSceneId)
      setStoryboardGenerationProgress(null)
    },
    [reloadSceneShotsSafely, selectedSceneId, setStoryboardGenerationProgress]
  )

  const handleImageGenerationComplete = useCallback(
    async (sceneId) => {
      await reloadSceneShotsSafely(sceneId ?? selectedSceneId)
    },
    [reloadSceneShotsSafely, selectedSceneId]
  )

  const handleGenerationError = useCallback((formatted) => {
    setError(formatted?.message ?? formatted ?? 'Shot generation failed')
  }, [])

  const handlePatchShotsFromImageProgress = useCallback(
    (progressShots) => {
      setStoryboardShots((previous) => patchStoryboardShotsFromProgress(previous, progressShots))
      setSelectedShot((previous) => {
        if (!previous) return previous
        const [patched] = patchStoryboardShotsFromProgress([previous], progressShots)
        return patched ?? previous
      })
    },
    [setSelectedShot, setStoryboardShots]
  )

  const handleShotsChangeFromProgress = useCallback(
    (progressShots) => {
      setStoryboardShots((previous) => mergeShotsPreservingImages(previous, progressShots))
      setSelectedShot((previous) => {
        if (!previous) return previous
        const [patched] = mergeShotsPreservingImages([previous], progressShots)
        return patched ?? previous
      })
    },
    [setSelectedShot, setStoryboardShots]
  )

  const {
    generationError: imageGenerationError,
    imageGenerationActive,
    startGeneration: startImageGeneration,
  } = useStoryboardSceneImageGeneration({
    projectId,
    sceneId: selectedSceneId,
    shots: storyboardShots,
    sceneLoading,
    onShotsPatch: handlePatchShotsFromImageProgress,
    onComplete: handleImageGenerationComplete,
    onError: (formatted) => {
      setShotSaveError(formatted?.message ?? formatted ?? 'Scene image generation failed')
    },
  })

  const handleGenerateAllImages = useCallback(() => {
    startImageGeneration()
  }, [startImageGeneration])

  const {
    progress,
    monitoring,
    starting,
    cancelling: shotCancelling,
    generationError,
    startGeneration,
  } = useStoryboardShotGeneration({
    projectId,
    sceneId: selectedSceneId,
    visualStyle,
    onProgressChange: setStoryboardGenerationProgress,
    onSceneMetaChange: (scene) => {
      if (scene?.apiId != null) {
        updateStoryboardSceneMeta(scene.apiId, scene)
      }
    },
    onShotsChange: handleShotsChangeFromProgress,
    onGenerationComplete: handleGenerationComplete,
    onError: handleGenerationError,
  })

  const generationActive =
    monitoring ||
    starting ||
    shotCancelling ||
    isStoryboardShotGenerationActive(progress?.status)

  const handleGenerateShots = useCallback(() => {
    startGeneration({ force: false })
  }, [startGeneration])

  const mergeSavedShot = useCallback((existing, saved) => {
    if (!saved) return existing
    return mergeShotPreservingImages(existing, saved)
  }, [])

  const handleSaveShot = useCallback(
    async (draft, markSaved) => {
      if (!projectId || !selectedShot?.apiId) return

      setShotSaving(true)
      setShotSaveError(null)
      setShotSaveMessage(null)

      try {
        const payload = draftToUpdatePayload(draft, selectedShot)
        const saved = await updateProjectShot(projectId, selectedShot.apiId, payload)
        const merged = mergeSavedShot(selectedShot, saved)

        setStoryboardShots((previous) =>
          previous.map((shot) =>
            String(shot.apiId) === String(merged.apiId) ? merged : shot
          )
        )
        setSelectedShot(merged)
        markSaved(createDraftFromShot(merged, characters))
        setShotSaveMessage('Shot saved.')
      } catch (err) {
        setShotSaveError(
          formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to save shot'
          ).message
        )
      } finally {
        setShotSaving(false)
      }
    },
    [characters, mergeSavedShot, projectId, selectedShot, setSelectedShot, setStoryboardShots]
  )

  const handleDuplicateShot = useCallback(
    async (shot) => {
      const source = shot ?? selectedShot
      if (!projectId || !source?.apiId) return

      setShotSaveError(null)
      setShotSaveMessage(null)

      try {
        const draft = createDraftFromShot(source, characters)
        const orderIndex =
          Math.max(...storyboardShots.map((item) => item.order_index ?? 0), 0) + 1
        const payload = draftToCreatePayload(draft, source, { orderIndex })
        const created = await createProjectShot(projectId, payload)

        if (created) {
          setStoryboardShots((previous) => [...previous, created])
          setSelectedShot(created)
          setShotSaveMessage('Shot duplicated.')
          setMobilePanel('inspector')
        }
      } catch (err) {
        setShotSaveError(
          formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to duplicate shot'
          ).message
        )
      }
    },
    [characters, projectId, selectedShot, setSelectedShot, setStoryboardShots, storyboardShots]
  )

  const handleDeleteShot = useCallback(
    async (shot) => {
      const target = shot ?? selectedShot
      if (!projectId || !target?.apiId) return

      setShotSaveError(null)
      setShotSaveMessage(null)

      try {
        await deleteProjectShot(projectId, target.apiId)

        const remaining = storyboardShots.filter(
          (item) => String(item.apiId) !== String(target.apiId)
        )
        setStoryboardShots(remaining)
        setSelectedShot(remaining[0] ?? null)
        setShotSaveMessage('Shot deleted.')
        if (!remaining.length) {
          setMobilePanel('shots')
        }
      } catch (err) {
        setShotSaveError(
          formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to delete shot'
          ).message
        )
      }
    },
    [projectId, selectedShot, setSelectedShot, setStoryboardShots, storyboardShots]
  )

  const handleMoveShot = useCallback(
    async (shot, direction) => {
      if (!projectId || !shot?.apiId) return

      const currentIndex = storyboardShots.findIndex(
        (item) => String(item.apiId) === String(shot.apiId)
      )
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= storyboardShots.length) return

      const neighbor = storyboardShots[targetIndex]
      const reordered = [...storyboardShots]
      reordered[currentIndex] = { ...neighbor, order_index: currentIndex }
      reordered[targetIndex] = { ...shot, order_index: targetIndex }
      setStoryboardShots(reordered)

      try {
        const shotPayload = draftToUpdatePayload(createDraftFromShot(shot, characters), shot)
        const neighborPayload = draftToUpdatePayload(
          createDraftFromShot(neighbor, characters),
          neighbor
        )

        await Promise.all([
          updateProjectShot(projectId, shot.apiId, {
            ...shotPayload,
            order_index: targetIndex,
          }),
          updateProjectShot(projectId, neighbor.apiId, {
            ...neighborPayload,
            order_index: currentIndex,
          }),
        ])
      } catch (err) {
        setShotSaveError(
          formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to reorder shots'
          ).message
        )
        sceneLoadCompletedRef.current = null
        sceneLoadInFlightRef.current = null
        const result = await loadStoryboardScene(projectId, selectedSceneId)
        if (String(selectedSceneId) === String(activeSceneIdRef.current)) {
          setStoryboardShots((previous) =>
            mergeSceneShotsFromLoader(previous, result?.shots ?? [], selectedSceneId)
          )
        }
      }
    },
    [characters, loadStoryboardScene, projectId, selectedSceneId, setStoryboardShots, storyboardShots]
  )

  const handleAddScene = useCallback(async () => {
    if (!projectId) return

    setAddingScene(true)
    setShotSaveError(null)

    try {
      const created = await createProjectScene(projectId, {
        title: `Scene ${storyboardScenes.length + 1}`,
      })
      const scenes = await loadStoryboard(projectId)
      const nextScene =
        scenes.find((scene) => String(scene.apiId) === String(created?.apiId)) ??
        scenes[scenes.length - 1] ??
        null

      if (nextScene) {
        sceneLoadCompletedRef.current = null
        sceneLoadInFlightRef.current = null
        setSelectedScene(nextScene)
        setSelectedShot(null)
        setStoryboardShots([])
        setMobilePanel('shots')
      }
    } catch (err) {
      setShotSaveError(
        formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to add scene'
        ).message
      )
    } finally {
      setAddingScene(false)
    }
  }, [
    loadStoryboard,
    projectId,
    setSelectedScene,
    setSelectedShot,
    setStoryboardShots,
    storyboardScenes.length,
  ])

  const handleAddShot = useCallback(async () => {
    if (!projectId || !selectedScene?.apiId) return

    setAddingShot(true)
    setShotSaveError(null)

    try {
      const orderIndex =
        Math.max(...storyboardShots.map((item) => item.order_index ?? 0), 0) + 1
      const created = await createProjectShot(projectId, {
        adstory_scene_id: selectedScene.apiId,
        order_index: orderIndex,
        shot_number: String(orderIndex),
        title: `Shot ${orderIndex}`,
      })

      if (created) {
        setStoryboardShots((previous) => [...previous, created])
        setSelectedShot(created)
        setMobilePanel('inspector')
      }
    } catch (err) {
      setShotSaveError(
        formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to add shot'
        ).message
      )
    } finally {
      setAddingShot(false)
    }
  }, [projectId, selectedScene, setSelectedShot, setStoryboardShots, storyboardShots])

  const applyUpdatedShot = useCallback(
    (target, updated) => {
      const merged = mergeShotPreservingImages(target, updated)

      setStoryboardShots((previous) =>
        previous.map((item) =>
          String(item.apiId ?? item.id) === String(merged.apiId ?? merged.id)
            ? mergeShotPreservingImages(item, merged)
            : item
        )
      )
      setSelectedShot((previous) =>
        previous && String(previous.apiId ?? previous.id) === String(merged.apiId ?? merged.id)
          ? mergeShotPreservingImages(previous, merged)
          : previous
      )
      setBasicShotsBySceneId((previous) => {
        const next = { ...previous }
        for (const [key, shots] of Object.entries(previous)) {
          if (!Array.isArray(shots)) continue
          next[key] = shots.map((item) =>
            String(item.apiId ?? item.id) === String(merged.apiId ?? merged.id)
              ? mergeShotPreservingImages(item, merged)
              : item
          )
        }
        return next
      })

      return merged
    },
    [setSelectedShot, setStoryboardShots]
  )

  const handleGenerateShotImage = useCallback(
    async (shot) => {
      const target = shot ?? selectedShot
      if (!projectId || !target?.apiId || generatingShotId) return

      setGeneratingShotId(target.apiId)
      setShotSaveError(null)

      try {
        const result = await generateShotImage(projectId, target.apiId)
        const updated = applyShotImageApiResponse(target, result)
        applyUpdatedShot(target, updated)
      } catch (err) {
        setShotSaveError(
          formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to generate shot image'
          ).message
        )
      } finally {
        setGeneratingShotId(null)
      }
    },
    [
      applyUpdatedShot,
      generatingShotId,
      projectId,
      selectedShot,
    ]
  )

  const lightboxItems = useMemo(
    () =>
      collectShotLightboxItems(
        storyboardScenes,
        basicShotsBySceneId,
        storyboardShots,
        selectedSceneId
      ),
    [basicShotsBySceneId, selectedSceneId, storyboardScenes, storyboardShots]
  )

  const handleOpenFullscreen = useCallback(
    (shot) => {
      setRegenerateError(null)
      setFullscreenIndex(findLightboxIndex(lightboxItems, shot))
    },
    [lightboxItems]
  )

  const handleOpenRegenerate = useCallback((shot, scene) => {
    if (!shot?.apiId) return
    setRegenerateError(null)
    setRegenerateShot(shot)
    setRegenerateSceneLabel(sceneDisplayLabel(scene ?? selectedScene))
  }, [selectedScene])

  const handleCloseRegenerate = useCallback(() => {
    if (generatingShotId) return
    setRegenerateShot(null)
    setRegenerateError(null)
  }, [generatingShotId])

  const runShotRegenerate = useCallback(
    async (target, prompt) => {
      if (!projectId || !target?.apiId || generatingShotId) return

      setGeneratingShotId(target.apiId)
      setRegenerateError(null)

      try {
        const result = await projectApi.generateProjectShotImage(projectId, target.apiId, {
          force: true,
          custom_prompt: prompt,
        })
        const updated = applyShotImageApiResponse(target, result)
        applyUpdatedShot(target, updated)
        return updated
      } catch (err) {
        const message = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to regenerate shot image'
        ).message
        setRegenerateError(message)
        throw err
      } finally {
        setGeneratingShotId(null)
      }
    },
    [applyUpdatedShot, generatingShotId, projectId]
  )

  const handleRegenerateShot = useCallback(
    async (prompt) => {
      try {
        await runShotRegenerate(regenerateShot, prompt)
        setRegenerateShot(null)
      } catch {
        // Error is shown in the regenerate modal.
      }
    },
    [regenerateShot, runShotRegenerate]
  )

  const workspaceClassName = [
    styles.workspace,
    mobilePanel === 'scenes' ? styles.workspaceScenesOpen : '',
    mobilePanel === 'shots' ? styles.workspaceShotsOpen : '',
    mobilePanel === 'inspector' ? styles.workspaceInspectorOpen : '',
  ]
    .filter(Boolean)
    .join(' ')

  const handleImageGateCharacter = useCallback(
    (updated) => {
      setCharacters((current) =>
        current.map((item) => (String(item.id) === String(updated.id) ? { ...item, ...updated } : item))
      )
    },
    [setCharacters]
  )

  const handleImageGateShot = useCallback((updated, sceneId) => {
    setBasicShotsBySceneId((previous) => {
      const current = previous[sceneId] ?? previous[String(sceneId)] ?? []
      const next = current.map((item) =>
        String(item.id ?? item.apiId) === String(updated.id ?? updated.apiId)
          ? { ...item, ...updated }
          : item
      )
      return {
        ...previous,
        [sceneId]: next,
        [String(sceneId)]: next,
      }
    })
  }, [])

  return (
    <div className={`${shellStyles.paneActive} ${styles.page}`}>
      <div className={styles.pageBar}>
        {onBackToProject ? (
          <button type="button" className={styles.backToProjectBtn} onClick={onBackToProject}>
            ← Project
          </button>
        ) : null}
        <span className={styles.pageBarTitle}>{project?.name || 'Storyboard'}</span>
        <div className={styles.viewSwitch} role="group" aria-label="Storyboard view">
          <button
            type="button"
            className={`${styles.viewSwitchBtn} ${viewMode === 'basic' ? styles.viewSwitchBtnActive : ''}`}
            onClick={() => setViewMode('basic')}
          >
            Basic
          </button>
          <button
            type="button"
            className={`${styles.viewSwitchBtn} ${viewMode === 'advance' ? styles.viewSwitchBtnActive : ''}`}
            onClick={() => setViewMode('advance')}
          >
            Advance
          </button>
        </div>
        {viewMode === 'basic' ? (
          <button
            type="button"
            className={styles.generateSceneBtn}
            onClick={() => setImageGateOpen(true)}
            disabled={imageGateOpen || listLoading || basicShotsLoading}
          >
            Generate scene
          </button>
        ) : null}
        <button
          type="button"
          className={styles.shareBtn}
          onClick={() => setShareOpen(true)}
        >
          <IconShare />
          Share
        </button>
        <StoryboardEditMenu projectId={projectId} />
      </div>
      <RegenerateStoryboardBanner
        projectId={projectId}
        regenerating={regenerating}
        onRegenerate={() => executeStoryboardPipeline({ force: true })}
      />
      {error ? (
        <div className={styles.errorBox} role="alert">
          {error}
        </div>
      ) : null}

      {viewMode === 'basic' ? (
        <StoryboardBasicView
          scenes={storyboardScenes}
          shotsBySceneId={basicShotsBySceneId}
          loading={listLoading || basicShotsLoading}
          generatingShotId={generatingShotId}
          onFullscreenShot={handleOpenFullscreen}
          onRegenerateShot={handleOpenRegenerate}
        />
      ) : (
        <>
          <div className={styles.mobileTabs} role="tablist" aria-label="Storyboard panels">
            <button
              type="button"
              role="tab"
              aria-selected={mobilePanel === 'scenes'}
              className={`${styles.mobileTab} ${mobilePanel === 'scenes' ? styles.mobileTabActive : ''}`}
              onClick={() => setMobilePanel('scenes')}
            >
              Scenes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobilePanel === 'shots'}
              className={`${styles.mobileTab} ${mobilePanel === 'shots' ? styles.mobileTabActive : ''}`}
              onClick={() => setMobilePanel('shots')}
            >
              Shots
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobilePanel === 'inspector'}
              className={`${styles.mobileTab} ${mobilePanel === 'inspector' ? styles.mobileTabActive : ''}`}
              onClick={() => setMobilePanel('inspector')}
              disabled={!selectedShot}
            >
              Inspector
            </button>
          </div>

          <div className={workspaceClassName}>
            <StoryboardWorkspaceSceneList
              scenes={storyboardScenes}
              selectedSceneId={selectedSceneId}
              loading={listLoading}
              onSelectScene={handleSelectScene}
              onAddScene={handleAddScene}
              addingScene={addingScene}
            />

            <StoryboardShotsPanel
              scene={selectedScene}
              shots={storyboardShots}
              selectedShotId={selectedShotId}
              sceneLoading={sceneLoading}
              generationActive={generationActive}
              generationStarting={starting}
              generationError={generationError}
              generatingShotId={generatingShotId}
              addingShot={addingShot}
              onGenerateShots={handleGenerateShots}
              onSelectShot={handleSelectShot}
              onGenerateImage={handleGenerateShotImage}
              onAddShot={handleAddShot}
              onDuplicateShot={handleDuplicateShot}
              onDeleteShot={handleDeleteShot}
              onMoveShot={handleMoveShot}
              imageGenerationError={imageGenerationError}
              imageGenerationActive={imageGenerationActive}
              onGenerateAllImages={handleGenerateAllImages}
              onFullscreenShot={handleOpenFullscreen}
              onRegenerateShot={handleOpenRegenerate}
            />

            <StoryboardShotEditor
              shot={selectedShot}
              projectCharacters={characters}
              projectEnvironments={environments}
              saving={shotSaving}
              generatingImage={Boolean(
                selectedShot?.apiId && String(generatingShotId) === String(selectedShot.apiId)
              )}
              saveError={shotSaveError}
              saveMessage={shotSaveMessage}
              onSave={handleSaveShot}
              onGenerateImage={handleGenerateShotImage}
            />
          </div>
        </>
      )}

      <StoryboardImageGateModal
        open={imageGateOpen}
        projectId={projectId}
        scenes={storyboardScenes}
        onCharacterUpdated={handleImageGateCharacter}
        onShotUpdated={handleImageGateShot}
        onClose={() => setImageGateOpen(false)}
      />

      <ShotFullscreenViewer
        open={fullscreenIndex != null && lightboxItems.length > 0}
        items={lightboxItems}
        index={Math.min(fullscreenIndex ?? 0, Math.max(lightboxItems.length - 1, 0))}
        onIndexChange={setFullscreenIndex}
        onClose={() => setFullscreenIndex(null)}
        regenerating={Boolean(
          generatingShotId &&
            String(lightboxItems[Math.min(fullscreenIndex ?? 0, Math.max(lightboxItems.length - 1, 0))]?.shot?.apiId) ===
              String(generatingShotId)
        )}
        regenerateError={regenerateShot ? null : regenerateError}
        onRegenerate={runShotRegenerate}
      />

      <ShareStoryboardModal
        open={shareOpen}
        projectId={projectId}
        projectTitle={project?.name || 'Storyboard'}
        onClose={() => setShareOpen(false)}
      />

      <ShotRegenerateModal
        open={Boolean(regenerateShot)}
        shot={regenerateShot}
        sceneLabel={regenerateSceneLabel}
        submitting={
          Boolean(regenerateShot?.apiId && String(generatingShotId) === String(regenerateShot.apiId))
        }
        error={regenerateError}
        onClose={handleCloseRegenerate}
        onSubmit={handleRegenerateShot}
      />

      <DebugPanel
        pageName="Storyboard"
        loading={listLoading || sceneLoading}
        dataCount={storyboardScenes.length}
        requestTriggered={requestTriggered}
      />
    </div>
  )
}
