import { resolveMediaUrl } from '../../utils/resolveMediaUrl'
import { getCharacterStatusLabel } from '../../services/characterWorkflow'
import { StatusDot } from '../components/StatusDot'
import styles from './AssignmentSection.module.css'

const CHARACTER_STATUS_VARIANT = {
  suggested: 'reviewNeedsWork',
  accepted: 'reviewApproved',
  skipped: 'pending',
  modified: 'generating',
}

function formatRoleLabel(character) {
  if (character.role?.trim()) return character.role.trim()

  const importance = character.importance
  if (importance === 'main') return 'Main Character'
  if (importance === 'supporting') return 'Supporting'
  if (importance === 'background') return 'Background'
  return 'Character'
}

function CharacterChip({ character, onRemove, removing = false }) {
  const heroUrl = resolveMediaUrl(character.heroImageUrl)
  const initial = character.name?.charAt(0)?.toUpperCase() ?? '?'
  const statusLabel = character.status ? getCharacterStatusLabel(character.status) : null
  const statusVariant = CHARACTER_STATUS_VARIANT[character.status] ?? 'pending'

  return (
    <div className={styles.characterChip}>
      <span
        className={styles.characterAvatar}
        style={
          heroUrl
            ? {
                backgroundImage: `url(${heroUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
        aria-hidden="true"
      >
        {!heroUrl ? initial : null}
      </span>
      <span className={styles.characterMeta}>
        <span className={styles.characterName}>{character.name}</span>
        <span className={styles.characterRole}>{formatRoleLabel(character)}</span>
      </span>
      {statusLabel ? (
        <StatusDot label={statusLabel} variant={statusVariant} className={styles.characterStatusDot} />
      ) : null}
      {onRemove ? (
        <button
          type="button"
          className={styles.chipRemoveBtn}
          onClick={() => onRemove(character.id)}
          disabled={removing}
          aria-label={`Remove ${character.name}`}
          title="Remove"
        >
          ×
        </button>
      ) : null}
    </div>
  )
}

export default function CharacterAssignmentSection({
  characters,
  loading = false,
  onManageClick,
  onRemoveCharacter,
  removingCharacterId = null,
}) {
  const hasCharacters = characters.length > 0

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Characters In Shot</h3>

      {loading ? (
        <p className={styles.emptyHint}>Loading characters…</p>
      ) : hasCharacters ? (
        <div className={styles.characterList}>
          {characters.map((character) => (
            <CharacterChip
              key={character.id}
              character={character}
              onRemove={onRemoveCharacter}
              removing={removingCharacterId === Number(character.id)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>No characters assigned.</p>
        </div>
      )}

      <button
        type="button"
        className={styles.primaryActionBtn}
        onClick={onManageClick}
        disabled={loading}
      >
        Manage Characters
      </button>
    </section>
  )
}
