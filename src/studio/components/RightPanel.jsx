import { useEffect, useState } from 'react'
import { resolveMediaUrl } from '../../utils/resolveMediaUrl'
import { useResolvedMediaPreview } from '../../utils/useResolvedMediaPreview'
import { findShotById, SHOT_PRESETS } from '../data'
import { buildPresetApplyConfig } from '../applyScope/buildApplyScopeConfig'
import {
  resolveShotImageStatus,
} from '../imageStatus'
import { IconChevronRight, IconSun } from '../icons'
import ShotInspectorTab from '../inspector/ShotInspectorTab'
import AIEditPanel from '../aiEdit/AIEditPanel'
import { ShotStatusBadge } from './ImageStatusBadge'
import badgeStyles from './ImageStatusBadge.module.css'
import styles from './RightPanel.module.css'
import SuggestTab from './SuggestTab'
import { buildShotUpdatePayload, getShotEditForm } from '../shotEditForm'

const TABS = ['Edit', 'Suggest', 'Details', 'Inspector', 'AI Edit']

const SAVEABLE_PRESET_FIELDS = [
  { key: 'composition', formKey: 'composition', label: 'Composition' },
  { key: 'shotSize', formKey: 'shotSize', label: 'Shot Size' },
  { key: 'camera', formKey: 'camera', label: 'Camera' },
  { key: 'lighting', formKey: 'lighting', label: 'Lighting' },
]

const SCOPE_ONLY_FIELDS = [
  { key: 'lens', label: 'Lens' },
  { key: 'timeOfDay', label: 'Time of Day', icon: IconSun },
  { key: 'mood', label: 'Mood' },
]

function getEnvironmentCard(shot) {
  const assignedEnvironment =
    shot.environment && typeof shot.environment === 'object' ? shot.environment : null

  if (assignedEnvironment) {
    return {
      title: assignedEnvironment.name ?? 'Environment',
      subtitle: assignedEnvironment.location ?? assignedEnvironment.type ?? 'Scene',
      gradient: shot.thumbGradient,
      previewImage: resolveMediaUrl(assignedEnvironment.previewImage ?? shot.previewImage),
    }
  }

  const sceneContext =
    shot.sceneContext ?? (typeof shot.environment === 'string' ? shot.environment : '')

  if (sceneContext.toLowerCase().includes('ocean')) {
    return {
      title: 'Ocean',
      subtitle: 'Open Sea',
      gradient: shot.thumbGradient,
      previewImage: resolveMediaUrl(shot.previewImage),
    }
  }
  const parts = (sceneContext || 'Environment').split('—')
  return {
    title: parts[0]?.trim() || 'Environment',
    subtitle: parts[1]?.trim() || 'Scene',
    gradient: shot.thumbGradient,
    previewImage: resolveMediaUrl(shot.previewImage),
  }
}

function AssetThumb({ previewImage, gradient }) {
  const { imageSrc, showGradient, thumbGradient } = useResolvedMediaPreview(
    previewImage,
    gradient
  )

  return (
    <span
      className={styles.assetThumb}
      style={
        imageSrc
          ? { backgroundImage: `url(${imageSrc})` }
          : { background: showGradient ? thumbGradient : gradient }
      }
    />
  )
}

function getLightingCard(shot) {
  const lighting = shot.presets?.lighting ?? shot.lighting ?? 'Golden Hour'
  return {
    title: lighting === 'Golden Hour' ? 'Golden Sunset' : lighting,
    subtitle: 'Warm / Soft',
    gradient: 'linear-gradient(135deg, #422006, #f59e0b)',
  }
}

export default function RightPanel({
  selectedShotId,
  activeTab,
  onTabChange,
  shotAssignments,
  assignmentTimestamps,
  selectedRegion,
  onEditCharacter,
  onEditEnvironment,
  onEditObject,
  onOpenApplyScopeModal,
  regeneratingShotApiId = null,
  onSaveShot,
  projectCharacters = [],
  projectEnvironments = [],
  projectObjects = [],
  onReassignAssets,
  onRefreshAssignments,
  onUpdateShotReviewStatus,
  savingReviewStatus = false,
  compact = false,
}) {
  const match = findShotById(selectedShotId)
  const shot = match?.shot
  const scene = match?.scene

  return (
    <aside className={`${styles.panel} ${compact ? styles.panelCompact : ''}`}>
      <div className={styles.tabs} role="tablist" aria-label="Properties panel">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div
        className={styles.content}
        role="tabpanel"
        aria-label={`${activeTab} panel`}
        key={`${selectedShotId}-${activeTab}`}
      >
        {activeTab === 'Edit' && shot && (
          <EditTab
            key={shot.id}
            shot={shot}
            selectedShotId={selectedShotId}
            onOpenApplyScopeModal={onOpenApplyScopeModal}
            onSaveShot={onSaveShot}
          />
        )}
        {activeTab === 'Suggest' && shot && <SuggestTab key={shot.id} shot={shot} />}
        {activeTab === 'Details' && shot && scene && (
          <DetailsTab key={shot.id} shot={shot} scene={scene} />
        )}
        {activeTab === 'Inspector' && shot && (
          <ShotInspectorTab
            key={shot.apiId ?? shot.id}
            shot={shot}
            shotAssignments={shotAssignments}
            assignmentTimestamps={assignmentTimestamps}
            projectCharacters={projectCharacters}
            projectEnvironments={projectEnvironments}
            projectObjects={projectObjects}
            onReassignAssets={onReassignAssets}
            onAssignmentsRefresh={onRefreshAssignments}
            selectedRegion={selectedRegion}
            onEditCharacter={onEditCharacter}
            onEditEnvironment={onEditEnvironment}
            onEditObject={onEditObject}
            onUpdateShotReviewStatus={onUpdateShotReviewStatus}
            savingReviewStatus={savingReviewStatus}
          />
        )}
        {activeTab === 'AI Edit' && shot && (
          <AIEditPanel
            key={shot.id}
            shotId={shot.id}
            shotAssignments={shotAssignments}
            selectedRegion={selectedRegion}
          />
        )}
      </div>
    </aside>
  )
}

