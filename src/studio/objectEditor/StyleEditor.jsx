import { SectionBlock, VisualGrid, VisualOptionCard } from './ObjectEditorFields'
import { STYLE_OPTIONS } from './objectEditorVisuals'

export default function StyleEditor({ state, onChange }) {
  return (
    <SectionBlock title="Style" subtitle="Choose the visual treatment for this prop">
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
