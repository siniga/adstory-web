import { SectionBlock, VisualGrid, VisualOptionCard } from './CharacterEditorFields'
import { EXPRESSION_OPTIONS } from './characterEditorVisuals'

export default function ExpressionEditor({ state, onChange }) {
  return (
    <SectionBlock title="Expression" subtitle="Set the character's mood">
      <VisualGrid columns={3}>
        {EXPRESSION_OPTIONS.map((option) => (
          <VisualOptionCard
            key={option.id}
            label={option.label}
            gradient={option.gradient}
            icon={option.icon}
            selected={state.expression === option.id}
            onClick={() => onChange({ ...state, expression: option.id })}
          />
        ))}
      </VisualGrid>
    </SectionBlock>
  )
}