function EditTab({
  shot,
  selectedShotId,
  onOpenApplyScopeModal,
  regeneratingShotApiId,
  onSaveShot,
}) {
  const env = getEnvironmentCard(shot)
  const light = getLightingCard(shot)
  const [form, setForm] = useState(() => getShotEditForm(shot))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const isRegenerating = Boolean(shot.apiId) && String(regeneratingShotApiId) === String(shot.apiId)
  const shotStatus = resolveShotImageStatus(shot, { isRegenerating })

  useEffect(() => {
    setForm(getShotEditForm(shot))
    setSaveError(null)
  }, [
    shot.apiId,
    shot.label,
    shot.notes,
    shot.description,
    shot.duration,
    shot.lighting,
    shot.presets?.shotSize,
    shot.presets?.camera,
    shot.presets?.composition,
    shot.presets?.lighting,
  ])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    if (!shot.apiId || !onSaveShot || saving) return

    if (!form.title.trim()) {
      setSaveError('Title is required.')
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      await onSaveShot(shot.apiId, buildShotUpdatePayload(form))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save shot'
      setSaveError(message)
    } finally {
      setSaving(false)
    }
  }

  const handlePresetChange = (fieldKey, fieldLabel, newValue) => {
    onOpenApplyScopeModal?.(
      buildPresetApplyConfig(shot, fieldKey, fieldLabel, newValue, selectedShotId)
    )
  }

  return (
    <>
      <label className={styles.presetRow}>
        <span className={styles.presetLabel}>Title</span>
        <input
          className={styles.textInput}
          value={form.title}
          onChange={(event) => updateField('title', event.target.value)}
          aria-label="Shot title"
        />
      </label>

      <div className={styles.presetsHeader}>
        <h3 className={styles.presetsTitle}>Shot Presets</h3>
        <button type="button" className={styles.resetBtn}>
          Reset
        </button>
      </div>

      <div className={styles.presetRows}>
        {SAVEABLE_PRESET_FIELDS.map((field) => (
          <label key={field.key} className={styles.presetRow}>
            <span className={styles.presetLabel}>{field.label}</span>
            <select
              className={styles.select}
              value={form[field.formKey]}
              onChange={(event) => updateField(field.formKey, event.target.value)}
            >
              {SHOT_PRESETS[field.key].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
        {SCOPE_ONLY_FIELDS.map((field) => (
          <label key={field.key} className={styles.presetRow}>
            <span className={styles.presetLabel}>
              {field.icon && <field.icon />}
              {field.label}
            </span>
            <select
              className={styles.select}
              defaultValue={shot.presets?.[field.key] ?? ''}
              onChange={(event) =>
                handlePresetChange(field.key, field.label, event.target.value)
              }
            >
              {SHOT_PRESETS[field.key].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label className={styles.presetRow}>
          <span className={styles.presetLabel}>Duration</span>
          <input
            className={styles.textInput}
            type="number"
            min="1"
            max="3600"
            value={form.durationSeconds}
            onChange={(event) => updateField('durationSeconds', event.target.value)}
            aria-label="Shot duration in seconds"
          />
        </label>
      </div>

      <button type="button" className={styles.assetCard}>
        <AssetThumb previewImage={env.previewImage} gradient={env.gradient} />
        <span className={styles.assetMeta}>
          <span className={styles.assetTitle}>{env.title}</span>
          <span className={styles.assetSubtitle}>{env.subtitle}</span>
        </span>
        <IconChevronRight />
      </button>

      <button type="button" className={styles.assetCard}>
        <span className={styles.assetThumb} style={{ background: light.gradient }} />
        <span className={styles.assetMeta}>
          <span className={styles.assetTitle}>{light.title}</span>
          <span className={styles.assetSubtitle}>{light.subtitle}</span>
        </span>
        <IconChevronRight />
      </button>

      <label className={styles.notesField}>
        <span className={styles.notesLabel}>Notes</span>
        <textarea
          className={styles.textarea}
          rows={3}
          placeholder="Add notes for this shot..."
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
        />
      </label>

      <button
        type="button"
        className={styles.saveBtn}
        onClick={handleSave}
        disabled={!shot.apiId || saving}
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
      {saveError && <p className={styles.saveError}>{saveError}</p>}

      <div className={badgeStyles.imageStatusRow}>
        <span className={badgeStyles.imageStatusLabel}>Image status</span>
        <ShotStatusBadge status={shotStatus} />
      </div>
    </>
  )
}

function DetailsTab({ shot, scene }) {
  const metaRows = [
    { label: 'Scene', value: scene.title },
    { label: 'Shot', value: shot.id },
    { label: 'Duration', value: shot.duration },
    { label: 'Frame count', value: String(shot.frameCount) },
  ]

  return (
    <>
      <dl className={styles.metaList}>
        {metaRows.map((row) => (
          <div key={row.label} className={styles.metaRow}>
            <dt className={styles.metaLabel}>{row.label}</dt>
            <dd className={styles.metaValue}>{row.value}</dd>
          </div>
        ))}
      </dl>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Description</h3>
        <p className={styles.description}>{shot.description}</p>
      </section>
    </>
  )
}
