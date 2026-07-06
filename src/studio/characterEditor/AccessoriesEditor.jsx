import {
  SectionBlock,
  ToggleAccessoryCard,
  VisualGrid,
} from './CharacterEditorFields'
import { ACCESSORY_OPTIONS } from './characterEditorVisuals'

export default function AccessoriesEditor({ state, onChange }) {
  const toggle = (key) => {
    const equipped = state[key] !== 'None'
    onChange({ ...state, [key]: equipped ? 'None' : key.charAt(0).toUpperCase() + key.slice(1) })
  }

  return (
    <SectionBlock title="Accessories" subtitle="Tap to equip or remove">
      <VisualGrid columns={3}>
        {ACCESSORY_OPTIONS.map((item) => (
          <ToggleAccessoryCard
            key={item.key}
            label={item.label}
            gradient={item.gradient}
            icon={item.icon}
            equipped={state[item.key] !== 'None'}
            onClick={() => toggle(item.key)}
          />
        ))}
      </VisualGrid>
    </SectionBlock>
  )
}
