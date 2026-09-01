import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DebugPanel from '../../components/DebugPanel'
import {
  deleteProjectCharacter,
  isBackendCharacterId,
  mapAdstoryCharacters,
  mergeAdstoryCharacterUpdate,
} from '../../services/adstoryApi'
import * as projectApi from '../../services/projectApi'
import { getCharacterImageUrl, getCostumeImageUrl, resolveMediaUrl } from '../../utils/resolveMediaUrl'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import ErrorModal from '../../app/components/ErrorModal'
import ImagePreviewModal from '../../app/components/ImagePreviewModal'
import CharacterSheetModal from './CharacterSheetModal'
import { getCharacterDisplayStatus } from '../characterGenerationStatus'
import { useProjectStore } from '../../project/ProjectStoreContext'
import { getWorkspaceQuestion } from '../creationData'
import fieldStyles from './StepLayout.module.css'
import styles from './CharactersStep.module.css'

const AVATAR_GRADIENTS = [
  'linear-gradient(145deg, #1f2937 0%, #374151 100%)',
  'linear-gradient(145deg, #1e293b 0%, #334155 100%)',
  'linear-gradient(145deg, #312e81 0%, #4c1d95 100%)',
  'linear-gradient(145deg, #134e4a 0%, #0f766e 100%)',
]

function characterHasImage(character) {
  return Boolean(getCharacterImageUrl(character))
}

function updateCharacter(characters, characterId, patch) {
  return characters.map((item) =>
    String(item.id) === String(characterId) ? { ...item, ...patch } : item
  )
}

function CastGalleryCard({ character, index, isSelected, isGenerating, onSelect, onPreviewImage }) {
  const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]
  const rawImageUrl = String(character.image_url ?? '').trim()
  const displayImageUrl =
    resolveMediaUrl(rawImageUrl) ??
    getCharacterImageUrl(character)

  useEffect(() => {
    if (displayImageUrl) {
      console.log('[CharacterCard]', character.name, character.image_url, 'image element rendered')
    }
  }, [character.name, character.image_url, displayImageUrl])

  let statusLabel = getCharacterDisplayStatus(character)
  if (isGenerating && !displayImageUrl) {
    statusLabel = 'Generating…'
  }

  return (
    <article
      className={`${fieldStyles.galleryCard} ${isSelected ? fieldStyles.galleryCardSelected : ''}`}
      onClick={() => onSelect(character.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(character.id)
        }
      }}
      role="button"
      tabIndex={0}
    >
      {displayImageUrl ? (
        <button
          type="button"
          className={styles.imagePreviewBtn}
          onClick={(event) => {
            event.stopPropagation()
            onPreviewImage({ imageUrl: displayImageUrl, title: character.name })
          }}
          aria-label={`View ${character.name}`}
        >
          <div className={styles.imageMedia}>
            <img
              src={displayImageUrl}
              alt={character.name || 'Character portrait'}
              className="character-image"
            />
          </div>
        </button>
      ) : (
        <div
          className={`${styles.imageMedia} ${fieldStyles.galleryHero}`}
          style={{ background: gradient }}
          aria-hidden="true"
        />
      )}
      <div className={fieldStyles.galleryCardBody}>
        <h3 className={fieldStyles.galleryCardTitle}>{character.name || 'Unnamed'}</h3>
        <p className={fieldStyles.galleryCardMeta}>
          {character.role || 'Role TBD'} · {statusLabel}
        </p>
      </div>
    </article>
  )
}

