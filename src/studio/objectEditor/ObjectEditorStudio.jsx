import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { findObjectById } from '../objects/objectData'
import { IconClose } from '../icons'
import ColorEditor from './ColorEditor'
import ConditionEditor from './ConditionEditor'
import IdentityEditor from './IdentityEditor'
import MaterialEditor from './MaterialEditor'
import ObjectApplyScopePanel from './ObjectApplyScopePanel'
import EditorApplyTrigger from '../applyScope/EditorApplyTrigger'
import { buildObjectApplyConfig } from '../applyScope/buildApplyScopeConfig'
import ObjectConsistencyPanel from './ObjectConsistencyPanel'
import ObjectEditorSidebar from './ObjectEditorSidebar'
import ObjectPreviewPanel from './ObjectPreviewPanel'
import ObjectReplacementPanel from './ObjectReplacementPanel'
import ScaleEditor from './ScaleEditor'
import StyleEditor from './StyleEditor'
import { createEditorStateFromObject } from './objectEditorData'
import styles from './ObjectEditorStudio.module.css'

export default function ObjectEditorStudio({
  open,
  objectId,
  selectedShotId,
  onClose,
  onOpenApplyScopeModal,
}) {
  const [activeSection, setActiveSection] = useState('identity')
  const [editorState, setEditorState] = useState(null)

  const object = objectId ? findObjectById(objectId) : null

  useEffect(() => {
    if (open && objectId) {
      const nextObject = findObjectById(objectId)
      if (nextObject) {
        setEditorState(createEditorStateFromObject(nextObject))
        setActiveSection('identity')
      }
    }
  }, [open, objectId])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !object || !editorState) return null

  const renderSection = () => {
    const props = { state: editorState, onChange: setEditorState }
    switch (activeSection) {
      case 'identity':
        return <IdentityEditor {...props} />
      case 'material':
        return <MaterialEditor {...props} />
      case 'color':
        return <ColorEditor {...props} />
      case 'condition':
        return <ConditionEditor {...props} />
      case 'scale':
        return <ScaleEditor {...props} />
      case 'style':
        return <StyleEditor {...props} />
      case 'replacement':
        return <ObjectReplacementPanel {...props} />
      case 'consistency':
        return (
          <ObjectConsistencyPanel
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
        aria-label="Object Editor"
      >
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <h2 className={styles.title}>Object Editor</h2>
            <div className={styles.identity}>
              <div
                className={styles.thumb}
                style={{ background: object.thumbnailGradient }}
                aria-hidden="true"
              />
              <div className={styles.meta}>
                <span className={styles.metaLabel}>Name:</span>
                <span className={styles.metaValue}>{object.name}</span>
                <span className={styles.metaLabel}>Category:</span>
                <span className={styles.metaValue}>{object.categoryLabel}</span>
              </div>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </header>

        <div className={styles.body}>
          <ObjectEditorSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          <div className={styles.main}>
            <div className={styles.editorScroll}>{renderSection()}</div>
            {onOpenApplyScopeModal && (
              <EditorApplyTrigger
                label="Apply Object Changes"
                onClick={() =>
                  onOpenApplyScopeModal(
                    buildObjectApplyConfig(object, editorState, selectedShotId)
                  )
                }
              />
            )}
            <ObjectApplyScopePanel
              value={editorState.applyScope}
              onChange={(applyScope) => setEditorState({ ...editorState, applyScope })}
            />
          </div>
          <ObjectPreviewPanel object={object} editorState={editorState} />
        </div>
      </div>
    </div>,
    document.body
  )
}
