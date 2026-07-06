import { useEffect, useId, useMemo, useRef, useState } from 'react'
import styles from './SearchableSelect.module.css'

export default function SearchableSelect({
  label,
  value = '',
  onChange,
  options = [],
  placeholder = 'Select…',
  required = false,
  highlight = false,
}) {
  const listboxId = useId()
  const wrapRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return options

    return options.filter((option) => option.toLowerCase().includes(normalizedQuery))
  }, [options, query])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const handleSelect = (option) => {
    onChange(option)
    setOpen(false)
    setQuery('')
  }

  const handleInputChange = (event) => {
    setQuery(event.target.value)
    setOpen(true)
  }

  const handleFocus = () => {
    setOpen(true)
    setQuery(value || '')
  }

  const displayValue = open ? query : value || ''

  return (
    <div className={styles.field} ref={wrapRef}>
      <span className={styles.label}>
        {label}
        {required ? <span className={styles.requiredMark}> *</span> : null}
      </span>
      <div className={styles.wrap}>
        <input
          className={`${styles.input} ${highlight ? styles.inputHighlight : ''}`}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          value={displayValue}
          placeholder={!value ? placeholder : undefined}
          onChange={handleInputChange}
          onFocus={handleFocus}
        />
        <span className={styles.chevron} aria-hidden="true">
          ▾
        </span>
        {open ? (
          <ul className={styles.dropdown} id={listboxId} role="listbox">
            {filteredOptions.length === 0 ? (
              <li className={styles.emptyOption}>No matches</li>
            ) : (
              filteredOptions.map((option) => (
                <li key={option} role="option" aria-selected={option === value}>
                  <button
                    type="button"
                    className={`${styles.option} ${option === value ? styles.optionActive : ''}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(option)}
                  >
                    {option}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
