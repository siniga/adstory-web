import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildMediaThumbStyle } from '../../utils/resolveMediaUrl'
import { findEnvironmentById } from '../environments/environmentData'
import { IconClose } from '../icons'
import ColorPaletteEditor from './ColorPaletteEditor'
import EnvironmentApplyScopePanel from './EnvironmentApplyScopePanel'
import EditorApplyTrigger from '../applyScope/EditorApplyTrigger'
import { buildEnvironmentApplyConfig } from '../applyScope/buildApplyScopeConfig'
import EnvironmentConsistencyPanel from './EnvironmentConsistencyPanel'
import EnvironmentEditorSidebar from './EnvironmentEditorSidebar'
import EnvironmentPreviewPanel from './EnvironmentPreviewPanel'
import EnvironmentStyleEditor from './EnvironmentStyleEditor'
import LightingEditor from './LightingEditor'
import LocationEditor from './LocationEditor'
import MoodEditor from './MoodEditor'
import TimeOfDayEditor from './TimeOfDayEditor'
import WeatherEditor from './WeatherEditor'
import { createEditorStateFromEnvironment } from './environmentEditorData'

import styles from './EnvironmentEditorStudio.module.css'

export default function EnvironmentEditorStudio({
  open,
  environmentId,
  selectedShotId,
  onClose,
  onOpenApplyScopeModal,
}) {
  const [activeSection, setActiveSection] = useState('location')
  const [editorState, setEditorState] = useState(null)

  const environment = environmentId ? findEnvironmentById(environmentId) : null

  useEffect(() => {
    if (open && environmentId) {
      const nextEnvironment = findEnvironmentById(environmentId)
      if (nextEnvironment) {
        setEditorState(createEditorStateFromEnvironment(nextEnvironment))
        setActiveSection('location')
      }
    }
  }, [open, environmentId])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !environment || !editorState) return null

  const thumbStyle = buildMediaThumbStyle(
    environment.previewImage,
    environment.thumbnailGradient
  )

  const renderSection = () => {
    const props = { state: editorState, onChange: setEditorState }
    switch (activeSection) {
      case 'location':
        return <LocationEditor {...props} />
      case 'timeOfDay':
        return <TimeOfDayEditor {...props} />
      case 'weather':
        return <WeatherEditor {...props} />
      case 'lighting':
        return <LightingEditor {...props} />
      case 'mood':
        return <MoodEditor {...props} />
      case 'colorPalette':
        return <ColorPaletteEditor {...props} />
      case 'style':
        return <EnvironmentStyleEditor {...props} />
      case 'consistency':
        return (
          <EnvironmentConsistencyPanel
            consistency={editorState.consistency}
            onChange={(consistency) => setEditorState({ ...editorState, consistency })}
          />
        )
      default:
        return null
    }
  }

  return createPortal(
    <div className={styles.overlay} role="presentation">
      <div
        className={styles.studio}
        role="dialog"
        aria-modal="true"
        aria-label="Environment Editor"
      >
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <h2 className={styles.title}>Environment Editor</h2>
            <div className={styles.identity}>
              <div className={styles.thumb} style={thumbStyle} aria-hidden="true" />
              <div className={styles.meta}>
                <span className={styles.metaLabel}>Name:</span>
                <span className={styles.metaValue}>{environment.name}</span>
                <span className={styles.metaLabel}>Type:</span>
                <span className={styles.metaValue}>{environment.type}</span>
              </div>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </header>

        <div className={styles.body}>
          <EnvironmentEditorSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          <div className={styles.main}>
            <div className={styles.editorScroll}>{renderSection()}</div>
            {onOpenApplyScopeModal && (
              <EditorApplyTrigger
                label="Apply Environment Changes"
                onClick={() =>
                  onOpenApplyScopeModal(
                    buildEnvironmentApplyConfig(environment, editorState, selectedShotId)
                  )
                }
              />
            )}
            <EnvironmentApplyScopePanel
              value={editorState.applyScope}
              onChange={(applyScope) => setEditorState({ ...editorState, applyScope })}
            />
          </div>
          <EnvironmentPreviewPanel environment={environment} editorState={editorState} />
        </div>
      </div>
    </div>,
    document.body
  )
}
