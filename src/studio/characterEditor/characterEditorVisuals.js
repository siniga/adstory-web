export const GENDER_OPTIONS = [
  { id: 'Male', label: 'Male', gradient: 'linear-gradient(160deg, #1e3a5f 0%, #2563eb 100%)', icon: '♂' },
  { id: 'Female', label: 'Female', gradient: 'linear-gradient(160deg, #4a1942 0%, #a855f7 100%)', icon: '♀' },
]

export const BODY_TYPE_OPTIONS = [
  { id: 'Slim', label: 'Slim', gradient: 'linear-gradient(180deg, #374151 0%, #111827 100%)', thumbClass: 'bodySlim' },
  { id: 'Athletic', label: 'Athletic', gradient: 'linear-gradient(180deg, #1f2937 0%, #059669 100%)', thumbClass: 'bodyAthletic' },
  { id: 'Average', label: 'Average', gradient: 'linear-gradient(180deg, #374151 0%, #1f2937 100%)', thumbClass: 'bodyAverage' },
  { id: 'Heavy', label: 'Heavy', gradient: 'linear-gradient(180deg, #44403c 0%, #1c1917 100%)', thumbClass: 'bodyHeavy' },
]

export const FACE_OPTIONS = {
  eyeShape: [
    { id: 'Almond', label: 'Almond', gradient: 'linear-gradient(135deg, #fef3c7, #92400e)', icon: '◠' },
    { id: 'Round', label: 'Round', gradient: 'linear-gradient(135deg, #fef9c3, #ca8a04)', icon: '●' },
    { id: 'Hooded', label: 'Hooded', gradient: 'linear-gradient(135deg, #e5e7eb, #4b5563)', icon: '◡' },
    { id: 'Monolid', label: 'Monolid', gradient: 'linear-gradient(135deg, #fde68a, #78350f)', icon: '—' },
  ],
  eyeColor: [
    { id: 'Brown', label: 'Brown', color: '#5c4033' },
    { id: 'Blue', label: 'Blue', color: '#3b82f6' },
    { id: 'Green', label: 'Green', color: '#22c55e' },
    { id: 'Hazel', label: 'Hazel', color: '#a16207' },
  ],
  noseStyle: [
    { id: 'Straight', label: 'Straight', gradient: 'linear-gradient(180deg, #d1d5db, #6b7280)', thumbClass: 'noseStraight' },
    { id: 'Wide', label: 'Wide', gradient: 'linear-gradient(180deg, #e5e7eb, #9ca3af)', thumbClass: 'noseWide' },
    { id: 'Narrow', label: 'Narrow', gradient: 'linear-gradient(180deg, #f3f4f6, #6b7280)', thumbClass: 'noseNarrow' },
    { id: 'Button', label: 'Button', gradient: 'linear-gradient(180deg, #fde68a, #d97706)', thumbClass: 'noseButton' },
  ],
  beardStyle: [
    { id: 'None', label: 'None', gradient: 'linear-gradient(135deg, #1f2937, #111827)', icon: '∅' },
    { id: 'Stubble', label: 'Stubble', gradient: 'linear-gradient(135deg, #4b5563, #1f2937)', thumbClass: 'beardStubble' },
    { id: 'Full', label: 'Full', gradient: 'linear-gradient(135deg, #374151, #111827)', thumbClass: 'beardFull' },
    { id: 'Goatee', label: 'Goatee', gradient: 'linear-gradient(135deg, #525252, #171717)', thumbClass: 'beardGoatee' },
  ],
  mustacheStyle: [
    { id: 'None', label: 'None', gradient: 'linear-gradient(135deg, #1f2937, #111827)', icon: '∅' },
    { id: 'Thin', label: 'Thin', gradient: 'linear-gradient(135deg, #6b7280, #374151)', thumbClass: 'mustacheThin' },
    { id: 'Handlebar', label: 'Handlebar', gradient: 'linear-gradient(135deg, #78716c, #292524)', thumbClass: 'mustacheHandlebar' },
    { id: 'Full', label: 'Full', gradient: 'linear-gradient(135deg, #57534e, #1c1917)', thumbClass: 'mustacheFull' },
  ],
}

