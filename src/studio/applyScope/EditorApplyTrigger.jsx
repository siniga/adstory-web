import styles from './EditorApplyTrigger.module.css'

export default function EditorApplyTrigger({ label, onClick }) {
  return (
    <div className={styles.row}>
      <button type="button" className={styles.button} onClick={onClick}>
        {label}
      </button>
    </div>
  )
}
