import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconChevronLeft, IconChevronRight, IconClose, IconSparkle } from '../../studio/icons'
import { getShotVersionImageUrl } from '../../utils/resolveMediaUrl'
import styles from './ShotFullscreenViewer.module.css'

function shotDiary(shot) {
  return {
    description: String(shot?.description ?? '').trim(),
    action: String(shot?.action ?? '').trim(),
    dialogue: String(shot?.dialogue ?? '').trim(),
    notes: String(shot?.meta?.editor?.notes ?? shot?.meta?.notes ?? '').trim(),
  }
}

function completedVersions(shot) {
  return [...(shot?.shot_images ?? [])]
    .filter((version) => version.status === 'completed' && (version.image_url || version.thumbnail_url))
    .sort((a, b) => (a.version_number ?? 0) - (b.version_number ?? 0))
}

export default function ShotFullscreenViewer({
  open,
  items = [],
  index = 0,
  onIndexChange,
  onClose,
  readOnly = false,
  regenerating = false,
  regenerateError = null,
  onRegenerate,
}) {
  const thumbRefs = useRef([])
  const diaryRef = useRef(null)
  const promptRef = useRef(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [previewVersionId, setPreviewVersionId] = useState(null)
  const current = items[index] ?? null
  const diary = shotDiary(current?.shot)
  const hasDiary = Boolean(diary.description || diary.action || diary.dialogue || diary.notes)
  const versions = completedVersions(current?.shot)
  const previewVersion = versions.find((version) => String(version.id) === String(previewVersionId))
  const displayUrl = previewVersion ? getShotVersionImageUrl(previewVersion) : current?.imageUrl
  const canPrev = index > 0
  const canNext = index < items.length - 1
  const canRegenerate = Boolean(!readOnly && onRegenerate && current?.shot?.apiId && current?.imageUrl)

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      const typing = event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement
      if (event.key === 'Escape') {
        if (promptOpen && !regenerating) {
          setPromptOpen(false)
          return
        }
        onClose?.()
        return
      }
      if (typing) return
      if (event.key === 'ArrowLeft' && canPrev) {
        event.preventDefault()
        onIndexChange?.(index - 1)
      }
      if (event.key === 'ArrowRight' && canNext) {
        event.preventDefault()
        onIndexChange?.(index + 1)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, index, canPrev, canNext, onClose, onIndexChange, promptOpen, regenerating])

  useEffect(() => {
    if (!open) return
    const node = thumbRefs.current[index]
    node?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    if (diaryRef.current) diaryRef.current.scrollTop = 0
    setPromptOpen(false)
    setPrompt('')
    setPreviewVersionId(null)
  }, [open, index])

  useEffect(() => {
    if (promptOpen) promptRef.current?.focus()
  }, [promptOpen])

  if (!open || !current) return null

  const handlePromptSubmit = async (event) => {
    event.preventDefault()
    const value = prompt.trim()
    if (!value || regenerating || !canRegenerate) return
    try {
      await onRegenerate?.(current.shot, value)
      setPrompt('')
      setPromptOpen(false)
      setPreviewVersionId(null)
    } catch {
      // Parent surfaces regenerateError.
    }
  }

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={current.title}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.kicker}>{current.sceneLabel}</p>
          <h2 className={styles.title}>{current.title}</h2>
        </div>
        <div className={styles.headerActions}>
          {canRegenerate ? (
            <button
              type="button"
              className={`${styles.regenBtn} ${promptOpen ? styles.regenBtnActive : ''}`}
              onClick={() => setPromptOpen((openPrompt) => !openPrompt)}
              disabled={regenerating}
              aria-expanded={promptOpen}
            >
              <IconSparkle />
              {regenerating ? 'Updating…' : 'Regenerate'}
            </button>
          ) : null}
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close fullscreen">
            <IconClose />
          </button>
        </div>
      </header>

      <div className={styles.stage}>
        <button
          type="button"
          className={`${styles.navBtn} ${styles.navPrev}`}
          onClick={() => onIndexChange?.(index - 1)}
          disabled={!canPrev}
          aria-label="Previous shot"
        >
          <IconChevronLeft />
        </button>

        <div className={styles.stageSplit}>
          <div className={styles.stageImage}>
            <div className={styles.imageFrame}>
              {displayUrl ? (
                <img src={displayUrl} alt={current.title} className={styles.image} />
              ) : (
                <div className={styles.placeholder}>No image yet</div>
              )}
              {regenerating ? (
                <div className={styles.generatingVeil} role="status">
                  Regenerating…
                </div>
              ) : null}
            </div>

            {promptOpen && canRegenerate ? (
              <form className={styles.promptBox} onSubmit={handlePromptSubmit}>
                <textarea
                  ref={promptRef}
                  className={styles.promptInput}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="What should change in this image?"
                  rows={2}
                  disabled={regenerating}
                />
                <div className={styles.promptRow}>
                  {regenerateError ? <p className={styles.promptError}>{regenerateError}</p> : <span />}
                  <button
                    type="submit"
                    className={styles.promptSubmit}
                    disabled={regenerating || !prompt.trim()}
                  >
                    {regenerating ? 'Working…' : 'Regenerate'}
                  </button>
                </div>
              </form>
            ) : null}

            {versions.length > 1 ? (
              <div className={styles.versions} aria-label="Image versions">
                {versions.map((version) => {
                  const versionUrl = getShotVersionImageUrl(version)
                  const isCurrent = previewVersion
                    ? String(version.id) === String(previewVersion.id)
                    : String(version.id) === String(versions[versions.length - 1]?.id)
                  return (
                    <button
                      key={version.id ?? version.version_number}
                      type="button"
                      className={`${styles.versionThumb} ${isCurrent ? styles.versionThumbCurrent : ''}`}
                      onClick={() => setPreviewVersionId(version.id)}
                      aria-current={isCurrent ? 'true' : undefined}
                      aria-label={`Version ${version.version_number ?? ''}`}
                    >
                      {versionUrl ? (
                        <img src={versionUrl} alt="" className={styles.versionImage} />
                      ) : (
                        <span className={styles.versionPlaceholder}>v</span>
                      )}
                      <span className={styles.versionLabel}>v{version.version_number ?? '?'}</span>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          <aside className={styles.diary} ref={diaryRef} aria-label="Shot description">
            <p className={styles.diaryKicker}>{current.sceneLabel}</p>
            <h3 className={styles.diaryTitle}>{current.title}</h3>

            {diary.description ? (
              <section className={styles.diarySection}>
                <h4>Description</h4>
                <p>{diary.description}</p>
              </section>
            ) : null}

            {diary.action ? (
              <section className={styles.diarySection}>
                <h4>Action</h4>
                <p>{diary.action}</p>
              </section>
            ) : null}

            {diary.dialogue ? (
              <section className={styles.diarySection}>
                <h4>Dialogue</h4>
                <p className={styles.diaryDialogue}>“{diary.dialogue}”</p>
              </section>
            ) : null}

            {diary.notes ? (
              <section className={styles.diarySection}>
                <h4>Notes</h4>
                <p>{diary.notes}</p>
              </section>
            ) : null}

            {!hasDiary ? (
              <p className={styles.diaryEmpty}>No description for this shot yet.</p>
            ) : null}
          </aside>
        </div>

        <button
          type="button"
          className={`${styles.navBtn} ${styles.navNext}`}
          onClick={() => onIndexChange?.(index + 1)}
          disabled={!canNext}
          aria-label="Next shot"
        >
          <IconChevronRight />
        </button>
      </div>

      <div className={styles.strip}>
        <p className={styles.stripLabel}>
          Shot {index + 1} of {items.length}
        </p>
        <div className={styles.stripTrack}>
          {items.map((item, itemIndex) => {
            const isCurrent = itemIndex === index
            return (
              <button
                key={item.key}
                type="button"
                ref={(node) => {
                  thumbRefs.current[itemIndex] = node
                }}
                className={`${styles.thumb} ${isCurrent ? styles.thumbCurrent : ''}`}
                onClick={() => onIndexChange?.(itemIndex)}
                aria-current={isCurrent ? 'true' : undefined}
                aria-label={`${item.sceneLabel}: ${item.title}${isCurrent ? ' (current)' : ''}`}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className={styles.thumbImage} />
                ) : (
                  <span className={styles.thumbPlaceholder}>□</span>
                )}
                <span className={styles.thumbCaption}>
                  {item.sceneLabel} · {item.title}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
