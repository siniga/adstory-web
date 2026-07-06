export const CREATION_STEPS = [
  { id: 'story', label: 'Story' },
  { id: 'script', label: 'Script' },
  { id: 'screenplay', label: 'Screenplay' },
  { id: 'sceneboard', label: 'Sceneboard' },
  { id: 'characters', label: 'Characters' },
  { id: 'environments', label: 'Environments' },
  { id: 'storyboard', label: 'Storyboard' },
  { id: 'studio', label: 'Studio' },
]

export const CREATION_STEP_COUNT = CREATION_STEPS.length

export const WORKSPACE_QUESTIONS = {
  story: 'What story am I telling?',
  script: 'How does it sound?',
  screenplay: 'How does it play?',
  sceneboard: 'How is the story broken into scenes?',
  characters: 'Who appears?',
  environments: 'Where does it happen?',
  storyboard: 'How does each scene play on screen?',
  studio: "Let's direct the movie.",
}

export function getWorkspaceQuestion(stepId) {
  return WORKSPACE_QUESTIONS[stepId] ?? ''
}

export const PRODUCER_NOTES = {
  story: [
    { title: 'Story hook', text: 'Lead with emotion and clear stakes so the script has something to build from.' },
  ],
  script: [
    { title: 'Dialogue', text: 'Use dialogue sparingly in early drafts. Let action and environment do part of the storytelling.' },
  ],
  screenplay: [
    { title: 'Formatting', text: 'Consistent scene headers and beat labels help downstream episode and scene generation.' },
  ],
  sceneboard: [
    { title: 'Scene planning', text: 'Review and edit scenes extracted from your screenplay before moving on to characters.' },
    { title: 'Scene by scene', text: 'Select a scene to review its details, then add or reorder scenes as needed.' },
    { title: 'Next step', text: 'Continue to Characters once your scene list looks right.' },
  ],
  characters: [
    { title: 'Cast review', text: 'Confirm characters match your screenplay before continuing to Environments.' },
  ],
  environments: [
    { title: 'Location review', text: 'Confirm reusable environments match your story locations before continuing.' },
  ],
  storyboard: [
    { title: 'Scene by scene', text: 'Generate storyboard shots one scene at a time before moving on to Studio.' },
  ],
  studio: [],
}

export function getStepIndex(stepId) {
  return CREATION_STEPS.findIndex((step) => step.id === stepId)
}
