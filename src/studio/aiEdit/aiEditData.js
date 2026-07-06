export const PROMPT_PLACEHOLDER = `Examples:

"Change Juma's shirt to a red jacket"

"Turn the weather into a storm"

"Replace the fishing boat with a luxury yacht"

"Make the scene look like a Nike commercial"

"Change sunset to night"`

export const QUICK_ACTIONS = [
  'Change Outfit',
  'Change Hair',
  'Change Expression',
  'Replace Object',
  'Change Environment',
  'Change Lighting',
  'Change Weather',
  'Change Camera Angle',
  'Add Prop',
  'Remove Object',
]

export const TARGET_OPTIONS = [
  { id: 'selectedAsset', label: 'Selected Asset' },
  { id: 'currentShot', label: 'Current Shot' },
  { id: 'currentScene', label: 'Current Scene' },
  { id: 'entireProject', label: 'Entire Project' },
]

export const CREATIVITY_OPTIONS = ['Low', 'Medium', 'High']
export const CONSISTENCY_OPTIONS = ['Strict', 'Balanced', 'Flexible']

export const RECENT_PROMPTS = [
  'Change shirt to red',
  'Replace boat with yacht',
  'Add dramatic lighting',
]

export const EXPECTED_CHANGES = [
  { key: 'character', label: 'Character', enabled: true },
  { key: 'environment', label: 'Environment', enabled: true },
  { key: 'object', label: 'Object', enabled: true },
]

export const QUICK_ACTION_PROMPTS = {
  'Change Outfit': "Change the character's outfit",
  'Change Hair': "Change the character's hair style",
  'Change Expression': "Change the character's expression",
  'Replace Object': 'Replace the selected object',
  'Change Environment': 'Change the environment background',
  'Change Lighting': 'Change the lighting in this shot',
  'Change Weather': 'Change the weather conditions',
  'Change Camera Angle': 'Change the camera angle',
  'Add Prop': 'Add a new prop to the scene',
  'Remove Object': 'Remove the selected object',
}
