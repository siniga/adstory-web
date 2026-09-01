import { sanitizeUserErrorMessage } from './sanitizeUserErrorMessage'

const GENERIC_TITLE = 'Something went wrong'
const GENERIC_MESSAGE = 'Something went wrong. Please try again.'
const GENERATION_MESSAGE = 'We could not finish this step right now. Please try again in a moment.'
const BUSY_MESSAGE = 'Our creative tools are busy right now. Please wait a minute and try again.'

const VALIDATION_FIELD_LABELS = {
  story: 'story',
  script: 'script',
  screenplay: 'screenplay',
  style: 'style',
}

function cleanValidationMessage(message) {
  const fieldMatch = message.match(/^The ([a-z_]+) field (.+)$/i)
  if (fieldMatch) {
    const label = VALIDATION_FIELD_LABELS[fieldMatch[1]] ?? fieldMatch[1].replace(/_/g, ' ')
    const rest = fieldMatch[2]
    if (rest.startsWith('is required')) {
      return `Please enter your ${label} before continuing.`
    }
    if (rest.includes('must be at least')) {
      const countMatch = rest.match(/at least (\d+)/)
      const count = countMatch?.[1]
      return count
        ? `Your ${label} needs to be at least ${count} characters.`
        : `Your ${label} is too short. Please add more detail.`
    }
    if (rest.includes('may not be greater than')) {
      return `Your ${label} is too long. Please shorten it and try again.`
    }
    return `Please check your ${label} and try again.`
  }

  return message
}

function looksLikeSystemError(message) {
  const lower = String(message ?? '').toLowerCase()
  return (
    /sqlstate/i.test(message) ||
    lower.includes('gemini') ||
    lower.includes('api key') ||
    lower.includes('google ai') ||
    lower.includes('pdoexception') ||
    lower.includes('queryexception') ||
    lower.includes('stack trace') ||
    lower.includes('xampp') ||
    lower.includes('artisan') ||
    lower.includes('curl error') ||
    lower.includes('illuminate\\') ||
    lower.includes('connection: mysql') ||
    lower.includes('insert into') ||
    lower.includes('undefined array key') ||
    lower.includes('vendor/') ||
    lower.includes('billing') ||
    lower.includes('prepayment credits')
  )
}

