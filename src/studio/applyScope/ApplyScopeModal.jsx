import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '../icons'
import {
  CONSISTENCY_WARNINGS,
  getImpactForScope,
  getShotContext,
  SCOPE_OPTIONS,
} from './applyScopeData'
import ConsistencyWarningCard from './ConsistencyWarningCard'
import ImpactPreviewCard from './ImpactPreviewCard'
import ScopeOptionCard from './ScopeOptionCard'
import SelectedScenesChecklist from './SelectedScenesChecklist'
import styles from './ApplyScopeModal.module.css'

export default function ApplyScopeModal({ open, config, onClose, onApply }) {
  const [scope, setScope] = useState('currentShot')
  const [selectedSceneIds, setSelectedSceneIds] = useState([1])

  useEffect(() => {
    if (open && config) {
      setScope(config.initialScope ?? 'currentShot')
      setSelectedSceneIds([config.sceneId ?? 1])
    }
  }, [open, config])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const context = useMemo(() => {
    if (!config) return getShotContext('1.1')
    return {
      shotId: config.currentShotId,
      sceneId: config.sceneId,
      sceneTitle: config.sceneTitle,
    }
  }, [config])

  const impact = useMemo(
    () => getImpactForScope(scope, selectedSceneIds),
    [scope, selectedSceneIds]
  )

  const toggleScene = (sceneId) => {
    setSelectedSceneIds((prev) =>
      prev.includes(sceneId) ? prev.filter((id) => id !== sceneId) : [...prev, sceneId]
    )
  }

  const handleApply = () => {
    onApply?.({ scope, selectedSceneIds, config })
    onClose()
  }

  if (!open || !config) return null

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Apply changes"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Apply Changes</h2>
            <p className={styles.subtitle}>Choose where this update should be applied.</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.summaryCard}>
            <dl className={styles.summaryGrid}>
              <div className={styles.summaryRow}>
                <dt>Asset:</dt>
                <dd>{config.assetName}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Change:</dt>
                <dd>{config.changeSummary}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Type:</dt>
                <dd>{config.changeType}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.scopeSection}>
            <h4 className={styles.sectionTitle}>Scope Options</h4>
            <div className={styles.scopeList}>
              {SCOPE_OPTIONS.map((option) => (
                <ScopeOptionCard
                  key={option.id}
                  option={option}
                  selected={scope === option.id}
                  context={context}
                  onSelect={setScope}
                />
              ))}
            </div>
          </section>

          {scope === 'selectedScenes' && (
            <SelectedScenesChecklist
              selectedIds={selectedSceneIds}
              onToggle={toggleScene}
            />
          )}

          <ImpactPreviewCard impact={impact} />

          <section className={styles.warningsSection}>
            <h4 className={styles.sectionTitle}>Consistency Warnings</h4>
            {CONSISTENCY_WARNINGS.map((message) => (
              <ConsistencyWarningCard key={message} message={message} />
            ))}
          </section>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.applyBtn} onClick={handleApply}>
            Apply Change
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
