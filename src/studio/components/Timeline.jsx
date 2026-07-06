import { useEffect, useRef, useState } from 'react'
import { resolveShotImageSrc } from '../../utils/resolveMediaUrl'
import { getActiveScenes } from '../activeProject'
import {
  getAdjacentShotSelectionKey,
  getShotSelectionKey,
  isShotSelected,
} from '../shotSelection'
import { getTotalShotCount } from '../data'
import {
  isSceneGenerating,
  resolveShotImageStatus,
  SHOT_IMAGE_STATUS,
} from '../imageStatus'
import { getShotAssetCounts } from '../shotAssetCounts'
import { IconChevronLeft, IconChevronRight } from '../icons'
import { ShotStatusBadge } from './ImageStatusBadge'
import { ShotReviewBadge } from './ShotReviewBadge'
import { StatusDotGroup } from './StatusDot'
import ShotCaptionBubble from './ShotCaptionBubble'
import styles from './Timeline.module.css'

function ShotThumbnail({ shot, isRegenerating, showGeneratingOverlay }) {
  const imageSrc = resolveShotImageSrc(shot)
  const [failed, setFailed] = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const srcWhenRegenStarted = useRef(null)
  const waitingForNewImage = useRef(false)
  const imgRef = useRef(null)

  useEffect(() => {
    setFailed(false)
  }, [imageSrc])

  useEffect(() => {
    if (isRegenerating) {
      srcWhenRegenStarted.current = imageSrc
      waitingForNewImage.current = true
      setShowLoader(true)
      return
    }

    if (showGeneratingOverlay) {
      setShowLoader(true)
      return
    }

    if (!waitingForNewImage.current) {
      setShowLoader(false)
      return
    }

    if (imageSrc === srcWhenRegenStarted.current) {
      waitingForNewImage.current = false
      setShowLoader(false)
      return
    }

    if (imgRef.current?.complete) {
      finishLoading()
    }
  }, [isRegenerating, imageSrc, showGeneratingOverlay])

  const finishLoading = () => {
    if (!waitingForNewImage.current) return
    if (imageSrc !== srcWhenRegenStarted.current) {
      waitingForNewImage.current = false
      setShowLoader(false)
    }
  }

  return (
    <div className={styles.thumbWrap}>
      {imageSrc && !failed ? (
        <img
          ref={imgRef}
          key={imageSrc ?? shot.id}
          className={styles.thumbImage}
          src={imageSrc}
          alt=""
          onLoad={finishLoading}
          onError={() => {
            setFailed(true)
            finishLoading()
          }}
        />
      ) : (
        <div className={styles.thumbGradient} style={{ background: shot.thumbGradient }} />
      )}
      {showLoader && (
        <div className={styles.thumbLoader} aria-label="Regenerating image">
          <span className={styles.thumbSpinner} />
        </div>
      )}
    </div>
  )
}

const MAX_REVEAL_ITEMS = 4
const EDGE_PADDING = 8

function getOrderedCards(track) {
  return Array.from(track.querySelectorAll('[data-timeline-card]'))
}

function getVisibleCards(track, orderedCards) {
  const trackRect = track.getBoundingClientRect()

  return orderedCards.filter((card) => {
    const rect = card.getBoundingClientRect()
    return rect.right > trackRect.left && rect.left < trackRect.right
  })
}

function getAllHiddenCardsToRight(track, orderedCards) {
  const trackRect = track.getBoundingClientRect()

  return orderedCards.filter((card) => {
    const rect = card.getBoundingClientRect()
    return rect.left >= trackRect.right - EDGE_PADDING
  })
}

function getAllHiddenCardsToLeft(track, orderedCards) {
  const trackRect = track.getBoundingClientRect()

  return orderedCards.filter((card) => {
    const rect = card.getBoundingClientRect()
    return rect.right <= trackRect.left + EDGE_PADDING
  })
}

function isNearTrailingEdge(card, visibleCards) {
  const visibleIndex = visibleCards.indexOf(card)
  if (visibleIndex === -1) return false

  const lastIndex = visibleCards.length - 1
  return visibleIndex === lastIndex || visibleIndex === lastIndex - 1
}

function isNearLeadingEdge(card, visibleCards) {
  const visibleIndex = visibleCards.indexOf(card)
  if (visibleIndex === -1) return false

  return visibleIndex === 0 || visibleIndex === 1
}

