import { SectionBlock, VisualGrid, VisualOptionCard } from './CharacterEditorFields'
import { POSE_OPTIONS } from './characterEditorVisuals'

export default function PoseEditor({ state, onChange }) {
  return (
    <SectionBlock title="Pose" subtitle="Pick a body pose for this character">
      <VisualGrid columns={3}>
        {POSE_OPTIONS.map((option) => (
          <VisualOptionCard
            key={option.id}
            label={option.label}
            gradient={option.gradient}
            thumbClass={option.thumbClass}
            selected={state.pose === option.id}
            onClick={() => onChange({ ...state, pose: option.id })}
          />
        ))}
      </VisualGrid>
    </SectionBlock>
  )
}
