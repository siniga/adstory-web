import { PaletteSwatchCard, SectionBlock, VisualGrid } from './EnvironmentEditorFields'
import { COLOR_PALETTE_OPTIONS } from './environmentEditorVisuals'

export default function ColorPaletteEditor({ state, onChange }) {
  return (
    <SectionBlock title="Color Palette" subtitle="Pick the dominant color story">
      <VisualGrid columns={2}>
        {COLOR_PALETTE_OPTIONS.map((option) => (
          <PaletteSwatchCard
            key={option.id}
            label={option.label}
            gradient={option.gradient}
            selected={state.colorPalette === option.id}
            onClick={() => onChange({ ...state, colorPalette: option.id })}
          />
        ))}
      </VisualGrid>
    </SectionBlock>
  )
}
