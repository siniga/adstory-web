import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CharacterReferenceGallery from '../../assetsLibrary/components/CharacterReferenceGallery'
import {
  findReferenceInCharacter,
  mergeReferenceIntoCharacter,
  referencesFromCharacter,
} from '../../assetsLibrary/characterReferences'
import { buildCharacterSheetGalleryItems } from '../../assetsLibrary/mapAssetsLibraryData'
import {
  generateCharacterReferenceImage,
  mergeAdstoryCharacterUpdate,
} from '../../services/adstoryApi'
import { generateCharacterImage } from '../../services/projectApi'
import { getCharacterImageUrl } from '../../utils/resolveMediaUrl'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import CreationFullscreenReader from './CreationFullscreenReader'
import styles from './CharacterSheetModal.module.css'

const SHEET_GRADIENT = 'linear-gradient(145deg, #1f2937 0%, #374151 100%)'

function referenceIsComplete(character, referenceType) {
  if (referenceType === 'hero_portrait') {
    return Boolean(getCharacterImageUrl(character))
  }

  const ref = findReferenceInCharacter(character, referenceType)
  if (!ref) return false

  const imageUrl = ref.image_url ?? ref.imageUrl ?? ref.url
  const status = String(ref.status ?? '').toLowerCase()
  return Boolean(imageUrl) || status === 'completed'
}

function buildPendingTasks(character, galleryItems) {
  return galleryItems
    .filter((item) => item.referenceType && !referenceIsComplete(character, item.referenceType))
    .map((item) => ({
      referenceType: item.referenceType,
      label: item.label,
    }))
}

