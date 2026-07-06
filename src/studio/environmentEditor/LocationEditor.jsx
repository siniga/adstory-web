import { SectionBlock, VisualGrid, VisualOptionCard } from './EnvironmentEditorFields'
import { LOCATION_OPTIONS } from './environmentEditorVisuals'

export default function LocationEditor({ state, onChange }) {
  return (
    <SectionBlock title="Location" subtitle="Choose the world or backdrop type">
      <VisualGrid columns={3}>
        {LOCATION_OPTIONS.map((option) => (
          <VisualOptionCard
            key={option.id}
            label={option.label}
            gradient={option.gradient}
            icon={option.icon}
            selected={state.location === option.id}
            onClick={() => onChange({ ...state, location: option.id })}
          />
        ))}
      </VisualGrid>
    </SectionBlock>
  )
}
