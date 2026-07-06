import { resolveMediaUrl } from '../../utils/resolveMediaUrl'
import styles from './ShotCharacterChips.module.css'

export default function ShotCharacterChips({ characters = [] }) {
  if (!characters.length) return null

  return (
    <div className={styles.chips} aria-label="Characters in shot">
      {characters.map((character) => {
        const heroUrl = resolveMediaUrl(character.heroImageUrl)
        const initial = character.name?.charAt(0)?.toUpperCase() ?? '?'

        return (
          <span key={character.id} className={styles.chip} title={character.name}>
            <span
              className={styles.avatar}
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
          </span>
        )
      })}
    </div>
  )
}
