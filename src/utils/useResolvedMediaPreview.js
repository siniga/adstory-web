import { useEffect, useMemo, useState } from 'react'
import { resolveShotImageSrc } from './resolveMediaUrl'

export function useResolvedMediaPreview(previewImage, thumbGradient, cacheKey) {
  const imageSrc = useMemo(
    () => resolveShotImageSrc(previewImage, cacheKey),
    [previewImage, cacheKey]
  )
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)

    if (!imageSrc) {
      return undefined
    }

    const img = new Image()
    img.onload = () => setFailed(false)
    img.onerror = () => setFailed(true)
    img.src = imageSrc

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [imageSrc])

  const showImage = Boolean(imageSrc) && !failed

  return {
    imageSrc: showImage ? imageSrc : null,
    showGradient: !showImage,
    thumbGradient,
  }
}
