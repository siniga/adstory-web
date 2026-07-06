import { SectionBlock, VisualGrid, VisualOptionCard } from './ObjectEditorFields'
import { CONDITION_OPTIONS } from './objectEditorVisuals'

export default function ConditionEditor({ state, onChange }) {
  return (
    <SectionBlock title="Condition" subtitle="Set wear, age, and finish quality">
      <VisualGrid columns={3}>
        {CONDITION_OPTIONS.map((option) => (
          <VisualOptionCard
            key={option.id}
            label={option.label}
            gradient={option.gradient}
            icon={option.icon}
            selected={state.condition === option.id}
            onClick={() => onChange({ ...state, condition: option.id })}
          />
        ))}
      </VisualGrid>
    </SectionBlock>
  )
}
