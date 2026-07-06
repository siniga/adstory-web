import styles from './AssetsTabs.module.css'

export default function AssetsTabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Asset categories">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
