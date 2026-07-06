import {
  CatalogGroup,
  ColorSwatchGrid,
  SectionBlock,
  VisualGrid,
  VisualOptionCard,
} from './CharacterEditorFields'
import { FACE_OPTIONS } from './characterEditorVisuals'

const FACE_GROUPS = [
  { key: 'eyeShape', label: 'Eye Shape', options: FACE_OPTIONS.eyeShape, type: 'visual' },
  { key: 'eyeColor', label: 'Eye Color', options: FACE_OPTIONS.eyeColor, type: 'color' },
  { key: 'noseStyle', label: 'Nose Style', options: FACE_OPTIONS.noseStyle, type: 'visual' },
  { key: 'beardStyle', label: 'Beard Style', options: FACE_OPTIONS.beardStyle, type: 'visual' },
  { key: 'mustacheStyle', label: 'Mustache Style', options: FACE_OPTIONS.mustacheStyle, type: 'visual' },
]

export default function FaceEditor({ state, onChange }) {
  const set = (key, value) => onChange({ ...state, [key]: value })

  return (
    <SectionBlock title="Face" subtitle="Sculpt facial features with visual presets">
      {FACE_GROUPS.map((group) => (
        <CatalogGroup key={group.key} label={group.label}>
          {group.type === 'color' ? (
            <ColorSwatchGrid
              options={group.options}
              value={state[group.key]}
              onChange={(value) => set(group.key, value)}
            />
          ) : (
            <VisualGrid columns={4}>
              {group.options.map((option) => (
                <VisualOptionCard
                  key={option.id}
                  label={option.label}
                  gradient={option.gradient}
                  icon={option.icon}
                  thumbClass={option.thumbClass}
                  selected={state[group.key] === option.id}
                  onClick={() => set(group.key, option.id)}
                  compact
                />
              ))}
            </VisualGrid>
          )}
        </CatalogGroup>
      ))}
    </SectionBlock>
  )
}
