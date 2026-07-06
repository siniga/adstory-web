import { useEffect, useState } from 'react'
import CreationFullscreenReader from './CreationFullscreenReader'
import readerStyles from './CreationFullscreenReader.module.css'
import StepHeader from './StepHeader'
import styles from './StepLayout.module.css'

export default function FramesStep({
  frameGroups = [],
  onActionChange,
  onOpenStudio,
  generating,
  canOpenStudio = false,
}) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  useEffect(() => {
    if (!onActionChange) {
      return undefined
    }

    onActionChange({
      label: 'Open Studio',
      disabled: !canOpenStudio,
      onClick: onOpenStudio,
    })

    return () => onActionChange(null)
  }, [canOpenStudio, onActionChange, onOpenStudio])

  const subtitle =
    'Keyframes grouped by shot. Each frame becomes an editable visual in the Studio.'

  const framesContent = (
    <>
      {frameGroups.map((group) => (
        <div key={group.shotId} className={styles.frameGroup}>
          <div className={styles.frameGroupHeader}>
            Shot {group.shotId} — {group.shotLabel}
          </div>
          <div className={styles.frameGrid}>
            {group.frames.map((frame) => (
              <article key={frame.id} className={styles.frameCard}>
                <div
                  className={styles.frameThumb}
                  style={{ background: frame.thumbGradient }}
                  aria-hidden="true"
                />
                <span className={styles.frameId}>{frame.id}</span>
                <p className={styles.frameDesc}>{frame.description}</p>
                <span className={styles.frameDuration}>{frame.duration}</span>
              </article>
            ))}
          </div>
        </div>
      ))}
    </>
  )

  return (
    <div className={styles.step}>
      <StepHeader
        eyebrow="Step 6 of 8"
        title="Frames"
        subtitle={subtitle}
        onFullscreen={() => setFullscreenOpen(true)}
      />
      <div className={styles.content}>{framesContent}</div>
      <CreationFullscreenReader
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        eyebrow="Step 6 of 8"
        title="Frames"
        subtitle={subtitle}
      >
        <div className={readerStyles.scrollContent}>{framesContent}</div>
      </CreationFullscreenReader>
    </div>
  )
}
