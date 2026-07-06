import styles from './EnvironmentDownloadButton.module.css'

const DISABLED_TOOLTIP = 'No generated image yet.'

export default function EnvironmentDownloadButton({
  row,
  isDownloading = false,
  onDownload,
}) {
  return (
    <button
      type="button"
      className={styles.btn}
      disabled={!row.canDownloadImage || isDownloading}
      title={!row.canDownloadImage ? DISABLED_TOOLTIP : 'Download Image'}
      onClick={() => onDownload?.(row)}
      aria-label={`Download image for ${row.name}`}
    >
      {isDownloading ? '…' : '↓'}
    </button>
  )
}