export default function CharacterSheetModal({
  open,
  character,
  style,
  projectId,
  onClose,
  onCharacterChange,
  onPreviewImage,
}) {
  const [localCharacter, setLocalCharacter] = useState(character)
  const [generatingHero, setGeneratingHero] = useState(false)
  const [generatingReferenceKey, setGeneratingReferenceKey] = useState(null)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [generateAllProgress, setGenerateAllProgress] = useState(null)
  const [error, setError] = useState(null)
  const characterRef = useRef(character)

  useEffect(() => {
    characterRef.current = localCharacter
  }, [localCharacter])

  useEffect(() => {
    if (open) {
      setLocalCharacter(character)
      setError(null)
      setGenerateAllProgress(null)
    }
  }, [character, open])

  const applyCharacterUpdate = useCallback(
    (nextCharacter) => {
      setLocalCharacter(nextCharacter)
      onCharacterChange?.(nextCharacter)
    },
    [onCharacterChange]
  )

  const galleryItems = useMemo(
    () => (localCharacter ? buildCharacterSheetGalleryItems(localCharacter, SHEET_GRADIENT) : []),
    [localCharacter]
  )

  const characterReferences = useMemo(
    () => (localCharacter ? referencesFromCharacter(localCharacter) : []),
    [localCharacter]
  )

  const pendingTasks = useMemo(
    () => (localCharacter ? buildPendingTasks(localCharacter, galleryItems) : []),
    [galleryItems, localCharacter]
  )

  const isBusy = generatingHero || generatingAll || Boolean(generatingReferenceKey)

  const handleGenerateHero = useCallback(async () => {
    const current = characterRef.current
    if (!current || generatingHero || generatingReferenceKey) return

    setGeneratingHero(true)
    setError(null)

    try {
      const result = await generateCharacterImage({
        character: current,
        style,
        project_id: projectId,
        character_id: current.db_id ?? current.id,
        force: Boolean(getCharacterImageUrl(current)),
      })

      applyCharacterUpdate(mergeAdstoryCharacterUpdate(current, result))
    } catch (err) {
      const message = formatUserFriendlyError(
        err instanceof Error ? err.message : 'Failed to generate character image'
      ).message
      setError(message)
    } finally {
      setGeneratingHero(false)
    }
  }, [applyCharacterUpdate, generatingHero, generatingReferenceKey, projectId, style])

  const handleGenerateReference = useCallback(
    async (item) => {
      const current = characterRef.current
      if (!current || !item?.referenceType || generatingHero || generatingReferenceKey) return

      const referenceType = item.referenceType
      setGeneratingReferenceKey(referenceType)
      setError(null)

      try {
        const result = await generateCharacterReferenceImage({
          character: current,
          reference_type: referenceType,
          style,
          project_id: projectId,
        })

        if (result.character) {
          applyCharacterUpdate(mergeAdstoryCharacterUpdate(current, result))
        } else {
          const image_url = result.image_url || result.reference?.image_url || ''
          const nextCharacter = mergeReferenceIntoCharacter(current, {
            reference_type: referenceType,
            image_url,
            status: image_url ? 'completed' : 'failed',
          })
          applyCharacterUpdate(nextCharacter)
        }
      } catch (err) {
        const message = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to generate character reference'
        ).message
        setError(message)
      } finally {
        setGeneratingReferenceKey(null)
      }
    },
    [applyCharacterUpdate, generatingHero, generatingReferenceKey, projectId, style]
  )

  const generateTask = useCallback(
    async (task) => {
      if (task.referenceType === 'hero_portrait') {
        await handleGenerateHero()
        return
      }

      const item = galleryItems.find((entry) => entry.referenceType === task.referenceType)
      if (item) {
        await handleGenerateReference(item)
      }
    },
    [galleryItems, handleGenerateHero, handleGenerateReference]
  )

  const handleGenerateAll = useCallback(async () => {
    const current = characterRef.current
    if (!current || generatingHero || generatingReferenceKey || generatingAll) return

    const tasks = buildPendingTasks(current, buildCharacterSheetGalleryItems(current, SHEET_GRADIENT))
    if (!tasks.length) return

    setGeneratingAll(true)
    setError(null)

    try {
      for (let index = 0; index < tasks.length; index += 1) {
        setGenerateAllProgress({
          current: index + 1,
          total: tasks.length,
          label: tasks[index].label,
        })
        try {
          await generateTask(tasks[index])
        } catch {
          // Individual errors are surfaced via setError in handlers.
        }
      }
    } finally {
      setGeneratingAll(false)
      setGenerateAllProgress(null)
    }
  }, [generateTask, generatingAll, generatingHero, generatingReferenceKey])

  if (!localCharacter) return null

  return (
    <CreationFullscreenReader
      open={open}
      onClose={onClose}
      eyebrow="Character sheet"
      title={localCharacter.name ?? 'Character'}
      subtitle="Generate reference images so Gemini can stay consistent across your storyboard."
    >
      <div className={styles.sheet}>
        <div className={styles.toolbar}>
          <p className={styles.hint}>
            Build a visual reference set — hero portrait plus poses and angles. These images travel
            with the character when you continue to Environments.
          </p>
          {pendingTasks.length > 0 ? (
            <button
              type="button"
              className={styles.generateAllBtn}
              onClick={handleGenerateAll}
              disabled={isBusy}
            >
              {generatingAll
                ? 'Generating...'
                : `Generate All (${pendingTasks.length})`}
            </button>
          ) : null}
        </div>

        {generateAllProgress ? (
          <p className={styles.progress} role="status">
            Generating reference {generateAllProgress.current} of {generateAllProgress.total}:{' '}
            {generateAllProgress.label}...
          </p>
        ) : null}

        {error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}

        <div className={styles.galleryWrap}>
          <CharacterReferenceGallery
            assetName={localCharacter.name}
            assetType="character"
            galleryItems={galleryItems}
            characterReferences={characterReferences}
            primaryActionLabel="Generate Hero Portrait"
            generatingPrimaryLabel="Generating hero portrait..."
            onGeneratePrimary={handleGenerateHero}
            onGenerateReference={handleGenerateReference}
            onPreviewImage={onPreviewImage}
            generatingReferenceKey={generatingReferenceKey}
            generatingPrimary={generatingHero}
            generatingAll={generatingAll}
          />
        </div>
      </div>
    </CreationFullscreenReader>
  )
}
