import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createProjectScene,
  deleteProjectScene,
  getProjectSceneboard,
  updateProjectScene,
} from '../../../services/adstoryApi'
import { formatUserFriendlyError } from '../../../utils/userFriendlyErrors'
import { useProjectStore } from '../../../project/ProjectStoreContext'
import useSceneboardSceneGeneration from '../../hooks/useSceneboardSceneGeneration'
import {
  areSceneboardScenesGenerationSettled,
  findNearestSceneAfterDelete,
  mergeSceneInList,
  mergeSceneboardSceneLists,
} from '../../sceneboardStatus'
import SceneboardSceneGenerationProgress from './SceneboardSceneGenerationProgress'
import SceneDeleteModal from './SceneDeleteModal'
import SceneEditModal from './SceneEditModal'
import SceneInfoSidebar from './SceneInfoSidebar'
import SceneListSidebar from './SceneListSidebar'
import styles from './Sceneboard.module.css'

function getSceneKey(scene) {
  const key = scene?.apiId ?? scene?.id
  return key != null ? key : null
}

function sortScenesForDisplay(sceneList = []) {
  return [...sceneList].sort(
    (a, b) =>
      (a.order_index ?? 0) - (b.order_index ?? 0) ||
      Number(a.scene_number ?? 0) - Number(b.scene_number ?? 0)
  )
}

function pickDefaultSceneId(sceneList = []) {
  const first = sortScenesForDisplay(sceneList).find((scene) => getSceneKey(scene) != null)
  return first ? getSceneKey(first) : null
}

function findSceneById(scenes, sceneId) {
  if (sceneId == null) return null
  return (
    scenes.find(
      (scene) =>
        String(scene.apiId) === String(sceneId) || String(scene.id) === String(sceneId)
    ) ?? null
  )
}

