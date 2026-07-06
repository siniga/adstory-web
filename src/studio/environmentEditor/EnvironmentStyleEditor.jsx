import { SectionBlock, VisualGrid, VisualOptionCard } from './EnvironmentEditorFields'
import { STYLE_OPTIONS } from './environmentEditorVisuals'

export default function EnvironmentStyleEditor({ state, onChange }) {
  return (
    <SectionBlock title="Style" subtitle="Choose the visual treatment for this world">
      <VisualGrid columns={3}>
        {STYLE_OPTIONS.map((option) => (
          <VisualOptionCard
            key={option.id}
            label={option.label}
            gradient={option.gradient}
            icon={option.icon}
            selected={state.style === option.id}
            onClick={() => onChange({ ...state, style: option.id })}
          />
        ))}
      </VisualGrid>
    </SectionBlock>
  )
}
