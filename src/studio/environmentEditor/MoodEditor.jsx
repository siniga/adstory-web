import { SectionBlock, VisualGrid, VisualOptionCard } from './EnvironmentEditorFields'
import { MOOD_OPTIONS } from './environmentEditorVisuals'

export default function MoodEditor({ state, onChange }) {
  return (
    <SectionBlock title="Mood" subtitle="Set the emotional tone of the environment">
      <VisualGrid columns={3}>
        {MOOD_OPTIONS.map((option) => (
          <VisualOptionCard
            key={option.id}
            label={option.label}
            gradient={option.gradient}
            icon={option.icon}
            selected={state.mood === option.id}
            onClick={() => onChange({ ...state, mood: option.id })}
          />
        ))}
      </VisualGrid>
    </SectionBlock>
  )
}
