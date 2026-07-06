import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import ErrorModal from '../app/components/ErrorModal'
import { getCharacterImageUrl, getEnvironmentImageUrl, getShotVersionImageUrl, resolveMediaUrl } from '../utils/resolveMediaUrl'
import { formatUserFriendlyError } from '../utils/userFriendlyErrors'
import {
  CINEMATOGRAPHY_PRESETS,
  COMPOSITION_PRESETS,
  LIGHTING_PRESETS,
  STORYBOARD_SETTINGS_TABS,
  presetToPayload,
  resolvePresetOption,
} from './storyboardPresets'
import { askShotDirector } from '../services/adstoryApi'
import StoryboardDirectorPanel from './StoryboardDirectorPanel'
import { applyDirectorSuggestionsToLocalSettings } from './storyboardDirector'
import { shotHasStoryboardImage } from './storyboardStatus'
import styles from './StoryboardShotSettingsModal.module.css'

function sortVersionsNewestFirst(versions = []) {
  return [...versions].sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0))
}

function formatVersionStatus(status) {
  const normalized = String(status ?? '').trim().toLowerCase()
  if (!normalized) return 'Unknown'
  if (normalized === 'completed') return 'Completed'
  if (normalized === 'failed') return 'Failed'
  if (normalized === 'pending') return 'Pending'
  return status
}

function assetKey(asset) {
  return String(asset?.id ?? '')
}

function isAssetSelected(selected, asset) {
  const key = assetKey(asset)
  if (!key) return false
  return selected.some((item) => assetKey(item) === key)
}

function toggleAsset(selected, asset) {
  const key = assetKey(asset)
  if (!key) return selected
  if (isAssetSelected(selected, asset)) {
    return selected.filter((item) => assetKey(item) !== key)
  }
  return [...selected, asset]
}

