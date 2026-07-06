import { useEffect, useState } from 'react'
import { ETHNICITY_OPTIONS, GENDER_OPTIONS, SKIN_TONE_SWATCHES } from '../assetsLibraryData'
import {
  isCharacterEthnicityMissing,
  resolveCharacterFormEthnicity,
} from '../characterEthnicity'
import SearchableSelect from './SearchableSelect'
import styles from './CharacterPropertiesPanel.module.css'

function AccordionSection({ title, open, onToggle, children }) {
  return (
    <div className={styles.section}>
      <button type="button" className={styles.sectionHeader} onClick={onToggle}>
        <span>{title}</span>
        <span className={styles.chevron} aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open ? <div className={styles.sectionBody}>{children}</div> : null}
    </div>
  )
}

function ReadOnlyField({ label, value, multiline = false, showWhenEmpty = false }) {
  if (!value && !showWhenEmpty) return null

  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {multiline ? (
        <textarea className={styles.textarea} value={value ?? ''} readOnly />
      ) : (
        <input className={styles.input} value={value ?? ''} readOnly />
      )}
    </label>
  )
}

function FormField({ label, value, onChange, multiline = false, type = 'text' }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {multiline ? (
        <textarea
          className={styles.textarea}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={styles.input}
          type={type}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  )
}

function formatReferenceStatus(status) {
  if (!status) return 'Not started'
  return String(status).replace(/_/g, ' ')
}

function formatStatus(status) {
  if (!status) return 'Suggested'
  return String(status).replace(/_/g, ' ')
}

function buildCharacterForm(selectedCharacter, projectDefaultEthnicity) {
  if (!selectedCharacter) {
    return {
      name: '',
      role: '',
      description: '',
      ageRange: '',
      appearance: '',
      clothing: '',
      personality: '',
      status: 'suggested',
      referenceStatus: 'not_started',
      gender: '',
      ethnicity: resolveCharacterFormEthnicity(null, projectDefaultEthnicity),
      skinTone: SKIN_TONE_SWATCHES[2],
      hair: '',
      beard: '',
      build: '',
      height: '',
    }
  }

  return {
    name: selectedCharacter.name ?? '',
    role: selectedCharacter.role ?? '',
    description: selectedCharacter.description ?? '',
    ageRange: selectedCharacter.ageRange ?? '',
    appearance: selectedCharacter.appearance ?? '',
    clothing: selectedCharacter.clothing ?? '',
    personality:
      selectedCharacter.personality ??
      selectedCharacter.notes ??
      selectedCharacter.meta?.notes ??
      '',
    status: selectedCharacter.status ?? 'suggested',
    referenceStatus: selectedCharacter.referenceStatus ?? 'not_started',
    gender: selectedCharacter.gender ?? '',
    ethnicity: resolveCharacterFormEthnicity(selectedCharacter, projectDefaultEthnicity),
    skinTone: selectedCharacter.skinTone ?? SKIN_TONE_SWATCHES[2],
    hair: selectedCharacter.hair ?? '',
    beard: selectedCharacter.beard ?? '',
    build: selectedCharacter.build ?? '',
    height: selectedCharacter.height ?? '',
  }
}

export function buildCharacterSavePayload(form) {
  return {
    name: form.name,
    role: form.role,
    description: form.description,
    appearance: {
      age_range: form.ageRange || null,
      gender: form.gender || null,
      skin_tone: form.skinTone || null,
      hair: form.hair || form.appearance || null,
      beard: form.beard || null,
      build: form.build || null,
      height: form.height || null,
      clothing: form.clothing || null,
    },
    status: form.status,
    reference_status: form.referenceStatus,
    ethnicity: form.ethnicity || null,
    meta: {
      notes: form.personality || '',
    },
  }
}

function buildAssetForm(properties) {
  if (!properties) {
    return {}
  }

  return { ...properties }
}

export default function CharacterPropertiesPanel({
  selectedCharacter = null,
  properties = null,
  assetType = 'character',
  projectDefaultEthnicity,
  onSaveChanges,
  onApprove,
  onDelete,
  saving = false,
  approving = false,
  saveError = null,
}) {
  const [openSections, setOpenSections] = useState({
    basic: true,
    appearance: false,
    clothing: false,
    personality: false,
  })
  const [characterForm, setCharacterForm] = useState(() =>
    buildCharacterForm(selectedCharacter, projectDefaultEthnicity)
  )
  const [assetForm, setAssetForm] = useState(() => buildAssetForm(properties))

  useEffect(() => {
    if (assetType !== 'character') return

    setCharacterForm(buildCharacterForm(selectedCharacter, projectDefaultEthnicity))
  }, [assetType, projectDefaultEthnicity, selectedCharacter?.id])

  useEffect(() => {
    if (assetType === 'character') return

    setAssetForm(buildAssetForm(properties))
  }, [assetType, properties?.id, properties])

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const updateCharacterField = (key, value) => {
    setCharacterForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleReset = () => {
    if (assetType === 'character') {
      setCharacterForm(buildCharacterForm(selectedCharacter, projectDefaultEthnicity))
      return
    }

    setAssetForm(buildAssetForm(properties))
  }

  const handleSave = () => {
    if (!selectedCharacter?.id || !onSaveChanges || saving) return

    onSaveChanges(buildCharacterSavePayload(characterForm))
  }

  const panelTitle =
    assetType === 'environment'
      ? 'Environment Properties'
      : assetType === 'object'
        ? 'Object Properties'
        : 'Character Properties'

  const approveLabel =
    assetType === 'environment'
      ? 'Approve Environment'
      : assetType === 'object'
        ? 'Approve Object'
        : 'Approve Character'

  const deleteLabel =
    assetType === 'environment'
      ? 'Delete Environment'
      : assetType === 'object'
        ? 'Delete Object'
        : 'Delete Character'

  const ethnicityNotSaved = isCharacterEthnicityMissing(selectedCharacter)

  const emptyMessage =
    assetType === 'environment'
      ? 'Select an environment to view properties.'
      : assetType === 'object'
        ? 'Select an object to view properties.'
        : 'Select a character to view properties.'

  if (assetType === 'character' && !selectedCharacter) {
    return (
      <aside className={styles.panel}>
        <p className={styles.empty}>{emptyMessage}</p>
      </aside>
    )
  }

  if (assetType !== 'character' && !properties) {
    return (
      <aside className={styles.panel}>
        <p className={styles.empty}>{emptyMessage}</p>
      </aside>
    )
  }

  if (assetType === 'environment') {
    return (
      <aside className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>{panelTitle}</h2>
          <button type="button" className={styles.resetBtn} onClick={handleReset}>
            Reset
          </button>
        </div>

        <div className={styles.scroll}>
          <AccordionSection
            title="Basic Information"
            open={openSections.basic}
            onToggle={() => toggleSection('basic')}
          >
            <ReadOnlyField label="Name" value={assetForm.name} />
            <ReadOnlyField label="Type" value={assetForm.type} />
            <ReadOnlyField label="Description" value={assetForm.description} multiline />
            <ReadOnlyField label="Location" value={assetForm.location} />
            <ReadOnlyField label="Time of Day" value={assetForm.timeOfDay} />
            <ReadOnlyField label="Weather" value={assetForm.weather} />
            <ReadOnlyField label="Mood" value={assetForm.mood} />
            <ReadOnlyField label="Lighting" value={assetForm.lightingStyle} />
            <ReadOnlyField label="Status" value={formatStatus(assetForm.status)} showWhenEmpty />
            <ReadOnlyField label="Notes" value={assetForm.notes} multiline />
          </AccordionSection>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.approveBtn} onClick={onApprove}>
            {approveLabel}
          </button>
          <button type="button" className={styles.deleteBtn} onClick={onDelete}>
            {deleteLabel}
          </button>
        </div>
      </aside>
    )
  }

  if (assetType === 'object') {
    return (
      <aside className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>{panelTitle}</h2>
          <button type="button" className={styles.resetBtn} onClick={handleReset}>
            Reset
          </button>
        </div>

        <div className={styles.scroll}>
          <AccordionSection
            title="Basic Information"
            open={openSections.basic}
            onToggle={() => toggleSection('basic')}
          >
            <ReadOnlyField label="Name" value={assetForm.name} />
            <ReadOnlyField label="Category" value={assetForm.category} />
            <ReadOnlyField label="Description" value={assetForm.description} multiline />
            <ReadOnlyField label="Material" value={assetForm.material} />
            <ReadOnlyField label="Color" value={assetForm.color} />
            <ReadOnlyField label="Condition" value={assetForm.condition} />
            <ReadOnlyField label="Used In Context" value={assetForm.usedInContext} multiline />
            <ReadOnlyField label="Status" value={formatStatus(assetForm.status)} showWhenEmpty />
            <ReadOnlyField label="Notes" value={assetForm.notes} multiline />
          </AccordionSection>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.approveBtn} onClick={onApprove}>
            {approveLabel}
          </button>
          <button type="button" className={styles.deleteBtn} onClick={onDelete}>
            {deleteLabel}
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>{panelTitle}</h2>
        <button type="button" className={styles.resetBtn} onClick={handleReset}>
          Reset
        </button>
      </div>

      <div className={styles.scroll}>
        <AccordionSection
          title="Basic Information"
          open={openSections.basic}
          onToggle={() => toggleSection('basic')}
        >
          <FormField
            label="Name"
            value={characterForm.name}
            onChange={(value) => updateCharacterField('name', value)}
          />
          <FormField
            label="Role"
            value={characterForm.role}
            onChange={(value) => updateCharacterField('role', value)}
          />
          <FormField
            label="Description"
            value={characterForm.description}
            onChange={(value) => updateCharacterField('description', value)}
            multiline
          />
          <FormField
            label="Age Range"
            value={characterForm.ageRange}
            onChange={(value) => updateCharacterField('ageRange', value)}
          />
          <div className={styles.field}>
            <span className={styles.label}>Gender</span>
            <div className={styles.segmented}>
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.segment} ${characterForm.gender === option ? styles.segmentActive : ''}`}
                  onClick={() => updateCharacterField('gender', option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <SearchableSelect
            label="Ethnicity"
            value={characterForm.ethnicity}
            onChange={(value) => updateCharacterField('ethnicity', value)}
            options={ETHNICITY_OPTIONS}
            placeholder="Select ethnicity"
            required
            highlight={ethnicityNotSaved}
          />
          {ethnicityNotSaved ? (
            <p className={styles.ethnicityWarning} role="status">
              Ethnicity is missing. Image generation may be inaccurate.
            </p>
          ) : null}
          <FormField
            label="Status"
            value={characterForm.status}
            onChange={(value) => updateCharacterField('status', value)}
          />
          <FormField
            label="Reference Status"
            value={characterForm.referenceStatus}
            onChange={(value) => updateCharacterField('referenceStatus', value)}
          />
        </AccordionSection>

        <AccordionSection
          title="Appearance"
          open={openSections.appearance}
          onToggle={() => toggleSection('appearance')}
        >
          <div className={styles.field}>
            <span className={styles.label}>Skin Tone</span>
            <div className={styles.swatches}>
              {SKIN_TONE_SWATCHES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  className={`${styles.swatch} ${characterForm.skinTone === tone ? styles.swatchActive : ''}`}
                  style={{ background: tone }}
                  onClick={() => updateCharacterField('skinTone', tone)}
                  aria-label={`Skin tone ${tone}`}
                />
              ))}
            </div>
          </div>
          <FormField
            label="Appearance"
            value={characterForm.appearance}
            onChange={(value) => updateCharacterField('appearance', value)}
            multiline
          />
          <FormField
            label="Hair"
            value={characterForm.hair}
            onChange={(value) => updateCharacterField('hair', value)}
          />
          <FormField
            label="Beard"
            value={characterForm.beard}
            onChange={(value) => updateCharacterField('beard', value)}
          />
          <FormField
            label="Build"
            value={characterForm.build}
            onChange={(value) => updateCharacterField('build', value)}
          />
          <FormField
            label="Height"
            value={characterForm.height}
            onChange={(value) => updateCharacterField('height', value)}
          />
        </AccordionSection>

        <AccordionSection
          title="Clothing & Accessories"
          open={openSections.clothing}
          onToggle={() => toggleSection('clothing')}
        >
          <FormField
            label="Outfit"
            value={characterForm.clothing}
            onChange={(value) => updateCharacterField('clothing', value)}
            multiline
          />
        </AccordionSection>

        <AccordionSection
          title="Personality & Notes"
          open={openSections.personality}
          onToggle={() => toggleSection('personality')}
        >
          <FormField
            label="Notes"
            value={characterForm.personality}
            onChange={(value) => updateCharacterField('personality', value)}
            multiline
          />
        </AccordionSection>
      </div>

      {saveError ? <p className={styles.saveError}>{saveError}</p> : null}

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || approving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          className={styles.approveBtn}
          onClick={onApprove}
          disabled={saving || approving}
        >
          {approving ? 'Approving...' : approveLabel}
        </button>
        <button type="button" className={styles.deleteBtn} onClick={onDelete}>
          {deleteLabel}
        </button>
      </div>
    </aside>
  )
}
