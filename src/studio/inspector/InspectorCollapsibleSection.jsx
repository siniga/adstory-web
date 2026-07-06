import { useState } from 'react'
import { IconChevronDown } from '../icons'
import styles from './InspectorCollapsibleSection.module.css'

export default function InspectorCollapsibleSection({
  title,
  defaultOpen = true,
  children,
  trailing = null,
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className={styles.section}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true">
          <IconChevronDown />
        </span>
        <span className={styles.title}>{title}</span>
        {trailing ? <span className={styles.trailing}>{trailing}</span> : null}
      </button>
      {open ? <div className={styles.body}>{children}</div> : null}
    </section>
  )
}