function revealHiddenFromEdge(track, card) {
  if (!track || !card) return

  const orderedCards = getOrderedCards(track)
  if (!orderedCards.includes(card)) return

  const visibleCards = getVisibleCards(track, orderedCards)
  if (!visibleCards.length) return

  const trackRect = track.getBoundingClientRect()

  if (isNearTrailingEdge(card, visibleCards)) {
    const hiddenRight = getAllHiddenCardsToRight(track, orderedCards)
    const revealCount = Math.min(MAX_REVEAL_ITEMS, hiddenRight.length)
    if (revealCount === 0) return

    const targetCard = hiddenRight[revealCount - 1]
    const targetRect = targetCard.getBoundingClientRect()
    const scrollAmount = targetRect.right - trackRect.right + EDGE_PADDING

    if (scrollAmount > 0) {
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
    return
  }

  if (isNearLeadingEdge(card, visibleCards)) {
    const hiddenLeft = getAllHiddenCardsToLeft(track, orderedCards)
    const revealCount = Math.min(MAX_REVEAL_ITEMS, hiddenLeft.length)
    if (revealCount === 0) return

    const targetCard = hiddenLeft[hiddenLeft.length - revealCount]
    const targetRect = targetCard.getBoundingClientRect()
    const scrollAmount = targetRect.left - trackRect.left - EDGE_PADDING

    if (scrollAmount < 0) {
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }
}

function scrollCardIntoViewIfNeeded(track, card) {
  revealHiddenFromEdge(track, card)
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

function ShotMetaRow({ counts }) {
  const summary = `${counts.characters}·${counts.environments}·${counts.objects}`

  return (
    <span className={styles.metaRow} aria-label="Shot assets" title="Characters · Environments · Objects">
      {summary}
    </span>
  )
}

export default function Timeline({
  selectedShotId,
  onSelectShot,
  regeneratingShotApiId = null,
  selectingShotCandidateId = null,
  generatingSceneIds = {},
  navigationEnabled = true,
  showShotCaptions = false,
  onShowShotCaptionsChange,
  shotAssignments = {},
  compact = false,
}) {
  const trackRef = useRef(null)
  const cardRefs = useRef({})
  const scenes = getActiveScenes()
  const totalShots = getTotalShotCount(scenes)

  useEffect(() => {
    const track = trackRef.current
    const card = cardRefs.current[selectedShotId]
    if (!track || !card) return undefined

    const frameId = requestAnimationFrame(() => {
      scrollCardIntoViewIfNeeded(track, card)
    })

    return () => cancelAnimationFrame(frameId)
  }, [selectedShotId])

  useEffect(() => {
    if (!navigationEnabled) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      if (isEditableTarget(event.target)) {
        return
      }

      const offset = event.key === 'ArrowRight' ? 1 : -1
      const nextKey = getAdjacentShotSelectionKey(scenes, selectedShotId, offset)

      if (nextKey && nextKey !== String(selectedShotId)) {
        event.preventDefault()
        onSelectShot(nextKey)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigationEnabled, onSelectShot, scenes, selectedShotId])

  const scrollTrack = (direction) => {
    trackRef.current?.scrollBy({ left: direction * 160, behavior: 'smooth' })
  }

  return (
    <div className={`${styles.timeline} ${compact ? styles.timelineFocus : ''}`}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>{totalShots} shots</span>
        <label className={styles.captionToggle}>
          <span className={styles.captionToggleLabel}>Captions</span>
          <input
            type="checkbox"
            className={styles.captionSwitch}
            checked={showShotCaptions}
            onChange={(event) => onShowShotCaptionsChange?.(event.target.checked)}
            aria-label="Show shot captions on images"
          />
        </label>
      </div>
      <div className={styles.strip}>
        <button type="button" className={styles.navBtn} aria-label="Scroll left" onClick={() => scrollTrack(-1)}>
          <IconChevronLeft />
        </button>
        <div className={styles.track} ref={trackRef}>
          {scenes.map((scene) => (
            <div key={scene.id} className={styles.sceneBlock}>
              <div className={styles.sceneLabel}>
                <span className={styles.sceneNumber}>Scene {scene.id}</span>
                <span className={styles.sceneTitle}>{scene.title}</span>
              </div>
              <div className={styles.shotRow}>
                {scene.shots.map((shot) => {
                  const selectionKey = getShotSelectionKey(scene, shot)
                  const isSelected = isShotSelected(scene, shot, selectedShotId)
                  const sceneGenerating = isSceneGenerating(generatingSceneIds, scene.apiId)
                  const isRegenerating =
                    Boolean(shot.apiId) &&
                    (String(regeneratingShotApiId) === String(shot.apiId) ||
                      String(selectingShotCandidateId) === String(shot.apiId))
                  const shotStatus = resolveShotImageStatus(shot, {
                    isRegenerating,
                    isSceneGenerating: sceneGenerating,
                  })
                  const showGeneratingOverlay = shotStatus === SHOT_IMAGE_STATUS.GENERATING
                  const assetCounts = getShotAssetCounts(shot, shotAssignments)
                  return (
                    <button
                      key={selectionKey}
                      data-timeline-card
                      ref={(el) => {
                        cardRefs.current[selectionKey] = el
                      }}
                      type="button"
                      className={`${styles.shotCard} ${isSelected ? styles.shotCardActive : ''}`}
                      onClick={() => onSelectShot(selectionKey)}
                      aria-label={`Shot ${shot.id}: ${shot.label}`}
                      aria-current={isSelected ? 'true' : undefined}
                    >
                      {isSelected && <span className={styles.activeDot} aria-hidden="true" />}
                      <div className={styles.thumbnail}>
                        <ShotThumbnail
                          shot={shot}
                          isRegenerating={isRegenerating}
                          showGeneratingOverlay={showGeneratingOverlay}
                        />
                        {showShotCaptions && <ShotCaptionBubble shot={shot} variant="timeline" />}
                        <StatusDotGroup className={styles.statusDots}>
                          <ShotReviewBadge status={shot.reviewStatus} />
                          <ShotStatusBadge status={shotStatus} />
                        </StatusDotGroup>
                      </div>
                      <span className={styles.shotNumber}>{shot.id}</span>
                      <ShotMetaRow counts={assetCounts} />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <button type="button" className={styles.navBtn} aria-label="Scroll right" onClick={() => scrollTrack(1)}>
          <IconChevronRight />
        </button>
      </div>
    </div>
  )
}
