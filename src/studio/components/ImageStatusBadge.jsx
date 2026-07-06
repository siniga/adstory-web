import {
  getShotStatusBadgeLabel,
  SHOT_IMAGE_STATUS,
} from '../imageStatus'
import { StatusDot } from './StatusDot'
import styles from './ImageStatusBadge.module.css'

const STATUS_VARIANT = {
  [SHOT_IMAGE_STATUS.PENDING]: 'pending',
  [SHOT_IMAGE_STATUS.GENERATING]: 'generating',
  [SHOT_IMAGE_STATUS.COMPLETED]: 'done',
  [SHOT_IMAGE_STATUS.FAILED]: 'failed',
}

const SCENE_STATUS_VARIANT = {
  not_generated: 'notGenerated',
  generating: 'generating',
  complete: 'complete',
  some_failed: 'someFailed',
}

export function ShotStatusBadge({ status, className = '' }) {
  const label = getShotStatusBadgeLabel(status)
  const variant = STATUS_VARIANT[status] ?? 'pending'
  const pulse = status === SHOT_IMAGE_STATUS.GENERATING

  return (
    <StatusDot
      label={label}
      variant={variant}
      pulse={pulse}
      className={`${styles.statusDot} ${className}`.trim()}
    />
  )
}

export function SceneStatusBadge({ status, label }) {
  const variant = SCENE_STATUS_VARIANT[status] ?? 'notGenerated'
  const pulse = status === 'generating'

  return (
    <StatusDot
      label={label}
      variant={variant}
      pulse={pulse}
      className={styles.statusDot}
    />
  )
}
