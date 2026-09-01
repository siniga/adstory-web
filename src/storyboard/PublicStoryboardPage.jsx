import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BRAND } from '../config/branding'
import { getPublicStoryboard } from '../services/projectApi'
import { formatUserFriendlyError } from '../utils/userFriendlyErrors'
import shellStyles from '../app/AppShell.module.css'
import StoryboardBasicView from './components/StoryboardBasicView'
import ShotFullscreenViewer from './components/ShotFullscreenViewer'
import { collectShotLightboxItems, findLightboxIndex } from './shotLightbox'
import { mapPublicStoryboard } from './mapPublicStoryboard'
import styles from './ProjectStoryboard.module.css'
import publicStyles from './PublicStoryboardPage.module.css'

export default function PublicStoryboardPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [board, setBoard] = useState(null)
  const [fullscreenIndex, setFullscreenIndex] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setBoard(null)
    setFullscreenIndex(null)

    getPublicStoryboard(token)
      .then((storyboard) => {
        if (cancelled) return
        setBoard(mapPublicStoryboard(storyboard))
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          formatUserFriendlyError(
            err instanceof Error ? err.message : 'This shared storyboard is no longer available.'
          ).message
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const lightboxItems = useMemo(
    () => collectShotLightboxItems(board?.scenes ?? [], board?.shotsBySceneId ?? {}),
    [board]
  )

  const handleOpenFullscreen = (shot) => {
    setFullscreenIndex(findLightboxIndex(lightboxItems, shot))
  }

  if (loading) {
    return <div className={shellStyles.loading}>Loading storyboard…</div>
  }

  if (error || !board) {
    return (
      <div className={publicStyles.missing}>
        <p>{error || 'This shared storyboard is no longer available.'}</p>
        <Link to="/login" className={publicStyles.missingLink}>
          Go to {BRAND.name}
        </Link>
      </div>
    )
  }

  return (
    <div className={`${shellStyles.shell} ${publicStyles.shell}`}>
      <div className={shellStyles.content}>
        <div className={`${shellStyles.paneActive} ${styles.page}`}>
          <header className={styles.pageBar}>
            <span className={styles.pageBarTitle}>{board.title}</span>
            <span className={publicStyles.badge}>Shared storyboard</span>
            <Link to="/login" className={publicStyles.brandLink}>
              {BRAND.name}
            </Link>
          </header>

          <StoryboardBasicView
            scenes={board.scenes}
            shotsBySceneId={board.shotsBySceneId}
            loading={false}
            readOnly
            onFullscreenShot={handleOpenFullscreen}
          />

          <ShotFullscreenViewer
            open={fullscreenIndex != null && lightboxItems.length > 0}
            items={lightboxItems}
            index={Math.min(fullscreenIndex ?? 0, Math.max(lightboxItems.length - 1, 0))}
            onIndexChange={setFullscreenIndex}
            onClose={() => setFullscreenIndex(null)}
            readOnly
          />
        </div>
      </div>
    </div>
  )
}
