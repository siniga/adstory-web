import {
  CatalogGroup,
  SectionBlock,
  VisualGrid,
  VisualOptionCard,
} from './CharacterEditorFields'
import { WARDROBE_CATALOG } from './characterEditorVisuals'
import styles from './CharacterEditorSection.module.css'

const WARDROBE_GROUPS = [
  { key: 'shirt', label: 'Shirts' },
  { key: 'pants', label: 'Pants' },
  { key: 'shoes', label: 'Shoes' },
  { key: 'jacket', label: 'Jackets' },
  { key: 'dress', label: 'Dresses' },
]

export default function WardrobeEditor({ state, onChange }) {
  const set = (key, value) => onChange({ ...state, [key]: value })

  return (
    <SectionBlock title="Wardrobe" subtitle="Mix and match outfit pieces">
      {WARDROBE_GROUPS.map((group) => (
        <div key={group.key} className={styles.wardrobeSection}>
          <CatalogGroup label={group.label}>
            <VisualGrid columns={4}>
              {WARDROBE_CATALOG[group.key].map((item) => (
                <VisualOptionCard
                  key={item.id}
                  label={item.label}
                  gradient={item.gradient}
                  icon={item.icon}
                  selected={state[group.key] === item.id}
                  onClick={() => set(group.key, item.id)}
                  compact
                />
              ))}
            </VisualGrid>
          </CatalogGroup>
        </div>
      ))}
    </SectionBlock>
  )
}
