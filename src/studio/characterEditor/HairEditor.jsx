import { HAIR_COLOR_PRESETS } from './characterEditorData'
import {
  CatalogGroup,
  ColorSwatchGrid,
  SectionBlock,
  VisualGrid,
  VisualOptionCard,
} from './CharacterEditorFields'
import { HAIR_STYLE_OPTIONS } from './characterEditorVisuals'

export default function HairEditor({ state, onChange }) {
  const set = (key, value) => onChange({ ...state, [key]: value })

  return (
    <SectionBlock title="Hair" subtitle="Choose style and color from the catalog">
      <CatalogGroup label="Hair Style">
        <VisualGrid columns={3}>
          {HAIR_STYLE_OPTIONS.map((option) => (
            <VisualOptionCard
              key={option.id}
              label={option.label}
              gradient={option.gradient}
              thumbClass={option.thumbClass}
              selected={state.hairStyle === option.id}
              onClick={() => set('hairStyle', option.id)}
            />
          ))}
        </VisualGrid>
      </CatalogGroup>

      <CatalogGroup label="Hair Color">
        <ColorSwatchGrid
          options={HAIR_COLOR_PRESETS.map((preset) => ({
            id: preset.label,
            label: preset.label,
            color: preset.color,
          }))}
          value={state.hairColor}
          onChange={(value) => set('hairColor', value)}
        />
      </CatalogGroup>
    </SectionBlock>
  )
}
