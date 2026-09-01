export const MAX_SINGLE_STORY_WORDS = 2000
export const WORDS_PER_EPISODE = 900

export function countStoryWords(text = '') {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function storyNeedsEpisodes(text = '') {
  return countStoryWords(text) > MAX_SINGLE_STORY_WORDS
}

export function estimateEpisodeCount(text = '') {
  const words = countStoryWords(text)
  if (words <= MAX_SINGLE_STORY_WORDS) return 1
  return Math.max(2, Math.min(12, Math.ceil(words / WORDS_PER_EPISODE)))
}

export function storyTooLongMessage(text = '') {
  const episodes = estimateEpisodeCount(text)
  return `Your story is too long for a single screenplay. We need to divide it into ${episodes} episodes.`
}
