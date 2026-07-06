import { buildMediaThumbStyle } from '../../utils/resolveMediaUrl'
import styles from './AssetCard.module.css'

function statusLabel(status) {
  if (status === 'approved' || status === 'accepted' || status === 'modified') return 'Approved'
  if (status === 'needs_review' || status === 'rejected' || status === 'skipped') return 'Needs Review'
  if (status === 'suggested' || status === 'draft') return 'Suggested'
  return 'Draft'
}

function statusBadgeClass(status) {
  if (status === 'approved' || status === 'accepted' || status === 'modified') return styles.badgeApproved
  if (status === 'needs_review' || status === 'rejected' || status === 'skipped') return styles.badgeReview
  if (status === 'suggested' || status === 'draft') return styles.badgeDraft
  return styles.badgeDraft
}

function identityStatusBadgeClass(status) {
  if (status === 'completed') return styles.badgeIdentityCompleted
  if (status === 'generating') return styles.badgeIdentityGenerating
  if (status === 'failed') return styles.badgeIdentityFailed
  if (status === 'queued') return styles.badgeIdentityQueued
  return styles.badgeIdentityPending
}

export default function AssetCard({
  name,
  role,
  ethnicity,
  status,
  identityStatus,
  identityStatusLabel,
  thumbGradient,
  previewImage,
  selected = false,
  generating = false,
  showCompletedCheck = false,
  isCurrentGenerating = false,
  onClick,
  variant = 'list',
}) {
  const thumbStyle = buildMediaThumbStyle(previewImage, thumbGradient)

  return (
    <button
      type="button"
      className={`${styles.card} ${styles[variant]} ${selected ? styles.selected : ''} ${generating ? styles.generating : ''} ${isCurrentGenerating || identityStatus === 'generating' ? styles.currentGenerating : ''}`}
      onClick={onClick}
      disabled={generating}
    >
      {variant !== 'addNew' ? (
        <span className={styles.thumb} style={thumbStyle} aria-hidden="true">
          {generating ? <span className={styles.spinner} aria-hidden="true" /> : null}
          {showCompletedCheck && !generating ? (
            <span className={styles.completedCheck} aria-hidden="true">
              ✓
            </span>
          ) : null}
        </span>
      ) : null}
      <span className={styles.meta}>
        <span className={styles.name}>{name}</span>
        {role ? <span className={styles.role}>{role}</span> : null}
        {ethnicity ? <span className={styles.ethnicity}>{ethnicity}</span> : null}
      </span>
      {variant === 'list' ? (
        <span
          className={`${styles.badge} ${
            identityStatusLabel
              ? identityStatusBadgeClass(identityStatus)
              : statusBadgeClass(status)
          }`}
        >
          {identityStatusLabel ?? statusLabel(status)}
        </span>
      ) : null}
    </button>
  )
}
