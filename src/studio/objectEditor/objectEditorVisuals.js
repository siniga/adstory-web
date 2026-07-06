export const MATERIAL_OPTIONS = [
  { id: 'Wood', label: 'Wood', gradient: 'linear-gradient(160deg, #78350f 0%, #a16207 100%)', icon: '🪵' },
  { id: 'Metal', label: 'Metal', gradient: 'linear-gradient(160deg, #374151 0%, #9ca3af 100%)', icon: '⚙️' },
  { id: 'Plastic', label: 'Plastic', gradient: 'linear-gradient(160deg, #1e40af 0%, #60a5fa 100%)', icon: '🧴' },
  { id: 'Glass', label: 'Glass', gradient: 'linear-gradient(160deg, #bae6fd 0%, #e0f2fe 100%)', icon: '🪟' },
  { id: 'Fabric', label: 'Fabric', gradient: 'linear-gradient(160deg, #4338ca 0%, #a5b4fc 100%)', icon: '🧵' },
  { id: 'Stone', label: 'Stone', gradient: 'linear-gradient(160deg, #44403c 0%, #78716c 100%)', icon: '🪨' },
  { id: 'Mixed', label: 'Mixed', gradient: 'linear-gradient(160deg, #57534e 0%, #d97706 50%, #2563eb 100%)', icon: '🔀' },
]

export const CONDITION_OPTIONS = [
  { id: 'New', label: 'New', gradient: 'linear-gradient(160deg, #fff 0%, #e5e7eb 100%)', icon: '✨' },
  { id: 'Used', label: 'Used', gradient: 'linear-gradient(160deg, #78716c 0%, #d6d3d1 100%)', icon: '📦' },
  { id: 'Old', label: 'Old', gradient: 'linear-gradient(160deg, #44403c 0%, #78716c 100%)', icon: '🕰️' },
  { id: 'Weathered', label: 'Weathered', gradient: 'linear-gradient(160deg, #57534e 0%, #a8a29e 100%)', icon: '🌊' },
  { id: 'Broken', label: 'Broken', gradient: 'linear-gradient(160deg, #450a0a 0%, #78716c 100%)', icon: '💔' },
  { id: 'Luxury', label: 'Luxury', gradient: 'linear-gradient(160deg, #1c1917 0%, #fcd34d 100%)', icon: '💎' },
]

export const SCALE_OPTIONS = [
  { id: 'Tiny', label: 'Tiny', gradient: 'linear-gradient(160deg, #374151 0%, #6b7280 100%)', icon: '·' },
  { id: 'Small', label: 'Small', gradient: 'linear-gradient(160deg, #374151 0%, #9ca3af 100%)', icon: '◦' },
  { id: 'Medium', label: 'Medium', gradient: 'linear-gradient(160deg, #1f2937 0%, #d1d5db 100%)', icon: '●' },
  { id: 'Large', label: 'Large', gradient: 'linear-gradient(160deg, #111827 0%, #9ca3af 100%)', icon: '◉' },
  { id: 'Massive', label: 'Massive', gradient: 'linear-gradient(160deg, #0a0a0a 0%, #6b7280 100%)', icon: '⬤' },
]

export const STYLE_OPTIONS = [
  { id: 'Realistic', label: 'Realistic', gradient: 'linear-gradient(160deg, #374151 0%, #9ca3af 100%)', icon: '📷' },
  { id: 'Commercial', label: 'Commercial', gradient: 'linear-gradient(160deg, #fff 0%, #38bdf8 100%)', icon: '📺' },
  { id: 'Luxury', label: 'Luxury', gradient: 'linear-gradient(160deg, #1c1917 0%, #fcd34d 100%)', icon: '✨' },
  { id: 'Cartoon', label: 'Cartoon', gradient: 'linear-gradient(160deg, #ec4899 0%, #fde047 100%)', icon: '🎨' },
  { id: 'Cinematic', label: 'Cinematic', gradient: 'linear-gradient(160deg, #1e1b4b 0%, #7c3aed 100%)', icon: '🎬' },
  { id: 'Documentary', label: 'Documentary', gradient: 'linear-gradient(160deg, #44403c 0%, #a8a29e 100%)', icon: '🎞️' },
]

export const REPLACEMENT_SUGGESTIONS = [
  { id: 'fishing-boat', label: 'Fishing Boat', gradient: 'linear-gradient(145deg, #0c1445 0%, #334155 50%, #78716c 100%)', icon: '🚤' },
  { id: 'yacht', label: 'Yacht', gradient: 'linear-gradient(145deg, #0f172a 0%, #fff 50%, #94a3b8 100%)', icon: '🛥️' },
  { id: 'canoe', label: 'Canoe', gradient: 'linear-gradient(145deg, #78350f 0%, #a16207 100%)', icon: '🛶' },
  { id: 'cargo-ship', label: 'Cargo Ship', gradient: 'linear-gradient(145deg, #1e293b 0%, #475569 50%, #f97316 100%)', icon: '🚢' },
  { id: 'sail-boat', label: 'Sail Boat', gradient: 'linear-gradient(145deg, #0ea5e9 0%, #fff 60%, #78716c 100%)', icon: '⛵' },
]

export const CONSISTENCY_OPTIONS = [
  { key: 'keepShape', label: 'Shape', detail: 'Keep shape consistent', icon: '📐' },
  { key: 'keepMaterial', label: 'Material', detail: 'Keep material consistent', icon: '🪵' },
  { key: 'keepColor', label: 'Color', detail: 'Keep color consistent', icon: '🎨' },
  { key: 'keepScale', label: 'Scale', detail: 'Keep scale consistent', icon: '📏' },
  { key: 'keepStyle', label: 'Style', detail: 'Keep style consistent', icon: '✨' },
]

export const APPLY_SCOPE_VISUALS = [
  { id: 'currentShot', label: 'Current Shot', detail: 'This frame only', icon: '🎬' },
  { id: 'currentScene', label: 'Current Scene', detail: 'All shots in scene', icon: '🎞️' },
  { id: 'selectedScenes', label: 'Selected Scenes', detail: 'Pick scenes later', icon: '📋' },
  { id: 'entireProject', label: 'Entire Project', detail: 'Every appearance', icon: '🌐' },
]

export const CATEGORY_OPTIONS = [
  'Vehicle',
  'Furniture',
  'Tool',
  'Lighting Prop',
  'Nature',
  'Building',
  'Electronics',
  'Food',
  'Custom',
]