export const HAIR_STYLE_OPTIONS = [
  { id: 'Short', label: 'Short', gradient: 'linear-gradient(180deg, #1a1a1a 30%, #525252 100%)', thumbClass: 'hairShort' },
  { id: 'Long', label: 'Long', gradient: 'linear-gradient(180deg, #1a1a1a 20%, #78716c 100%)', thumbClass: 'hairLong' },
  { id: 'Curly', label: 'Curly', gradient: 'linear-gradient(180deg, #292524 0%, #a8a29e 100%)', thumbClass: 'hairCurly' },
  { id: 'Braided', label: 'Braided', gradient: 'linear-gradient(180deg, #1c1917 0%, #78716c 100%)', thumbClass: 'hairBraided' },
  { id: 'Bald', label: 'Bald', gradient: 'linear-gradient(180deg, #fde68a 0%, #d97706 100%)', thumbClass: 'hairBald' },
]

export const WARDROBE_CATALOG = {
  shirt: [
    { id: 'White Oxford', label: 'White Oxford', gradient: 'linear-gradient(135deg, #f9fafb, #d1d5db)' },
    { id: 'Flannel', label: 'Flannel', gradient: 'linear-gradient(135deg, #991b1b, #450a0a)' },
    { id: 'Linen', label: 'Linen', gradient: 'linear-gradient(135deg, #fef3c7, #d97706)' },
    { id: 'T-Shirt', label: 'T-Shirt', gradient: 'linear-gradient(135deg, #1e40af, #1e3a8a)' },
  ],
  pants: [
    { id: 'Khaki', label: 'Khaki', gradient: 'linear-gradient(135deg, #d6d3d1, #78716c)' },
    { id: 'Denim', label: 'Denim', gradient: 'linear-gradient(135deg, #1e3a8a, #172554)' },
    { id: 'Black', label: 'Black', gradient: 'linear-gradient(135deg, #374151, #111827)' },
    { id: 'Cargo', label: 'Cargo', gradient: 'linear-gradient(135deg, #57534e, #292524)' },
  ],
  shoes: [
    { id: 'Boots', label: 'Boots', gradient: 'linear-gradient(135deg, #44403c, #1c1917)' },
    { id: 'Sneakers', label: 'Sneakers', gradient: 'linear-gradient(135deg, #fff, #9ca3af)' },
    { id: 'Sandals', label: 'Sandals', gradient: 'linear-gradient(135deg, #d97706, #92400e)' },
    { id: 'Loafers', label: 'Loafers', gradient: 'linear-gradient(135deg, #78350f, #451a03)' },
  ],
  jacket: [
    { id: 'None', label: 'None', gradient: 'linear-gradient(135deg, #1f2937, #111827)', icon: '∅' },
    { id: 'Leather', label: 'Leather', gradient: 'linear-gradient(135deg, #292524, #0c0a09)' },
    { id: 'Denim', label: 'Denim', gradient: 'linear-gradient(135deg, #1e40af, #1e3a8a)' },
    { id: 'Parka', label: 'Parka', gradient: 'linear-gradient(135deg, #365314, #14532d)' },
  ],
  dress: [
    { id: 'None', label: 'None', gradient: 'linear-gradient(135deg, #1f2937, #111827)', icon: '∅' },
    { id: 'Floral', label: 'Floral', gradient: 'linear-gradient(135deg, #fce7f3, #db2777)' },
    { id: 'Evening', label: 'Evening', gradient: 'linear-gradient(135deg, #1e1b4b, #312e81)' },
    { id: 'Casual', label: 'Casual', gradient: 'linear-gradient(135deg, #fef9c3, #eab308)' },
  ],
}

