import { SectionBlock, VisualGrid, VisualOptionCard } from './EnvironmentEditorFields'
import { WEATHER_OPTIONS } from './environmentEditorVisuals'

export default function WeatherEditor({ state, onChange }) {
  return (
    <SectionBlock title="Weather" subtitle="Define atmospheric conditions">
      <VisualGrid columns={3}>
        {WEATHER_OPTIONS.map((option) => (
          <VisualOptionCard
            key={option.id}
            label={option.label}
            gradient={option.gradient}
            icon={option.icon}
            selected={state.weather === option.id}
            onClick={() => onChange({ ...state, weather: option.id })}
          />
        ))}
      </VisualGrid>
    </SectionBlock>
  )
}
