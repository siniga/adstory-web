import assignmentStyles from './AssignmentSection.module.css'
import promptStyles from './PromptInputsSection.module.css'

function InputGroup({ label, children }) {
  return (
    <div className={promptStyles.inputGroup}>
      <span className={promptStyles.inputLabel}>{label}</span>
      {children}
    </div>
  )
}

function AssetNameList({ items, emptyLabel }) {
  if (!items.length) {
    return <p className={assignmentStyles.emptyStateText}>{emptyLabel}</p>
  }

  return (
    <ul className={promptStyles.inputList}>
      {items.map((item) => (
        <li key={item.id ?? item.name} className={promptStyles.inputListItem}>
          {item.name}
        </li>
      ))}
    </ul>
  )
}

export default function PromptInputsSection({
  characters = [],
  environment = null,
  objects = [],
  onViewPrompt,
  onRebuildPrompt,
  rebuilding = false,
  error = null,
}) {
  return (
    <section className={assignmentStyles.section}>
      <InputGroup label="Characters used">
        <AssetNameList items={characters} emptyLabel="No characters assigned." />
      </InputGroup>

      <InputGroup label="Environment used">
        {environment ? (
          <p className={promptStyles.inputValue}>{environment.name}</p>
        ) : (
          <p className={assignmentStyles.emptyStateText}>No environment assigned.</p>
        )}
      </InputGroup>

      <InputGroup label="Objects used">
        <AssetNameList items={objects} emptyLabel="No objects assigned." />
      </InputGroup>

      {error ? <p className={promptStyles.error}>{error}</p> : null}

      <div className={promptStyles.actions}>
        <button type="button" className={promptStyles.actionBtn} onClick={onViewPrompt}>
          View Prompt
        </button>
        <button
          type="button"
          className={`${promptStyles.actionBtn} ${promptStyles.actionBtnPrimary}`}
          onClick={onRebuildPrompt}
          disabled={rebuilding}
        >
          {rebuilding ? 'Rebuilding…' : 'Rebuild Prompt'}
        </button>
      </div>
    </section>
  )
}
