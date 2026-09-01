import styles from './AssetWorkflowLayout.module.css'

export default function AssetWorkflowLayout({
  children,
  footer,
}) {
  return (
    <div className={styles.flow}>
      <div className={styles.body}>
        <div className={styles.main}>
          <div className={styles.content}>{children}</div>
          {footer}
        </div>
      </div>
    </div>
  )
}
