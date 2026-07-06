import { SectionBlock, VisualGrid, VisualOptionCard } from './EnvironmentEditorFields'
import { TIME_OF_DAY_OPTIONS } from './environmentEditorVisuals'

export default function TimeOfDayEditor({ state, onChange }) {
  return (
    <SectionBlock title="Time of Day" subtitle="Set when the scene takes place">
      <VisualGrid columns={3}>
        {TIME_OF_DAY_OPTIONS.map((option) => (
          <VisualOptionCard
            key={option.id}
            label={option.label}
            gradient={option.gradient}
            icon={option.icon}
            selected={state.timeOfDay === option.id}
            onClick={() => onChange({ ...state, timeOfDay: option.id })}
          />
        ))}
      </VisualGrid>
    </SectionBlock>
  )
}