export function formatUserFriendlyError(rawMessage) {
  const message = String(rawMessage ?? '').trim()

  if (!message) {
    return {
      title: GENERIC_TITLE,
      message: GENERIC_MESSAGE,
    }
  }

  const lower = message.toLowerCase()

  if (
    lower.includes('high demand') ||
    lower.includes('try again later') ||
    lower.includes('overloaded') ||
    lower.includes('resource exhausted') ||
    lower.includes('quota') ||
    lower.includes('credits are depleted')
  ) {
    return {
      title: 'Please try again shortly',
      message: BUSY_MESSAGE,
    }
  }

  if (lower.includes('did not return an image')) {
    return {
      title: 'Image not ready',
      message: 'We could not create this image. Please try again.',
    }
  }

  if (lower.includes('blocked this image for safety') || lower.includes('for safety')) {
    return {
      title: 'Image could not be created',
      message:
        'This image could not be created because of content guidelines. Try changing the scene and try again.',
    }
  }

  if (lower.includes('api key') || lower.includes('not configured')) {
    return {
      title: GENERIC_TITLE,
      message: GENERATION_MESSAGE,
    }
  }

  if (lower.includes('gemini api error:') || lower.includes('gemini api request failed')) {
    return {
      title: GENERIC_TITLE,
      message: GENERATION_MESSAGE,
    }
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('cannot reach the api')
  ) {
    return {
      title: 'Connection problem',
      message: 'We could not reach the server. Check your internet connection and try again.',
    }
  }

  if (
    lower.includes('sqlstate') ||
    lower.includes('connection refused') ||
    lower.includes('actively refused') ||
    lower.includes('could not be made because') ||
    lower.includes('connection: mysql') ||
    lower.includes('no connection could be made')
  ) {
    return {
      title: GENERIC_TITLE,
      message: GENERIC_MESSAGE,
    }
  }

  if (lower.includes('open a project before')) {
    return {
      title: 'Project required',
      message: 'Open or create a project before running this step.',
    }
  }

  if (lower.includes('is required') || lower.includes('must be at least')) {
    const cleaned = cleanValidationMessage(message.replace(/^Validation failed:?\s*/i, ''))
    return {
      title: 'Check your input',
      message: cleaned,
    }
  }

  if (lower.includes('failed to generate script')) {
    return {
      title: 'Script generation failed',
      message: 'We could not generate your script. Please try again in a moment.',
    }
  }

  if (lower.includes('too long for a single screenplay') || lower.includes('divide it into')) {
    return {
      title: 'Story is too long',
      message:
        'Your story is too long for a single screenplay. We need to divide it into episodes.',
    }
  }

  if (lower.includes('failed to generate screenplay')) {
    return {
      title: 'Screenplay generation failed',
      message: 'We could not generate your screenplay. Please try again in a moment.',
    }
  }

  if (
    lower.includes('failed to generate scenes') ||
    lower.includes('failed to generate sequences') ||
    lower.includes('did not return any sequences')
  ) {
    return {
      title: 'Sequence breakdown failed',
      message: 'We could not break your screenplay into sequences. Please try again in a moment.',
    }
  }

  if (
    lower.includes('failed to generate shots') ||
    lower.includes('did not return any shots') ||
    lower.includes('generate sequences before') ||
    lower.includes('at least one scene')
  ) {
    return {
      title: 'Storyboard shots failed',
      message:
        lower.includes('at least one scene') || lower.includes('generate sequences before')
          ? 'Generate sequences before creating storyboard shots.'
          : 'We could not break your sequences into shots. Please try again in a moment.',
    }
  }

  if (
    lower.includes('failed to extract characters') ||
    lower.includes('did not return any characters') ||
    lower.includes('screenplay is missing')
  ) {
    return {
      title: 'Character extraction failed',
      message: lower.includes('screenplay is missing')
        ? 'Screenplay is missing. Please go back and generate screenplay first.'
        : 'We could not detect characters from your screenplay. Please try again in a moment.',
    }
  }

  if (
    lower.includes('failed to extract environments') ||
    lower.includes('did not return any environments')
  ) {
    return {
      title: 'Environment extraction failed',
      message: 'We could not detect locations from your screenplay. Please try again in a moment.',
    }
  }

  if (lower.includes('failed to generate character image')) {
    return {
      title: 'Character image failed',
      message: 'We could not generate this character image. Please try again in a moment.',
    }
  }

  if (lower.includes('failed to generate character reference')) {
    return {
      title: 'Reference image failed',
      message: 'We could not generate this reference image. Please try again in a moment.',
    }
  }

  if (lower.includes('failed to save environments')) {
    return {
      title: 'Save failed',
      message: 'We could not save your environments. Please try again in a moment.',
    }
  }

  if (lower.includes('failed to generate shot image')) {
    return {
      title: 'Storyboard image failed',
      message: 'We could not generate this storyboard image. Please try again in a moment.',
    }
  }

  if (lower.includes('failed to delete shot image')) {
    return {
      title: 'Delete failed',
      message: 'We could not delete this storyboard version. Please try again in a moment.',
    }
  }

  if (lower.includes('failed to generate storyboard images')) {
    return {
      title: 'Storyboard generation failed',
      message: 'We could not generate all storyboard images. Please try again in a moment.',
    }
  }

  if (lower.includes('failed to load shot images')) {
    return {
      title: 'Could not load versions',
      message: 'We could not load storyboard versions for this shot. Please try again.',
    }
  }

  if (lower.includes('failed to save storyboard settings')) {
    return {
      title: 'Save failed',
      message: 'We could not save storyboard settings for this shot. Please try again in a moment.',
    }
  }

  if (lower.includes('failed to approve shot image')) {
    return {
      title: 'Approval failed',
      message: 'We could not approve this storyboard version. Please try again in a moment.',
    }
  }

  if (lower.includes('failed to generate environment image')) {
    return {
      title: 'Environment image failed',
      message: 'We could not generate this environment image. Please try again in a moment.',
    }
  }

  if (looksLikeSystemError(message)) {
    return {
      title: GENERIC_TITLE,
      message: GENERATION_MESSAGE,
    }
  }

  const sanitized = sanitizeUserErrorMessage(message)
  return {
    title: GENERIC_TITLE,
    message: sanitized || GENERIC_MESSAGE,
  }
}

export function userErrorText(error) {
  if (!error) return ''
  if (typeof error === 'object' && typeof error.message === 'string') {
    return formatUserFriendlyError(error.message).message
  }
  return formatUserFriendlyError(error).message
}
