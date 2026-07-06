import styles from './ObjectCategoryTabs.module.css'

export default function ObjectCategoryTabs({ categories, activeId, onChange }) {
  return (
    <div className={styles.wrap} role="tablist" aria-label="Object categories">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          role="tab"
          aria-selected={activeId === category.id}
          className={`${styles.tab} ${activeId === category.id ? styles.tabActive : ''}`}
          onClick={() => onChange(category.id)}
        >
          {category.label}
        </button>
      ))}
    </div>
  )
}
