import CharacterGenerationPendingRow from './CharacterGenerationPendingRow'
import CharacterGenerationRow from './CharacterGenerationRow'
import styles from './CharacterGenerationList.module.css'

export default function CharacterGenerationList({
  rows = [],
  showPendingRow = false,
  downloadingRowId = null,
  onDownloadHero,
  onDownloadReferences,
}) {
  return (
    <section className={styles.listSection} aria-label="Character generation progress">
      <div className={styles.tableHeader}>
        <span>Character</span>
        <span>Status</span>
      </div>

      <div className={styles.rows}>
        {rows.map((row) => (
          <CharacterGenerationRow
            key={row.id}
            row={row}
            isDownloading={String(downloadingRowId) === String(row.id)}
            onDownloadHero={onDownloadHero}
            onDownloadReferences={onDownloadReferences}
          />
        ))}
        {showPendingRow ? <CharacterGenerationPendingRow /> : null}
      </div>
    </section>
  )
}
