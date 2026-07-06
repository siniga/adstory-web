import { CatalogGroup, SectionBlock } from './ObjectEditorFields'
import { CATEGORY_OPTIONS } from './objectEditorVisuals'
import styles from './ObjectEditorSection.module.css'

export default function IdentityEditor({ state, onChange }) {
  const set = (key, value) => onChange({ ...state, [key]: value })

  return (
    <SectionBlock title="Identity" subtitle="Define what this object is">
      <div className={styles.identityPanel}>
        <CatalogGroup label="Name">
          <div className={styles.identityField}>
            <input
              className={styles.identityInput}
              type="text"
              value={state.name}
              onChange={(event) => set('name', event.target.value)}
              aria-label="Object name"
            />
          </div>
        </CatalogGroup>

        <CatalogGroup label="Category">
          <div className={styles.categoryGrid}>
            {CATEGORY_OPTIONS.map((category) => (
              <button
                key={category}
                type="button"
                className={`${styles.categoryChip} ${state.category === category ? styles.categoryChipActive : ''}`}
                onClick={() => set('category', category)}
              >
                {category}
              </button>
            ))}
          </div>
        </CatalogGroup>

        <CatalogGroup label="Description">
          <div className={styles.identityField}>
            <textarea
              className={styles.identityTextarea}
              value={state.description}
              onChange={(event) => set('description', event.target.value)}
              aria-label="Object description"
            />
          </div>
        </CatalogGroup>
      </div>
    </SectionBlock>
  )
}