function PresetGrid({ options, value, onChange }) {
  const selectedId = value?.id ?? null

  return (
    <div className={styles.presetGrid}>
      {options.map((option) => {
        const isSelected = selectedId === option.id
        return (
          <button
            key={option.id}
            type="button"
            className={`${styles.presetBtn} ${isSelected ? styles.presetBtnSelected : ''}`}
            onClick={() => onChange(isSelected ? null : option)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function AssetEntitySection({ entity, entityType, heroUrl, assets, selectedAssets, onToggleAsset }) {
  const label = entity.name ?? 'Unnamed'

  return (
    <section className={styles.entitySection}>
      <div className={styles.entityHeader}>
        {heroUrl ? (
          <img src={heroUrl} alt="" className={styles.entityHero} />
        ) : (
          <div className={styles.entityHeroPlaceholder} aria-hidden="true" />
        )}
        <div>
          <h3 className={styles.entityName}>{label}</h3>
          <p className={styles.entityMeta}>
            {assets.length} asset{assets.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>
      {assets.length ? (
        <div className={styles.assetGrid}>
          {assets.map((asset) => {
            const thumbUrl = resolveMediaUrl(asset.image_url)
            const selected = isAssetSelected(selectedAssets, asset)
            return (
              <button
                key={`${entityType}-${asset.id}`}
                type="button"
                className={`${styles.assetTile} ${selected ? styles.assetTileSelected : ''}`}
                onClick={() => onToggleAsset(asset)}
                title={asset.title || asset.asset_type || 'Asset'}
              >
                {thumbUrl ? (
                  <img src={thumbUrl} alt="" className={styles.assetThumb} />
                ) : (
                  <div className={styles.assetThumbPlaceholder} aria-hidden="true" />
                )}
                <span className={styles.assetLabel}>
                  {asset.title || asset.asset_type || 'Asset'}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className={styles.emptyHint}>No saved assets for this {entityType} yet.</p>
      )}
    </section>
  )
}

export default function StoryboardShotSettingsModal({
  open,
  scene,
  shot,
  projectId,
  characters = [],
  environments = [],
  onClose,
  onSave,
  onGenerateImage,
  onApproveVersion,
  onDeleteVersion,
}) {
  const [activeTab, setActiveTab] = useState('composition')
  const [compositionPreset, setCompositionPreset] = useState(null)
  const [cinematographyPreset, setCinematographyPreset] = useState(null)
  const [lightingPreset, setLightingPreset] = useState(null)
  const [selectedCharacterAssets, setSelectedCharacterAssets] = useState([])
  const [selectedEnvironmentAssets, setSelectedEnvironmentAssets] = useState([])
  const [storyboardSettings, setStoryboardSettings] = useState(null)
  const [directorNotes, setDirectorNotes] = useState('')
  const [directorSuggestions, setDirectorSuggestions] = useState(null)
  const [askingDirector, setAskingDirector] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [approvingImageId, setApprovingImageId] = useState(null)
  const [deletingImageId, setDeletingImageId] = useState(null)
  const [saveMessage, setSaveMessage] = useState(null)
  const [error, setError] = useState(null)
  const [errorModal, setErrorModal] = useState(null)

  const isBusy = saving || generating || askingDirector || Boolean(approvingImageId || deletingImageId)

  useEffect(() => {
    if (!open || !shot) return
    setActiveTab('composition')
    setCompositionPreset(resolvePresetOption(shot.composition_preset, COMPOSITION_PRESETS))
    setCinematographyPreset(resolvePresetOption(shot.cinematography_preset, CINEMATOGRAPHY_PRESETS))
    setLightingPreset(resolvePresetOption(shot.lighting_preset, LIGHTING_PRESETS))
    setSelectedCharacterAssets(
      Array.isArray(shot.selected_character_assets) ? [...shot.selected_character_assets] : []
    )
    setSelectedEnvironmentAssets(
      Array.isArray(shot.selected_environment_assets) ? [...shot.selected_environment_assets] : []
    )
    setStoryboardSettings(
      shot.storyboard_settings && typeof shot.storyboard_settings === 'object'
        ? { ...shot.storyboard_settings }
        : null
    )
    setDirectorNotes('')
    setDirectorSuggestions(null)
    setAskingDirector(false)
    setSaving(false)
    setGenerating(false)
    setApprovingImageId(null)
    setDeletingImageId(null)
    setSaveMessage(null)
    setError(null)
    setErrorModal(null)
  }, [open, shot])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isBusy) onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, open, isBusy])

  const imageSrc = useMemo(() => {
    if (!shot) return null
    return resolveMediaUrl(shot.previewImage ?? shot.imageUrl ?? shot.image_url)
  }, [shot])

  const versions = useMemo(
    () => sortVersionsNewestFirst(shot?.shot_images ?? []),
    [shot?.shot_images]
  )

  const hasStoryboardImage = shotHasStoryboardImage(shot)

  if (!open || !shot) return null

  const shotLabel = shot.label ?? shot.title ?? `Shot ${shot.id}`

  const buildSettingsPayload = () => ({
    composition_preset: presetToPayload(compositionPreset),
    cinematography_preset: presetToPayload(cinematographyPreset),
    lighting_preset: presetToPayload(lightingPreset),
    selected_character_assets: selectedCharacterAssets,
    selected_environment_assets: selectedEnvironmentAssets,
    storyboard_settings: storyboardSettings,
  })

  const showErrorModal = (err, fallback) => {
    const formatted = formatUserFriendlyError(
      err instanceof Error ? err.message : fallback
    )
    setErrorModal(formatted)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaveMessage(null)
    try {
      await onSave?.(buildSettingsPayload())
      setSaveMessage('Settings saved')
    } catch (err) {
      const formatted = formatUserFriendlyError(
        err instanceof Error ? err.message : 'Failed to save storyboard settings'
      )
      setError(formatted.message)
      showErrorModal(err, 'Failed to save storyboard settings')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateImage = async () => {
    if (!onGenerateImage) return

    setGenerating(true)
    setError(null)
    setSaveMessage(null)
    try {
      await onGenerateImage(buildSettingsPayload())
      setActiveTab('versions')
    } catch (err) {
      const formatted = formatUserFriendlyError(
        err instanceof Error ? err.message : 'Failed to generate shot image'
      )
      setError(formatted.message)
      showErrorModal(err, 'Failed to generate shot image')
    } finally {
      setGenerating(false)
    }
  }

  const handleApproveVersion = async (version) => {
    if (!version?.id || !onApproveVersion) return

    setApprovingImageId(version.id)
    setError(null)
    try {
      await onApproveVersion(version)
    } catch (err) {
      const formatted = formatUserFriendlyError(
        err instanceof Error ? err.message : 'Failed to approve version'
      )
      setError(formatted.message)
      showErrorModal(err, 'Failed to approve version')
    } finally {
      setApprovingImageId(null)
    }
  }

  const handleDeleteVersion = async (version) => {
    if (!version?.id || !onDeleteVersion) return

    setDeletingImageId(version.id)
    setError(null)
    try {
      await onDeleteVersion(version)
    } catch (err) {
      const formatted = formatUserFriendlyError(
        err instanceof Error ? err.message : 'Failed to delete version'
      )
      setError(formatted.message)
      showErrorModal(err, 'Failed to delete version')
    } finally {
      setDeletingImageId(null)
    }
  }

  const handleAskDirector = async () => {
    const instruction = directorNotes.trim()
    if (!projectId || !shot?.apiId) {
      showErrorModal(new Error('Open a project before asking the director.'), 'Shot unavailable')
      return
    }
    if (instruction.length < 3) {
      setError('Director instruction must be at least 3 characters.')
      return
    }

    setAskingDirector(true)
    setError(null)
    setSaveMessage(null)
    try {
      const suggestions = await askShotDirector(projectId, shot.apiId, instruction)
      setDirectorSuggestions(suggestions)
    } catch (err) {
      const formatted = formatUserFriendlyError(
        err instanceof Error ? err.message : 'Failed to get director suggestions'
      )
      setError(formatted.message)
      showErrorModal(err, 'Failed to get director suggestions')
    } finally {
      setAskingDirector(false)
    }
  }

  const handleApplyDirectorSuggestions = () => {
    if (!directorSuggestions) return

    const applied = applyDirectorSuggestionsToLocalSettings(
      directorSuggestions,
      storyboardSettings ?? shot.storyboard_settings ?? {}
    )

    if (applied.compositionPreset) setCompositionPreset(applied.compositionPreset)
    if (applied.cinematographyPreset) setCinematographyPreset(applied.cinematographyPreset)
    if (applied.lightingPreset) setLightingPreset(applied.lightingPreset)
    setStoryboardSettings(applied.storyboardSettings)
    setSaveMessage('Suggestions applied locally')
    setError(null)
  }

  const toggleCharacterAsset = (asset) => {
    setSelectedCharacterAssets((current) => toggleAsset(current, asset))
  }

  const toggleEnvironmentAsset = (asset) => {
    setSelectedEnvironmentAssets((current) => toggleAsset(current, asset))
  }

  return createPortal(
    <>
      <div className={styles.overlay} role="presentation" onClick={isBusy ? undefined : onClose}>
        <div
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="storyboard-shot-settings-title"
          onClick={(event) => event.stopPropagation()}
        >
          <header className={styles.header}>
            <div className={styles.headerCopy}>
              <p className={styles.eyebrow}>
                Scene {scene?.id ?? '—'} · Shot {shot.id}
              </p>
              <h2 id="storyboard-shot-settings-title" className={styles.title}>
                {shotLabel}
              </h2>
              {shot.description ? <p className={styles.subtitle}>{shot.description}</p> : null}
            </div>
            <button type="button" className={styles.closeBtn} onClick={onClose} disabled={isBusy}>
              ×
            </button>
          </header>

          <div className={styles.workspace}>
            <aside className={styles.previewColumn}>
              <div className={styles.heroImageFrame}>
                {generating ? (
                  <div className={styles.generatingOverlay} role="status" aria-live="polite">
                    Generating storyboard image...
                  </div>
                ) : null}
                {imageSrc ? (
                  <img src={imageSrc} alt="" className={styles.heroImage} />
                ) : (
                  <span className={styles.heroPlaceholder}>No storyboard image yet</span>
                )}
              </div>
            </aside>

            <div className={styles.settingsColumn}>
              <div className={styles.tabs} role="tablist" aria-label="Storyboard settings">
                {STORYBOARD_SETTINGS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className={styles.body}>
                {activeTab === 'composition' ? (
                  <PresetGrid
                    options={COMPOSITION_PRESETS}
                    value={compositionPreset}
                    onChange={setCompositionPreset}
                  />
                ) : null}

                {activeTab === 'cinematography' ? (
                  <PresetGrid
                    options={CINEMATOGRAPHY_PRESETS}
                    value={cinematographyPreset}
                    onChange={setCinematographyPreset}
                  />
                ) : null}

                {activeTab === 'lighting' ? (
                  <PresetGrid
                    options={LIGHTING_PRESETS}
                    value={lightingPreset}
                    onChange={setLightingPreset}
                  />
                ) : null}

                {activeTab === 'characters' ? (
                  <div className={styles.entityList}>
                    {characters.length ? (
                      characters.map((character) => (
                        <AssetEntitySection
                          key={character.id}
                          entity={character}
                          entityType="character"
                          heroUrl={getCharacterImageUrl(character)}
                          assets={character.assets ?? []}
                          selectedAssets={selectedCharacterAssets}
                          onToggleAsset={toggleCharacterAsset}
                        />
                      ))
                    ) : (
                      <p className={styles.emptyHint}>No characters in this project yet.</p>
                    )}
                  </div>
                ) : null}

                {activeTab === 'environment' ? (
                  <div className={styles.entityList}>
                    {environments.length ? (
                      environments.map((environment) => (
                        <AssetEntitySection
                          key={environment.id}
                          entity={environment}
                          entityType="environment"
                          heroUrl={getEnvironmentImageUrl(environment)}
                          assets={environment.assets ?? []}
                          selectedAssets={selectedEnvironmentAssets}
                          onToggleAsset={toggleEnvironmentAsset}
                        />
                      ))
                    ) : (
                      <p className={styles.emptyHint}>No environments in this project yet.</p>
                    )}
                  </div>
                ) : null}

                {activeTab === 'director' ? (
                  <StoryboardDirectorPanel
                    directorNotes={directorNotes}
                    onDirectorNotesChange={setDirectorNotes}
                    suggestions={directorSuggestions}
                    asking={askingDirector}
                    onAskDirector={handleAskDirector}
                    onApplySuggestions={handleApplyDirectorSuggestions}
                    disabled={isBusy}
                  />
                ) : null}

                {activeTab === 'versions' ? (
                  versions.length ? (
                    <div className={styles.versionList}>
                      {versions.map((version) => {
                        const versionUrl = getShotVersionImageUrl(version)
                        const isApproved = Boolean(version.is_approved)
                        const isApproving = String(approvingImageId) === String(version.id)
                        const isDeleting = String(deletingImageId) === String(version.id)

                        return (
                          <article key={version.id ?? version.version_number} className={styles.versionRow}>
                            <div className={styles.versionMeta}>
                              <h3 className={styles.versionLabel}>
                                Version {version.version_number}
                                {isApproved ? (
                                  <span className={styles.versionApproved}>Approved</span>
                                ) : null}
                              </h3>
                              <p className={styles.versionStatus}>
                                Status: {formatVersionStatus(version.status)}
                              </p>
                            </div>
                            {versionUrl ? (
                              <img src={versionUrl} alt="" className={styles.versionThumb} />
                            ) : (
                              <div className={styles.versionThumbPlaceholder} aria-hidden="true" />
                            )}
                            <div className={styles.versionActions}>
                              {!isApproved ? (
                                <button
                                  type="button"
                                  className={styles.versionActionBtn}
                                  onClick={() => handleApproveVersion(version)}
                                  disabled={isBusy}
                                >
                                  {isApproving ? 'Approving…' : 'Approve'}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className={styles.versionActionBtnDanger}
                                onClick={() => handleDeleteVersion(version)}
                                disabled={isBusy}
                              >
                                {isDeleting ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  ) : (
                    <p className={styles.emptyHint}>No generated image versions yet.</p>
                  )
                ) : null}

                {error ? <p className={styles.error}>{error}</p> : null}
              </div>
            </div>
          </div>

          <footer className={styles.footer}>
            {saveMessage ? (
              <span className={styles.savedBadge} role="status">
                {saveMessage}
              </span>
            ) : null}
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isBusy}>
              Close
            </button>
            <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={isBusy}>
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
            <button
              type="button"
              className={styles.generateBtn}
              onClick={handleGenerateImage}
              disabled={isBusy || hasStoryboardImage || !onGenerateImage}
            >
              {generating ? 'Generating…' : 'Generate Image'}
            </button>
            <button
              type="button"
              className={styles.regenerateBtn}
              onClick={handleGenerateImage}
              disabled={isBusy || !hasStoryboardImage || !onGenerateImage}
            >
              {generating ? 'Regenerating…' : 'Regenerate Image'}
            </button>
          </footer>
        </div>
      </div>

      <ErrorModal
        open={Boolean(errorModal)}
        title={errorModal?.title ?? 'Something went wrong'}
        message={errorModal?.message ?? ''}
        onClose={() => setErrorModal(null)}
      />
    </>,
    document.body
  )
}
