import { PRODUCER_NOTES } from '../creationData'
import { IconSparkle } from '../../studio/icons'
import styles from './AIProducerNotesPanel.module.css'

export default function AIProducerNotesPanel({ step }) {
  const notes = PRODUCER_NOTES[step] ?? []

  if (notes.length === 0) return null

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <IconSparkle />
        <h2 className={styles.title}>AI Producer Notes</h2>
      </div>
      <div className={styles.notes}>
        {notes.map((note) => (
          <div key={note.title} className={styles.noteCard}>
            <h3 className={styles.noteTitle}>{note.title}</h3>
            <p className={styles.noteText}>{note.text}</p>
          </div>
        ))}
      </div>
    </aside>
  )
}
