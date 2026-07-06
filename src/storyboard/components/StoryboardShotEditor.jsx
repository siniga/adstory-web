import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CAMERA_MOVEMENT_OPTIONS,
  CHARACTER_EXPRESSION_OPTIONS,
  CHARACTER_FACING_OPTIONS,
  CHARACTER_IMPORTANCE_OPTIONS,
  CHARACTER_POSITION_OPTIONS,
  CHARACTER_ROLE_OPTIONS,
  COMPOSITION_OPTIONS,
  createDraftFromShot,
  ENVIRONMENT_TYPE_OPTIONS,
  areDraftsEqual,
  LENS_OPTIONS,
  LIGHTING_OPTIONS,
  MOOD_OPTIONS,
  SEASON_OPTIONS,
  SHOT_SIZE_OPTIONS,
  VISUAL_STYLE_OPTIONS,
  WEATHER_OPTIONS,
} from '../shotEditorModel'
import editorStyles from '../StoryboardShotEditor.module.css'
import styles from '../ProjectStoryboard.module.css'

function SectionRow({ title, summary, onClick }) {
  return (
    <button type="button" className={editorStyles.sectionRow} onClick={onClick}>
      <span className={editorStyles.sectionRowTitle}>{title}</span>
      {summary ? <span className={editorStyles.sectionRowSummary}>{summary}</span> : null}
      <span className={editorStyles.sectionRowChevron} aria-hidden="true">
        ›
      </span>
    </button>
  )
}

function Field({ label, children }) {
  return (
    <label className={editorStyles.field}>
      <span className={editorStyles.fieldLabel}>{label}</span>
      {children}
    </label>
  )
}

function ModalOverlay({ className, onClose, children }) {
  return (
    <div
      className={className}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      {children}
    </div>
  )
}

function OptionPickerModal({ open, title, options, value, multiple = false, onSelect, onClose }) {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const selected = multiple ? (Array.isArray(value) ? value : []) : value

  const isSelected = (option) => {
    if (multiple) return selected.includes(option)
    return selected === option
  }

  const handlePick = (option) => {
    if (multiple) {
      const next = isSelected(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option]
      onSelect(next)
      return
    }
    onSelect(option === selected ? '' : option)
    onClose()
  }

  return createPortal(
    <ModalOverlay
      className={`${editorStyles.modalOverlay} ${editorStyles.optionModalOverlay}`}
      onClose={onClose}
    >
      <div
        className={editorStyles.optionModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="option-picker-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={editorStyles.modalHeader}>
          <h3 id="option-picker-title" className={editorStyles.modalTitle}>
            {title}
          </h3>
          <button type="button" className={editorStyles.modalClose} onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className={editorStyles.optionList}>
          {!multiple ? (
            <button
              type="button"
              className={`${editorStyles.optionItem} ${!selected ? editorStyles.optionItemSelected : ''}`}
              onClick={() => {
                onSelect('')
                onClose()
              }}
            >
              None
            </button>
          ) : null}
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={`${editorStyles.optionItem} ${isSelected(option) ? editorStyles.optionItemSelected : ''}`}
              onClick={() => handlePick(option)}
            >
              {option}
              {isSelected(option) ? <span className={editorStyles.optionCheck}>✓</span> : null}
            </button>
          ))}
        </div>
        {multiple ? (
          <footer className={editorStyles.modalFooter}>
            <button type="button" className={editorStyles.modalDoneBtn} onClick={onClose}>
              Done
            </button>
          </footer>
        ) : null}
      </div>
    </ModalOverlay>,
    document.body
  )
}

function OptionPickerField({ label, value, options, onChange, placeholder = 'Select…', multiple = false }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const display = multiple
    ? (Array.isArray(value) && value.length ? value.join(', ') : placeholder)
    : value || placeholder

  return (
    <>
      <Field label={label}>
        <button
          type="button"
          className={editorStyles.pickerTrigger}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => setPickerOpen(true)}
        >
          <span className={!value || (multiple && !value.length) ? editorStyles.pickerPlaceholder : ''}>
            {display}
          </span>
          <span aria-hidden="true">›</span>
        </button>
      </Field>
      <OptionPickerModal
        open={pickerOpen}
        title={label}
        options={options}
        value={value}
        multiple={multiple}
        onSelect={onChange}
        onClose={() => setPickerOpen(false)}
      />
    </>
  )
}

