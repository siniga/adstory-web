import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  generateEnvironmentImage,
  getEnvironmentDbId,
  mergeAdstoryEnvironmentUpdate,
} from '../../services/adstoryApi'
import { getEnvironmentImageUrl } from '../../utils/resolveMediaUrl'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import ErrorModal from '../../app/components/ErrorModal'
import ImagePreviewModal from '../../app/components/ImagePreviewModal'
import AiGenerationProgress from './AiGenerationProgress'
import EnvironmentPlanningPanel from './EnvironmentPlanningPanel'
import useEnvironmentGeneration from '../hooks/useEnvironmentGeneration'
import { isGenerationInProgress } from '../aiGenerationStatus'
import {
  areEnvironmentsGenerationSettled,
  ENVIRONMENT_IMAGE_STATUS,
  getEnvironmentDisplayStatus,
  hasProjectEnvironments,
  isEnvironmentFailed,
  isEnvironmentGenerating,
  normalizeEnvironmentRecord,
} from '../environmentGenerationStatus'
import { useProjectStore } from '../../project/ProjectStoreContext'
import { getWorkspaceQuestion } from '../creationData'
import fieldStyles from './StepLayout.module.css'
import styles from './EnvironmentsStep.module.css'

const THUMB_GRADIENTS = [
  'linear-gradient(145deg, #1f2937 0%, #374151 100%)',
  'linear-gradient(145deg, #1e293b 0%, #334155 100%)',
  'linear-gradient(145deg, #312e81 0%, #4c1d95 100%)',
  'linear-gradient(145deg, #134e4a 0%, #0f766e 100%)',
]

function environmentHasImage(environment) {
  return Boolean(getEnvironmentImageUrl(environment))
}

function updateEnvironment(items, environmentId, patch) {
  return items.map((item) =>
    String(item.id) === String(environmentId) ? { ...item, ...patch } : item
  )
}

function statusClassName(status) {
  switch (status) {
    case ENVIRONMENT_IMAGE_STATUS.GENERATING:
    case ENVIRONMENT_IMAGE_STATUS.QUEUED:
      return styles.status_generating
    case ENVIRONMENT_IMAGE_STATUS.COMPLETED:
      return styles.status_generated
    case ENVIRONMENT_IMAGE_STATUS.FAILED:
      return styles.status_failed
    default:
      return styles.status_not_generated
  }
}

function LocationGalleryCard({
  environment,
  index,
  isSelected,
  isGenerating,
  onSelect,
  onPreviewImage,
  onRetry,
  retrying,
}) {
  const gradient = THUMB_GRADIENTS[index % THUMB_GRADIENTS.length]
  const normalized = normalizeEnvironmentRecord(environment)
  const imageUrl = getEnvironmentImageUrl(normalized)
  const imageStatus = normalized.image_status
  const failed = isEnvironmentFailed(normalized)
  const showGenerating = isGenerating && isEnvironmentGenerating(normalized)

  const statusLabel = showGenerating ? 'Generating…' : getEnvironmentDisplayStatus(normalized)

  return (
    <article
      className={`${fieldStyles.galleryCard} ${isSelected ? fieldStyles.galleryCardSelected : ''}`}
      onClick={() => onSelect(environment.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(environment.id)
        }
      }}
      role="button"
      tabIndex={0}
    >
      {imageUrl ? (
        <button
          type="button"
          className={styles.imagePreviewBtn}
          onClick={(event) => {
            event.stopPropagation()
            onPreviewImage({ imageUrl, title: environment.name })
          }}
          aria-label={`View ${environment.name}`}
        >
          <div
            className={`${fieldStyles.galleryHero} ${fieldStyles.galleryHeroWide}`}
            style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
        </button>
      ) : (
        <div
          className={`${fieldStyles.galleryHero} ${fieldStyles.galleryHeroWide}`}
          style={{ background: gradient }}
          aria-hidden="true"
        />
      )}
      <div className={fieldStyles.galleryCardBody}>
        <h3 className={fieldStyles.galleryCardTitle}>{environment.name || 'Unnamed'}</h3>
        {environment.description ? (
          <p className={styles.cardDescription}>{environment.description}</p>
        ) : null}
        <p className={fieldStyles.galleryCardMeta}>
          {environment.mood ? `${environment.mood} · ` : ''}
          {environment.lighting || 'Lighting TBD'}
        </p>
        <p className={styles.cardStatus}>
          <span className={`${styles.statusText} ${statusClassName(imageStatus)}`}>
            {statusLabel}
          </span>
        </p>
        {failed ? (
          <button
            type="button"
            className={styles.retryBtn}
            onClick={(event) => {
              event.stopPropagation()
              onRetry(environment)
            }}
            disabled={retrying}
          >
            {retrying ? 'Retrying…' : 'Retry'}
          </button>
        ) : null}
      </div>
    </article>
  )
}

