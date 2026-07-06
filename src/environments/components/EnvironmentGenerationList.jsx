import EnvironmentGenerationPendingRow from './EnvironmentGenerationPendingRow'
import EnvironmentGenerationRow from './EnvironmentGenerationRow'
import styles from './EnvironmentGenerationList.module.css'

export default function EnvironmentGenerationList({
  rows = [],
  showPendingRow = false,
  downloadingRowId = null,
  onDownloadImage,
}) {
  return (
    <section className={styles.listSection} aria-label="Environment generation progress">
      <div className={styles.tableHeader}>
        <span>Environment</span>
        <span>Status</span>
      </div>

      <div className={styles.rows}>
        {rows.map((row) => (
          <EnvironmentGenerationRow
            key={row.id}
            row={row}
            isDownloading={String(downloadingRowId) === String(row.id)}
            onDownloadImage={onDownloadImage}
          />
        ))}
        {showPendingRow ? <EnvironmentGenerationPendingRow /> : null}
      </div>
    </section>
  )
}
