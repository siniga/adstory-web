import { CatalogGroup, ColorSwatchGrid, SectionBlock } from './ObjectEditorFields'
import { COLOR_PRESETS } from './objectEditorData'

export default function ColorEditor({ state, onChange }) {
  const set = (key, value) => onChange({ ...state, [key]: value })

  return (
    <SectionBlock title="Color" subtitle="Set primary, secondary, and accent colors">
      <CatalogGroup label="Primary Color">
        <ColorSwatchGrid
          options={COLOR_PRESETS}
          value={state.primaryColor}
          onChange={(value) => set('primaryColor', value)}
        />
      </CatalogGroup>
      <CatalogGroup label="Secondary Color">
        <ColorSwatchGrid
          options={COLOR_PRESETS}
          value={state.secondaryColor}
          onChange={(value) => set('secondaryColor', value)}
        />
      </CatalogGroup>
      <CatalogGroup label="Accent Color">
        <ColorSwatchGrid
          options={COLOR_PRESETS}
          value={state.accentColor}
          onChange={(value) => set('accentColor', value)}
        />
      </CatalogGroup>
    </SectionBlock>
  )
}