function EnvironmentInspector({
  environment,
  environmentIndex,
  total,
  isGenerating,
  generationActive,
  rowError,
  onChange,
  onGenerate,
}) {
  if (!environment) {
    return (
      <aside className={fieldStyles.inspector}>
        <p className={fieldStyles.fieldHint}>Select a location to edit details.</p>
      </aside>
    )
  }

  const hasImage = environmentHasImage(environment)
  const buttonLabel = isGenerating ? 'Generating…' : hasImage ? 'Regenerate' : 'Generate'
  const buttonDisabled = isGenerating || generationActive

  return (
    <aside className={fieldStyles.inspector}>
      <div className={fieldStyles.inspectorHeader}>
        <h2 className={fieldStyles.inspectorTitle}>Inspector</h2>
        <span className={fieldStyles.inspectorIndex}>
          LOCATION {environmentIndex + 1} OF {total}
        </span>
      </div>
      <div className={fieldStyles.inspectorBody}>
        <div className={fieldStyles.sceneField}>
          <label className={fieldStyles.sceneFieldLabel} htmlFor={`env-${environment.id}-name`}>Name</label>
          <input id={`env-${environment.id}-name`} className={fieldStyles.sceneFieldInput} value={environment.name ?? ''} onChange={(e) => onChange({ name: e.target.value })} />
        </div>
        <div className={fieldStyles.sceneField}>
          <label className={fieldStyles.sceneFieldLabel} htmlFor={`env-${environment.id}-description`}>Description</label>
          <textarea id={`env-${environment.id}-description`} className={fieldStyles.sceneFieldTextarea} value={environment.description ?? ''} onChange={(e) => onChange({ description: e.target.value })} rows={3} />
        </div>
        <div className={fieldStyles.sceneFieldRow}>
          <div className={fieldStyles.sceneField}>
            <label className={fieldStyles.sceneFieldLabel} htmlFor={`env-${environment.id}-appearance`}>Appearance</label>
            <input id={`env-${environment.id}-appearance`} className={fieldStyles.sceneFieldInput} value={environment.appearance ?? ''} onChange={(e) => onChange({ appearance: e.target.value })} />
          </div>
          <div className={fieldStyles.sceneField}>
            <label className={fieldStyles.sceneFieldLabel} htmlFor={`env-${environment.id}-lighting`}>Lighting</label>
            <input id={`env-${environment.id}-lighting`} className={fieldStyles.sceneFieldInput} value={environment.lighting ?? ''} onChange={(e) => onChange({ lighting: e.target.value })} />
          </div>
        </div>
        <div className={fieldStyles.sceneField}>
          <label className={fieldStyles.sceneFieldLabel} htmlFor={`env-${environment.id}-mood`}>Mood</label>
          <input id={`env-${environment.id}-mood`} className={fieldStyles.sceneFieldInput} value={environment.mood ?? ''} onChange={(e) => onChange({ mood: e.target.value })} />
        </div>
        {rowError ? <p className={styles.rowError} role="alert">{rowError}</p> : null}
        <button type="button" className={styles.generateBtn} onClick={() => onGenerate(environment)} disabled={buttonDisabled}>{buttonLabel}</button>
      </div>
    </aside>
  )
}