function CharacterInspector({
  character,
  characterIndex,
  total,
  isGenerating,
  isGeneratingCostume,
  isGenerateAllRunning,
  isDeleting,
  rowError,
  onChange,
  onDelete,
  onGenerate,
  onGenerateCostume,
  onOpenSheet,
  onPreviewImage,
}) {
  if (!character) {
    return (
      <aside className={fieldStyles.inspector}>
        <p className={fieldStyles.fieldHint}>Select a cast member to edit details.</p>
      </aside>
    )
  }

  const hasImage = characterHasImage(character)
  const costumeUrl = getCostumeImageUrl(character)
  const buttonLabel = isGenerating ? 'Generating…' : hasImage ? 'Regenerate' : 'Generate'
  const buttonDisabled = isGenerating || isGeneratingCostume || isGenerateAllRunning || isDeleting
  const costumeLabel = isGeneratingCostume ? 'Generating…' : costumeUrl ? 'Regenerate costume sheet' : 'Generate costume sheet'

  return (
    <aside className={fieldStyles.inspector}>
      <div className={fieldStyles.inspectorHeader}>
        <h2 className={fieldStyles.inspectorTitle}>Inspector</h2>
        <span className={fieldStyles.inspectorIndex}>
          CAST {characterIndex + 1} OF {total}
        </span>
      </div>
      <div className={fieldStyles.inspectorBody}>
        <div className={fieldStyles.sceneField}>
          <label className={fieldStyles.sceneFieldLabel} htmlFor={`char-${character.id}-name`}>Name</label>
          <input id={`char-${character.id}-name`} className={fieldStyles.sceneFieldInput} value={character.name ?? ''} onChange={(e) => onChange({ name: e.target.value })} />
        </div>
        <div className={fieldStyles.sceneField}>
          <label className={fieldStyles.sceneFieldLabel} htmlFor={`char-${character.id}-role`}>Role</label>
          <input id={`char-${character.id}-role`} className={fieldStyles.sceneFieldInput} value={character.role ?? ''} onChange={(e) => onChange({ role: e.target.value })} />
        </div>
        <div className={fieldStyles.sceneFieldRow}>
          <div className={fieldStyles.sceneField}>
            <label className={fieldStyles.sceneFieldLabel} htmlFor={`char-${character.id}-age`}>Age</label>
            <input id={`char-${character.id}-age`} className={fieldStyles.sceneFieldInput} value={character.age ?? ''} onChange={(e) => onChange({ age: e.target.value })} />
          </div>
          <div className={fieldStyles.sceneField}>
            <label className={fieldStyles.sceneFieldLabel} htmlFor={`char-${character.id}-gender`}>Gender</label>
            <input id={`char-${character.id}-gender`} className={fieldStyles.sceneFieldInput} value={character.gender ?? ''} onChange={(e) => onChange({ gender: e.target.value })} />
          </div>
        </div>
        <div className={fieldStyles.sceneField}>
          <label className={fieldStyles.sceneFieldLabel} htmlFor={`char-${character.id}-description`}>Description</label>
          <textarea id={`char-${character.id}-description`} className={fieldStyles.sceneFieldTextarea} value={character.description ?? ''} onChange={(e) => onChange({ description: e.target.value })} rows={2} />
        </div>
        <div className={fieldStyles.sceneField}>
          <label className={fieldStyles.sceneFieldLabel} htmlFor={`char-${character.id}-personality`}>Personality</label>
          <input id={`char-${character.id}-personality`} className={fieldStyles.sceneFieldInput} value={character.personality ?? ''} onChange={(e) => onChange({ personality: e.target.value })} />
        </div>
        <div className={fieldStyles.sceneField}>
          <label className={fieldStyles.sceneFieldLabel} htmlFor={`char-${character.id}-appearance`}>Appearance</label>
          <textarea id={`char-${character.id}-appearance`} className={fieldStyles.sceneFieldTextarea} value={character.appearance ?? ''} onChange={(e) => onChange({ appearance: e.target.value })} rows={2} />
        </div>
        <div className={fieldStyles.sceneField}>
          <label className={fieldStyles.sceneFieldLabel} htmlFor={`char-${character.id}-wardrobe`}>Wardrobe</label>
          <textarea id={`char-${character.id}-wardrobe`} className={fieldStyles.sceneFieldTextarea} value={character.wardrobe ?? ''} onChange={(e) => onChange({ wardrobe: e.target.value })} rows={2} />
        </div>
        <div className={fieldStyles.sceneField}>
          <span className={fieldStyles.sceneFieldLabel}>Costume sheet</span>
          {costumeUrl ? (
            <button
              type="button"
              className={styles.costumePreviewBtn}
              onClick={() => onPreviewImage?.({ imageUrl: costumeUrl, title: `${character.name} costume` })}
            >
              <img src={costumeUrl} alt={`${character.name} costume sheet`} className={styles.costumePreview} />
            </button>
          ) : (
            <p className={fieldStyles.fieldHint}>Full-body sheet so storyboard shots keep the same clothes.</p>
          )}
        </div>
        {rowError ? <p className={styles.rowError} role="alert">{rowError}</p> : null}
        <div className={fieldStyles.characterActionsPrimary}>
          <button type="button" className={styles.generateBtn} onClick={() => onGenerate(character)} disabled={buttonDisabled}>{buttonLabel}</button>
          <button type="button" className={fieldStyles.secondaryBtnActive} onClick={() => onGenerateCostume(character)} disabled={buttonDisabled}>{costumeLabel}</button>
          <button type="button" className={fieldStyles.secondaryBtnActive} onClick={() => onOpenSheet(character)}>Character sheet</button>
          <button type="button" className={styles.deleteBtn} onClick={() => onDelete(character)} disabled={buttonDisabled}>{isDeleting ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>
    </aside>
  )
}

const extractInflight = new Map()

export default function CharactersStep({
  projectId,
  style,
  onBack,
  onNext,
  onActionChange,
  onSave,
  saveStatus = 'idle',
  saveError,
}) {
  const navigate = useNavigate()
  const {
    characters,
    mergeCharacters,
    loadCharacters,
  } = useProjectStore()

  const [extracting, setExtracting] = useState(false)
  const [stepDataLoading, setStepDataLoading] = useState(() => characters.length === 0)
  const [generatingIds, setGeneratingIds] = useState(() => new Set())
  const [generatingCostumeIds, setGeneratingCostumeIds] = useState(() => new Set())
  const [requestTriggered, setRequestTriggered] = useState(false)
  const [deletingIds, setDeletingIds] = useState(() => new Set())
  const [generatingAll, setGeneratingAll] = useState(false)
  const [rowErrors, setRowErrors] = useState({})
  const [actionError, setActionError] = useState(null)
  const [sheetCharacterId, setSheetCharacterId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const isSaving = saveStatus === 'saving'
  const saveStatusLabel =
    saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : null

  const combinedLoading = stepDataLoading && characters.length === 0

  useEffect(() => {
    if (characters.length > 0) {
      setStepDataLoading(false)
    }
  }, [characters.length])

  useEffect(() => {
    if (!projectId) return undefined

    let cancelled = false
    setRequestTriggered(true)
    if (characters.length === 0) {
      setStepDataLoading(true)
    }

    const loadAndExtract = async () => {
      try {
        const loaded = await loadCharacters(projectId)
        if (cancelled) return

        if ((loaded?.length ?? 0) > 0) {
          return
        }

        setExtracting(true)
        const key = String(projectId)
        let pending = extractInflight.get(key)
        if (!pending) {
          pending = projectApi
            .generateCharacters({
              project_id: projectId,
              style,
            })
            .finally(() => {
              extractInflight.delete(key)
            })
          extractInflight.set(key, pending)
        }

        const result = await pending
        if (cancelled) return

        const next = mapAdstoryCharacters(result.characters ?? [])
        if (next.length > 0) {
          mergeCharacters(next)
        }
      } catch (err) {
        if (!cancelled) {
          setActionError(
            formatUserFriendlyError(
              err instanceof Error ? err.message : 'Failed to extract characters'
            ).message
          )
        }
      } finally {
        if (!cancelled) {
          setExtracting(false)
          setStepDataLoading(false)
        }
      }
    }

    loadAndExtract()

    return () => {
      cancelled = true
    }
  }, [loadCharacters, mergeCharacters, projectId, style])

  const patchCharacters = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(characters) : updater
      mergeCharacters(next)
    },
    [characters, mergeCharacters]
  )

  const generationActive =
    generatingAll || generatingIds.size > 0 || generatingCostumeIds.size > 0

  useEffect(() => {
    if (!selectedId && characters.length) setSelectedId(characters[0].id)
    else if (selectedId && !characters.find((c) => String(c.id) === String(selectedId)) && characters.length) {
      setSelectedId(characters[0].id)
    }
  }, [characters, selectedId])

  const selectedCharacter = characters.find((c) => String(c.id) === String(selectedId)) ?? null
  const selectedIndex = characters.findIndex((c) => String(c.id) === String(selectedId))

  const generateOne = useCallback(
    async (character) => {
      const id = String(character.id)
      setGeneratingIds((prev) => new Set(prev).add(id))
      setRowErrors((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })

      try {
        const characterId = character.db_id ?? character.id
        const result = await projectApi.generateCharacterImage({
          project_id: projectId,
          character_id: characterId,
          character,
          force: characterHasImage(character),
        })

        let merged = mergeAdstoryCharacterUpdate(character, result)
        patchCharacters((current) =>
          current.map((item) => (String(item.id) === id ? merged : item))
        )

        try {
          const costume = await projectApi.generateCharacterCostume({
            project_id: projectId,
            character_id: characterId,
            character: merged,
            force: Boolean(merged.costume_image_url) || characterHasImage(character),
          })
          merged = mergeAdstoryCharacterUpdate(merged, costume)
          patchCharacters((current) =>
            current.map((item) => (String(item.id) === id ? merged : item))
          )
        } catch (costumeErr) {
          setRowErrors((prev) => ({
            ...prev,
            [id]: formatUserFriendlyError(
              costumeErr instanceof Error ? costumeErr.message : 'Failed to generate costume sheet'
            ).message,
          }))
        }
      } catch (err) {
        const message = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to generate character image'
        ).message
        setRowErrors((prev) => ({ ...prev, [id]: message }))
        throw err
      } finally {
        setGeneratingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [projectId, patchCharacters]
  )

  const handleGenerateOne = useCallback(
    async (character) => {
      if (generatingAll) return
      const id = String(character.id)
      if (generatingIds.has(id)) return
      await generateOne(character)
    },
    [generateOne, generatingAll, generatingIds]
  )

  const handleGenerateCostume = useCallback(
    async (character) => {
      if (generatingAll) return
      const id = String(character.id)
      if (generatingIds.has(id) || generatingCostumeIds.has(id)) return
      if (!isBackendCharacterId(character.id) && !isBackendCharacterId(character.db_id)) {
        setRowErrors((prev) => ({
          ...prev,
          [id]: 'Save this character before generating a costume sheet.',
        }))
        return
      }

      setGeneratingCostumeIds((prev) => new Set(prev).add(id))
      setRowErrors((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })

      try {
        const result = await projectApi.generateCharacterCostume({
          project_id: projectId,
          character_id: character.db_id ?? character.id,
          character,
          force: Boolean(character.costume_image_url),
        })
        patchCharacters((current) =>
          current.map((item) =>
            String(item.id) === id ? mergeAdstoryCharacterUpdate(item, result) : item
          )
        )
      } catch (err) {
        const message = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to generate costume sheet'
        ).message
        setRowErrors((prev) => ({ ...prev, [id]: message }))
      } finally {
        setGeneratingCostumeIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [generatingAll, generatingIds, generatingCostumeIds, projectId, patchCharacters]
  )

  const handleGenerateAll = useCallback(async () => {
    if (generatingAll || generatingIds.size > 0 || generationActive) return

    const pending = characters.filter((character) => !characterHasImage(character))
    if (!pending.length) return

    setGeneratingAll(true)
    setActionError(null)

    try {
      for (let index = 0; index < pending.length; index += 1) {
        try {
          await generateOne(pending[index])
        } catch {
          // Row-level error is shown; continue with remaining characters.
        }
      }
    } finally {
      setGeneratingAll(false)
    }
  }, [generateOne, generationActive, generatingAll, generatingIds, characters])

  const handleDelete = useCallback(
    async (character) => {
      const id = String(character.id)
      if (generatingIds.has(id) || deletingIds.has(id)) return

      setDeletingIds((prev) => new Set(prev).add(id))
      setRowErrors((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })

      try {
        if (projectId && isBackendCharacterId(character.id)) {
          await deleteProjectCharacter(projectId, character.id)
        }

        patchCharacters((current) => current.filter((item) => String(item.id) !== id))

        if (String(sheetCharacterId) === id) {
          setSheetCharacterId(null)
        }
      } catch (err) {
        const message = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to delete character'
        ).message
        setRowErrors((prev) => ({ ...prev, [id]: message }))
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [deletingIds, generatingIds, projectId, sheetCharacterId, patchCharacters]
  )

  const handleSave = useCallback(async () => {
    await onSave?.(characters)
  }, [characters, onSave])

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
      return
    }
    navigate(-1)
  }, [navigate, onBack])

  useEffect(() => {
    if (!onActionChange) {
      return undefined
    }

    onActionChange({
      label: 'Continue to environments',
      generatingLabel: extracting ? 'Extracting characters…' : 'Continue to environments',
      disabled: extracting || isSaving || characters.length === 0,
      onClick: () => onNext?.(),
      secondaryAction: {
        label: 'Back to Sequences',
        onClick: handleBack,
        disabled: extracting || isSaving,
      },
    })

    return () => onActionChange(null)
  }, [characters.length, extracting, handleBack, isSaving, onActionChange, onNext])

  const localModalError = useMemo(
    () => (actionError ? formatUserFriendlyError(actionError) : null),
    [actionError]
  )
  const characterCount = characters.length
  const isImageGenerationBusy = generatingAll || generatingIds.size > 0
  const sheetCharacter = useMemo(
    () => characters.find((item) => String(item.id) === String(sheetCharacterId)) ?? null,
    [characters, sheetCharacterId]
  )

  const handleSheetCharacterChange = useCallback(
    (updatedCharacter) => {
      patchCharacters((current) =>
        current.map((item) =>
          String(item.id) === String(updatedCharacter.id) ? updatedCharacter : item
        )
      )
    },
    [patchCharacters]
  )

  const handleOpenSheet = useCallback((character) => {
    setSheetCharacterId(String(character.id))
  }, [])

  const handlePreviewImage = useCallback((preview) => {
    setPreviewImage(preview)
  }, [])

  const listBody = useMemo(() => {
    if (combinedLoading || extracting) {
      return (
        <p className={styles.generationStatus} role="status">
          {extracting
            ? 'Extracting characters from your screenplay…'
            : 'Loading saved characters...'}
        </p>
      )
    }

    if (!characterCount) {
      return (
        <div className={styles.stateBlock}>
          <p>No characters were detected in your screenplay yet.</p>
        </div>
      )
    }

    return (
      <div className={fieldStyles.galleryGrid}>
        {characters.map((character, index) => {
          const id = String(character.id)
          return (
            <CastGalleryCard
              key={character.id ?? character.name}
              character={character}
              index={index}
              isSelected={String(selectedId) === id}
              isGenerating={generatingIds.has(id)}
              onSelect={setSelectedId}
              onPreviewImage={handlePreviewImage}
            />
          )
        })}
      </div>
    )
  }, [characterCount, combinedLoading, extracting, generatingIds, handlePreviewImage, characters, selectedId])

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <h1 className={styles.title}>Characters</h1>
            <p className={fieldStyles.question}>{getWorkspaceQuestion('characters')}</p>
            <p className={styles.subtitle}>
              {extracting
                ? 'Extracting the cast from your screenplay…'
                : `${characterCount} cast members${
                    generationActive
                      ? ' · Generation in progress'
                      : ' · Review the cast, then generate portraits when you are ready.'
                  }`}
            </p>
          </div>

          <div className={styles.headerActions}>
            {characterCount > 0 ? (
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={isSaving || isImageGenerationBusy || generationActive}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            ) : null}
            {saveStatusLabel ? (
              <span className={styles.saveStatusInline} role="status">
                {saveStatusLabel}
              </span>
            ) : null}
            {characterCount > 0 ? (
              <button
                type="button"
                className={styles.generateAllBtn}
                onClick={handleGenerateAll}
                disabled={isImageGenerationBusy || generationActive || isSaving}
              >
                {generatingAll ? 'Generating...' : 'Generate All'}
              </button>
            ) : null}
          </div>
        </header>

        {saveError ? (
          <div className={styles.inlineErrorBox} role="alert">
            {saveError}
          </div>
        ) : null}

        <div className={fieldStyles.workspaceSplit}>
          <div className={fieldStyles.workspaceMain}>{listBody}</div>
          <CharacterInspector
            character={selectedCharacter}
            characterIndex={selectedIndex >= 0 ? selectedIndex : 0}
            total={characterCount}
            isGenerating={selectedCharacter ? generatingIds.has(String(selectedCharacter.id)) : false}
            isGeneratingCostume={
              selectedCharacter ? generatingCostumeIds.has(String(selectedCharacter.id)) : false
            }
            isGenerateAllRunning={generatingAll}
            isDeleting={selectedCharacter ? deletingIds.has(String(selectedCharacter.id)) : false}
            rowError={selectedCharacter ? rowErrors[String(selectedCharacter.id)] : null}
            onChange={(patch) => {
              if (!selectedCharacter) return
              patchCharacters((current) => updateCharacter(current, selectedCharacter.id, patch))
            }}
            onDelete={handleDelete}
            onGenerate={handleGenerateOne}
            onGenerateCostume={handleGenerateCostume}
            onOpenSheet={handleOpenSheet}
            onPreviewImage={setPreviewImage}
          />
        </div>
      </div>

      <footer className={styles.footer}>
        <button type="button" className={styles.footerBackBtn} onClick={handleBack}>
          Back to Sequences
        </button>
      </footer>

      <ErrorModal
        open={Boolean(localModalError)}
        title={localModalError?.title ?? 'Something went wrong'}
        message={localModalError?.message ?? ''}
        onClose={() => setActionError(null)}
      />

      <CharacterSheetModal
        open={Boolean(sheetCharacter)}
        character={sheetCharacter}
        style={style}
        projectId={projectId}
        onClose={() => setSheetCharacterId(null)}
        onCharacterChange={handleSheetCharacterChange}
        onPreviewImage={handlePreviewImage}
      />

      <ImagePreviewModal
        open={Boolean(previewImage)}
        imageUrl={previewImage?.imageUrl}
        title={previewImage?.title}
        onClose={() => setPreviewImage(null)}
      />

      <DebugPanel
        pageName="Characters"
        loading={combinedLoading}
        dataCount={characters.length}
        requestTriggered={requestTriggered}
      />
    </div>
  )
}
