import styles from './ObjectEditorSection.module.css'

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

export function CatalogGroup({ label, children }) {
  return (
    <div className={styles.catalogGroup}>
      {label && <h4 className={styles.catalogLabel}>{label}</h4>}
      {children}
    </div>
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

export function ColorSwatchGrid({ options, value, onChange }) {
  return (
    <div className={styles.swatchGrid}>
      {options.map((option) => {
        const selected = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            className={`${styles.colorSwatch} ${selected ? styles.colorSwatchActive : ''}`}
            onClick={() => onChange(option.id)}
            aria-pressed={selected}
            aria-label={option.label}
          >
            <span className={styles.colorSwatchDot} style={{ background: option.color }} />
            <span className={styles.colorSwatchLabel}>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
