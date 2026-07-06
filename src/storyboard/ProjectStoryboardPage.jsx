import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getVisualStyleLabel } from '../config/visualStyles'
import { useProjectStore } from '../project/ProjectStoreContext'
import { formatUserFriendlyError } from '../utils/userFriendlyErrors'
import StoryboardShotsPanel from './components/StoryboardShotsPanel'
import StoryboardShotEditor from './components/StoryboardShotEditor'
import StoryboardWorkspaceSceneList from './components/StoryboardWorkspaceSceneList'
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
import styles from './ProjectStoryboard.module.css'
import shellStyles from '../app/ScreenlyAppShell.module.css'
import {
  applyShotImageApiResponse,
  createProjectScene,
  createProjectShot,
  deleteProjectShot,
  generateShotImage,
  updateProjectShot,
} from '../services/adstoryApi'

export default function ProjectStoryboardPage({ projectId }) {
  const {
    project,
    storyboardScenes,
    storyboardShots,
    selectedScene,
    selectedShot,
    characters,
    environments,
    loadStoryboard,
    loadStoryboardScene,
    loadCharacters,
    loadEnvironments,
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

  const selectedSceneId = selectedScene?.apiId ?? null
  const selectedShotId = selectedShot?.id ?? selectedShot?.apiId ?? null

  const storyboardLoadKeyRef = useRef(null)
  const sceneLoadCompletedRef = useRef(null)
  const sceneLoadInFlightRef = useRef(null)
  const assetsLoadKeyRef = useRef(null)
  const activeSceneIdRef = useRef(selectedSceneId)

  useEffect(() => {
    activeSceneIdRef.current = selectedSceneId
  }, [selectedSceneId])

  const visualStyle = useMemo(
    () => getVisualStyleLabel(project.visualStyle) || '',
    [project.visualStyle]
  )

  useEffect(() => {
    if (!projectId) return undefined

    const loadKey = `${projectId}:storyboard`
    if (storyboardLoadKeyRef.current === loadKey) {
      return undefined
    }
    storyboardLoadKeyRef.current = loadKey

    let cancelled = false
    setListLoading(true)
    setError(null)

    loadStoryboard(projectId)
      .then((scenes) => {
        if (cancelled) return
        if (scenes.length > 0) {
          setSelectedScene((current) => {
            if (
              current?.apiId != null &&
              scenes.some((scene) => String(scene.apiId) === String(current.apiId))
            ) {
              return current
            }
            return scenes[0]
          })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            formatUserFriendlyError(
              err instanceof Error ? err.message : 'Failed to load storyboard'
            ).message
          )
        }
      })
      .finally(() => {
        if (!cancelled) setListLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [loadStoryboard, projectId, setSelectedScene])

  useEffect(() => {
    if (!projectId) return undefined

    const loadKey = String(projectId)
    if (assetsLoadKeyRef.current === loadKey) {
      return undefined
    }

    const projectMatches = String(project.projectId) === loadKey
    const hasCharacters = projectMatches && characters.length > 0
    const hasEnvironments = projectMatches && environments.length > 0

    if (hasCharacters && hasEnvironments) {
      assetsLoadKeyRef.current = loadKey
      return undefined
    }

    assetsLoadKeyRef.current = loadKey

    if (!hasCharacters) {
      void loadCharacters(projectId)
    }
    if (!hasEnvironments) {
      void loadEnvironments(projectId)
    }

    return undefined
    // Load assets once per project; skip when store already has them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

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
        setStoryboardShots((previous) =>
          mergeSceneShotsFromLoader(previous, nextShots, requestSceneId)
        )
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
      setStoryboardShots((previous) => mergeSceneShotsFromLoader(previous, nextShots, sceneId))
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
    progress: imageGenerationProgress,
    starting: imageStarting,
    resuming: imageResuming,
    generationError: imageGenerationError,
    generationComplete: imageGenerationComplete,
    stalled: imageGenerationStalled,
    slowProgress: imageGenerationSlowProgress,
    imageGenerationActive,
    startGeneration: startImageGeneration,
    resumeGeneration: resumeImageGeneration,
    cancelGeneration: cancelImageGeneration,
    cancelling: imageCancelling,
    dismissSlowProgress: dismissSlowImageProgress,
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
    cancelGeneration: cancelShotGeneration,
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

  const handleGenerateShotImage = useCallback(
    async (shot) => {
      const target = shot ?? selectedShot
      if (!projectId || !target?.apiId || generatingShotId) return

      setGeneratingShotId(target.apiId)
      setShotSaveError(null)

      try {
        const result = await generateShotImage(projectId, target.apiId)
        const updated = applyShotImageApiResponse(target, result)

        setStoryboardShots((previous) =>
          previous.map((item) =>
            String(item.apiId) === String(updated.apiId)
              ? mergeShotPreservingImages(item, updated)
              : item
          )
        )
        setSelectedShot((previous) =>
          previous && String(previous.apiId) === String(updated.apiId)
            ? mergeShotPreservingImages(previous, updated)
            : previous
        )
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
    [generatingShotId, projectId, selectedShot, setSelectedShot, setStoryboardShots]
  )

  const workspaceClassName = [
    styles.workspace,
    mobilePanel === 'scenes' ? styles.workspaceScenesOpen : '',
    mobilePanel === 'shots' ? styles.workspaceShotsOpen : '',
    mobilePanel === 'inspector' ? styles.workspaceInspectorOpen : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`${shellStyles.paneActive} ${styles.page}`}>
      {error ? (
        <div className={styles.errorBox} role="alert">
          {error}
        </div>
      ) : null}

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
          generationCancelling={shotCancelling}
          generationError={generationError}
          progress={progress}
          generatingShotId={generatingShotId}
          addingShot={addingShot}
          onGenerateShots={handleGenerateShots}
          onCancelGeneration={cancelShotGeneration}
          onSelectShot={handleSelectShot}
          onGenerateImage={handleGenerateShotImage}
          onAddShot={handleAddShot}
          onDuplicateShot={handleDuplicateShot}
          onDeleteShot={handleDeleteShot}
          onMoveShot={handleMoveShot}
          imageGenerationProgress={imageGenerationProgress}
          imageGenerationStarting={imageStarting}
          imageGenerationResuming={imageResuming}
          imageGenerationActive={imageGenerationActive}
          imageGenerationComplete={imageGenerationComplete}
          imageGenerationStalled={imageGenerationStalled}
          imageGenerationSlowProgress={imageGenerationSlowProgress}
          imageGenerationError={imageGenerationError}
          onGenerateAllImages={handleGenerateAllImages}
          onResumeImageGeneration={resumeImageGeneration}
          onDismissSlowImageProgress={dismissSlowImageProgress}
          onCancelImageGeneration={cancelImageGeneration}
          imageGenerationCancelling={imageCancelling}
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
    </div>
  )
}
