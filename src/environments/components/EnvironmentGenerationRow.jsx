import CharacterGenerationStatusBadge from '../../assetsLibrary/components/charactersGeneration/CharacterGenerationStatusBadge'
import EnvironmentDownloadButton from './EnvironmentDownloadButton'
import EnvironmentThumbnail from './EnvironmentThumbnail'
import styles from './EnvironmentGenerationRow.module.css'

export default function EnvironmentGenerationRow({
  row,
  isDownloading = false,
  onDownloadImage,
}) {
  return (
    <div
      className={`${styles.rowWrap} ${row.statusTone === 'completed' ? styles.rowCompleted : ''}`}
      style={{ animationDelay: `${row.gradientIndex * 60}ms` }}
    >
      <div className={styles.row}>
        <div className={styles.environmentCell}>
          <EnvironmentThumbnail row={row} />
          <div className={styles.meta}>
            <span className={styles.name}>{row.name}</span>
            {row.type ? <span className={styles.detail}>{row.type}</span> : null}
            {row.location ? <span className={styles.detailMuted}>{row.location}</span> : null}
            {row.timeOfDay ? <span className={styles.detailMuted}>{row.timeOfDay}</span> : null}
            {row.mood ? <span className={styles.detailMuted}>{row.mood}</span> : null}
            <span className={styles.statusMeta}>
              {row.assetStatusLabel ? (
                <span className={styles.assetStatus}>Status: {row.assetStatusLabel}</span>
              ) : null}
            </span>
          </div>
        </div>

        <div className={styles.statusCell}>
          <CharacterGenerationStatusBadge
            tone={row.imageStatusTone}
            label={row.imageStatusLabel}
          />
          <CharacterGenerationStatusBadge tone={row.statusTone} label={row.statusLabel} />
          <EnvironmentDownloadButton
            row={row}
            isDownloading={isDownloading}
            onDownload={onDownloadImage}
          />
        </div>
      </div>
    </div>
  )
}
