import styles from './EnvironmentEditorSection.module.css'

export function SectionBlock({ title, subtitle, children }) {
  return (
    <section className={styles.block}>
      {title && (
        <header className={styles.blockHeader}>
          <h3 className={styles.blockTitle}>{title}</h3>
          {subtitle && <p className={styles.blockSubtitle}>{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  )
}

export function VisualGrid({ columns = 3, children }) {
  return (
    <div className={styles.visualGrid} style={{ '--grid-cols': columns }}>
      {children}
    </div>
  )
}

export function VisualOptionCard({ label, selected, onClick, gradient, icon, compact }) {
  return (
    <button
      type="button"
      className={`${styles.visualCard} ${selected ? styles.visualCardActive : ''} ${compact ? styles.visualCardCompact : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <div className={styles.visualThumb} style={{ background: gradient }} aria-hidden="true">
        {icon && <span className={styles.visualIcon}>{icon}</span>}
      </div>
      <span className={styles.visualLabel}>{label}</span>
    </button>
  )
}

export function PaletteSwatchCard({ label, gradient, selected, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.paletteCard} ${selected ? styles.paletteCardActive : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className={styles.paletteStrip} style={{ background: gradient }} aria-hidden="true" />
      <span className={styles.visualLabel}>{label}</span>
    </button>
  )
}
