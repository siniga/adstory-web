import { IconChevronLeft } from '../icons'
import CharacterConsistencyCard from './CharacterConsistencyCard'
import styles from './CharacterDetailsPanel.module.css'

function DetailField({ label, value }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input className={styles.input} type="text" defaultValue={value} readOnly />
    </label>
  )
}

function DetailSection({ title, children }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.fieldGrid}>{children}</div>
    </section>
  )
}

export default function CharacterDetailsPanel({ character, onBack, onOpenCharacterEditor }) {
  const initial = character.name.charAt(0).toUpperCase()

  return (
    <div className={styles.panel}>
      <button type="button" className={styles.backBtn} onClick={onBack}>
        <IconChevronLeft />
        <span>All Characters</span>
      </button>

      <div className={styles.hero}>
        <div
          className={styles.heroImage}
          style={{ background: character.imageGradient }}
          aria-hidden="true"
        >
          <span className={styles.heroInitial}>{initial}</span>
        </div>
        <div className={styles.heroMeta}>
          <DetailField label="Name" value={character.name} />
          <DetailField label="Role" value={character.role} />
        </div>
      </div>

      <DetailSection title="Appearance">
        <DetailField label="Gender" value={character.appearance.gender} />
        <DetailField label="Age" value={character.appearance.age} />
        <DetailField label="Skin Tone" value={character.appearance.skinTone} />
        <DetailField label="Body Type" value={character.appearance.bodyType} />
        <DetailField label="Hair Style" value={character.appearance.hairStyle} />
        <DetailField label="Hair Color" value={character.appearance.hairColor} />
      </DetailSection>

      <DetailSection title="Wardrobe">
        <DetailField label="Shirt" value={character.wardrobe.shirt} />
        <DetailField label="Pants" value={character.wardrobe.pants} />
        <DetailField label="Shoes" value={character.wardrobe.shoes} />
      </DetailSection>

      <DetailSection title="Accessories">
        <DetailField label="Hat" value={character.accessories.hat} />
        <DetailField label="Watch" value={character.accessories.watch} />
        <DetailField label="Necklace" value={character.accessories.necklace} />
        <DetailField label="Glasses" value={character.accessories.glasses} />
      </DetailSection>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Used In</h3>
        <div className={styles.usedIn}>
          <div className={styles.usedGroup}>
            <span className={styles.usedLabel}>Scenes</span>
            <div className={styles.tagList}>
              {character.usedIn.scenes.map((sceneId) => (
                <span key={sceneId} className={styles.tag}>
                  Scene {sceneId}
                </span>
              ))}
            </div>
          </div>
          <div className={styles.usedGroup}>
            <span className={styles.usedLabel}>Shots</span>
            <div className={styles.tagList}>
              {character.usedIn.shots.map((shotId) => (
                <span key={shotId} className={styles.tag}>
                  Shot {shotId}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CharacterConsistencyCard consistency={character.consistency} />

      {onOpenCharacterEditor && (
        <button
          type="button"
          className={styles.editCharacterBtn}
          onClick={() => onOpenCharacterEditor(character.id)}
        >
          Edit Character
        </button>
      )}
    </div>
  )
}
