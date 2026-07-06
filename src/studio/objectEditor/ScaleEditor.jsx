import { SectionBlock, VisualGrid, VisualOptionCard } from './ObjectEditorFields'
import { SCALE_OPTIONS } from './objectEditorVisuals'

export default function ScaleEditor({ state, onChange }) {
  return (
    <SectionBlock title="Scale" subtitle="Set relative size in the scene">
      <VisualGrid columns={3}>
        {SCALE_OPTIONS.map((option) => (
          <VisualOptionCard
            key={option.id}
            label={option.label}
            gradient={option.gradient}
            icon={option.icon}
            selected={state.scale === option.id}
            onClick={() => onChange({ ...state, scale: option.id })}
            compact
          />
        ))}
      </VisualGrid>
    </SectionBlock>
  )
}
