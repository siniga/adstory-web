import { useCallback, useState } from 'react'

const DEFAULT_ERROR = 'Download failed. Please try again.'

export function useAssetDownload() {
  const [downloadingKey, setDownloadingKey] = useState(null)
  const [downloadError, setDownloadError] = useState(null)

  const clearDownloadError = useCallback(() => {
    setDownloadError(null)
  }, [])

  const runDownload = useCallback(async (key, downloadFn) => {
    setDownloadingKey(key)
    setDownloadError(null)

    try {
      await downloadFn()
    } catch (err) {
      const message = err instanceof Error ? err.message : DEFAULT_ERROR
      setDownloadError(message || DEFAULT_ERROR)
    } finally {
      setDownloadingKey(null)
    }
  }, [])

  const isDownloading = useCallback((key) => downloadingKey === key, [downloadingKey])

  return {
    downloadingKey,
    downloadError,
    clearDownloadError,
    runDownload,
    isDownloading,
  }
}
