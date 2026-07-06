import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  applyShotImageApiResponse,
  approveShotImage,
  deleteShotImage,
  deriveShotFieldsFromImages,
  generateShotImage,
  getShotImages,
} from '../../services/adstoryApi'
import { getApprovedShotImageUrl, getShotDisplayImageUrl } from '../../utils/resolveMediaUrl'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import ErrorModal from '../../app/components/ErrorModal'
import ImagePreviewModal from '../../app/components/ImagePreviewModal'
import AiGenerationProgress from './AiGenerationProgress'
import useShotGeneration from '../hooks/useShotGeneration'
import { isGenerationInProgress } from '../aiGenerationStatus'
import { hasProjectShots, mergeShotGroups } from '../shotGenerationStatus'
import { CREATION_STEP_COUNT } from '../creationData'
import CreationFullscreenReader from './CreationFullscreenReader'
import readerStyles from './CreationFullscreenReader.module.css'
import ShotVersionHistoryModal from './ShotVersionHistoryModal'
import ws from './ShotsWorkspace.module.css'

function getShotKey(shot) {
  return String(shot.id ?? shot.apiId)
}

function ensureUniqueShotIds(groups) {
  return groups.map((group) => {
    const usedIds = new Set()
    return {
      ...group,
      shots: (group.shots ?? []).map((shot, index) => {
        const apiId = shot.apiId ?? null
        let id = apiId != null ? String(apiId) : String(shot.id ?? '')
        if (!id || usedIds.has(id)) {
          id = `${group.sceneId}-${shot.order_index ?? index}-${shot.shot_number ?? index + 1}`
        }
        usedIds.add(id)
        return id === shot.id ? shot : { ...shot, id }
      }),
    }
  })
}

function updateShotInGroups(groups, shotId, patch) {
  return groups.map((group) => ({
    ...group,
    shots: group.shots.map((shot) => (shot.id === shotId ? { ...shot, ...patch } : shot)),
  }))
}

function replaceShotInGroups(groups, shotKey, nextShot) {
  return groups.map((group) => ({
    ...group,
    shots: group.shots.map((shot) =>
      getShotKey(shot) === String(shotKey) ? { ...nextShot, id: shot.id } : shot
    ),
  }))
}

function findShotInGroups(groups, shotKey) {
  for (const group of groups) {
    const match = group.shots.find((shot) => getShotKey(shot) === String(shotKey))
    if (match) return match
  }
  return null
}

function getAllShotsFlat(groups) {
  return groups.flatMap((group) => group.shots ?? [])
}

function getShotIndex(groups, shotKey) {
  const all = getAllShotsFlat(groups)
  return all.findIndex((shot) => getShotKey(shot) === String(shotKey))
}

function shotHasDisplayImage(shot) {
  return Boolean(getShotDisplayImageUrl(shot))
}

function shouldSkipShotForBulk(shot, regenerateAll) {
  if (regenerateAll) return false
  if (shotHasApprovedImage(shot)) return true
  return Boolean(shot.image_url) && shot.image_status === 'completed'
}

function formatVersionDate(value) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function shotHasApprovedImage(shot) {
  return Boolean(getApprovedShotImageUrl(shot))
}

function sortVersionsNewestFirst(versions = []) {
  return [...versions].sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0))
}

function getLatestUnapprovedVersion(shot) {
  return sortVersionsNewestFirst(shot?.shot_images ?? []).find((v) => !v.is_approved)
}

function getShotStatus(shot, isGenerating) {
  if (isGenerating) return { tone: 'generating', label: 'Generating...' }
  if (shotHasApprovedImage(shot)) return { tone: 'complete', label: 'Storyboard Ready' }
  if (shotHasDisplayImage(shot) || (shot.shot_images?.length ?? 0) > 0) {
    return { tone: 'review', label: 'Needs Review' }
  }
  return { tone: 'missing', label: 'Missing Image' }
}

function getStatusDotClass(tone) {
  if (tone === 'complete') return ws.dotComplete
  if (tone === 'generating') return ws.dotGenerating
  if (tone === 'review') return ws.dotReview
  return ws.dotMissing
}

function ShotStatusBadge({ status, compact = false }) {
  const toneClass =
    status.tone === 'complete'
      ? ws.badgeComplete
      : status.tone === 'generating'
        ? ws.badgeGenerating
        : status.tone === 'review'
          ? ws.badgeReview
          : ws.badgeMissing

  return (
    <span className={`${ws.badge} ${toneClass} ${compact ? ws.badgeCompact : ''}`}>
      <span className={ws.badgeDot} aria-hidden="true" />
      {status.label}
    </span>
  )
}

