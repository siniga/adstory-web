import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { findCharacterById } from '../characters/characterData'
import { IconClose } from '../icons'
import AppearanceEditor from './AppearanceEditor'
import ApplyScopePanel from './ApplyScopePanel'
import EditorApplyTrigger from '../applyScope/EditorApplyTrigger'
import { buildCharacterApplyConfig } from '../applyScope/buildApplyScopeConfig'
import CharacterEditorSidebar from './CharacterEditorSidebar'
import CharacterPreviewPanel from './CharacterPreviewPanel'
import ConsistencyPanel from './ConsistencyPanel'
import ExpressionEditor from './ExpressionEditor'
import FaceEditor from './FaceEditor'
import HairEditor from './HairEditor'
import AccessoriesEditor from './AccessoriesEditor'
import PoseEditor from './PoseEditor'
import WardrobeEditor from './WardrobeEditor'
import { createEditorStateFromCharacter } from './characterEditorData'
import styles from './CharacterEditorStudio.module.css'

export default function CharacterEditorStudio({
  open,
  characterId,
  selectedShotId,
  onClose,
  onOpenApplyScopeModal,
}) {
  const [activeSection, setActiveSection] = useState('appearance')
  const [editorState, setEditorState] = useState(null)

  const character = characterId ? findCharacterById(characterId) : null

  useEffect(() => {
    if (open && characterId) {
      const nextCharacter = findCharacterById(characterId)
      if (nextCharacter) {
        setEditorState(createEditorStateFromCharacter(nextCharacter))
        setActiveSection('appearance')
      }
    }
  }, [open, characterId])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !character || !editorState) return null

  const initial = character.name.charAt(0).toUpperCase()

  const renderSection = () => {
    const props = { state: editorState, onChange: setEditorState }
    switch (activeSection) {
      case 'appearance':
        return <AppearanceEditor {...props} />
      case 'face':
        return <FaceEditor {...props} />
      case 'hair':
        return <HairEditor {...props} />
      case 'wardrobe':
        return <WardrobeEditor {...props} />
      case 'accessories':
        return <AccessoriesEditor {...props} />
      case 'pose':
        return <PoseEditor {...props} />
      case 'expression':
        return <ExpressionEditor {...props} />
      case 'consistency':
        return (
          <ConsistencyPanel
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
        aria-label="Character Editor"
      >
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <h2 className={styles.title}>Character Editor</h2>
            <div className={styles.identity}>
              <div
                className={styles.thumb}
                style={{ background: character.imageGradient }}
                aria-hidden="true"
              >
                <span>{initial}</span>
              </div>
              <div className={styles.meta}>
                <span className={styles.metaLabel}>Name:</span>
                <span className={styles.metaValue}>{character.name}</span>
                <span className={styles.metaLabel}>Role:</span>
                <span className={styles.metaValue}>{character.role}</span>
              </div>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </header>

        <div className={styles.body}>
          <CharacterEditorSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          <div className={styles.main}>
            <div className={styles.editorScroll}>{renderSection()}</div>
            {onOpenApplyScopeModal && (
              <EditorApplyTrigger
                label="Apply Character Changes"
                onClick={() =>
                  onOpenApplyScopeModal(
                    buildCharacterApplyConfig(character, editorState, selectedShotId)
                  )
                }
              />
            )}
            <ApplyScopePanel
              value={editorState.applyScope}
              onChange={(applyScope) => setEditorState({ ...editorState, applyScope })}
            />
          </div>
          <CharacterPreviewPanel character={character} editorState={editorState} />
        </div>
      </div>
    </div>,
    document.body
  )
}