function SectionEditModal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <ModalOverlay className={editorStyles.modalOverlay} onClose={onClose}>
      <div
        className={editorStyles.sectionModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="section-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={editorStyles.modalHeader}>
          <h3 id="section-modal-title" className={editorStyles.modalTitle}>
            {title}
          </h3>
          <button type="button" className={editorStyles.modalClose} onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className={editorStyles.modalBody}>{children}</div>
        <footer className={editorStyles.modalFooter}>
          <button type="button" className={editorStyles.modalDoneBtn} onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </ModalOverlay>,
    document.body
  )
}

function summarize(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  return value?.trim?.() || ''
}

export default function StoryboardShotEditor({
  shot,
  projectCharacters = [],
  projectEnvironments = [],
  saving = false,
  generatingImage = false,
  saveError,
  saveMessage,
  onSave,
  onGenerateImage,
  onDraftSaved,
}) {
  const [draft, setDraft] = useState(null)
  const [savedDraft, setSavedDraft] = useState(null)
  const [activeSection, setActiveSection] = useState(null)

  const shotIdentity = shot?.apiId ?? shot?.id ?? null

  useEffect(() => {
    setActiveSection(null)
  }, [shotIdentity])

  useEffect(() => {
    if (!shot) {
      setDraft(null)
      setSavedDraft(null)
      return
    }

    const nextDraft = createDraftFromShot(shot, projectCharacters)
    setDraft(nextDraft)
    setSavedDraft(nextDraft)
  }, [projectCharacters, shot, shotIdentity])

  const isDirty = useMemo(
    () => draft && savedDraft && !areDraftsEqual(draft, savedDraft),
    [draft, savedDraft]
  )

  const updateDraft = useCallback((patch) => {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }, [])

  const updateCharacterAssignment = useCallback((characterId, patch) => {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        characterAssignments: current.characterAssignments.map((item) =>
          String(item.characterId) === String(characterId) ? { ...item, ...patch } : item
        ),
      }
    })
  }, [])

  const markSaved = useCallback(
    (nextDraft) => {
      setSavedDraft(nextDraft)
      onDraftSaved?.(nextDraft)
    },
    [onDraftSaved]
  )

  const handleSave = useCallback(() => {
    if (!draft || !isDirty) return
    onSave?.(draft, markSaved)
  }, [draft, isDirty, markSaved, onSave])

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave])

  if (!shot) {
    return (
      <aside className={styles.inspector}>
        <div className={editorStyles.editorHeader}>
          <h2 className={editorStyles.editorTitle}>Shot Details</h2>
        </div>
        <div className={editorStyles.emptyState}>Select a shot to view and edit its details.</div>
      </aside>
    )
  }

  if (!draft) return null

  const environmentOptions = projectEnvironments.map((environment) => environment.name).filter(Boolean)
  const enabledCharacters = draft.characterAssignments.filter((item) => item.enabled)
  const compositionSummary = draft.compositionTags.filter(Boolean).join(', ')

  const closeSection = () => setActiveSection(null)

  return (
    <aside className={`${styles.inspector} ${editorStyles.editor}`}>
      <div className={editorStyles.editorHeader}>
        <h2 className={editorStyles.editorTitle}>Shot Details</h2>
        {isDirty ? <span className={editorStyles.unsavedBadge}>Unsaved</span> : null}
      </div>

      <div className={editorStyles.editorScroll}>
        <div className={editorStyles.sectionList}>
          <SectionRow
            title="Title"
            summary={draft.title || 'Untitled'}
            onClick={() => setActiveSection('title')}
          />
          <SectionRow
            title="Description"
            summary={summarize(draft.description) || '—'}
            onClick={() => setActiveSection('description')}
          />
          <SectionRow
            title="Characters"
            summary={enabledCharacters.map((item) => item.name).join(', ') || 'None'}
            onClick={() => setActiveSection('characters')}
          />
          <SectionRow
            title="Environment"
            summary={draft.environment || 'None'}
            onClick={() => setActiveSection('environment')}
          />
          <SectionRow
            title="Camera"
            summary={[draft.shotSize, draft.cameraMovement].filter(Boolean).join(' · ') || '—'}
            onClick={() => setActiveSection('camera')}
          />
          <SectionRow title="Lens" summary={draft.lens || '—'} onClick={() => setActiveSection('lens')} />
          <SectionRow
            title="Lighting"
            summary={draft.lighting || '—'}
            onClick={() => setActiveSection('lighting')}
          />
          <SectionRow title="Mood" summary={draft.mood || '—'} onClick={() => setActiveSection('mood')} />
          <SectionRow
            title="Composition"
            summary={compositionSummary || '—'}
            onClick={() => setActiveSection('composition')}
          />
          <SectionRow
            title="Style"
            summary={draft.visualStyle || '—'}
            onClick={() => setActiveSection('style')}
          />
        </div>
      </div>

      <SectionEditModal open={activeSection === 'title'} title="Title" onClose={closeSection}>
        <Field label="Shot number">
          <input
            className={editorStyles.input}
            value={draft.shotNumber}
            onChange={(event) => updateDraft({ shotNumber: event.target.value })}
          />
        </Field>
        <Field label="Title">
          <input
            className={editorStyles.input}
            value={draft.title}
            onChange={(event) => updateDraft({ title: event.target.value })}
          />
        </Field>
      </SectionEditModal>

      <SectionEditModal open={activeSection === 'description'} title="Description" onClose={closeSection}>
        <Field label="Description">
          <textarea
            className={editorStyles.textarea}
            value={draft.description}
            onChange={(event) => updateDraft({ description: event.target.value })}
          />
        </Field>
        <Field label="Action">
          <textarea
            className={editorStyles.textarea}
            value={draft.action}
            onChange={(event) => updateDraft({ action: event.target.value })}
          />
        </Field>
        <Field label="Dialogue">
          <textarea
            className={editorStyles.textarea}
            value={draft.dialogue}
            onChange={(event) => updateDraft({ dialogue: event.target.value })}
          />
        </Field>
        <Field label="Notes">
          <textarea
            className={editorStyles.textarea}
            value={draft.notes}
            onChange={(event) => updateDraft({ notes: event.target.value })}
          />
        </Field>
      </SectionEditModal>

      <SectionEditModal open={activeSection === 'characters'} title="Characters" onClose={closeSection}>
        {draft.characterAssignments.map((assignment) => (
          <div key={assignment.characterId} className={editorStyles.characterRow}>
            <label className={editorStyles.checkboxRow}>
              <input
                type="checkbox"
                checked={assignment.enabled}
                onChange={(event) =>
                  updateCharacterAssignment(assignment.characterId, {
                    enabled: event.target.checked,
                  })
                }
              />
              <span className={editorStyles.characterName}>{assignment.name || 'Character'}</span>
            </label>
            {assignment.enabled ? (
              <div className={editorStyles.characterFields}>
                <OptionPickerField
                  label="Role"
                  value={assignment.role}
                  options={CHARACTER_ROLE_OPTIONS}
                  onChange={(value) =>
                    updateCharacterAssignment(assignment.characterId, { role: value })
                  }
                />
                <OptionPickerField
                  label="Position"
                  value={assignment.position}
                  options={CHARACTER_POSITION_OPTIONS}
                  onChange={(value) =>
                    updateCharacterAssignment(assignment.characterId, { position: value })
                  }
                />
                <OptionPickerField
                  label="Facing"
                  value={assignment.facingDirection}
                  options={CHARACTER_FACING_OPTIONS}
                  onChange={(value) =>
                    updateCharacterAssignment(assignment.characterId, { facingDirection: value })
                  }
                />
                <OptionPickerField
                  label="Expression"
                  value={assignment.expression}
                  options={CHARACTER_EXPRESSION_OPTIONS}
                  onChange={(value) =>
                    updateCharacterAssignment(assignment.characterId, { expression: value })
                  }
                />
                <OptionPickerField
                  label="Importance"
                  value={assignment.importance}
                  options={CHARACTER_IMPORTANCE_OPTIONS}
                  onChange={(value) =>
                    updateCharacterAssignment(assignment.characterId, { importance: value })
                  }
                />
              </div>
            ) : null}
          </div>
        ))}
      </SectionEditModal>

      <SectionEditModal open={activeSection === 'environment'} title="Environment" onClose={closeSection}>
        <OptionPickerField
          label="Location"
          value={draft.environment}
          options={environmentOptions}
          onChange={(value) => updateDraft({ environment: value })}
          placeholder="Select environment"
        />
        <OptionPickerField
          label="Type"
          value={draft.environmentType}
          options={ENVIRONMENT_TYPE_OPTIONS}
          onChange={(value) => updateDraft({ environmentType: value })}
        />
        <Field label="Time">
          <input
            className={editorStyles.input}
            value={draft.environmentTime}
            onChange={(event) => updateDraft({ environmentTime: event.target.value })}
          />
        </Field>
        <OptionPickerField
          label="Weather"
          value={draft.weather}
          options={WEATHER_OPTIONS}
          onChange={(value) => updateDraft({ weather: value })}
        />
        <OptionPickerField
          label="Season"
          value={draft.season}
          options={SEASON_OPTIONS}
          onChange={(value) => updateDraft({ season: value })}
        />
      </SectionEditModal>

      <SectionEditModal open={activeSection === 'camera'} title="Camera" onClose={closeSection}>
        <OptionPickerField
          label="Shot size"
          value={draft.shotSize}
          options={SHOT_SIZE_OPTIONS}
          onChange={(value) => updateDraft({ shotSize: value })}
        />
        <Field label="Camera angle">
          <input
            className={editorStyles.input}
            value={draft.cameraAngle}
            onChange={(event) => updateDraft({ cameraAngle: event.target.value })}
          />
        </Field>
        <OptionPickerField
          label="Movement"
          value={draft.cameraMovement}
          options={CAMERA_MOVEMENT_OPTIONS}
          onChange={(value) => updateDraft({ cameraMovement: value })}
        />
      </SectionEditModal>

      <SectionEditModal open={activeSection === 'lens'} title="Lens" onClose={closeSection}>
        <OptionPickerField
          label="Lens"
          value={draft.lens}
          options={LENS_OPTIONS}
          onChange={(value) => updateDraft({ lens: value })}
        />
      </SectionEditModal>

      <SectionEditModal open={activeSection === 'lighting'} title="Lighting" onClose={closeSection}>
        <OptionPickerField
          label="Lighting"
          value={draft.lighting}
          options={LIGHTING_OPTIONS}
          onChange={(value) => updateDraft({ lighting: value })}
        />
      </SectionEditModal>

      <SectionEditModal open={activeSection === 'mood'} title="Mood" onClose={closeSection}>
        <OptionPickerField
          label="Mood"
          value={draft.mood}
          options={MOOD_OPTIONS}
          onChange={(value) => updateDraft({ mood: value })}
        />
      </SectionEditModal>

      <SectionEditModal open={activeSection === 'composition'} title="Composition" onClose={closeSection}>
        <OptionPickerField
          label="Tags"
          value={draft.compositionTags}
          options={COMPOSITION_OPTIONS}
          multiple
          onChange={(value) => updateDraft({ compositionTags: value })}
          placeholder="Select tags"
        />
      </SectionEditModal>

      <SectionEditModal open={activeSection === 'style'} title="Style" onClose={closeSection}>
        <OptionPickerField
          label="Visual style"
          value={draft.visualStyle}
          options={VISUAL_STYLE_OPTIONS}
          onChange={(value) => updateDraft({ visualStyle: value })}
        />
      </SectionEditModal>

      <div className={editorStyles.editorFooter}>
        {saveMessage ? <p className={editorStyles.statusMessage}>{saveMessage}</p> : null}
        {saveError ? <p className={editorStyles.errorMessage}>{saveError}</p> : null}
        <div className={editorStyles.footerActions}>
          <button
            type="button"
            className={`${editorStyles.footerBtn} ${editorStyles.footerBtnPrimary}`}
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            {saving ? 'Saving…' : 'Save Shot'}
          </button>
          <button
            type="button"
            className={`${editorStyles.footerBtn} ${editorStyles.footerBtnSecondary}`}
            onClick={() => onGenerateImage?.(shot)}
            disabled={generatingImage || !shot.apiId}
          >
            {generatingImage ? 'Generating…' : 'Generate Image'}
          </button>
        </div>
      </div>
    </aside>
  )
}
