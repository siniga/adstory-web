import { useEffect, useMemo, useState } from 'react'
import { useResolvedMediaPreview } from '../../utils/useResolvedMediaPreview'
import { findShotById } from '../data'
import {
  canRegenerateShotImage,
  getRegenerateBlockedReason,
  getSceneImageStatus,
  isSceneGenerating as isSceneGeneratingFlag,
  resolveShotImageStatus,
  SHOT_IMAGE_STATUS,
} from '../imageStatus'
import { formatDurationBadge, getShotAssetCounts } from '../shotAssetCounts'
import {
  IconChevronDown,
  IconEdit,
  IconExpand,
  IconFit,
  IconGridView,
  IconSparkle,
} from '../icons'
import AssetSelectionToolbar from '../selection/AssetSelectionToolbar'
import CanvasSelectionLayer from '../selection/CanvasSelectionLayer'
import { getSelectionBreadcrumbSuffix } from '../selection/selectableRegionsData'
import ShotCaptionBubble from './ShotCaptionBubble'
import ShotCharacterChips from './ShotCharacterChips'
import ShotReviewControls from './ShotReviewControls'
import StoryboardGridFullscreen from './StoryboardGridFullscreen'
import styles from './CanvasPreview.module.css'
import { SHOT_REVIEW_STATUS } from '../shotReviewStatus'

