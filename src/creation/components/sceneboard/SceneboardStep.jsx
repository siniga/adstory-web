import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DebugPanel from '../../../components/DebugPanel'
import {
  createProjectScene,
  deleteProjectScene,
  updateProjectScene,
} from '../../../services/adstoryApi'
import { formatUserFriendlyError } from '../../../utils/userFriendlyErrors'
import { useProjectStore } from '../../../project/ProjectStoreContext'
import useSceneboardSceneGeneration from '../../hooks/useSceneboardSceneGeneration'
import {
  findNearestSceneAfterDelete,
  mergeSceneInList,
} from '../../sceneboardStatus'
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

const sceneboardInitialLoadAt = new Map()

export default function SceneboardStep({
  projectId,
  screenplay = '',
  sceneGenerationStatus = null,
  sceneGenerationStartedAt = null,
  onBack,
  onContinue,
  onGenerationMetaChange,
  loading = false,
}) {
  const {
    scenes,
    setScenes,
    loadSceneboard: loadSceneboardFromStore,
  } = useProjectStore()

  const [selectedSceneId, setSelectedSceneId] = useState(null)
  const [loadingSceneboard, setLoadingSceneboard] = useState(() => scenes.length === 0)
  const [initialLoadDone, setInitialLoadDone] = useState(() => scenes.length > 0)
  const [error, setError] = useState(null)
  const [requestTriggered, setRequestTriggered] = useState(false)
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
  const scenesExistedAtLoadRef = useRef(scenes.length > 0)
  const projectIdRef = useRef(projectId)
  const scenesRef = useRef(scenes)

  useEffect(() => {
    scenesRef.current = scenes
  }, [scenes])

  const selectedScene = useMemo(
    () => (selectedSceneId ? findSceneById(scenes, selectedSceneId) : null),
    [scenes, selectedSceneId]
  )

  useEffect(() => {
    if (!projectId) return undefined

    const lastLoadAt = sceneboardInitialLoadAt.get(String(projectId)) ?? 0
    // Guard against remount storms (HMR / context invalidation) that re-fire this load
    // and starve start-generation on php artisan's single-threaded server.
    if (Date.now() - lastLoadAt < 4000 && scenesRef.current.length === 0) {
      setInitialLoadDone(true)
      setLoadingSceneboard(false)
      return undefined
    }

    let cancelled = false
    sceneboardInitialLoadAt.set(String(projectId), Date.now())

    const initialize = async () => {
      setRequestTriggered(true)
      if (scenesRef.current.length === 0) {
        setLoadingSceneboard(true)
      }
      setError(null)

      try {
        const loaded = await loadSceneboardFromStore(projectId)
        if (cancelled) return

        if (loaded.length > 0) {
          scenesExistedAtLoadRef.current = true
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            formatUserFriendlyError(
              err instanceof Error ? err.message : 'Failed to load sequences'
            ).message
          )
        }
      } finally {
        if (!cancelled) {
          setInitialLoadDone(true)
          setLoadingSceneboard(false)
        }
      }
    }

    initialize()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    if (scenes.length > 0) {
      setInitialLoadDone(true)
      setLoadingSceneboard(false)
      scenesExistedAtLoadRef.current = true
    }
  }, [scenes.length])

  useEffect(() => {
    if (projectIdRef.current !== projectId) {
      projectIdRef.current = projectId
      setInitialLoadDone(scenes.length > 0)
      scenesExistedAtLoadRef.current = scenes.length > 0
      setSelectedSceneId(null)
      setLoadingSceneboard(scenes.length === 0)
      setRequestTriggered(false)
    }
  }, [projectId, scenes.length])

  const reloadSceneList = useCallback(async () => {
    if (!projectId) return []

    try {
      const freshScenes = await loadSceneboardFromStore(projectId, { silent: true })
      return freshScenes ?? []
    } catch (err) {
      const message = formatUserFriendlyError(
        err instanceof Error ? err.message : 'Failed to reload sequences'
      ).message
      setError(message)
      return []
    }
  }, [projectId, loadSceneboardFromStore])

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

  const { sceneGenerationActive } = useSceneboardSceneGeneration({
    enabled: Boolean(projectId) && initialLoadDone,
    projectId,
    screenplay,
    initialStatus: sceneGenerationStatus,
    scenes,
    onError: (formatted) => {
      setError(formatted?.message ?? formatted ?? 'Sequence generation failed')
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

  const showManualAddSceneEmpty =
    initialLoadDone &&
    !loadingSceneboard &&
    !scenes.length &&
    !sceneGenerationActive
  const deleteModalHasShots = (deleteModal.scene?.shotCount ?? 0) > 0
  const hasSceneData = scenes.length > 0
  const showSceneboardLoading =
    !hasSceneData && (!initialLoadDone || loadingSceneboard)

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

          {showSceneboardLoading ? (
            <p className={styles.loadingMessage} role="status">
              Loading sequences…
            </p>
          ) : null}


          {selectedScene ? (
            <>
              <header className={styles.centerHeader}>
                <p className={styles.sceneNumber}>
                  Sequence {selectedScene.scene_number ?? '—'}
                </p>
                <h1 className={styles.sceneTitle}>
                  {selectedScene.title || 'Untitled sequence'}
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
                    Edit Sequence
                  </button>
                  <button
                    type="button"
                    className={styles.sceneActionBtn}
                    onClick={() => openAddScene('after', selectedScene)}
                  >
                    Add Sequence After
                  </button>
                  <button
                    type="button"
                    className={`${styles.sceneActionBtn} ${styles.sceneActionBtnDanger}`}
                    onClick={() => openDeleteScene(selectedScene)}
                  >
                    Delete Sequence
                  </button>
                </div>
              </header>
            </>
          ) : null}

          {showManualAddSceneEmpty ? (
            <div>
              <p className={styles.loadingMessage}>
                {hasScreenplay
                  ? 'Sequence generation did not produce any sequences. Add a sequence manually to continue.'
                  : 'Write a screenplay first, or add a sequence manually to start building your sequence board.'}
              </p>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => openAddScene('end')}
              >
                Add Sequence
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
        {onContinue && hasSceneData ? (
          <button type="button" className={`${styles.footerBtn} ${styles.footerContinue}`} onClick={onContinue}>
            Continue to characters
          </button>
        ) : null}
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

      <DebugPanel
        pageName="Sequences"
        loading={showSceneboardLoading}
        dataCount={scenes.length}
        requestTriggered={requestTriggered}
      />
    </div>
  )
}
