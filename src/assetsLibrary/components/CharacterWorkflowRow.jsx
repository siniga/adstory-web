import { useMemo } from 'react'
import { getCharacterImageUrl } from '../../utils/resolveMediaUrl'
import { resolveCharacterDisplayEthnicity } from '../characterEthnicity'
import { readCharacterGenerationStatus } from '../assetGenerationStatus'
import AssetGenerationStatusBadge from '../workflow/AssetGenerationStatusBadge'
import AssetWorkflowThumbnail from '../workflow/AssetWorkflowThumbnail'
import GenerateButton from '../workflow/GenerateButton'
import styles from './CharacterWorkflowRow.module.css'

const AVATAR_GRADIENTS = [
  'linear-gradient(145deg, #3d2914 0%, #6b4f2a 45%, #8f6b3d 100%)',
  'linear-gradient(145deg, #1e293b 0%, #334155 50%, #475569 100%)',
  'linear-gradient(145deg, #4a1942 0%, #7c3aed 55%, #a78bfa 100%)',
  'linear-gradient(145deg, #134e4a 0%, #0f766e 50%, #14b8a6 100%)',
  'linear-gradient(145deg, #1f2937 0%, #374151 50%, #6b7280 100%)',
]

export default function CharacterWorkflowRow({
  character,
  index,
  isGenerating = false,
  isBuildingAll = false,
  projectDefaultEthnicity = null,
  onGenerate,
}) {
  const status = readCharacterGenerationStatus(character, {
    forceGenerating: isGenerating,
  })

  const isRowGenerating = status.tone === 'generating'
  const isCompleted = status.tone === 'completed'
  const buttonLabel = isCompleted ? 'Regenerate' : 'Generate'
  const canGenerate = !isRowGenerating && !isBuildingAll

  const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]
  const heroImageUrl = useMemo(() => getCharacterImageUrl(character), [character])
  const ethnicity = resolveCharacterDisplayEthnicity(character, projectDefaultEthnicity)
  const description =
    character.description ||
    character.appearance ||
    character.notes ||
    'No description available yet.'

  return (
    <div
      className={`${styles.rowWrap} ${isCompleted ? styles.rowCompleted : ''}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className={styles.row}>
        <span className={styles.index}>{index + 1}</span>

        <AssetWorkflowThumbnail
          imageUrl={heroImageUrl}
          placeholderGradient={gradient}
          variant="character"
          alt={character.name ? `${character.name} portrait` : 'Character portrait'}
        />

        <div className={styles.meta}>
          <span className={styles.name}>{character.name ?? 'Unnamed character'}</span>
          {character.role ? <span className={styles.role}>{character.role}</span> : null}
          <span className={styles.description}>{description}</span>
          {ethnicity ? <span className={styles.ethnicity}>{ethnicity}</span> : null}
        </div>

        <div className={styles.actions}>
          <AssetGenerationStatusBadge tone={status.tone} label={status.label} />
          <GenerateButton
            label={buttonLabel}
            onClick={() => onGenerate?.(character.id)}
            disabled={!canGenerate}
            loading={isRowGenerating}
          />
        </div>
      </div>
    </div>
  )
}