export default function CanvasPreview({
  selectedShotId,
  activeCanvasTool,
  onCanvasToolChange,
  selectionModeActive,
  selectableRegions,
  selectedRegionId,
  onSelectRegion,
  selectedRegion,
  regeneratingShotApiId = null,
  generatingSceneIds = {},
  onRegenerateShot,
  onEditShot,
  showShotCaptions = false,
  shotAssignments = {},
  assignedCharacters = [],
  isFocusMode = false,
  onEnterFocusMode,
  onUpdateShotReviewStatus,
  savingReviewStatus = false,
}) {
  const match = findShotById(selectedShotId)
  const scene = match?.scene
  const shot = match?.shot
  const selectionSuffix = getSelectionBreadcrumbSuffix(selectedRegion)
  const [regenerateError, setRegenerateError] = useState(null)
  const [storyboardOpen, setStoryboardOpen] = useState(false)
  const [imageDisplayMode, setImageDisplayMode] = useState('fit')
  const [fitMenuOpen, setFitMenuOpen] = useState(false)
  const isRegenerating = Boolean(shot?.apiId) && String(regeneratingShotApiId) === String(shot.apiId)
  const isSceneGenerating = isSceneGeneratingFlag(generatingSceneIds, scene?.apiId)
  const statusOptions = { isRegenerating, isSceneGenerating }
  const sceneStatus = scene ? getSceneImageStatus(scene, { isSceneGenerating }) : null
  const shotStatus = resolveShotImageStatus(shot ?? {}, statusOptions)
  const canRegenerate = canRegenerateShotImage(shot ?? {}, statusOptions)
  const regenerateBlockedReason = getRegenerateBlockedReason(shot ?? {}, scene, statusOptions)
  const { imageSrc, showGradient, thumbGradient } = useResolvedMediaPreview(shot, shot?.thumbGradient)

  const assetCounts = useMemo(
    () => getShotAssetCounts(shot, shotAssignments),
    [shot, shotAssignments]
  )

  const durationBadge = formatDurationBadge(shot)

  const metaSummary = useMemo(() => {
    return [
      shot?.shotType,
      durationBadge,
      `${assetCounts.characters} char`,
      `${assetCounts.environments} env`,
    ]
      .filter(Boolean)
      .join(' · ')
  }, [shot?.shotType, durationBadge, assetCounts.characters, assetCounts.environments])

  useEffect(() => {
    setRegenerateError(null)
  }, [shot?.apiId])

  useEffect(() => {
    if (!import.meta.env.DEV || !shot) return

    console.log('[Studio Regenerate]', {
      'scene.status': sceneStatus,
      'shot.image_status': shot.imageStatus,
      'shot.review_status': shot.reviewStatus,
      canRegenerate,
      isGenerating: isRegenerating,
      resolvedShotStatus: shotStatus,
      blockedReason: regenerateBlockedReason,
      isSceneGenerating,
    })
  }, [
    shot?.apiId,
    shot?.imageStatus,
    shot?.reviewStatus,
    sceneStatus,
    canRegenerate,
    isRegenerating,
    shotStatus,
    regenerateBlockedReason,
    isSceneGenerating,
  ])

  useEffect(() => {
    if (!fitMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (event.target.closest('[data-fit-menu]')) return
      setFitMenuOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setFitMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [fitMenuOpen])

  const handleRegenerate = async () => {
    if (!shot?.apiId || !onRegenerateShot || isRegenerating) return

    setRegenerateError(null)

    try {
      await onRegenerateShot(shot.apiId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image regeneration failed'
      setRegenerateError(message)
    }
  }

  const regenerateLabel = isRegenerating
    ? 'Regenerating…'
    : shotStatus === SHOT_IMAGE_STATUS.FAILED
      ? 'Retry'
      : 'Regenerate'

  const regenerateTitle = isRegenerating
    ? 'Regenerating shot image'
    : regenerateBlockedReason ?? regenerateLabel

  const handleApproveShot = () => {
    const reviewTargetId = shot?.apiId ?? shot?.id
    if (!reviewTargetId || !onUpdateShotReviewStatus || savingReviewStatus) return
    onUpdateShotReviewStatus(reviewTargetId, SHOT_REVIEW_STATUS.APPROVED)
  }

  const handleNeedsRevision = () => {
    const reviewTargetId = shot?.apiId ?? shot?.id
    if (!reviewTargetId || !onUpdateShotReviewStatus || savingReviewStatus) return
    onUpdateShotReviewStatus(reviewTargetId, SHOT_REVIEW_STATUS.NEEDS_REVISION)
  }

  return (
    <div className={`${styles.canvas} ${isFocusMode ? styles.canvasFocus : ''}`}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.shotIdentity}>
            <div className={styles.shotLines}>
              <span className={styles.sceneLine}>Scene {scene?.id ?? '—'}</span>
              <span className={styles.shotLine}>Shot {shot?.id ?? '—'}</span>
              {selectionSuffix ? (
                <span className={styles.selectionLine}>{selectionSuffix}</span>
              ) : (
                <h2 className={styles.titleLine}>{shot?.label ?? 'Untitled Shot'}</h2>
              )}
            </div>

            <ShotCharacterChips characters={assignedCharacters} />

            {metaSummary ? (
              <p className={styles.metaLine} aria-label="Shot metadata">
                {metaSummary}
              </p>
            ) : null}

            {shot ? (
              <ShotReviewControls
                reviewStatus={shot.reviewStatus}
                onApprove={onUpdateShotReviewStatus ? handleApproveShot : undefined}
                onNeedsRevision={onUpdateShotReviewStatus ? handleNeedsRevision : undefined}
                saving={savingReviewStatus}
                compact
              />
            ) : null}
          </div>

          <div className={styles.headerActions}>
            {shot?.apiId && onEditShot ? (
              <button type="button" className={styles.editBtn} onClick={onEditShot}>
                <IconEdit />
                <span>Edit Shot</span>
              </button>
            ) : null}
            {shot?.apiId && onRegenerateShot ? (
              <div className={styles.regenerateWrap}>
                <button
                  type="button"
                  className={`${styles.regenerateBtn} ${
                    isRegenerating ? styles.regenerateBtnLoading : ''
                  }`}
                  onClick={handleRegenerate}
                  disabled={!isRegenerating && !canRegenerate}
                  aria-busy={isRegenerating}
                  title={regenerateTitle}
                >
                  {isRegenerating ? (
                    <span className={styles.regenerateSpinner} aria-hidden="true" />
                  ) : (
                    <IconSparkle />
                  )}
                  <span>{regenerateLabel}</span>
                </button>
                {!isRegenerating && regenerateBlockedReason ? (
                  <p className={styles.regenerateBlockedHint}>{regenerateBlockedReason}</p>
                ) : null}
              </div>
            ) : null}
            <div className={styles.viewControls}>
              <div className={styles.fitMenuWrap} data-fit-menu>
                <button
                  type="button"
                  className={styles.fitBtn}
                  onClick={() => setFitMenuOpen((open) => !open)}
                  aria-expanded={fitMenuOpen}
                  aria-haspopup="listbox"
                  aria-label="Image display mode"
                >
                  <span>{imageDisplayMode === 'fit' ? 'Fit' : 'Fill'}</span>
                  <IconChevronDown />
                </button>
                {fitMenuOpen ? (
                  <div className={styles.fitMenu} role="listbox" aria-label="Image display mode">
                    <button
                      type="button"
                      role="option"
                      aria-selected={imageDisplayMode === 'fit'}
                      className={`${styles.fitMenuItem} ${imageDisplayMode === 'fit' ? styles.fitMenuItemActive : ''}`}
                      onClick={() => {
                        setImageDisplayMode('fit')
                        setFitMenuOpen(false)
                      }}
                    >
                      Fit
                    </button>
                    <button
                      type="button"
                      role="option"
                      aria-selected={imageDisplayMode === 'fill'}
                      className={`${styles.fitMenuItem} ${imageDisplayMode === 'fill' ? styles.fitMenuItemActive : ''}`}
                      onClick={() => {
                        setImageDisplayMode('fill')
                        setFitMenuOpen(false)
                      }}
                    >
                      Fill
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className={styles.viewBtn}
                aria-label="Storyboard grid"
                title="Storyboard"
                onClick={() => setStoryboardOpen(true)}
              >
                <IconGridView />
              </button>
              <button type="button" className={styles.viewBtn} aria-label="Frame view">
                <IconFit />
              </button>
              <button
                type="button"
                className={styles.viewBtn}
                aria-label="Full screen"
                title="Focus mode (F)"
                onClick={onEnterFocusMode}
              >
                <IconExpand />
              </button>
            </div>
          </div>
        </div>
        {regenerateError ? <p className={styles.regenerateError}>{regenerateError}</p> : null}
      </div>

      <div className={styles.previewWrap}>
        <div
          className={styles.previewCard}
          key={`${selectedShotId}-${shot?.imageVersion ?? shot?.imageUpdatedAt ?? ''}`}
        >
          <div
            className={`${styles.placeholder} ${
              imageDisplayMode === 'fit' ? styles.placeholderFit : styles.placeholderFill
            }`}
            style={
              !imageSrc
                ? { background: showGradient ? thumbGradient : shot?.thumbGradient }
                : undefined
            }
            aria-label={`Preview for ${shot?.label ?? 'shot'}`}
          >
            {imageSrc ? (
              <>
                {imageDisplayMode === 'fit' ? (
                  <div
                    className={styles.placeholderBackdrop}
                    style={{ backgroundImage: `url(${imageSrc})` }}
                    aria-hidden="true"
                  />
                ) : null}
                <img
                  className={styles.previewImage}
                  src={imageSrc}
                  alt=""
                  draggable={false}
                />
              </>
            ) : null}
          </div>

          {showShotCaptions && shot && <ShotCaptionBubble shot={shot} variant="canvas" />}

          <CanvasSelectionLayer
            regions={selectableRegions}
            selectedRegionId={selectedRegionId}
            onSelectRegion={onSelectRegion}
            visible={selectionModeActive}
            selectedRegion={selectedRegion}
          />

          <AssetSelectionToolbar
            activeTool={activeCanvasTool}
            onToolChange={onCanvasToolChange}
          />
        </div>
      </div>

      <StoryboardGridFullscreen
        open={storyboardOpen}
        onClose={() => setStoryboardOpen(false)}
      />
    </div>
  )
}
