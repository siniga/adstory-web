import AssetCard from './AssetCard'
import styles from './CharacterAssetList.module.css'

export default function CharacterAssetList({
  listTitle,
  items = [],
  selectedId,
  onSelect,
  onAdd,
  addButtonLabel = '+ Add',
  addNewLabel = '+ Add New',
  emptyMessage = 'No assets found.',
  suggestLabel = 'Suggest Assets',
  onSuggestEmpty,
  suggestingEmpty = false,
  generatingId = null,
  currentGeneratingId = null,
  showIdentityStatus = false,
  getIdentityStatusLabel,
  getIdentityStatus,
}) {
  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>{listTitle}</h2>
        <button type="button" className={styles.addBtn} onClick={onAdd}>
          {addButtonLabel}
        </button>
      </div>

      <div className={styles.list}>
        {items.length === 0 ? (
          <div className={styles.emptyWrap}>
            <p className={styles.empty}>{emptyMessage}</p>
            {onSuggestEmpty ? (
              <button
                type="button"
                className={styles.suggestBtn}
                onClick={onSuggestEmpty}
                disabled={suggestingEmpty}
              >
                {suggestingEmpty ? 'Suggesting…' : suggestLabel}
              </button>
            ) : null}
          </div>
        ) : (
          items.map((item) => {
            const identityStatus = showIdentityStatus
              ? (getIdentityStatus?.(item) ?? item.identityGenerationStatus ?? 'pending')
              : null

            return (
            <AssetCard
              key={item.id}
              name={item.name}
              role={item.role}
              ethnicity={item.ethnicity}
              status={item.status}
              identityStatus={identityStatus}
              identityStatusLabel={
                showIdentityStatus && identityStatus
                  ? getIdentityStatusLabel?.(identityStatus)
                  : null
              }
              thumbGradient={item.thumbGradient}
              previewImage={item.previewImage}
              selected={item.id === selectedId || String(item.id) === String(currentGeneratingId)}
              generating={
                String(generatingId) === String(item.id) ||
                item.heroImageStatus === 'generating' ||
                identityStatus === 'generating'
              }
              isCurrentGenerating={String(currentGeneratingId) === String(item.id)}
              showCompletedCheck={identityStatus === 'completed'}
              onClick={() => onSelect(item.id)}
            />
            )
          })
        )}

        {items.length > 0 ? (
          <AssetCard
            variant="addNew"
            name={addNewLabel}
            role=""
            status="draft"
            thumbGradient="linear-gradient(145deg, #111827 0%, #1f2937 100%)"
            onClick={onAdd}
          />
        ) : null}
      </div>
    </aside>
  )
}
