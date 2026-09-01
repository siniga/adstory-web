export const CREATION_STEPS = [
  { id: 'story', label: 'Story' },
  { id: 'screenplay', label: 'Screenplay' },
  { id: 'sceneboard', label: 'Sequences' },
  { id: 'characters', label: 'Characters' },
  { id: 'environments', label: 'Environments' },
  { id: 'storyboard', label: 'Storyboard' },
  { id: 'studio', label: 'Studio' },
]

export const CREATION_STEP_COUNT = CREATION_STEPS.length

export const WORKSPACE_QUESTIONS = {
  story: 'What story am I telling?',
  screenplay: 'How does it play?',
  sceneboard: 'How is the story broken into visual sequences?',
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
    { title: 'Story hook', text: 'Lead with emotion and clear stakes so the screenplay has something to build from.' },
  ],
  screenplay: [
    { title: 'Formatting', text: 'Consistent scene headers and beat labels help downstream episode and sequence generation.' },
  ],
  sceneboard: [
    { title: 'Sequence planning', text: 'Review and edit visual sequences extracted from your screenplay before moving on to characters.' },
    { title: 'Sequence by sequence', text: 'Select a sequence to review its details, then add or reorder sequences as needed.' },
    { title: 'Next step', text: 'Continue to Characters once your sequence list looks right.' },
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
