import { SKIN_TONE_SWATCHES } from './characterEditorData'
import {
  AgePicker,
  CatalogGroup,
  SectionBlock,
  VisualGrid,
  VisualOptionCard,
} from './CharacterEditorFields'
import { BODY_TYPE_OPTIONS, GENDER_OPTIONS } from './characterEditorVisuals'
import styles from './CharacterEditorSection.module.css'

const SKIN_TONE_OPTIONS = SKIN_TONE_SWATCHES.map((color, index) => ({
  id: color,
  label: `Tone ${index + 1}`,
  color,
}))

export default function AppearanceEditor({ state, onChange }) {
  const set = (key, value) => onChange({ ...state, [key]: value })

  return (
    <SectionBlock title="Appearance" subtitle="Build the character's base look">
      <CatalogGroup label="Gender">
        <VisualGrid columns={2}>
          {GENDER_OPTIONS.map((option) => (
            <VisualOptionCard
              key={option.id}
              label={option.label}
              gradient={option.gradient}
              icon={option.icon}
              selected={state.gender === option.id}
              onClick={() => set('gender', option.id)}
            />
          ))}
        </VisualGrid>
      </CatalogGroup>

      <CatalogGroup label="Age">
        <AgePicker value={state.age} onChange={(value) => set('age', value)} />
      </CatalogGroup>

      <CatalogGroup label="Body Type">
        <VisualGrid columns={4}>
          {BODY_TYPE_OPTIONS.map((option) => (
            <VisualOptionCard
              key={option.id}
              label={option.label}
              gradient={option.gradient}
              thumbClass={option.thumbClass}
              selected={state.bodyType === option.id}
              onClick={() => set('bodyType', option.id)}
              compact
            />
          ))}
        </VisualGrid>
      </CatalogGroup>

      <CatalogGroup label="Skin Tone">
        <div className={styles.swatchGrid}>
          {SKIN_TONE_OPTIONS.map((option) => {
            const selected = state.skinTone === option.id
            return (
              <button
                key={option.id}
                type="button"
                className={`${styles.colorSwatch} ${selected ? styles.colorSwatchActive : ''}`}
                onClick={() => set('skinTone', option.id)}
                aria-pressed={selected}
                aria-label={option.label}
              >
                <span
                  className={styles.colorSwatchDot}
                  style={{ background: option.color }}
                />
              </button>
            )
          })}
        </div>
      </CatalogGroup>
    </SectionBlock>
  )
}
