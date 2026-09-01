import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconCopy } from '../../studio/icons'
import {
  disableProjectShare,
  enableProjectShare,
  getProjectShare,
} from '../../services/projectApi'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import styles from './ShareStoryboardModal.module.css'

async function copyText(value) {
  if (!value) return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // Fall through to execCommand.
  }

  const field = document.createElement('textarea')
  field.value = value
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.left = '-9999px'
  document.body.appendChild(field)
  field.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(field)
  return copied
}

export default function ShareStoryboardModal({ open, projectId, projectTitle, onClose }) {
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState(null)
  const [share, setShare] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open || !projectId) return undefined

    let cancelled = false
    setLoading(true)
    setError(null)
    setCopied(false)

    getProjectShare(projectId)
      .then((next) => {
        if (!cancelled) setShare(next)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            formatUserFriendlyError(
              err instanceof Error ? err.message : 'Failed to load share link'
            ).message
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, projectId])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !working) onClose?.()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, working, onClose])

  if (!open) return null

  const handleEnable = async () => {
    if (!projectId || working) return
    setWorking(true)
    setError(null)
    try {
      const next = await enableProjectShare(projectId)
      setShare(next)
    } catch (err) {
      setError(
        formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to create share link'
        ).message
      )
    } finally {
      setWorking(false)
    }
  }

  const handleDisable = async () => {
    if (!projectId || working) return
    setWorking(true)
    setError(null)
    try {
      const next = await disableProjectShare(projectId)
      setShare(next)
      setCopied(false)
    } catch (err) {
      setError(
        formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to stop sharing'
        ).message
      )
    } finally {
      setWorking(false)
    }
  }

  const handleCopy = async () => {
    const url = share?.shareUrl
    if (!url) return
    const ok = await copyText(url)
    setCopied(ok)
  }

  const handleNativeShare = async () => {
    const url = share?.shareUrl
    if (!url || typeof navigator.share !== 'function') {
      await handleCopy()
      return
    }
    try {
      await navigator.share({
        title: projectTitle || 'Storyboard',
        text: 'View this storyboard',
        url,
      })
    } catch (err) {
      if (err?.name !== 'AbortError') {
        await handleCopy()
      }
    }
  }

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={working ? undefined : onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-storyboard-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id="share-storyboard-title" className={styles.title}>
              Share storyboard
            </h2>
            <p className={styles.subtitle}>
              Anyone with the link can view this storyboard without signing in.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={working}
            aria-label="Close"
          >
            <IconClose />
          </button>
        </header>

        <div className={styles.body}>
          {loading ? <p className={styles.status}>Loading share settings…</p> : null}

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          {!loading && share?.enabled ? (
            <>
              <label className={styles.field}>
                <span className={styles.label}>Public link</span>
                <input
                  className={styles.input}
                  value={share.shareUrl}
                  readOnly
                  onFocus={(event) => event.target.select()}
                />
              </label>
              <div className={styles.actions}>
                <button type="button" className={styles.primaryBtn} onClick={handleCopy}>
                  <IconCopy />
                  {copied ? 'Copied' : 'Copy link'}
                </button>
                {typeof navigator.share === 'function' ? (
                  <button type="button" className={styles.secondaryBtn} onClick={handleNativeShare}>
                    Share…
                  </button>
                ) : null}
              </div>
            </>
          ) : null}

          {!loading && share && !share.enabled ? (
            <p className={styles.status}>
              Create a public link to send this storyboard to anyone. They will not need an account.
            </p>
          ) : null}
        </div>

        <footer className={styles.footer}>
          {share?.enabled ? (
            <button
              type="button"
              className={styles.dangerBtn}
              onClick={handleDisable}
              disabled={working}
            >
              {working ? 'Updating…' : 'Stop sharing'}
            </button>
          ) : (
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleEnable}
              disabled={working || loading}
            >
              {working ? 'Creating…' : 'Create public link'}
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body
  )
}
