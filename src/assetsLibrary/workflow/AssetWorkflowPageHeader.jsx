import GenerateButton from './GenerateButton'
import styles from './AssetWorkflowPageHeader.module.css'

export default function AssetWorkflowPageHeader({
  title,
  description,
  generateAllLabel,
  onGenerateAll,
  generateAllDisabled = false,
  generateAllLoading = false,
}) {
  return (
    <header className={styles.header}>
      <div className={styles.copy}>
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      <GenerateButton
        label={generateAllLabel}
        onClick={onGenerateAll}
        disabled={generateAllDisabled}
        loading={generateAllLoading}
        variant="primary"
      />
    </header>
  )
}
