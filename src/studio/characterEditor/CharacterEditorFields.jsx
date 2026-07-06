import styles from './CharacterEditorSection.module.css'

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

export function VisualOptionCard({
  label,
  selected,
  onClick,
  gradient,
  color,
  icon,
  thumbClass,
  compact,
}) {
  const thumbStyle = color ? { background: color } : { background: gradient }

  return (
    <button
      type="button"
      className={`${styles.visualCard} ${selected ? styles.visualCardActive : ''} ${compact ? styles.visualCardCompact : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <div
        className={`${styles.visualThumb} ${thumbClass ? styles[thumbClass] : ''}`}
        style={thumbStyle}
        aria-hidden="true"
      >
        {icon && <span className={styles.visualIcon}>{icon}</span>}
      </div>
      <span className={styles.visualLabel}>{label}</span>
    </button>
  )
}

export function ColorSwatchGrid({ options, value, onChange, getValue = (option) => option.id }) {
  return (
    <div className={styles.swatchGrid}>
      {options.map((option) => {
        const optionValue = getValue(option)
        const selected = value === optionValue
        return (
          <button
            key={optionValue}
            type="button"
            className={`${styles.colorSwatch} ${selected ? styles.colorSwatchActive : ''}`}
            onClick={() => onChange(optionValue)}
            aria-pressed={selected}
            aria-label={option.label}
          >
            <span
              className={styles.colorSwatchDot}
              style={{ background: option.color || option.id }}
            />
            <span className={styles.colorSwatchLabel}>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function AgePicker({ value, min = 18, max = 80, onChange }) {
  return (
    <div className={styles.agePicker}>
      <div className={styles.ageDisplay}>
        <span className={styles.ageNumber}>{value}</span>
        <span className={styles.ageUnit}>years</span>
      </div>
      <div className={styles.ageTrackWrap}>
        <span className={styles.ageEnd} aria-hidden="true">
          {min}
        </span>
        <input
          className={styles.ageTrack}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label="Age"
        />
        <span className={styles.ageEnd} aria-hidden="true">
          {max}
        </span>
      </div>
    </div>
  )
}

export function ToggleAccessoryCard({ label, gradient, icon, equipped, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.accessoryCard} ${equipped ? styles.accessoryCardOn : ''}`}
      onClick={onClick}
      aria-pressed={equipped}
    >
      <div className={styles.accessoryThumb} style={{ background: gradient }} aria-hidden="true">
        <span className={styles.visualIcon}>{icon}</span>
      </div>
      <span className={styles.visualLabel}>{label}</span>
      <span className={styles.accessoryState}>{equipped ? 'On' : 'Off'}</span>
    </button>
  )
}
