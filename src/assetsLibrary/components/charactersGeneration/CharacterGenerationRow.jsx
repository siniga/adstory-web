import { useMemo } from 'react'
import { buildMediaThumbStyle } from '../../../utils/resolveMediaUrl'
import CharacterGenerationStatusBadge from './CharacterGenerationStatusBadge'
import CharacterDownloadMenu from './CharacterDownloadMenu'
import styles from './CharacterGenerationRow.module.css'

const AVATAR_GRADIENTS = [
  'linear-gradient(145deg, #3d2914 0%, #6b4f2a 45%, #8f6b3d 100%)',
  'linear-gradient(145deg, #1e293b 0%, #334155 50%, #475569 100%)',
  'linear-gradient(145deg, #4a1942 0%, #7c3aed 55%, #a78bfa 100%)',
  'linear-gradient(145deg, #134e4a 0%, #0f766e 50%, #14b8a6 100%)',
  'linear-gradient(145deg, #1f2937 0%, #374151 50%, #6b7280 100%)',
]

export default function CharacterGenerationRow({
  row,
  isDownloading = false,
  onDownloadHero,
  onDownloadReferences,
}) {
  const gradient = AVATAR_GRADIENTS[row.gradientIndex % AVATAR_GRADIENTS.length]
  const thumbStyle = useMemo(
    () => buildMediaThumbStyle(row.heroImageUrl, gradient),
    [row.heroImageUrl, gradient]
  )

  return (
    <div
      className={`${styles.rowWrap} ${row.statusTone === 'completed' ? styles.rowCompleted : ''}`}
      style={{ animationDelay: `${row.gradientIndex * 60}ms` }}
    >
      <div className={styles.row}>
        <div className={styles.characterCell}>
          <span className={styles.avatar} style={thumbStyle} aria-hidden="true" />
          <div className={styles.characterMeta}>
            <span className={styles.name}>{row.name}</span>
            {row.role ? <span className={styles.role}>{row.role}</span> : null}
            {row.ethnicity ? <span className={styles.ethnicity}>{row.ethnicity}</span> : null}
          </div>
        </div>

        <div className={styles.statusCell}>
          <CharacterGenerationStatusBadge tone={row.statusTone} label={row.statusLabel} />
          {row.buildStatus === 'completed' ? (
            <CharacterDownloadMenu
              row={row}
              isDownloading={isDownloading}
              onDownloadHero={onDownloadHero}
              onDownloadReferences={onDownloadReferences}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
