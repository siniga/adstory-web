import styles from './StatusDot.module.css'

export function StatusDot({ label, variant = 'pending', className = '', size = 'default', pulse = false }) {
  const sizeClass = size === 'large' ? styles.dotLarge : ''

  return (
    <span
      className={`${styles.dot} ${styles[variant] ?? styles.pending} ${sizeClass} ${pulse ? styles.pulse : ''} ${className}`.trim()}
      title={label}
      aria-label={label}
      role="status"
    />
  )
}

export function StatusDotGroup({ children, className = '' }) {
  return <span className={`${styles.dotGroup} ${className}`.trim()}>{children}</span>
}
