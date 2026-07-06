import { SectionBlock, VisualGrid, VisualOptionCard } from './EnvironmentEditorFields'
import { LIGHTING_OPTIONS } from './environmentEditorVisuals'

export default function LightingEditor({ state, onChange }) {
  return (
    <SectionBlock title="Lighting" subtitle="Shape light and shadow across the scene">
      <VisualGrid columns={3}>
        {LIGHTING_OPTIONS.map((option) => (
          <VisualOptionCard
            key={option.id}
            label={option.label}
            gradient={option.gradient}
            icon={option.icon}
            selected={state.lighting === option.id}
            onClick={() => onChange({ ...state, lighting: option.id })}
          />
        ))}
      </VisualGrid>
    </SectionBlock>
  )
}
