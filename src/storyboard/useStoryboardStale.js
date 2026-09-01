import { useEffect, useState } from 'react'
import { isStoryboardStale, subscribeStoryboardStale } from './storyboardStale'

export default function useStoryboardStale(projectId) {
  const [stale, setStale] = useState(() => isStoryboardStale(projectId))

  useEffect(() => {
    setStale(isStoryboardStale(projectId))
    return subscribeStoryboardStale(projectId, setStale)
  }, [projectId])

  return stale
}
