import {
  normalizeShotReviewStatus,
  SHOT_REVIEW_STATUS,
} from '../shotReviewStatus'
import { ShotReviewBadge } from './ShotReviewBadge'
import styles from './ShotReviewControls.module.css'

export default function ShotReviewControls({
  reviewStatus,
  onApprove,
  onNeedsRevision,
  saving = false,
  compact = false,
}) {
  const normalized = normalizeShotReviewStatus(reviewStatus)
  const isApproved = normalized === SHOT_REVIEW_STATUS.APPROVED
  const isNeedsRevision = normalized === SHOT_REVIEW_STATUS.NEEDS_REVISION

  return (
    <div className={`${styles.controls} ${compact ? styles.controlsCompact : ''}`}>
      <ShotReviewBadge status={normalized} className={styles.statusBadge} />
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.actionBtn} ${isApproved ? styles.actionBtnActive : ''}`}
          onClick={onApprove}
          disabled={saving || !onApprove}
        >
          Approve Shot
        </button>
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.actionBtnRevision} ${
            isNeedsRevision ? styles.actionBtnActiveRevision : ''
          }`}
          onClick={onNeedsRevision}
          disabled={saving || !onNeedsRevision}
        >
          Needs Revision
        </button>
      </div>
    </div>
  )
}