export default function EnvironmentsStep({
  projectId,
  style,
  environmentGenerationStatus = null,
  environmentGenerationStartedAt = null,
  loading = false,
  loadError,
  saveStatus = 'idle',
  saveError,
  onGenerationMetaChange,
  onSave,
  onBackToCharacters,
  onContinueToStoryboard,
}) {
  const {
    environments,
    mergeEnvironments,
    loadEnvironments,
  } = useProjectStore()

  console.log('Environment page rendering:', environments.length)

  const [stepDataLoading, setStepDataLoading] = useState(true)
  const [generatingIds, setGeneratingIds] = useState(() => new Set())
  const [retryingIds, setRetryingIds] = useState(() => new Set())
  const [rowErrors, setRowErrors] = useState({})
  const [actionError, setActionError] = useState(null)
  const [continuing, setContinuing] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [generationErrorModal, setGenerationErrorModal] = useState(null)
  const isSaving = saveStatus === 'saving'
  const saveStatusLabel =
    saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : null
  const combinedLoading = loading || stepDataLoading

  useEffect(() => {
    if (!projectId) return undefined

    let cancelled = false
    setStepDataLoading(true)

    loadEnvironments(projectId, { force: true })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStepDataLoading(false)
      })

    return () => {
      cancelled = true
    }
    // Load environments once per project visit; only projectId should trigger reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const patchEnvironments = useCallback(
    (updater) => {
      const next =
        typeof updater === 'function' ? updater(environments) : updater
      mergeEnvironments(next)
    },
    [environments, mergeEnvironments]
  )

  const reloadEnvironmentsOnComplete = useCallback(
    () => loadEnvironments(projectId, { force: true }),
    [loadEnvironments, projectId]
  )

  const handleGenerationError = useCallback((formatted) => {
    setGenerationErrorModal(formatted)
  }, [])

  const {
    progress,
    monitoring,
    isStuck,
    resuming,
    starting,
    startGeneration,
    retryEnvironment,
    handleResumeGeneration,
  } = useEnvironmentGeneration({
    enabled: Boolean(projectId) && !combinedLoading,
    projectId,
    initialStatus: environmentGenerationStatus,
    initialStartedAt: environmentGenerationStartedAt,
    visualStyle: style,
    environments,
    reloadEnvironmentsOnComplete,
    onEnvironmentsChange: mergeEnvironments,
    onGenerationMetaChange,
    onError: handleGenerationError,
  })

  const environmentsSettled = areEnvironmentsGenerationSettled(environments)

  const generationActive =
    !environmentsSettled &&
    (monitoring ||
      Boolean(resuming) ||
      starting ||
      isStuck ||
      Boolean(progress?.stalled) ||
      isGenerationInProgress(environmentGenerationStatus) ||
      isGenerationInProgress(progress?.status))

  const environmentsReady = hasProjectEnvironments(environments) && environmentsSettled

  const showPlanningPanel =
    !combinedLoading && !loadError && !hasProjectEnvironments(environments) && !generationActive

  useEffect(() => {
    if (!selectedId && environments.length) setSelectedId(environments[0].id)
    else if (
      selectedId &&
      !environments.find((e) => String(e.id) === String(selectedId)) &&
      environments.length
    ) {
      setSelectedId(environments[0].id)
    }
  }, [environments, selectedId])

  const selectedEnvironment =
    environments.find((e) => String(e.id) === String(selectedId)) ?? null
  const selectedIndex = environments.findIndex((e) => String(e.id) === String(selectedId))

  const generateOne = useCallback(
    async (environment) => {
      const id = String(environment.id)
      setGeneratingIds((prev) => new Set(prev).add(id))
      setRowErrors((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })

      try {
        const result = await generateEnvironmentImage({
          environment,
          style,
          project_id: projectId,
          environment_id: getEnvironmentDbId(environment),
        })

        patchEnvironments((current) =>
          current.map((item) =>
            String(item.id) === id ? mergeAdstoryEnvironmentUpdate(item, result) : item
          )
        )
      } catch (err) {
        const message = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to generate environment image'
        ).message
        setRowErrors((prev) => ({ ...prev, [id]: message }))
        throw err
      } finally {
        setGeneratingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [projectId, style, patchEnvironments]
  )

  const handleGenerateOne = useCallback(
    async (environment) => {
      if (generationActive) return
      const id = String(environment.id)
      if (generatingIds.has(id)) return
      await generateOne(environment)
    },
    [generateOne, generatingIds, generationActive]
  )

  const handleRetryEnvironment = useCallback(
    async (environment) => {
      const id = String(environment.id ?? getEnvironmentDbId(environment))
      if (retryingIds.has(id)) return

      setRetryingIds((prev) => new Set(prev).add(id))
      try {
        await retryEnvironment(getEnvironmentDbId(environment) ?? environment.id)
      } finally {
        setRetryingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [retryEnvironment, retryingIds]
  )

  const handleSave = useCallback(async () => {
    await onSave?.(environments)
  }, [environments, onSave])

  const handlePreviewImage = useCallback((preview) => {
    setPreviewImage(preview)
  }, [])

  const handleBack = useCallback(() => {
    onBackToCharacters?.()
  }, [onBackToCharacters])

  const handleContinue = useCallback(async () => {
    setContinuing(true)
    setActionError(null)

    try {
      await onContinueToStoryboard?.(environments)
    } catch (err) {
      const message = formatUserFriendlyError(
        err instanceof Error ? err.message : 'Failed to continue'
      ).message
      setActionError(message)
    } finally {
      setContinuing(false)
    }
  }, [environments, onContinueToStoryboard])

  const localModalError = useMemo(
    () => (actionError ? formatUserFriendlyError(actionError) : null),
    [actionError]
  )
  const environmentCount = environments.length
  const isImageGenerationBusy = generatingIds.size > 0

  const listBody = useMemo(() => {
    if (showPlanningPanel) {
      return (
        <EnvironmentPlanningPanel generating={starting} onGenerate={startGeneration} />
      )
    }

    if (!environmentCount && generationActive) {
      return null
    }

    if (!environmentCount) {
      return (
        <div className={styles.stateBlock}>
          <p>No environments were detected in your screenplay yet.</p>
        </div>
      )
    }

    return (
      <div className={fieldStyles.galleryGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {environments.map((environment, index) => {
          const id = String(environment.id)
          const normalized = normalizeEnvironmentRecord(environment)
          const isGenerating =
            generatingIds.has(id) || isEnvironmentGenerating(normalized)
          return (
            <LocationGalleryCard
              key={environment.id ?? environment.name}
              environment={environment}
              index={index}
              isSelected={String(selectedId) === id}
              isGenerating={isGenerating}
              onSelect={setSelectedId}
              onPreviewImage={handlePreviewImage}
              onRetry={handleRetryEnvironment}
              retrying={retryingIds.has(id)}
            />
          )
        })}
      </div>
    )
  }, [
    environmentCount,
    generatingIds,
    generationActive,
    handlePreviewImage,
    handleRetryEnvironment,
    environments,
    retryingIds,
    selectedId,
    showPlanningPanel,
    startGeneration,
    starting,
  ])

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <h1 className={styles.title}>Environments</h1>
            <p className={fieldStyles.question}>{getWorkspaceQuestion('environments')}</p>
            <p className={styles.subtitle}>
              {environmentCount} locations
              {generationActive ? ' · Generation in progress' : ' · Generate reference images when you are ready.'}
            </p>
          </div>

          <div className={styles.headerActions}>
            {environmentCount > 0 ? (
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={isSaving || isImageGenerationBusy || generationActive}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            ) : null}
            {saveStatusLabel ? (
              <span className={styles.saveStatusInline} role="status">
                {saveStatusLabel}
              </span>
            ) : null}
          </div>
        </header>

        {combinedLoading && !environmentCount ? (
          <p className={styles.generationStatus} role="status">
            Loading saved environments...
          </p>
        ) : null}
        <AiGenerationProgress
          type="environments"
          progress={progress}
          startedAt={environmentGenerationStartedAt}
          isStuck={isStuck}
          resuming={resuming}
          onResume={() => handleResumeGeneration(false)}
          onRetryFailedAndResume={() => handleResumeGeneration(true)}
        />
        {loadError ? (
          <div className={styles.inlineErrorBox} role="alert">
            {loadError}
          </div>
        ) : null}
        {saveError ? (
          <div className={styles.inlineErrorBox} role="alert">
            {saveError}
          </div>
        ) : null}

        <div className={fieldStyles.workspaceSplit}>
          <div className={fieldStyles.workspaceMain}>{listBody}</div>
          {environmentCount > 0 ? (
            <EnvironmentInspector
              environment={selectedEnvironment}
              environmentIndex={selectedIndex >= 0 ? selectedIndex : 0}
              total={environmentCount}
              isGenerating={selectedEnvironment ? generatingIds.has(String(selectedEnvironment.id)) : false}
              generationActive={generationActive}
              rowError={selectedEnvironment ? rowErrors[String(selectedEnvironment.id)] : null}
              onChange={(patch) => {
                if (!selectedEnvironment) return
                patchEnvironments((current) =>
                  updateEnvironment(current, selectedEnvironment.id, patch)
                )
              }}
              onGenerate={handleGenerateOne}
            />
          ) : null}
        </div>
      </div>

      <footer className={styles.footer}>
        <button type="button" className={styles.footerBackBtn} onClick={handleBack}>
          Back to Characters
        </button>
        <button
          type="button"
          className={`${styles.footerContinueBtn} ${environmentsReady ? styles.footerContinueBtnActive : ''}`}
          onClick={handleContinue}
          disabled={continuing || isSaving || !environmentsReady}
        >
          {continuing ? 'Continuing...' : 'Continue to Storyboard'}
        </button>
      </footer>

      <ErrorModal
        open={Boolean(localModalError)}
        title={localModalError?.title ?? 'Something went wrong'}
        message={localModalError?.message ?? ''}
        onClose={() => setActionError(null)}
      />

      <ErrorModal
        open={Boolean(generationErrorModal)}
        title={generationErrorModal?.title ?? 'Something went wrong'}
        message={generationErrorModal?.message ?? ''}
        onClose={() => setGenerationErrorModal(null)}
      />

      <ImagePreviewModal
        open={Boolean(previewImage)}
        imageUrl={previewImage?.imageUrl}
        title={previewImage?.title}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  )
}
