import styles from './AssetWorkflowInfoCard.module.css'

export default function AssetWorkflowInfoCard({ children }) {
  return (
    <aside className={styles.card}>
      <p className={styles.text}>{children}</p>
    </aside>
  )
}
