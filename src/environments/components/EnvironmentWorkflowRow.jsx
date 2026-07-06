import { useMemo } from 'react'
import { getEnvironmentImageUrl } from '../../utils/resolveMediaUrl'
import { readEnvironmentGenerationStatus } from '../../assetsLibrary/assetGenerationStatus'
import AssetGenerationStatusBadge from '../../assetsLibrary/workflow/AssetGenerationStatusBadge'
import AssetWorkflowThumbnail from '../../assetsLibrary/workflow/AssetWorkflowThumbnail'
import GenerateButton from '../../assetsLibrary/workflow/GenerateButton'
import styles from './EnvironmentWorkflowRow.module.css'

const THUMB_GRADIENTS = [
  'linear-gradient(145deg, #1e293b 0%, #334155 50%, #475569 100%)',
  'linear-gradient(145deg, #134e4a 0%, #0f766e 50%, #14b8a6 100%)',
  'linear-gradient(145deg, #4a1942 0%, #7c3aed 55%, #a78bfa 100%)',
  'linear-gradient(145deg, #3d2914 0%, #6b4f2a 45%, #8f6b3d 100%)',
  'linear-gradient(145deg, #1f2937 0%, #374151 50%, #6b7280 100%)',
]

export default function EnvironmentWorkflowRow({
  environment,
  index,
  isGenerating = false,
  isBuildingAll = false,
  onGenerate,
}) {
  const status = readEnvironmentGenerationStatus(environment, {
    forceGenerating: isGenerating,
  })

  const isRowGenerating = status.tone === 'generating'
  const isCompleted = status.tone === 'completed'
  const buttonLabel = isCompleted ? 'Regenerate' : 'Generate'
  const canGenerate = !isRowGenerating && !isBuildingAll

  const gradient = THUMB_GRADIENTS[index % THUMB_GRADIENTS.length]
  const imageUrl = useMemo(() => getEnvironmentImageUrl(environment), [environment])
  const description = environment.description || environment.location || 'No description available yet.'

  return (
    <div
      className={`${styles.rowWrap} ${isCompleted ? styles.rowCompleted : ''}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className={styles.row}>
        <span className={styles.index}>{index + 1}</span>

        <AssetWorkflowThumbnail
          imageUrl={imageUrl}
          placeholderGradient={gradient}
          variant="environment"
          alt={environment.name ? `${environment.name} preview` : 'Environment preview'}
        />

        <div className={styles.meta}>
          <span className={styles.name}>{environment.name ?? 'Unnamed environment'}</span>
          <span className={styles.description}>{description}</span>
        </div>

        <div className={styles.actions}>
          <AssetGenerationStatusBadge tone={status.tone} label={status.label} />
          <GenerateButton
            label={buttonLabel}
            onClick={() => onGenerate?.(environment.id)}
            disabled={!canGenerate}
            loading={isRowGenerating}
          />
        </div>
      </div>
    </div>
  )
}
