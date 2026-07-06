import { useState } from 'react'
import { BRAND } from '../config/branding'
import { toUserError } from '../utils/sanitizeUserErrorMessage'
import styles from './LoginPage.module.css'

export default function LoginPage({ onLogin, onRegister, error, onClearError }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const switchMode = () => {
    onClearError?.()
    setShowPassword(false)
    setMode((current) => (current === 'login' ? 'register' : 'login'))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    onClearError?.()

    try {
      if (mode === 'login') {
        await onLogin({ email, password })
      } else {
        await onRegister({ name, email, password })
      }
    } catch {
      // Error is handled by parent auth state.
    } finally {
      setSubmitting(false)
    }
  }

  const displayError = error ? toUserError(error, null, 'auth') : null

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.logoMark}>{BRAND.logoMark}</span>
          <span className={styles.brandName}>{BRAND.name}</span>
        </div>

        <h1 className={styles.title}>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
        <p className={styles.subtitle}>
          {mode === 'login'
            ? 'Direct your story. Log in to access your projects and studio.'
            : 'Create an account to start directing with Adstory.'}
        </p>
        {mode === 'login' && (
          <p className={styles.demoHint}>
            Demo: demo@screenly.test / password
          </p>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label className={styles.field}>
              <span className={styles.label}>Name</span>
              <input
                className={styles.input}
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoComplete="name"
              />
            </label>
          )}

          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Password</span>
            <div className={styles.passwordWrap}>
              <input
                className={styles.input}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.passwordToggleIcon}>
                    <path
                      fill="currentColor"
                      d="M12 6.5c3.5 0 6.5 2.1 8.2 5.5-1.7 3.4-4.7 5.5-8.2 5.5S5.5 15.4 3.8 12C5.5 8.6 8.5 6.5 12 6.5m0-2C7.8 4.5 4 7.4 2 12c2 4.6 5.8 7.5 10 7.5s8-2.9 10-7.5C20 7.4 16.2 4.5 12 4.5m0 3a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.passwordToggleIcon}>
                    <path
                      fill="currentColor"
                      d="M12 6.5c3.5 0 6.5 2.1 8.2 5.5-.6 1.2-1.5 2.2-2.6 3l1.4 1.4C20.3 14.2 21.5 12 22 12c-2 4.6-5.8 7.5-10 7.5-1.4 0-2.7-.3-3.9-.8l1.6 1.6-1.4 1.4L3 5.6l1.4-1.4 2.3 2.3C8.1 5.8 9.9 5.5 12 5.5m0 1c-2.8 0-5.2 1.6-6.5 4 1.3 2.4 3.7 4 6.5 4 1 0 2-.2 2.9-.6l-1.5-1.5c-.4.1-.9.1-1.4.1-1.9 0-3.5-1.6-3.5-3.5 0-.5.1-1 .3-1.4L9.6 8.5C10.3 8.2 11.1 8 12 8m0 2.5c.8 0 1.5.7 1.5 1.5 0 .3-.1.6-.2.8l-2.1-2.1c.2-.1.5-.2.8-.2"
                    />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {displayError ? <p className={styles.error}>{displayError}</p> : null}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button type="button" className={styles.switchMode} onClick={switchMode}>
          {mode === 'login'
            ? 'Need an account? Create one'
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