function InspectorSection({ title, open, onToggle, children }) {
  return (
    <div className={ws.inspectorSection}>
      <button type="button" className={ws.sectionToggle} onClick={onToggle} aria-expanded={open}>
        {title}
        <span className={`${ws.sectionChevron} ${open ? '' : ws.sectionChevronCollapsed}`}>▾</span>
      </button>
      <div
        className={`${ws.sectionBody} ${open ? '' : ws.sectionBodyCollapsed}`}
        style={{ maxHeight: open ? '800px' : 0 }}
      >
        {children}
      </div>
    </div>
  )
}

function InspectorField({ id, label, children }) {
  return (
    <div className={ws.field}>
      <label className={ws.fieldLabel} htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ShotListCard({
  shot,
  shotIndex,
  isSelected,
  isGenerating,
  approvingImageId,
  onSelect,
  onGenerate,
  onOpenVersionHistory,
  onApprove,
  onPreviewImage,
}) {
  const shotKey = getShotKey(shot)
  const status = getShotStatus(shot, isGenerating)
  const displayImageUrl = getShotDisplayImageUrl(shot)
  const hasImages = (shot.shot_images?.length ?? 0) > 0 || shotHasDisplayImage(shot)
  const canGenerate = Boolean(shot.apiId)
  const isApproved = shotHasApprovedImage(shot)
  const versionCount = shot.shot_images?.length ?? 0
  const displayTitle = shot.title?.trim() || `Shot ${shot.shot_number ?? shot.id}`

  const stop = (event) => event.stopPropagation()

  return (
    <article
      className={`${ws.shotGridCard} ${isSelected ? ws.shotGridCardSelected : ''}`}
      onClick={() => onSelect(shotKey)}
    >
      <div className={ws.shotGridPreview}>
        {isGenerating ? (
          <div className={ws.shotGridGenerating}>
            <div className={ws.spinnerSmall} aria-hidden="true" />
            <span className={ws.shotGridGeneratingLabel}>Generating…</span>
          </div>
        ) : displayImageUrl ? (
          <button
            type="button"
            className={ws.shotGridPreviewBtn}
            onClick={(event) => {
              stop(event)
              onPreviewImage({ imageUrl: displayImageUrl, title: displayTitle })
            }}
            aria-label="View storyboard"
          >
            <img src={displayImageUrl} alt="" className={ws.shotGridPreviewImage} />
          </button>
        ) : (
          <div className={ws.shotGridPreviewPlaceholder} aria-hidden="true">
            🎞
          </div>
        )}
        <span className={ws.shotGridNumber}>{shotIndex + 1}</span>
        {!isGenerating ? (
          <button
            type="button"
            className={ws.shotGridGenerateOverlay}
            onClick={(event) => {
              stop(event)
              onGenerate(shot)
            }}
            disabled={!canGenerate}
            title={canGenerate ? undefined : 'Save shots to enable generation'}
          >
            {hasImages ? 'Regenerate' : 'Generate'}
          </button>
        ) : null}
      </div>

      <div className={ws.shotGridBody}>
        <h3 className={ws.shotGridTitle} title={displayTitle}>
          {displayTitle}
        </h3>
        <div className={ws.shotGridMeta}>
          <ShotStatusBadge status={status} compact />
        </div>
        <div className={ws.shotGridActions} onClick={stop} onKeyDown={stop} role="presentation">
          <button
            type="button"
            className={ws.btnGenerateSm}
            onClick={() => onGenerate(shot)}
            disabled={!canGenerate || isGenerating}
            title={canGenerate ? undefined : 'Save shots to enable generation'}
          >
            {isGenerating ? 'Generating…' : hasImages ? 'Regenerate' : 'Generate'}
          </button>
          {hasImages ? (
            <>
              <button
                type="button"
                className={ws.btnSm}
                onClick={() => onOpenVersionHistory(shot)}
                disabled={isGenerating}
                title="Versions"
              >
                Ver{versionCount > 0 ? ` (${versionCount})` : ''}
              </button>
              {isApproved ? (
                <span className={ws.shotGridApprovedMark} title="Approved">
                  ✓
                </span>
              ) : (
                <button
                  type="button"
                  className={ws.btnSm}
                  onClick={() => onApprove(shot)}
                  disabled={
                    isGenerating ||
                    Boolean(approvingImageId) ||
                    !getLatestUnapprovedVersion(shot)
                  }
                  title="Approve latest version"
                >
                  {approvingImageId ? '…' : 'OK'}
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function ShotInspector({
  shot,
  shotIndex,
  totalShots,
  openSections,
  onToggleSection,
  onChange,
}) {
  if (!shot) return null

  const handleFieldChange = (patch) => onChange(shot.id, patch)

  const removeCharacter = (name) => {
    handleFieldChange({
      characters: (shot.characters ?? []).filter((c) => c !== name),
    })
  }

  const addCharacter = (raw) => {
    const name = raw.trim()
    if (!name) return
    const current = shot.characters ?? []
    if (current.includes(name)) return
    handleFieldChange({ characters: [...current, name] })
  }

  return (
    <aside className={ws.inspector}>
      <div className={ws.inspectorHeader}>
        <h2 className={ws.inspectorTitle}>Inspector</h2>
        <span className={ws.inspectorShotIndex}>
          SHOT {shotIndex + 1} OF {totalShots}
        </span>
      </div>

      <div className={ws.inspectorSections}>
        <InspectorSection
          title="Basic Information"
          open={openSections.basic}
          onToggle={() => onToggleSection('basic')}
        >
          <InspectorField id={`insp-${shot.id}-title`} label="Title">
            <input
              id={`insp-${shot.id}-title`}
              className={ws.fieldInput}
              value={shot.title ?? ''}
              onChange={(e) => handleFieldChange({ title: e.target.value })}
            />
          </InspectorField>
          <InspectorField id={`insp-${shot.id}-desc`} label="Description">
            <textarea
              id={`insp-${shot.id}-desc`}
              className={ws.fieldTextarea}
              value={shot.description ?? ''}
              onChange={(e) => handleFieldChange({ description: e.target.value })}
              rows={3}
            />
          </InspectorField>
          <InspectorField id={`insp-${shot.id}-action`} label="Action">
            <textarea
              id={`insp-${shot.id}-action`}
              className={ws.fieldTextarea}
              value={shot.action ?? ''}
              onChange={(e) => handleFieldChange({ action: e.target.value })}
              rows={2}
            />
          </InspectorField>
          <InspectorField id={`insp-${shot.id}-dialogue`} label="Dialogue">
            <textarea
              id={`insp-${shot.id}-dialogue`}
              className={ws.fieldTextarea}
              value={shot.dialogue ?? ''}
              onChange={(e) => handleFieldChange({ dialogue: e.target.value })}
              rows={2}
            />
          </InspectorField>
        </InspectorSection>

        <InspectorSection
          title="Cinematography"
          open={openSections.cinematography}
          onToggle={() => onToggleSection('cinematography')}
        >
          <InspectorField id={`insp-${shot.id}-size`} label="Shot Size">
            <input
              id={`insp-${shot.id}-size`}
              className={ws.fieldInput}
              value={shot.shotSize ?? ''}
              onChange={(e) => handleFieldChange({ shotSize: e.target.value })}
            />
          </InspectorField>
          <InspectorField id={`insp-${shot.id}-angle`} label="Camera Angle">
            <input
              id={`insp-${shot.id}-angle`}
              className={ws.fieldInput}
              value={shot.cameraAngle ?? ''}
              onChange={(e) => handleFieldChange({ cameraAngle: e.target.value })}
            />
          </InspectorField>
          <InspectorField id={`insp-${shot.id}-move`} label="Camera Movement">
            <input
              id={`insp-${shot.id}-move`}
              className={ws.fieldInput}
              value={shot.cameraMovement ?? shot.camera ?? ''}
              onChange={(e) =>
                handleFieldChange({ cameraMovement: e.target.value, camera: e.target.value })
              }
            />
          </InspectorField>
          <div className={ws.fieldRow}>
            <InspectorField id={`insp-${shot.id}-lens`} label="Lens">
              <input
                id={`insp-${shot.id}-lens`}
                className={ws.fieldInput}
                value={shot.lens ?? ''}
                onChange={(e) => handleFieldChange({ lens: e.target.value })}
              />
            </InspectorField>
            <InspectorField id={`insp-${shot.id}-comp`} label="Composition">
              <input
                id={`insp-${shot.id}-comp`}
                className={ws.fieldInput}
                value={shot.composition ?? ''}
                onChange={(e) => handleFieldChange({ composition: e.target.value })}
              />
            </InspectorField>
          </div>
        </InspectorSection>

        <InspectorSection
          title="Lighting & Mood"
          open={openSections.lighting}
          onToggle={() => onToggleSection('lighting')}
        >
          <InspectorField id={`insp-${shot.id}-light`} label="Lighting">
            <input
              id={`insp-${shot.id}-light`}
              className={ws.fieldInput}
              value={shot.lighting ?? ''}
              onChange={(e) => handleFieldChange({ lighting: e.target.value })}
            />
          </InspectorField>
          <InspectorField id={`insp-${shot.id}-mood`} label="Mood">
            <input
              id={`insp-${shot.id}-mood`}
              className={ws.fieldInput}
              value={shot.mood ?? ''}
              onChange={(e) => handleFieldChange({ mood: e.target.value })}
            />
          </InspectorField>
        </InspectorSection>

        <InspectorSection
          title="Characters & Environment"
          open={openSections.characters}
          onToggle={() => onToggleSection('characters')}
        >
          <InspectorField id={`insp-${shot.id}-chars`} label="Characters">
            <div className={ws.characterTags}>
              {(shot.characters ?? []).map((name) => (
                <span key={name} className={ws.characterTag}>
                  {name}
                  <button
                    type="button"
                    className={ws.characterTagRemove}
                    onClick={() => removeCharacter(name)}
                    aria-label={`Remove ${name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              id={`insp-${shot.id}-chars`}
              className={ws.fieldInput}
              placeholder="Add character, press Enter"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCharacter(e.currentTarget.value)
                  e.currentTarget.value = ''
                }
              }}
            />
          </InspectorField>
          <InspectorField id={`insp-${shot.id}-env`} label="Environment">
            <input
              id={`insp-${shot.id}-env`}
              className={ws.fieldInput}
              value={shot.environment ?? ''}
              onChange={(e) => handleFieldChange({ environment: e.target.value })}
            />
          </InspectorField>
          <InspectorField id={`insp-${shot.id}-dur`} label="Duration (seconds)">
            <input
              id={`insp-${shot.id}-dur`}
              className={ws.fieldInput}
              type="number"
              min="0"
              step="1"
              value={shot.durationSeconds ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                handleFieldChange({
                  durationSeconds: raw === '' ? null : Number.parseInt(raw, 10),
                })
              }}
            />
          </InspectorField>
          <InspectorField id={`insp-${shot.id}-prompt`} label="Prompt">
            <textarea
              id={`insp-${shot.id}-prompt`}
              className={ws.fieldTextarea}
              value={shot.prompt ?? ''}
              onChange={(e) => handleFieldChange({ prompt: e.target.value })}
              rows={3}
            />
          </InspectorField>
        </InspectorSection>
      </div>
    </aside>
  )
}

function findSceneGroup(items, sceneId) {
  if (sceneId == null) return null
  return items.find((group) => String(group.sceneId) === String(sceneId)) ?? null
}

function getSceneStatusTone(group, generatingShotKeys) {
  if (!group?.shots?.length) return 'missing'
  let hasGenerating = false
  let hasMissing = false
  let hasReview = false
  for (const shot of group.shots) {
    const status = getShotStatus(shot, generatingShotKeys.has(getShotKey(shot)))
    if (status.tone === 'generating') hasGenerating = true
    if (status.tone === 'missing') hasMissing = true
    if (status.tone === 'review') hasReview = true
  }
  if (hasGenerating) return 'generating'
  if (hasMissing) return 'missing'
  if (hasReview) return 'review'
  return 'complete'
}

function ShotsWorkspaceBody({
  items,
  selectedSceneId,
  selectedShotKey,
  openSections,
  generatingShotKeys,
  approvingImageId,
  onSelectScene,
  onSelectShot,
  onToggleSection,
  onShotChange,
  onGenerate,
  onOpenVersionHistory,
  onApprove,
  onPreviewImage,
}) {
  const allShots = getAllShotsFlat(items)
  const totalShots = allShots.length
  const activeScene =
    findSceneGroup(items, selectedSceneId) ?? (items.length ? items[0] : null)
  const sceneShots = activeScene?.shots ?? []
  const selectedIndex = getShotIndex(items, selectedShotKey)
  const selectedShot = findShotInGroups(items, selectedShotKey)
  const sceneShotIndex = sceneShots.findIndex((shot) => getShotKey(shot) === selectedShotKey)

  return (
    <div className={ws.columns}>
      <aside className={ws.sidebar}>
        <div className={ws.sidebarHeader}>
          <h2 className={ws.sidebarTitle}>Scenes</h2>
        </div>
        <div className={ws.sceneList}>
          {items.map((group) => {
            const isSelected = String(group.sceneId) === String(activeScene?.sceneId)
            const sceneTone = getSceneStatusTone(group, generatingShotKeys)
            return (
              <button
                key={group.sceneId}
                type="button"
                className={`${ws.sceneNavItem} ${isSelected ? ws.sceneNavItemSelected : ''}`}
                onClick={() => onSelectScene(group.sceneId)}
              >
                <span
                  className={`${ws.shotNavDot} ${getStatusDotClass(sceneTone)}`}
                  aria-hidden="true"
                />
                <span className={ws.sceneNavCopy}>
                  <span className={ws.sceneNavName}>
                    Scene {group.sceneId} — {group.sceneTitle}
                  </span>
                  <span className={ws.sceneNavCount}>{group.shots.length} shots</span>
                </span>
              </button>
            )
          })}
        </div>
        <div className={ws.sidebarFooter}>
          <button type="button" className={ws.sidebarFooterBtn} disabled>
            Reorder Scenes
          </button>
        </div>
      </aside>

      <main className={ws.center}>
        <div className={ws.centerHeader}>
          <div>
            <h2 className={ws.centerTitle}>
              {activeScene
                ? `Scene ${activeScene.sceneId} — ${activeScene.sceneTitle}`
                : 'Shots'}
            </h2>
            <p className={ws.centerSubtitle}>
              {activeScene
                ? `${sceneShots.length} shots in this scene · ${totalShots} total`
                : `${totalShots} shots across ${items.length} scenes`}
            </p>
          </div>
          <div className={ws.centerHeaderActions}>
            <button type="button" className={ws.toolbarBtn} disabled aria-hidden="true">
              Filter
            </button>
            <button type="button" className={ws.toolbarBtn} disabled aria-hidden="true">
              ⊞
            </button>
          </div>
        </div>

        <div className={ws.shotCardList}>
          {sceneShots.length === 0 ? (
            <p className={ws.sceneEmptyShots}>No shots in this scene.</p>
          ) : (
            sceneShots.map((shot, idx) => {
              const shotKey = getShotKey(shot)
              return (
                <ShotListCard
                  key={`${activeScene.sceneId}-${shot.id}-${idx}`}
                  shot={shot}
                  shotIndex={idx}
                  isSelected={shotKey === selectedShotKey}
                  isGenerating={generatingShotKeys.has(shotKey)}
                  approvingImageId={approvingImageId}
                  onSelect={onSelectShot}
                  onGenerate={onGenerate}
                  onOpenVersionHistory={onOpenVersionHistory}
                  onApprove={onApprove}
                  onPreviewImage={onPreviewImage}
                />
              )
            })
          )}
        </div>
      </main>

      <ShotInspector
        shot={selectedShot}
        shotIndex={sceneShotIndex >= 0 ? sceneShotIndex : selectedIndex >= 0 ? selectedIndex : 0}
        totalShots={sceneShots.length || totalShots}
        openSections={openSections}
        onToggleSection={onToggleSection}
        onChange={onShotChange}
      />
    </div>
  )
}

export default function ShotsStep({
  shotGroups = [],
  projectId,
  scenes = [],
  fallbackShotGroups = [],
  shotGenerationStatus = null,
  shotGenerationStartedAt = null,
  visualStyle = '',
  refreshFullProject,
  error,
  onShotsChange,
  onGenerationMetaChange,
  onActionChange,
  onBackToBreakdown,
  onContinueToCharacters,
  onSave,
  generating = false,
  loading = false,
  saveStatus = 'idle',
  saveError,
}) {
  const [items, setItems] = useState(() => ensureUniqueShotIds(shotGroups))
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [generatingShotKeys, setGeneratingShotKeys] = useState(() => new Set())
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(null)
  const [versionHistoryShotKey, setVersionHistoryShotKey] = useState(null)
  const [approvingImageId, setApprovingImageId] = useState(null)
  const [deletingImageId, setDeletingImageId] = useState(null)
  const [versionHistoryError, setVersionHistoryError] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [imageActionError, setImageActionError] = useState(null)
  const [generationErrorModal, setGenerationErrorModal] = useState(null)
  const [selectedShotKey, setSelectedShotKey] = useState(null)
  const [selectedSceneId, setSelectedSceneId] = useState(null)
  const [openSections, setOpenSections] = useState({
    basic: false,
    cinematography: false,
    lighting: false,
    characters: false,
  })

  const showImageActionError = useCallback((rawMessage, fallbackTitle = 'Storyboard image failed') => {
    const formatted = formatUserFriendlyError(rawMessage)
    setImageActionError({
      title: formatted.title ?? fallbackTitle,
      message: formatted.message,
    })
  }, [])

  const updateItems = useCallback(
    (updater) => {
      setItems((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater
        onShotsChange?.(ensureUniqueShotIds(next))
        return ensureUniqueShotIds(next)
      })
    },
    [onShotsChange]
  )

  const handleGenerationError = useCallback((formatted) => {
    setGenerationErrorModal(formatted)
  }, [])

  const {
    progress,
    monitoring,
    isStuck,
    resuming,
    handleResumeGeneration,
  } = useShotGeneration({
    enabled: Boolean(projectId) && !loading,
    projectId,
    initialStatus: shotGenerationStatus,
    initialStartedAt: shotGenerationStartedAt,
    visualStyle,
    shotGroups: items,
    projectScenes: scenes,
    fallbackShotGroups,
    refreshFullProject,
    onShotsChange: updateItems,
    onGenerationMetaChange,
    onError: handleGenerationError,
  })

  const generationActive =
    monitoring ||
    Boolean(resuming) ||
    isGenerationInProgress(shotGenerationStatus) ||
    isGenerationInProgress(progress?.status)

  const shotsReady = hasProjectShots(items) && !generationActive

  const isSaving = saveStatus === 'saving'
  const saveStatusLabel =
    saveStatus === 'saved' ? 'Saved just now' : saveStatus === 'saving' ? 'Saving…' : null

  const firstSceneId = useMemo(() => items[0]?.sceneId ?? null, [items])

  const firstShotKey = useMemo(() => {
    const scene = findSceneGroup(items, selectedSceneId) ?? items[0]
    if (scene?.shots?.length) return getShotKey(scene.shots[0])
    for (const group of items) {
      if (group.shots?.length) return getShotKey(group.shots[0])
    }
    return null
  }, [items, selectedSceneId])

  const totalShots = items.reduce((n, g) => n + g.shots.length, 0)

  useEffect(() => {
    if (!selectedShotKey) return
    setOpenSections({
      basic: false,
      cinematography: false,
      lighting: false,
      characters: false,
    })
  }, [selectedShotKey])

  useEffect(() => {
    if (!shotGroups.length) return
    setItems((current) => ensureUniqueShotIds(mergeShotGroups(current, shotGroups)))
  }, [shotGroups])

  useEffect(() => {
    if (!selectedSceneId && firstSceneId) setSelectedSceneId(firstSceneId)
    else if (
      selectedSceneId &&
      !findSceneGroup(items, selectedSceneId) &&
      firstSceneId
    ) {
      setSelectedSceneId(firstSceneId)
    }
  }, [firstSceneId, items, selectedSceneId])

  useEffect(() => {
    if (!selectedShotKey && firstShotKey) setSelectedShotKey(firstShotKey)
    else if (selectedShotKey && !findShotInGroups(items, selectedShotKey) && firstShotKey) {
      setSelectedShotKey(firstShotKey)
    }
  }, [firstShotKey, items, selectedShotKey])

  const handleSelectScene = useCallback(
    (sceneId) => {
      setSelectedSceneId(sceneId)
      const group = findSceneGroup(items, sceneId)
      if (group?.shots?.length) {
        setSelectedShotKey(getShotKey(group.shots[0]))
      } else {
        setSelectedShotKey(null)
      }
    },
    [items]
  )

  const applyShotUpdate = useCallback(
    (shotKey, response) => {
      updateItems((current) => {
        const existing = findShotInGroups(current, shotKey)
        if (!existing) return current
        const nextShot = applyShotImageApiResponse(existing, response)
        return replaceShotInGroups(current, shotKey, nextShot)
      })
    },
    [updateItems]
  )

  const refreshShotImages = useCallback(
    async (shot) => {
      if (!projectId || !shot?.apiId) return
      const images = await getShotImages(projectId, shot.apiId)
      updateItems((current) => {
        const existing = findShotInGroups(current, getShotKey(shot))
        if (!existing) return current
        return replaceShotInGroups(
          current,
          getShotKey(shot),
          deriveShotFieldsFromImages(existing, images)
        )
      })
    },
    [projectId, updateItems]
  )

  const handleGenerateShotImage = useCallback(
    async (shot) => {
      const shotKey = getShotKey(shot)
      if (!projectId || !shot.apiId || generatingShotKeys.has(shotKey) || bulkGenerating) return

      setGeneratingShotKeys((prev) => new Set(prev).add(shotKey))
      try {
        const result = await generateShotImage(projectId, shot.apiId)
        applyShotUpdate(shotKey, result)
      } catch (err) {
        showImageActionError(
          err instanceof Error ? err.message : 'Failed to generate shot image'
        )
      } finally {
        setGeneratingShotKeys((prev) => {
          const next = new Set(prev)
          next.delete(shotKey)
          return next
        })
      }
    },
    [applyShotUpdate, bulkGenerating, generatingShotKeys, projectId, showImageActionError]
  )

  const handleGenerateStoryboard = useCallback(
    async (regenerateAll = false) => {
      if (!projectId || bulkGenerating) return

      const allShots = getAllShotsFlat(items).filter((shot) => shot.apiId)
      const targets = allShots.filter((shot) => !shouldSkipShotForBulk(shot, regenerateAll))

      if (targets.length === 0) {
        showImageActionError(
          regenerateAll
            ? 'No shots are available to regenerate.'
            : 'All shots already have storyboard images. Use Regenerate All to create new versions.',
          'Nothing to generate'
        )
        return
      }

      setBulkGenerating(true)
      setBulkProgress({ current: 0, total: targets.length })

      for (let index = 0; index < targets.length; index += 1) {
        const shot = targets[index]
        const shotKey = getShotKey(shot)
        setBulkProgress({
          current: index + 1,
          total: targets.length,
          label: shot.title?.trim() || `Shot ${shot.shot_number ?? shot.id}`,
        })
        setGeneratingShotKeys((prev) => new Set(prev).add(shotKey))

        try {
          const result = await generateShotImage(projectId, shot.apiId)
          applyShotUpdate(shotKey, result)
        } catch (err) {
          setImageActionError(
            formatUserFriendlyError(
              err instanceof Error ? err.message : 'Failed to generate shot image'
            ).message
          )
        } finally {
          setGeneratingShotKeys((prev) => {
            const next = new Set(prev)
            next.delete(shotKey)
            return next
          })
        }
      }

      setBulkGenerating(false)
      setBulkProgress(null)
    },
    [applyShotUpdate, bulkGenerating, items, projectId, showImageActionError]
  )

  const handleApproveVersion = useCallback(
    async (version, shot) => {
      if (!version?.id || !shot?.apiId || !projectId) throw new Error('Image id is required.')
      setApprovingImageId(version.id)
      setVersionHistoryError(null)
      try {
        const result = await approveShotImage(projectId, shot.apiId, version.id)
        applyShotUpdate(getShotKey(shot), result)
      } finally {
        setApprovingImageId(null)
      }
    },
    [applyShotUpdate, projectId]
  )

  const handleDeleteVersion = useCallback(
    async (version, shot) => {
      if (!version?.id || !shot?.apiId || !projectId) throw new Error('Image id is required.')
      setDeletingImageId(version.id)
      setVersionHistoryError(null)
      try {
        const result = await deleteShotImage(projectId, shot.apiId, version.id)
        updateItems((current) => {
          const existing = findShotInGroups(current, getShotKey(shot))
          if (!existing) return current
          return replaceShotInGroups(
            current,
            getShotKey(shot),
            deriveShotFieldsFromImages(existing, result.images ?? [])
          )
        })
      } finally {
        setDeletingImageId(null)
      }
    },
    [projectId, updateItems]
  )

  const handleOpenVersionHistory = useCallback(
    async (shot) => {
      const shotKey = getShotKey(shot)
      setVersionHistoryShotKey(shotKey)
      setVersionHistoryError(null)

      if (!projectId || !shot.apiId) return

      try {
        await refreshShotImages(shot)
      } catch (err) {
        setVersionHistoryError(
          formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to load shot images'
          ).message
        )
      }
    },
    [projectId, refreshShotImages]
  )

  const handleQuickApprove = useCallback(
    async (shot) => {
      const latest = getLatestUnapprovedVersion(shot)
      if (latest) {
        try {
          await handleApproveVersion(latest, shot)
        } catch (err) {
          showImageActionError(
            err instanceof Error ? err.message : 'Failed to approve shot image'
          )
        }
        return
      }
      handleOpenVersionHistory(shot)
    },
    [handleApproveVersion, handleOpenVersionHistory]
  )

  const handleSave = async () => {
    await onSave?.(items)
  }

  const handleToggleSection = useCallback((key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const handleShotChange = useCallback(
    (shotId, patch) => {
      updateItems((current) => updateShotInGroups(current, shotId, patch))
    },
    [updateItems]
  )

  const versionHistoryShot = versionHistoryShotKey
    ? findShotInGroups(items, versionHistoryShotKey)
    : null

  useEffect(() => {
    if (!onActionChange) return undefined
    onActionChange({
      label: 'Continue to Characters',
      generatingLabel: 'Extracting Characters...',
      secondaryAction: {
        label: 'Back to Breakdown',
        onClick: onBackToBreakdown,
        disabled: generating || isSaving || generationActive,
      },
      disabled: !shotsReady || generating || isSaving || generationActive,
      onClick: () => onContinueToCharacters(items),
    })
    return () => onActionChange(null)
  }, [
    generationActive,
    generating,
    isSaving,
    items,
    onActionChange,
    onBackToBreakdown,
    onContinueToCharacters,
    shotsReady,
  ])

  const workspaceBody = (
    <ShotsWorkspaceBody
      items={items}
      selectedSceneId={selectedSceneId}
      selectedShotKey={selectedShotKey}
      openSections={openSections}
      generatingShotKeys={generatingShotKeys}
      approvingImageId={approvingImageId}
      onSelectScene={handleSelectScene}
      onSelectShot={setSelectedShotKey}
      onToggleSection={handleToggleSection}
      onShotChange={handleShotChange}
      onGenerate={handleGenerateShotImage}
      onOpenVersionHistory={handleOpenVersionHistory}
      onApprove={handleQuickApprove}
      onPreviewImage={setPreviewImage}
    />
  )

  const isImageBusy = bulkGenerating || generatingShotKeys.size > 0

  return (
    <div className={ws.workspace}>
      <div className={ws.topBar}>
        <div className={ws.topBarLeft}>
          <button
            type="button"
            className={`${ws.saveBtn} ${ws.generateStoryboardBtn}`}
            onClick={() => handleGenerateStoryboard(false)}
            disabled={isImageBusy || generating || isSaving || totalShots === 0}
          >
            {bulkGenerating ? 'Generating Storyboard…' : 'Generate Storyboard'}
          </button>
          <button
            type="button"
            className={ws.saveBtn}
            onClick={() => handleGenerateStoryboard(true)}
            disabled={isImageBusy || generating || isSaving || totalShots === 0}
          >
            Regenerate All
          </button>
          {bulkProgress ? (
            <span className={ws.bulkProgress} role="status">
              Generating shot {bulkProgress.current} of {bulkProgress.total}
              {bulkProgress.label ? ` — ${bulkProgress.label}` : ''}…
            </span>
          ) : null}
        </div>
        <div className={ws.topBarRight}>
        {saveStatusLabel ? (
          <span className={ws.saveStatus} role="status">
            <span className={ws.saveStatusIcon} aria-hidden="true">
              ✓
            </span>
            {saveStatusLabel}
          </span>
        ) : null}
        <button
          type="button"
          className={ws.saveBtn}
          onClick={handleSave}
          disabled={generating || isSaving || totalShots === 0}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          className={ws.fullscreenBtn}
          onClick={() => setFullscreenOpen(true)}
          disabled={totalShots === 0}
          aria-label="Fullscreen"
        >
          ⛶
        </button>
        </div>
      </div>

      {loading ? (
        <p className={`${ws.banner} ${ws.bannerLoading}`} role="status">
          Loading saved shots...
        </p>
      ) : null}

      <AiGenerationProgress
        type="shots"
        progress={progress}
        startedAt={shotGenerationStartedAt ?? progress?.project?.shot_generation_started_at}
        isStuck={isStuck}
        resuming={resuming ? 'resume' : null}
        onResume={handleResumeGeneration}
      />

      {generating ? (
        <p className={`${ws.banner} ${ws.bannerLoading}`} role="status">
          Adstory is detecting characters from your screenplay...
        </p>
      ) : null}
      {error ? (
        <div className={`${ws.banner} ${ws.bannerError}`} role="alert">
          {error}
        </div>
      ) : saveError ? (
        <div className={`${ws.banner} ${ws.bannerError}`} role="alert">
          {saveError}
        </div>
      ) : null}

      {totalShots === 0 && !generationActive ? (
        <div className={ws.emptyState}>
          <p className={ws.emptyStateTitle}>No shots yet</p>
          <p className={ws.emptyStateText}>
            Shots will generate automatically from your completed scenes.
          </p>
        </div>
      ) : totalShots > 0 ? (
        workspaceBody
      ) : (
        <p className={`${ws.banner} ${ws.bannerLoading}`} role="status">
          Generating shots for your scenes…
        </p>
      )}

      <CreationFullscreenReader
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        eyebrow={`Step 5 of ${CREATION_STEP_COUNT}`}
        title="Shots"
        subtitle={`${totalShots} shots across ${items.length} scenes`}
      >
        <div className={readerStyles.scrollContent}>{workspaceBody}</div>
      </CreationFullscreenReader>

      <ShotVersionHistoryModal
        open={Boolean(versionHistoryShot)}
        shot={versionHistoryShot}
        onClose={() => {
          setVersionHistoryShotKey(null)
          setVersionHistoryError(null)
        }}
        onApprove={(version) => handleApproveVersion(version, versionHistoryShot)}
        onDelete={(version) => handleDeleteVersion(version, versionHistoryShot)}
        onPreviewImage={setPreviewImage}
        approvingImageId={approvingImageId}
        deletingImageId={deletingImageId}
        error={versionHistoryError}
        formatDate={formatVersionDate}
      />

      <ImagePreviewModal
        open={Boolean(previewImage)}
        imageUrl={previewImage?.imageUrl}
        title={previewImage?.title}
        onClose={() => setPreviewImage(null)}
      />

      <ErrorModal
        open={Boolean(imageActionError)}
        title={imageActionError?.title ?? 'Storyboard image failed'}
        message={imageActionError?.message ?? ''}
        onClose={() => setImageActionError(null)}
      />

      <ErrorModal
        open={Boolean(generationErrorModal)}
        title={generationErrorModal?.title ?? 'Something went wrong'}
        message={generationErrorModal?.message ?? ''}
        onClose={() => setGenerationErrorModal(null)}
      />
    </div>
  )
}
