export const EDITOR_SECTIONS = [
  { id: 'location', label: 'Location' },
  { id: 'timeOfDay', label: 'Time of Day' },
  { id: 'weather', label: 'Weather' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'mood', label: 'Mood' },
  { id: 'colorPalette', label: 'Color Palette' },
  { id: 'style', label: 'Style' },
  { id: 'consistency', label: 'Consistency' },
]

export const APPLY_SCOPE_OPTIONS = [
  { id: 'currentShot', label: 'Current Shot' },
  { id: 'currentScene', label: 'Current Scene' },
  { id: 'selectedScenes', label: 'Selected Scenes' },
  { id: 'entireProject', label: 'Entire Project' },
]

export function createEditorStateFromEnvironment(environment) {
  return {
    location: mapLocation(environment),
    timeOfDay: mapTimeOfDay(environment.timeOfDay),
    weather: mapWeather(environment.weather),
    lighting: mapLighting(environment.lightingStyle),
    mood: mapMood(environment.mood),
    colorPalette: mapColorPalette(environment.colorPalette),
    style: mapStyle(environment.mood, environment.type),
    consistency: {
      keepLocation: environment.consistency.keepLocation,
      keepTimeOfDay: environment.consistency.keepTimeOfDay,
      keepWeather: environment.consistency.keepWeather,
      keepLighting: environment.consistency.keepLighting,
      keepColorPalette: environment.consistency.keepColorPalette,
    },
    applyScope: 'currentShot',
  }
}

function mapLocation(environment) {
  const text = `${environment.name} ${environment.location} ${environment.type}`.toLowerCase()
  if (text.includes('ocean') || text.includes('sea')) return 'Ocean'
  if (text.includes('village') || text.includes('street')) return 'Village'
  if (text.includes('city') || text.includes('waterfront') || text.includes('downtown')) return 'City'
  if (text.includes('office') || text.includes('workspace')) return 'Office'
  if (text.includes('forest') || text.includes('wood')) return 'Forest'
  if (text.includes('desert')) return 'Desert'
  if (text.includes('mountain')) return 'Mountain'
  if (text.includes('bedroom') || text.includes('hotel')) return 'Office'
  return 'Ocean'
}

function mapTimeOfDay(value) {
  const normalized = String(value).toLowerCase()
  if (normalized.includes('sunrise') || normalized.includes('dawn')) return 'Sunrise'
  if (normalized.includes('morning')) return 'Morning'
  if (normalized.includes('noon') || normalized.includes('midday')) return 'Noon'
  if (normalized.includes('sunset') || normalized.includes('evening') || normalized.includes('afternoon')) {
    return normalized.includes('evening') ? 'Night' : 'Sunset'
  }
  if (normalized.includes('night')) return 'Night'
  return 'Sunset'
}

function mapWeather(value) {
  const normalized = String(value).toLowerCase()
  if (normalized.includes('storm')) return 'Stormy'
  if (normalized.includes('rain')) return 'Rainy'
  if (normalized.includes('fog')) return 'Foggy'
  if (normalized.includes('cloud') || normalized.includes('overcast')) return 'Cloudy'
  if (normalized.includes('clear')) return 'Clear'
  if (normalized.includes('n/a')) return 'Clear'
  return 'Clear'
}

function mapLighting(value) {
  const normalized = String(value).toLowerCase()
  if (normalized.includes('golden')) return 'Golden Hour'
  if (normalized.includes('moon')) return 'Moonlight'
  if (normalized.includes('neon')) return 'Neon'
  if (normalized.includes('soft') || normalized.includes('warm') || normalized.includes('bounce')) return 'Soft Light'
  if (normalized.includes('harsh') || normalized.includes('overhead') || normalized.includes('fluorescent')) {
    return 'Harsh Shadow'
  }
  return 'Golden Hour'
}

function mapMood(value) {
  const normalized = String(value).toLowerCase()
  if (normalized.includes('peaceful') || normalized.includes('soft')) return 'Peaceful'
  if (normalized.includes('dramatic') || normalized.includes('neon')) return 'Dramatic'
  if (normalized.includes('suspense')) return 'Suspenseful'
  if (normalized.includes('luxury') || normalized.includes('premium')) return 'Luxury'
  if (normalized.includes('documentary') || normalized.includes('corporate')) return 'Documentary'
  return 'Peaceful'
}

function mapColorPalette(value) {
  const normalized = String(value).toLowerCase()
  if (normalized.includes('amber') || normalized.includes('warm') || normalized.includes('gold') || normalized.includes('orange')) {
    return 'Warm Orange'
  }
  if (normalized.includes('blue') || normalized.includes('teal') || normalized.includes('slate') || normalized.includes('steel')) {
    return 'Cool Blue'
  }
  if (normalized.includes('green') || normalized.includes('earth')) return 'Green Natural'
  if (normalized.includes('black') || normalized.includes('magenta') || normalized.includes('electric')) {
    return 'Dark Cinematic'
  }
  if (normalized.includes('white') || normalized.includes('cream') || normalized.includes('champagne')) {
    return 'Bright Commercial'
  }
  return 'Warm Orange'
}

function mapStyle(mood, type) {
  const normalized = `${mood} ${type}`.toLowerCase()
  if (normalized.includes('documentary')) return 'Documentary'
  if (normalized.includes('cinematic') || normalized.includes('dramatic')) return 'Cinematic'
  if (normalized.includes('corporate') || normalized.includes('commercial')) return 'Commercial Ad'
  if (normalized.includes('luxury') || normalized.includes('premium')) return 'Luxury Brand'
  if (normalized.includes('music') || normalized.includes('neon')) return 'Music Video'
  return 'Realistic'
}
