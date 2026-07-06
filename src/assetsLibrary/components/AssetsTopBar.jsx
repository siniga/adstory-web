import { BRAND } from '../../config/branding'
import { ASSETS_TOP_STEPS } from '../assetsLibraryData'
import styles from './AssetsTopBar.module.css'

export default function AssetsTopBar({ projectName, activeStepId = 'assets' }) {
  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <span className={styles.logoMark}>{BRAND.logoMark}</span>
          <span className={styles.brandName}>{BRAND.name}</span>
        </div>
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.projectName}>{projectName}</span>
      </div>

      <nav className={styles.steps} aria-label="Project progress">
        {ASSETS_TOP_STEPS.map((step, index) => {
          const isActive = step.id === activeStepId
          const isDone = ASSETS_TOP_STEPS.findIndex((item) => item.id === activeStepId) > index

          return (
            <div key={step.id} className={styles.stepGroup}>
              {index > 0 ? <span className={styles.connector} aria-hidden="true" /> : null}
              <span
                className={`${styles.step} ${isDone ? styles.stepDone : ''} ${isActive ? styles.stepActive : ''}`}
                aria-current={isActive ? 'step' : undefined}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </nav>

      <div className={styles.right}>
        <button type="button" className={styles.saveBtn}>
          Save
        </button>
        <button type="button" className={styles.iconBtn} aria-label="Notifications">
          <span className={styles.bell} aria-hidden="true" />
        </button>
        <span className={styles.avatar} aria-hidden="true">
          {BRAND.avatarInitial}
        </span>
      </div>
    </header>
  )
}
