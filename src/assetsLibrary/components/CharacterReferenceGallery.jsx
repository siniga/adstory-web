import { buildReferenceImageSrc } from '../../utils/resolveMediaUrl'
import { BASIC_IDENTITY_REFERENCE_TYPES } from '../characterIdentityGeneration'
import { HERO_BATCH_REFERENCE_TYPES } from '../characterReferences'
import ReferencePoseCard from './ReferencePoseCard'
import styles from './CharacterReferenceGallery.module.css'

export default function CharacterReferenceGallery({
  assetName,
  assetType = 'character',
  galleryItems = [],
  characterReferences = [],
  selectedItemId,
  onSelectItem,
  primaryActionLabel = 'Generate Image',
  generateAllLabel = 'Generate All References',
  onGeneratePrimary,
  onGenerateAll,
  onGenerateReference,
  onPreviewImage,
  generatingReferenceKey = null,
  generatingPrimary = false,
  generatingPrimaryLabel = 'Generating…',
  generationNotice = null,
  generatingAll = false,
  pendingCount = 0,
  identityGenerationActive = false,
  selectedIdentityStatus = 'pending',
}) {
  const eyebrow =
    assetType === 'environment'
      ? 'Selected environment'
      : assetType === 'object'
        ? 'Selected object'
        : 'Selected character'
  const sectionTitle =
    assetType === 'character' ? 'Reference Poses' : 'Reference Images'
  const showGenerateAllButton =
    assetType !== 'character' && Boolean(onGenerateAll) && pendingCount > 0

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 className={styles.title}>{assetName || 'Select an asset'}</h2>
        </div>
        <div className={styles.actions}>
          {showGenerateAllButton ? (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onGenerateAll}
              disabled={generatingAll || generatingPrimary}
            >
              {generatingAll
                ? 'Generating…'
                : `${generateAllLabel}${pendingCount ? ` (${pendingCount})` : ''}`}
            </button>
          ) : null}
          {onGeneratePrimary ? (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={onGeneratePrimary}
              disabled={generatingPrimary || generatingAll}
            >
              {generatingPrimary ? generatingPrimaryLabel : primaryActionLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>{sectionTitle}</h3>
      </div>

      {generationNotice ? <p className={styles.generationNotice}>{generationNotice}</p> : null}

      {galleryItems.length === 0 ? (
        <p className={styles.empty}>Select an asset to view references.</p>
      ) : (
        <div className={styles.grid}>
          {galleryItems.map((item) => {
            const isBasicIdentityReference =
              item.referenceType != null &&
              BASIC_IDENTITY_REFERENCE_TYPES.includes(item.referenceType)
            const isIdentityBatchGenerating =
              identityGenerationActive &&
              isBasicIdentityReference &&
              (selectedIdentityStatus === 'generating' || selectedIdentityStatus === 'queued')
            const isGeneratingReference =
              item.referenceType != null && generatingReferenceKey === item.referenceType
            const isBasicReferenceGenerating =
              generatingPrimary &&
              item.referenceType != null &&
              HERO_BATCH_REFERENCE_TYPES.includes(item.referenceType)
            const isHeroPortraitGenerating = item.id === 'hero-portrait' && generatingPrimary
            const isGenerating =
              isIdentityBatchGenerating ||
              isHeroPortraitGenerating ||
              isGeneratingReference ||
              isBasicReferenceGenerating

            const ref =
              item.referenceType != null && item.referenceType !== 'hero_portrait'
                ? characterReferences.find(
                    (reference) => reference.reference_type === item.referenceType
                  )
                : null

            const imageSrc = ref ? buildReferenceImageSrc(ref) : item.imageUrl ?? null
            let status = ref?.status ?? item.status ?? (imageSrc ? 'completed' : 'pending')

            if (isIdentityBatchGenerating) {
              status = 'generating'
            } else if (isHeroPortraitGenerating) {
              status = 'generating'
            } else if (isBasicReferenceGenerating) {
              status = 'generating'
            }

            return (
              <ReferencePoseCard
                key={item.id}
                label={item.label}
                gradient={item.gradient}
                imageUrl={!ref ? item.imageUrl : null}
                imageSrc={imageSrc}
                status={status}
                isPose={item.isPose === true}
                showStatusBadge={item.showStatusBadge}
                selected={item.id === selectedItemId}
                isGenerating={isGenerating}
                onSelect={() => onSelectItem?.(item.id)}
                onPreviewImage={
                  onPreviewImage && imageSrc
                    ? () =>
                        onPreviewImage({
                          imageUrl: imageSrc,
                          title: assetName ? `${assetName} — ${item.label}` : item.label,
                        })
                    : undefined
                }
                onGenerate={
                  item.isPose && item.referenceType && onGenerateReference
                    ? () => onGenerateReference(item)
                    : undefined
                }
              />
            )
          })}
        </div>
      )}

      {assetType === 'character' && onGeneratePrimary ? (
        <button
          type="button"
          className={styles.customPoseBtn}
          onClick={onGeneratePrimary}
          disabled={generatingPrimary || generatingAll}
        >
          {generatingPrimary ? generatingPrimaryLabel : primaryActionLabel}
        </button>
      ) : null}
    </section>
  )
}
