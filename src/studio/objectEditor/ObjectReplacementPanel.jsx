import { useMemo } from 'react'
import { IconSearch } from '../icons'
import { CatalogGroup, SectionBlock, VisualGrid, VisualOptionCard } from './ObjectEditorFields'
import { REPLACEMENT_SUGGESTIONS } from './objectEditorVisuals'
import styles from './ObjectEditorSection.module.css'

export default function ObjectReplacementPanel({ state, onChange }) {
  const filtered = useMemo(() => {
    const query = state.replacementSearch.trim().toLowerCase()
    if (!query) return REPLACEMENT_SUGGESTIONS
    return REPLACEMENT_SUGGESTIONS.filter((item) => item.label.toLowerCase().includes(query))
  }, [state.replacementSearch])

  return (
    <SectionBlock title="Replace With" subtitle="Browse suggested replacements — visual only">
      <CatalogGroup label="Search">
        <label className={styles.searchWrap}>
          <IconSearch />
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search replacements..."
            value={state.replacementSearch}
            onChange={(event) =>
              onChange({ ...state, replacementSearch: event.target.value })
            }
          />
        </label>
      </CatalogGroup>

      <CatalogGroup label="Suggested Replacements">
        <VisualGrid columns={3}>
          {filtered.map((option) => (
            <VisualOptionCard
              key={option.id}
              label={option.label}
              gradient={option.gradient}
              icon={option.icon}
              selected={state.replacementSelection === option.id}
              onClick={() => onChange({ ...state, replacementSelection: option.id })}
            />
          ))}
        </VisualGrid>
        {filtered.length === 0 && (
          <p className={styles.blockSubtitle}>No replacements match your search.</p>
        )}
      </CatalogGroup>
    </SectionBlock>
  )
}