export default function SceneboardStep({
  projectId,
  screenplay = '',
  sceneGenerationStatus = null,
  sceneGenerationStartedAt = null,
  onBack,
  onContinueToCharacters,
  onGenerationMetaChange,
  loading = false,
}) {
  const {
    scenes,
    setScenes,
    loadSceneboard: loadSceneboardFromStore,
    loadProject,
  } = useProjectStore()

  console.log('Sceneboard page rendering:', scenes.length)

  const [selectedSceneId, setSelectedSceneId] = useState(null)
  const [loadingSceneboard, setLoadingSceneboard] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [error, setError] = useState(null)
  const [continuing, setContinuing] = useState(false)
  const [editModal, setEditModal] = useState({
    open: false,
    mode: 'edit',
    scene: null,
    addPosition: 'end',
    referenceSceneId: null,
  })
  const [deleteModal, setDeleteModal] = useState({ open: false, scene: null })
  const [sceneModalSaving, setSceneModalSaving] = useState(false)
  const [sceneModalError, setSceneModalError] = useState(null)
  const [sceneDeleting, setSceneDeleting] = useState(false)
  const [sceneDeleteError, setSceneDeleteError] = useState(null)
  const scenesExistedAtLoadRef = useRef(false)
  const projectIdRef = useRef(projectId)
  const sceneboardLoadKeyRef = useRef(null)

  const selectedScene = useMemo(
    () => (selectedSceneId ? findSceneById(scenes, selectedSceneId) : null),
    [scenes, selectedSceneId]
  )

  useEffect(() => {
    if (!projectId) return undefined

    const loadKey = `${projectId}:sceneboard`
    if (sceneboardLoadKeyRef.current === loadKey) {
      return undefined
    }
    sceneboardLoadKeyRef.current = loadKey

    let cancelled = false

    const initialize = async () => {
      setLoadingSceneboard(true)
      setError(null)

      try {
        const loaded = await loadSceneboardFromStore(projectId)
        if (cancelled) return

        if (loaded.length > 0) {
          scenesExistedAtLoadRef.current = true
        }

        setInitialLoadDone(true)
      } catch (err) {
        if (!cancelled) {
          setError(
            formatUserFriendlyError(
              err instanceof Error ? err.message : 'Failed to load sceneboard'
            ).message
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingSceneboard(false)
        }
      }
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [loadSceneboardFromStore, projectId])

  useEffect(() => {
    if (projectIdRef.current !== projectId) {
      projectIdRef.current = projectId
      sceneboardLoadKeyRef.current = null
      setInitialLoadDone(false)
      scenesExistedAtLoadRef.current = false
      setSelectedSceneId(null)
      setLoadingSceneboard(true)
    }
  }, [projectId])

  const reloadSceneList = useCallback(async () => {
    if (!projectId) return []

    try {
      const result = await getProjectSceneboard(projectId)
      const freshScenes = result.scenes ?? []
      setScenes((previous) => mergeSceneboardSceneLists(freshScenes, previous))
      return freshScenes
    } catch (err) {
      const message = formatUserFriendlyError(
        err instanceof Error ? err.message : 'Failed to reload sceneboard'
      ).message
      setError(message)
      return []
    }
  }, [projectId, setScenes])

  const reloadSceneboardAuthoritative = useCallback(async () => {
    if (!projectId) return []

    try {
      return await loadSceneboardFromStore(projectId)
    } catch (err) {
      const message = formatUserFriendlyError(
        err instanceof Error ? err.message : 'Failed to reload sceneboard'
      ).message
      setError(message)
      return []
    }
  }, [loadSceneboardFromStore, projectId])

  const loadProjectOnComplete = useCallback(
    () => loadProject(projectId, { force: true, reason: 'scene generation complete' }),
    [loadProject, projectId]
  )

  useEffect(() => {
    if (!scenes.length) return

    const hasValidSelection =
      selectedSceneId != null && findSceneById(scenes, selectedSceneId) != null

    if (!hasValidSelection) {
      const nextSceneId = pickDefaultSceneId(scenes)
      if (nextSceneId != null) {
        setSelectedSceneId(nextSceneId)
      }
    }
  }, [scenes, selectedSceneId])

  const handleSceneListFromGeneration = useCallback(
    (nextScenes) => {
      setScenes(nextScenes)
    },
    [setScenes]
  )

  const handleSceneGenerationComplete = useCallback(async (loadedScenes) => {
    if (!loadedScenes.length) {
      await reloadSceneboardAuthoritative()
    }
  }, [reloadSceneboardAuthoritative])

  const {
    sceneGenerationActive,
    sceneGenerationFailed,
  } = useSceneboardSceneGeneration({
    enabled: Boolean(projectId) && initialLoadDone,
    projectId,
    screenplay,
    initialStatus: sceneGenerationStatus,
    initialStartedAt: sceneGenerationStartedAt,
    scenes,
    loadProjectOnComplete,
    reloadSceneboard: reloadSceneboardAuthoritative,
    onScenesChange: handleSceneListFromGeneration,
    onGenerationMetaChange,
    onGenerationComplete: handleSceneGenerationComplete,
    onError: (formatted) => {
      setError(formatted?.message ?? formatted ?? 'Scene generation failed')
    },
  })

  const hasScreenplay = Boolean(screenplay?.trim())

  const handleSelectScene = useCallback(
    (sceneId) => {
      if (!sceneId || String(sceneId) === String(selectedSceneId)) return
      setSelectedSceneId(sceneId)
    },
    [selectedSceneId]
  )

  const handleContinue = async () => {
    setContinuing(true)
    setError(null)
    try {
      await onContinueToCharacters?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue')
    } finally {
      setContinuing(false)
    }
  }

  const openEditScene = useCallback((scene) => {
    setSceneModalError(null)
    setEditModal({
      open: true,
      mode: 'edit',
      scene,
      addPosition: 'end',
      referenceSceneId: null,
    })
  }, [])

  const openAddScene = useCallback((position, referenceScene = null) => {
    setSceneModalError(null)
    setEditModal({
      open: true,
      mode: 'add',
      scene: referenceScene,
      addPosition: position,
      referenceSceneId: referenceScene?.apiId ?? null,
    })
  }, [])

  const closeEditModal = useCallback(() => {
    if (sceneModalSaving) return
    setEditModal({
      open: false,
      mode: 'edit',
      scene: null,
      addPosition: 'end',
      referenceSceneId: null,
    })
    setSceneModalError(null)
  }, [sceneModalSaving])

  const openDeleteScene = useCallback((scene) => {
    setSceneDeleteError(null)
    setDeleteModal({ open: true, scene })
  }, [])

  const closeDeleteModal = useCallback(() => {
    if (sceneDeleting) return
    setDeleteModal({ open: false, scene: null })
    setSceneDeleteError(null)
  }, [sceneDeleting])

  const handleSaveScene = useCallback(
    async (form) => {
      if (!projectId) return

      setSceneModalSaving(true)
      setSceneModalError(null)

      try {
        if (editModal.mode === 'edit') {
          const sceneId = editModal.scene?.apiId
          if (!sceneId) throw new Error('Scene id is required.')

          const saved = await updateProjectScene(projectId, sceneId, form)

          setScenes((current) => mergeSceneInList(current, saved))

          closeEditModal()
          return
        }

        const created = await createProjectScene(projectId, {
          ...form,
          position: editModal.addPosition,
          reference_scene_id:
            editModal.addPosition === 'end' ? undefined : editModal.referenceSceneId,
        })

        if (!created?.apiId) {
          throw new Error('Scene was created but no id was returned.')
        }

        await reloadSceneList()
        setSelectedSceneId(created.apiId)
        closeEditModal()
      } catch (err) {
        setSceneModalError(
          formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to save scene'
          ).message
        )
      } finally {
        setSceneModalSaving(false)
      }
    },
    [
      closeEditModal,
      editModal.addPosition,
      editModal.mode,
      editModal.referenceSceneId,
      editModal.scene,
      projectId,
      reloadSceneList,
      setScenes,
    ]
  )

  const handleConfirmDeleteScene = useCallback(async () => {
    const scene = deleteModal.scene
    if (!projectId || !scene?.apiId) return

    const hasShots = (scene.shotCount ?? 0) > 0

    setSceneDeleting(true)
    setSceneDeleteError(null)

    try {
      const oldScenes = scenes
      await deleteProjectScene(projectId, scene.apiId, { force: hasShots })
      const remaining = await reloadSceneList()
      const nearestSceneId = findNearestSceneAfterDelete(remaining, oldScenes, scene.apiId)

      closeDeleteModal()

      if (nearestSceneId) {
        setSelectedSceneId(nearestSceneId)
      } else {
        setSelectedSceneId(null)
      }
    } catch (err) {
      setSceneDeleteError(
        formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to delete scene'
        ).message
      )
    } finally {
      setSceneDeleting(false)
    }
  }, [
    closeDeleteModal,
    deleteModal.scene,
    projectId,
    reloadSceneList,
    scenes,
  ])

  const sceneboardReady = scenes.length > 0
  const scenesGenerationSettled = areSceneboardScenesGenerationSettled(scenes)
  const canContinueToCharacters =
    sceneboardReady && (!sceneGenerationActive || scenesGenerationSettled)
  const showManualAddSceneEmpty =
    initialLoadDone &&
    !loadingSceneboard &&
    !scenes.length &&
    (!hasScreenplay || sceneGenerationFailed) &&
    !sceneGenerationActive
  const showSceneGenerationPanel =
    !scenesExistedAtLoadRef.current &&
    hasScreenplay &&
    sceneGenerationActive &&
    !sceneGenerationFailed &&
    scenes.length === 0
  const deleteModalHasShots = (deleteModal.scene?.shotCount ?? 0) > 0

  return (
    <div className={styles.page}>
      <div className={styles.workspace}>
        <SceneListSidebar
          scenes={scenes}
          selectedSceneId={selectedSceneId}
          sceneGenerationActive={sceneGenerationActive}
          onSelectScene={handleSelectScene}
          onAddSceneAtEnd={() => openAddScene('end')}
          onEditScene={openEditScene}
          onAddSceneBefore={(scene) => openAddScene('before', scene)}
          onAddSceneAfter={(scene) => openAddScene('after', scene)}
          onDeleteScene={openDeleteScene}
        />

        <main className={styles.center}>
          {error ? (
            <div className={styles.errorBox} role="alert">
              {error}
            </div>
          ) : null}

          {!initialLoadDone || loadingSceneboard || loading ? (
            <p className={styles.loadingMessage} role="status">
              Loading sceneboard…
            </p>
          ) : null}

          {showSceneGenerationPanel ? <SceneboardSceneGenerationProgress /> : null}

          {selectedScene ? (
            <>
              <header className={styles.centerHeader}>
                <p className={styles.sceneNumber}>
                  Scene {selectedScene.scene_number ?? '—'}
                </p>
                <h1 className={styles.sceneTitle}>
                  {selectedScene.title || 'Untitled scene'}
                </h1>
                <div className={styles.metaRow}>
                  {selectedScene.location ? (
                    <span className={styles.metaItem}>
                      <span className={styles.metaLabel}>Location</span>
                      {selectedScene.location}
                    </span>
                  ) : null}
                  {selectedScene.time_of_day ? (
                    <span className={styles.metaItem}>
                      <span className={styles.metaLabel}>Time of Day</span>
                      {selectedScene.time_of_day}
                    </span>
                  ) : null}
                  {selectedScene.mood ? (
                    <span className={styles.metaItem}>
                      <span className={styles.metaLabel}>Mood</span>
                      {selectedScene.mood}
                    </span>
                  ) : null}
                </div>
                {selectedScene.description ? (
                  <p className={styles.sceneDescription}>{selectedScene.description}</p>
                ) : null}

                <div className={styles.sceneActions}>
                  <button
                    type="button"
                    className={styles.sceneActionBtn}
                    onClick={() => openEditScene(selectedScene)}
                  >
                    Edit Scene
                  </button>
                  <button
                    type="button"
                    className={styles.sceneActionBtn}
                    onClick={() => openAddScene('after', selectedScene)}
                  >
                    Add Scene After
                  </button>
                  <button
                    type="button"
                    className={`${styles.sceneActionBtn} ${styles.sceneActionBtnDanger}`}
                    onClick={() => openDeleteScene(selectedScene)}
                  >
                    Delete Scene
                  </button>
                </div>
              </header>
            </>
          ) : null}

          {showManualAddSceneEmpty ? (
            <div>
              <p className={styles.loadingMessage}>
                {hasScreenplay
                  ? 'Scene generation did not produce any scenes. Add a scene manually to continue.'
                  : 'Write a screenplay first, or add a scene manually to start building your sceneboard.'}
              </p>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => openAddScene('end')}
              >
                Add Scene
              </button>
            </div>
          ) : null}
        </main>

        <SceneInfoSidebar scene={selectedScene} />
      </div>

      <footer className={styles.footer}>
        <button type="button" className={`${styles.footerBtn} ${styles.footerBack}`} onClick={onBack}>
          Back to Screenplay
        </button>
        <button
          type="button"
          className={`${styles.footerBtn} ${styles.footerContinue}`}
          onClick={handleContinue}
          disabled={!canContinueToCharacters || continuing}
        >
          {continuing ? 'Continuing…' : 'Continue to Characters'}
        </button>
      </footer>

      <SceneEditModal
        open={editModal.open}
        mode={editModal.mode}
        scene={editModal.scene}
        addPosition={editModal.addPosition}
        saving={sceneModalSaving}
        error={sceneModalError}
        onClose={closeEditModal}
        onSave={handleSaveScene}
      />

      <SceneDeleteModal
        open={deleteModal.open}
        scene={deleteModal.scene}
        hasShots={deleteModalHasShots}
        deleting={sceneDeleting}
        error={sceneDeleteError}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDeleteScene}
      />
    </div>
  )
}
