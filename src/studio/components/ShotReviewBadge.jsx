import {
  getShotReviewBadgeLabel,
  normalizeShotReviewStatus,
  SHOT_REVIEW_STATUS,
} from '../shotReviewStatus'
import { StatusDot } from './StatusDot'
import styles from './ImageStatusBadge.module.css'

const REVIEW_VARIANT = {
  [SHOT_REVIEW_STATUS.DRAFT]: 'reviewDraft',
  [SHOT_REVIEW_STATUS.APPROVED]: 'reviewApproved',
  [SHOT_REVIEW_STATUS.NEEDS_REVISION]: 'reviewNeedsWork',
}

export function ShotReviewBadge({ status, className = '' }) {
  const normalized = normalizeShotReviewStatus(status)
  const label = getShotReviewBadgeLabel(normalized)
  const variant = REVIEW_VARIANT[normalized] ?? 'reviewDraft'

  return (
    <StatusDot
      label={label}
      variant={variant}
      className={`${styles.statusDot} ${className}`.trim()}
    />
  )
}
