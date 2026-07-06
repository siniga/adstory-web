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

export function formatUserFriendlyError(rawMessage) {
  const message = String(rawMessage ?? '').trim()

  if (!message) {
    return {
      title: 'Something went wrong',
      message: 'An unexpected error occurred. Please try again.',
    }
  }

  const lower = message.toLowerCase()

  if (
    lower.includes('high demand') ||
    lower.includes('try again later') ||
    lower.includes('overloaded') ||
    lower.includes('resource exhausted')
  ) {
    return {
      title: 'AI service is busy',
      message:
        'Our AI is handling unusually high demand right now. Please wait a minute and try again.',
    }
  }

  if (lower.includes('gemini api') || lower.includes('gemini')) {
    return {
      title: 'Generation unavailable',
      message:
        'We could not complete this step because the AI service is temporarily unavailable. Please try again in a few minutes.',
    }
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed')
  ) {
    return {
      title: 'Connection problem',
      message:
        'We could not reach the server. Check your internet connection, confirm the API is running, then try again.',
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

  if (lower.includes('failed to generate screenplay')) {
    return {
      title: 'Screenplay generation failed',
      message: 'We could not format your script into a screenplay. Please try again in a moment.',
    }
  }

  if (lower.includes('failed to generate scenes')) {
    return {
      title: 'Scene breakdown failed',
      message: 'We could not break your screenplay into scenes. Please try again in a moment.',
    }
  }

  if (
    lower.includes('failed to generate shots') ||
    lower.includes('at least one scene')
  ) {
    return {
      title: 'Shot breakdown failed',
      message: lower.includes('at least one scene')
        ? 'Add at least one scene before generating shots.'
        : 'We could not create your shot breakdown. Please try again in a moment.',
    }
  }

  if (
    lower.includes('failed to extract characters') ||
    lower.includes('screenplay is missing')
  ) {
    return {
      title: 'Character extraction failed',
      message: lower.includes('screenplay is missing')
        ? 'Screenplay is missing. Please go back and generate screenplay first.'
        : 'We could not detect characters from your screenplay. Please try again in a moment.',
    }
  }

  if (lower.includes('failed to extract environments')) {
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

  const cleaned = message
    .replace(/^Gemini API request failed:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim()

  return {
    title: 'Something went wrong',
    message: cleaned || 'An unexpected error occurred. Please try again.',
  }
}
