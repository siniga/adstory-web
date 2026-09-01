import { useNavigate } from 'react-router-dom'
import { projectStoryboardPath } from '../../routes/paths'
import useStoryboardStale from '../useStoryboardStale'
import styles from './RegenerateStoryboardBanner.module.css'

export default function RegenerateStoryboardBanner({
  projectId,
  onRegenerate,
  regenerating = false,
}) {
  const navigate = useNavigate()
  const stale = useStoryboardStale(projectId)

  if (!stale && !regenerating) return null

  const handleClick = () => {
    if (regenerating || !projectId) return
    if (onRegenerate) {
      onRegenerate()
      return
    }
    navigate(projectStoryboardPath(projectId), {
      state: { regenerateStoryboard: true },
    })
  }

  return (
    <div className={styles.banner} role="status">
      <p className={styles.copy}>
        {regenerating
          ? 'Regenerating the storyboard from your latest edits…'
          : 'Your edits are not in the storyboard yet.'}
      </p>
      <button
        type="button"
        className={styles.button}
        onClick={handleClick}
        disabled={regenerating || !projectId}
      >
        {regenerating ? 'Regenerating…' : 'Regenerate storyboard'}
      </button>
    </div>
  )
}