export const ACCESSORY_OPTIONS = [
  { key: 'hat', label: 'Hat', gradient: 'linear-gradient(135deg, #57534e, #292524)', icon: '🎩' },
  { key: 'watch', label: 'Watch', gradient: 'linear-gradient(135deg, #374151, #111827)', icon: '⌚' },
  { key: 'necklace', label: 'Necklace', gradient: 'linear-gradient(135deg, #fef3c7, #ca8a04)', icon: '📿' },
  { key: 'glasses', label: 'Glasses', gradient: 'linear-gradient(135deg, #1f2937, #6b7280)', icon: '👓' },
  { key: 'ring', label: 'Ring', gradient: 'linear-gradient(135deg, #fde68a, #d97706)', icon: '💍' },
  { key: 'bag', label: 'Bag', gradient: 'linear-gradient(135deg, #78350f, #451a03)', icon: '👜' },
]

export const POSE_OPTIONS = [
  { id: 'Standing', label: 'Standing', gradient: 'linear-gradient(180deg, #374151, #111827)', thumbClass: 'poseStanding' },
  { id: 'Walking', label: 'Walking', gradient: 'linear-gradient(180deg, #1f2937, #059669)', thumbClass: 'poseWalking' },
  { id: 'Running', label: 'Running', gradient: 'linear-gradient(180deg, #1e3a8a, #172554)', thumbClass: 'poseRunning' },
  { id: 'Sitting', label: 'Sitting', gradient: 'linear-gradient(180deg, #44403c, #1c1917)', thumbClass: 'poseSitting' },
  { id: 'Holding Object', label: 'Holding Object', gradient: 'linear-gradient(180deg, #713f12, #451a03)', thumbClass: 'poseHolding' },
  { id: 'Talking', label: 'Talking', gradient: 'linear-gradient(180deg, #581c87, #3b0764)', thumbClass: 'poseTalking' },
]

export const EXPRESSION_OPTIONS = [
  { id: 'Neutral', label: 'Neutral', gradient: 'linear-gradient(135deg, #6b7280, #374151)', icon: '😐' },
  { id: 'Happy', label: 'Happy', gradient: 'linear-gradient(135deg, #fde047, #ca8a04)', icon: '😊' },
  { id: 'Sad', label: 'Sad', gradient: 'linear-gradient(135deg, #93c5fd, #1d4ed8)', icon: '😢' },
  { id: 'Angry', label: 'Angry', gradient: 'linear-gradient(135deg, #fca5a5, #b91c1c)', icon: '😠' },
  { id: 'Focused', label: 'Focused', gradient: 'linear-gradient(135deg, #a7f3d0, #059669)', icon: '🧐' },
  { id: 'Surprised', label: 'Surprised', gradient: 'linear-gradient(135deg, #fde68a, #d97706)', icon: '😲' },
]

export const CONSISTENCY_OPTIONS = [
  { key: 'keepFace', label: 'Face', detail: 'Keep face consistent', icon: '👤' },
  { key: 'keepHair', label: 'Hair', detail: 'Keep hair consistent', icon: '💇' },
  { key: 'keepClothing', label: 'Clothing', detail: 'Keep clothing consistent', icon: '👕' },
  { key: 'keepAccessories', label: 'Accessories', detail: 'Keep accessories consistent', icon: '⌚' },
  { key: 'keepBodyType', label: 'Body', detail: 'Keep body type consistent', icon: '🧍' },
]

export const APPLY_SCOPE_VISUALS = [
  { id: 'currentShot', label: 'Current Shot', detail: 'This frame only', icon: '🎬' },
  { id: 'currentScene', label: 'Current Scene', detail: 'All shots in scene', icon: '🎞️' },
  { id: 'selectedScenes', label: 'Selected Scenes', detail: 'Pick scenes later', icon: '📋' },
  { id: 'entireProject', label: 'Entire Project', detail: 'Every appearance', icon: '🌐' },
]
