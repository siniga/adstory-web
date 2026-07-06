import { SectionBlock, VisualGrid, VisualOptionCard } from './ObjectEditorFields'
import { MATERIAL_OPTIONS } from './objectEditorVisuals'

export default function MaterialEditor({ state, onChange }) {
  return (
    <SectionBlock title="Material" subtitle="Choose the surface and build material">
      <VisualGrid columns={3}>
        {MATERIAL_OPTIONS.map((option) => (
          <VisualOptionCard
            key={option.id}
            label={option.label}
            gradient={option.gradient}
            icon={option.icon}
            selected={state.material === option.id}
            onClick={() => onChange({ ...state, material: option.id })}
          />
        ))}
      </VisualGrid>
    </SectionBlock>
  )
}
