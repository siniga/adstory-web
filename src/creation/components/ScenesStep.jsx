import { useCallback, useEffect, useMemo, useState } from 'react'
import ErrorModal from '../../app/components/ErrorModal'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import useSceneGeneration from '../hooks/useSceneGeneration'
import {
  SCENE_STATUS,
  allScenesCompleted,
  allScenesFinished,
  getSceneStatusLabel,
  hasFailedScenes,
  isSceneEditable,
  isSceneFailed,
  isSceneGenerationInProgress,
  mergeProgressScenes,
  normalizeSceneGenerationProgress,
} from '../sceneGenerationStatus'
import { getWorkspaceQuestion } from '../creationData'
import CreationFullscreenReader from './CreationFullscreenReader'
import readerStyles from './CreationFullscreenReader.module.css'
import SceneGenerationProgress from './SceneGenerationProgress'
import StepHeader from './StepHeader'
import styles from './StepLayout.module.css'

function parseCharacters(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatCharacters(characters = []) {
  return characters.join(', ')
}

function updateScene(scenes, sceneId, patch) {
  return scenes.map((scene) => (scene.id === sceneId ? { ...scene, ...patch } : scene))
}

function sceneStatusClass(status) {
  switch (status) {
    case SCENE_STATUS.COMPLETED:
      return styles.sceneStatusCompleted
    case SCENE_STATUS.FAILED:
      return styles.sceneStatusFailed
    case SCENE_STATUS.GENERATING:
      return styles.sceneStatusGenerating
    case SCENE_STATUS.QUEUED:
      return styles.sceneStatusQueued
    default:
      return styles.sceneStatusPending
  }
}

function SceneInspector({ scene, sceneIndex, total, editable, onChange }) {
  if (!scene) {
    return (
      <aside className={styles.inspector}>
        <p className={styles.fieldHint}>Select a scene to edit details.</p>
      </aside>
    )
  }

  if (!editable) {
    return (
      <aside className={styles.inspector}>
        <div className={styles.inspectorHeader}>
          <h2 className={styles.inspectorTitle}>Inspector</h2>
          <span className={styles.inspectorIndex}>
            SCENE {sceneIndex + 1} OF {total}
          </span>
        </div>
        <p className={styles.fieldHint}>
          {scene.status === SCENE_STATUS.FAILED
            ? 'This scene failed to generate. Retry it or continue with other scenes.'
            : 'Scene details will be editable once generation completes.'}
        </p>
        {scene.generation_error ? (
          <p className={styles.sceneErrorText}>{scene.generation_error}</p>
        ) : null}
      </aside>
    )
  }

  return (
    <aside className={styles.inspector}>
      <div className={styles.inspectorHeader}>
        <h2 className={styles.inspectorTitle}>Inspector</h2>
        <span className={styles.inspectorIndex}>
          SCENE {sceneIndex + 1} OF {total}
        </span>
      </div>
      <div className={styles.inspectorBody}>
        <div className={styles.sceneField}>
          <label className={styles.sceneFieldLabel} htmlFor={`scene-${scene.id}-title`}>
            Title
          </label>
          <input
            id={`scene-${scene.id}-title`}
            className={styles.sceneFieldInput}
            value={scene.title}
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </div>
        <div className={styles.sceneFieldRow}>
          <div className={styles.sceneField}>
            <label className={styles.sceneFieldLabel} htmlFor={`scene-${scene.id}-location`}>
              Location
            </label>
            <input
              id={`scene-${scene.id}-location`}
              className={styles.sceneFieldInput}
              value={scene.location}
              onChange={(event) => onChange({ location: event.target.value })}
            />
          </div>
          <div className={styles.sceneField}>
            <label className={styles.sceneFieldLabel} htmlFor={`scene-${scene.id}-time`}>
              Time of day
            </label>
            <input
              id={`scene-${scene.id}-time`}
              className={styles.sceneFieldInput}
              value={scene.time_of_day ?? ''}
              onChange={(event) => onChange({ time_of_day: event.target.value })}
            />
          </div>
        </div>
        <div className={styles.sceneField}>
          <label className={styles.sceneFieldLabel} htmlFor={`scene-${scene.id}-description`}>
            Description
          </label>
          <textarea
            id={`scene-${scene.id}-description`}
            className={styles.sceneFieldTextarea}
            value={scene.description}
            onChange={(event) => onChange({ description: event.target.value })}
            rows={4}
          />
        </div>
        <div className={styles.sceneFieldRow}>
          <div className={styles.sceneField}>
            <label className={styles.sceneFieldLabel} htmlFor={`scene-${scene.id}-mood`}>
              Mood
            </label>
            <input
              id={`scene-${scene.id}-mood`}
              className={styles.sceneFieldInput}
              value={scene.mood}
              onChange={(event) => onChange({ mood: event.target.value })}
            />
          </div>
          <div className={styles.sceneField}>
            <label className={styles.sceneFieldLabel} htmlFor={`scene-${scene.id}-environment`}>
              Environment
            </label>
            <input
              id={`scene-${scene.id}-environment`}
              className={styles.sceneFieldInput}
              value={scene.environment ?? ''}
              onChange={(event) => onChange({ environment: event.target.value })}
            />
          </div>
        </div>
        <div className={styles.sceneField}>
          <label className={styles.sceneFieldLabel} htmlFor={`scene-${scene.id}-characters`}>
            Characters
          </label>
          <input
            id={`scene-${scene.id}-characters`}
            className={styles.sceneFieldInput}
            value={formatCharacters(scene.characters)}
            onChange={(event) => onChange({ characters: parseCharacters(event.target.value) })}
            placeholder="Comma-separated names"
          />
        </div>
      </div>
    </aside>
  )
}

export default function ScenesStep({
  projectId,
  scenes = [],
  fallbackScenes = [],
  sceneGenerationStatus = null,
  sceneGenerationStartedAt = null,
  refreshFullProject,
  error,
  onScenesChange,
  onGenerationMetaChange,
  onActionChange,
  onBackToScreenplay,
  onContinueToShots,
  onSave,
  generating,
  loading = false,
  saveStatus = 'idle',
  saveError,
}) {
  const [items, setItems] = useState(scenes)
  const [selectedId, setSelectedId] = useState(null)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [continueWithFailed, setContinueWithFailed] = useState(false)
  const [errorModal, setErrorModal] = useState(null)

  const isSaving = saveStatus === 'saving'
  const saveStatusLabel =
    saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : null

  const handleGenerationError = useCallback((formatted) => {
    setErrorModal(formatted)
  }, [])

  const updateItems = useCallback(
    (updater) => {
      setItems((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater
        onScenesChange?.(next)
        return next
      })
    },
    [onScenesChange]
  )

  const {
    progress,
    monitoring,
    retryingSceneId,
    isStuck,
    resuming,
    handleRetryScene,
    handleResumeGeneration,
  } = useSceneGeneration({
    enabled: Boolean(projectId) && !loading,
    projectId,
    initialStatus: sceneGenerationStatus,
    initialStartedAt: sceneGenerationStartedAt,
    scenes: items,
    fallbackScenes,
    refreshFullProject,
    onScenesChange: updateItems,
    onGenerationMetaChange,
    onError: handleGenerationError,
  })

  useEffect(() => {
    if (!scenes.length) return
    setItems((current) => mergeProgressScenes(current, scenes))
  }, [scenes])

  useEffect(() => {
    if (!selectedId && items.length) setSelectedId(items[0].id)
    else if (selectedId && !items.find((s) => s.id === selectedId) && items.length) {
      setSelectedId(items[0].id)
    }
  }, [items, selectedId])

  const allCompleted = allScenesCompleted(items)
  const allFinished = allScenesFinished(items)
  const failedPresent = hasFailedScenes(items)
  const generationActive =
    !allFinished &&
    (monitoring ||
      Boolean(resuming) ||
      isSceneGenerationInProgress(sceneGenerationStatus) ||
      isSceneGenerationInProgress(progress?.status))
  const canContinue = allCompleted || (continueWithFailed && !generationActive && items.length > 0)

  const fallbackProgress = useMemo(() => {
    const baseProgress =
      progress ??
      (sceneGenerationStatus || items.length > 0
        ? {
            status: sceneGenerationStatus ?? null,
            total: items.length,
            completed: items.filter((scene) => scene.status === SCENE_STATUS.COMPLETED).length,
            failed: items.filter((scene) => isSceneFailed(scene)).length,
            currentScene: null,
          }
        : null)

    if (!baseProgress) return null

    return normalizeSceneGenerationProgress(baseProgress, items)
  }, [items, progress, sceneGenerationStatus])

  const handleSave = async () => {
    await onSave?.(items)
  }

  useEffect(() => {
    if (!onActionChange) {
      return undefined
    }

    onActionChange({
      label: 'Continue to Shots',
      generatingLabel: 'Generating Shots...',
      secondaryAction: {
        label: 'Back to Screenplay',
        onClick: onBackToScreenplay,
        disabled: generating || isSaving || generationActive,
      },
      disabled: !canContinue || generating || isSaving || generationActive,
      onClick: () => onContinueToShots({ allowFailed: continueWithFailed }),
    })

    return () => onActionChange(null)
  }, [
    canContinue,
    generating,
    generationActive,
    isSaving,
    items,
    onActionChange,
    onBackToScreenplay,
    onContinueToShots,
  ])

  const selectedScene = items.find((s) => s.id === selectedId) ?? null
  const selectedIndex = items.findIndex((s) => s.id === selectedId)
  const selectedEditable = isSceneEditable(selectedScene)

  const subtitle = useMemo(() => {
    if (generationActive) {
      return 'Scenes are being generated automatically. Completed scenes can be edited right away.'
    }
    if (items.length > 0) {
      return `${items.length} scenes · Beat by beat, what happens in your film.`
    }
    return 'Scene generation will start automatically.'
  }, [generationActive, items.length])

  const renderSceneCard = (scene) => {
    const displayStatus =
      scene.status ??
      (isSceneFailed(scene) ? SCENE_STATUS.FAILED : SCENE_STATUS.PENDING)
    const isSelected = scene.id === selectedId
    const isGenerating = displayStatus === SCENE_STATUS.GENERATING
    const isRetrying = String(retryingSceneId) === String(scene.apiId)
    const recoveryBusy = Boolean(retryingSceneId || resuming)

    return (
      <article
        key={scene.id}
        className={`${styles.sceneIndexCardWrap} ${isSelected ? styles.sceneIndexCardWrapSelected : ''} ${isGenerating ? styles.sceneIndexCardGenerating : ''}`}
      >
        <button
          type="button"
          className={`${styles.sceneIndexCard} ${isSelected ? styles.sceneIndexCardSelected : ''}`}
          onClick={() => setSelectedId(scene.id)}
        >
          <div
            className={styles.sceneIndexThumb}
            style={{ background: scene.thumbGradient }}
            aria-hidden="true"
          />
          <div className={styles.sceneIndexCardBody}>
            <div className={styles.sceneIndexCardTop}>
              <h3 className={styles.sceneIndexTitle}>
                {scene.title?.trim() || `Scene ${scene.scene_number ?? scene.id}`}
              </h3>
              {displayStatus ? (
                <span
                  className={`${styles.sceneStatusBadge} ${sceneStatusClass(displayStatus)}`}
                >
                  {getSceneStatusLabel(displayStatus)}
                </span>
              ) : null}
            </div>
            <p className={styles.sceneIndexMeta}>
              {scene.location || 'Location TBD'}
              {scene.time_of_day ? ` · ${scene.time_of_day}` : ''}
            </p>
            {scene.mood ? <span className={styles.metaTag}>{scene.mood}</span> : null}
          </div>
        </button>
        {displayStatus === SCENE_STATUS.FAILED || isSceneFailed(scene) ? (
          <button
            type="button"
            className={styles.sceneRetryBtn}
            onClick={(event) => {
              event.stopPropagation()
              handleRetryScene(scene)
            }}
            disabled={recoveryBusy}
          >
            {isRetrying ? 'Retrying…' : 'Retry Scene'}
          </button>
        ) : null}
      </article>
    )
  }

  const scenesGrid = (
    <div className={styles.sceneIndexGrid}>
      {items.length ? (
        items.map(renderSceneCard)
      ) : generationActive ? (
        <p className={styles.fieldHint}>Planning your scenes…</p>
      ) : (
        <p className={styles.fieldHint}>No scenes yet.</p>
      )}
    </div>
  )

  return (
    <div className={styles.step}>
      <StepHeader
        stepNumber={4}
        title="Scenes"
        question={getWorkspaceQuestion('scenes')}
        subtitle={subtitle}
        onFullscreen={() => setFullscreenOpen(true)}
      />

      <SceneGenerationProgress
        progress={fallbackProgress}
        startedAt={sceneGenerationStartedAt ?? progress?.project?.scene_generation_started_at}
        isStuck={isStuck}
        resuming={resuming}
        onResume={() => handleResumeGeneration(false)}
        onRetryFailedAndResume={() => handleResumeGeneration(true)}
      />

      {loading ? (
        <p className={styles.generationStatus} role="status">
          Loading saved scenes...
        </p>
      ) : null}

      {failedPresent && !generationActive && !allCompleted ? (
        <div className={styles.continueWithFailedRow}>
          <label className={styles.continueWithFailedLabel}>
            <input
              type="checkbox"
              checked={continueWithFailed}
              onChange={(event) => setContinueWithFailed(event.target.checked)}
            />
            Continue with failed scenes
          </label>
        </div>
      ) : null}

      <div className={styles.toolbarRow}>
        <button
          type="button"
          className={`${styles.secondaryBtnActive} ${styles.toolbarBtn}`}
          onClick={handleSave}
          disabled={generating || isSaving || generationActive || items.length === 0}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        {saveStatusLabel ? (
          <span className={styles.saveStatusInline} role="status">
            {saveStatusLabel}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className={styles.inlineErrorBox} role="alert">
          {error}
        </div>
      ) : saveError ? (
        <div className={styles.inlineErrorBox} role="alert">
          {saveError}
        </div>
      ) : null}

      <div className={styles.workspaceSplit}>
        <div className={styles.workspaceMain}>{scenesGrid}</div>
        <SceneInspector
          scene={selectedScene}
          sceneIndex={selectedIndex >= 0 ? selectedIndex : 0}
          total={items.length}
          editable={selectedEditable}
          onChange={(patch) => {
            if (!selectedScene || !selectedEditable) return
            updateItems((current) => updateScene(current, selectedScene.id, patch))
          }}
        />
      </div>

      <CreationFullscreenReader
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        eyebrow="Scenes"
        title="Scenes"
        subtitle={subtitle}
      >
        <div className={readerStyles.scrollContent}>{scenesGrid}</div>
      </CreationFullscreenReader>

      <ErrorModal
        open={Boolean(errorModal)}
        title={errorModal?.title ?? 'Something went wrong'}
        message={errorModal?.message ?? ''}
        onClose={() => setErrorModal(null)}
      />
    </div>
  )
}
