import { useState } from 'react'
import styles from './EnvironmentThumbnail.module.css'

const ROW_GRADIENTS = [
  'linear-gradient(145deg, #134e4a 0%, #0f766e 50%, #14b8a6 100%)',
  'linear-gradient(145deg, #1e293b 0%, #334155 50%, #475569 100%)',
  'linear-gradient(145deg, #4a1942 0%, #7c3aed 55%, #a78bfa 100%)',
  'linear-gradient(145deg, #3d2914 0%, #6b4f2a 45%, #8f6b3d 100%)',
]

export default function EnvironmentThumbnail({ row }) {
  const [imageFailed, setImageFailed] = useState(false)
  const gradient = ROW_GRADIENTS[row.gradientIndex % ROW_GRADIENTS.length]
  const showLoader = row.imageStatus === 'generating'
  const showFailed = row.imageStatus === 'failed' || imageFailed
  const showImage =
    !showLoader &&
    !showFailed &&
    row.imageStatus === 'completed' &&
    Boolean(row.imageUrl)

  if (showLoader) {
    return (
      <span className={styles.thumb} aria-hidden="true">
        <span className={styles.loader} />
      </span>
    )
  }

  if (showFailed) {
    return (
      <span className={`${styles.thumb} ${styles.thumbFailed}`} style={{ background: gradient }}>
        <span className={styles.failedLabel}>Image failed</span>
      </span>
    )
  }

  if (showImage) {
    return (
      <span className={styles.thumb}>
        <img
          src={row.imageUrl}
          alt=""
          className={styles.thumbImg}
          onError={() => setImageFailed(true)}
        />
      </span>
    )
  }

  return <span className={styles.thumb} style={{ background: gradient }} aria-hidden="true" />
}
