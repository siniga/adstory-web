import { useEffect, useMemo, useState } from 'react'
import * as projectApi from '../../services/projectApi'
import { IconTrash } from '../../studio/icons'
import ObjectDeleteModal from './ObjectDeleteModal'
import ObjectEditModal from './ObjectEditModal'
import StepHeader from './StepHeader'
import styles from './StepLayout.module.css'

const OBJECT_STATUS_LABELS = {
  suggested: 'Suggested',
  accepted: 'Accepted',
  rejected: 'Rejected',
  modified: 'Modified',
}

function getObjectStatusLabel(status) {
  return OBJECT_STATUS_LABELS[status] ?? 'Suggested'
}

function isObjectAccepted(object) {
  return object.status === 'accepted' || object.status === 'modified'
}

function getSourceLabel(source) {
  if (source === 'library') return 'Loaded from Object Library'
  if (source === 'ai') return 'Generated from Story'
  return null
}

function StatusBadge({ status }) {
  const normalized = status ?? 'suggested'
  const statusClass = styles[`status${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`]

  return (
    <span className={`${styles.statusBadge} ${statusClass ?? styles.statusSuggested}`}>
      {getObjectStatusLabel(status)}
    </span>
  )
}

function ImportanceBadge({ importance }) {
  if (!importance) return null

  const normalized = String(importance).toLowerCase()
  const importanceClass =
    normalized === 'main'
      ? styles.importanceMain
      : normalized === 'background'
        ? styles.importanceBackground
        : styles.importanceSupporting

  return (
    <span className={`${styles.importanceBadge} ${importanceClass}`}>
      {normalized}
    </span>
  )
}

function ObjectField({ label, value }) {
  if (!value) return null

  return (
    <p className={styles.characterField}>
      <span className={styles.characterFieldLabel}>{label}</span>
      {value}
    </p>
  )
}

function ObjectCard({ object, busy, deleting, onAccept, onReject, onRestore, onEdit, onDelete }) {
  const isBusy = busy === object.id
  const isDeleting = deleting === object.id
  const isRejected = object.status === 'rejected'
  const isAccepted = isObjectAccepted(object)
  const cardBusy = isBusy || isDeleting

  return (
    <article
      className={`${styles.characterCard} ${isRejected ? styles.environmentCardRejected : ''}`}
    >
      <div className={styles.characterCardHeader}>
        <h3 className={styles.characterName}>{object.name}</h3>
        <div className={styles.characterCardHeaderRight}>
          <StatusBadge status={object.status} />
          <ImportanceBadge importance={object.importance} />
          <button
            type="button"
            className={styles.cardDeleteBtn}
            onClick={() => onDelete(object)}
            disabled={cardBusy}
            aria-label={`Delete ${object.name}`}
            title="Delete object"
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {object.category ? <p className={styles.characterRole}>{object.category}</p> : null}
      <ObjectField label="Description" value={object.description} />
      <ObjectField label="Material" value={object.material} />
      <ObjectField label="Color" value={object.color ?? object.primaryColor} />
      <ObjectField label="Condition" value={object.condition} />

      <div className={styles.characterCardActions}>
        {isRejected ? (
          <button
            type="button"
            className={styles.cardActionBtn}
            onClick={() => onRestore(object)}
            disabled={cardBusy}
          >
            Restore
          </button>
        ) : (
          <>
            <button
              type="button"
              className={styles.cardActionBtn}
              onClick={() => onAccept(object)}
              disabled={cardBusy || isAccepted}
            >
              Accept
            </button>
            <button
              type="button"
              className={styles.cardActionBtn}
              onClick={() => onReject(object)}
              disabled={cardBusy}
            >
              Reject
            </button>
          </>
        )}
        <button
          type="button"
          className={styles.cardActionBtn}
          onClick={() => onEdit(object)}
          disabled={cardBusy}
        >
          Edit
        </button>
        <button
          type="button"
          className={styles.cardActionBtn}
          onClick={() => onDelete(object)}
          disabled={cardBusy}
        >
          Delete
        </button>
      </div>
    </article>
  )
}

export default function ObjectsStep({
  projectId,
  objects = [],
  onActionChange,
  onSuggestObjects,
  onRefreshObjects,
  onComplete,
  onAssignAssets,
  onOpenStudio,
  error = null,
}) {
  const [items, setItems] = useState(objects)
  const [objectSource, setObjectSource] = useState(objects.length > 0 ? 'library' : null)
  const [suggesting, setSuggesting] = useState(false)
  const [busyObjectId, setBusyObjectId] = useState(null)
  const [acceptAllBusy, setAcceptAllBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [assigning, setAssigning] = useState(false)
  const [objectToEdit, setObjectToEdit] = useState(null)
  const [objectToDelete, setObjectToDelete] = useState(null)
  const [deletingObjectId, setDeletingObjectId] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [editError, setEditError] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    setItems(objects)
  }, [objects])

  useEffect(() => {
    onActionChange?.(null)
    return () => onActionChange?.(null)
  }, [onActionChange])

  const hasAcceptedObjects = useMemo(() => items.some(isObjectAccepted), [items])

  const syncObjectsFromProject = async () => {
    if (!onRefreshObjects) {
      return items
    }

    const refreshed = await onRefreshObjects()
    setItems(refreshed)
    return refreshed
  }

  const applySuggestionResult = ({ objects: suggested, source }) => {
    setItems(suggested)
    setObjectSource(source ?? 'ai')
  }

  const handleSuggestObjects = async () => {
    if (!onSuggestObjects) return

    setSuggesting(true)
    setActionError(null)

    try {
      const result = await onSuggestObjects({ force: false })
      applySuggestionResult(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Object suggestion failed'
      setActionError(message)
    } finally {
      setSuggesting(false)
    }
  }

  const runObjectAction = async (objectId, action) => {
    setBusyObjectId(objectId)
    setActionError(null)

    try {
      await action()
      await syncObjectsFromProject()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Object action failed'
      setActionError(message)
    } finally {
      setBusyObjectId(null)
    }
  }

  const handleAccept = (object) =>
    runObjectAction(object.id, () => projectApi.acceptObject(object.id))

  const handleReject = (object) =>
    runObjectAction(object.id, () => projectApi.rejectObject(object.id))

  const handleRestore = (object) =>
    runObjectAction(object.id, () => projectApi.restoreObject(object.id))

  const handleAcceptAll = async () => {
    if (!projectId) return

    setAcceptAllBusy(true)
    setActionError(null)

    try {
      await projectApi.acceptAllObjects(projectId)
      await syncObjectsFromProject()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Accept all failed'
      setActionError(message)
    } finally {
      setAcceptAllBusy(false)
    }
  }

  const handleEditSave = async (form) => {
    if (!objectToEdit?.id) return

    setSavingEdit(true)
    setEditError(null)
    setActionError(null)

    try {
      await projectApi.updateObject(objectToEdit.id, {
        name: form.name,
        category: form.category,
        description: form.description,
        material: form.material || null,
        color: form.color || null,
        condition: form.condition || null,
        notes: form.notes || null,
      })
      await syncObjectsFromProject()
      setObjectToEdit(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save object'
      setEditError(message)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteRequest = (object) => {
    setDeleteError(null)
    setObjectToDelete(object)
  }

  const handleDeleteCancel = () => {
    if (deletingObjectId) return
    setObjectToDelete(null)
    setDeleteError(null)
  }

  const handleDeleteConfirm = async () => {
    if (!objectToDelete?.id) return

    const objectId = objectToDelete.id
    setDeletingObjectId(objectId)
    setDeleteError(null)
    setActionError(null)

    try {
      await projectApi.deleteObject(objectId)
      setItems((prev) => prev.filter((item) => item.id !== objectId))
      setObjectToDelete(null)

      const refreshed = await syncObjectsFromProject()
      if (refreshed.length === 0) {
        setObjectSource(null)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete object'
      setDeleteError(message)
    } finally {
      setDeletingObjectId(null)
    }
  }

  const handleContinueToStudio = () => {
    onComplete?.()
    onOpenStudio?.()
  }

  const handleAssignAssetsToShots = async () => {
    if (!onAssignAssets) {
      handleContinueToStudio()
      return
    }

    setAssigning(true)
    setActionError(null)

    try {
      await onAssignAssets()
      onComplete?.()
      onOpenStudio?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Asset assignment failed'
      setActionError(message)
    } finally {
      setAssigning(false)
    }
  }

  const sourceLabel = getSourceLabel(objectSource)
  const displayError = actionError || error
  const subtitle =
    items.length === 0 && !suggesting
      ? 'Review reusable project objects and props before entering Studio.'
      : `${items.length} object${items.length === 1 ? '' : 's'} in this project.`

  return (
    <div className={styles.step}>
      <StepHeader eyebrow="Step 8 of 8" title="Objects" subtitle={subtitle} />

      {!suggesting && items.length > 0 ? (
        <div className={styles.characterTopActions}>
          {sourceLabel ? <span className={styles.characterSourceLabel}>{sourceLabel}</span> : null}
          <div className={styles.characterTopActionsButtons}>
            <button
              type="button"
              className={styles.secondaryBtnActive}
              onClick={handleAcceptAll}
              disabled={
                acceptAllBusy ||
                busyObjectId != null ||
                deletingObjectId != null ||
                savingEdit
              }
            >
              {acceptAllBusy ? 'Accepting…' : 'Accept All Objects'}
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.content}>
        {suggesting ? (
          <div className={styles.characterState}>
            <span className={styles.characterSpinner} aria-hidden="true" />
            <p>Suggesting objects…</p>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.characterState}>
            {displayError ? <p className={styles.characterError}>{displayError}</p> : null}
            <p>No objects yet for this project.</p>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleSuggestObjects}
              disabled={!projectId}
            >
              Suggest Objects from Story
            </button>
          </div>
        ) : (
          <>
            {displayError ? <p className={styles.characterInlineError}>{displayError}</p> : null}
            <div className={styles.characterGrid}>
              {items.map((object) => (
                <ObjectCard
                  key={object.id ?? object.name}
                  object={object}
                  busy={busyObjectId}
                  deleting={deletingObjectId}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onRestore={handleRestore}
                  onEdit={(item) => {
                    setEditError(null)
                    setObjectToEdit(item)
                  }}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <footer className={styles.characterActions}>
        <div className={styles.characterActionsPrimary}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleAssignAssetsToShots}
            disabled={suggesting || assigning}
          >
            {assigning ? 'Assigning assets...' : 'Assign Assets to Shots'}
          </button>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={handleContinueToStudio}
            disabled={suggesting || assigning}
          >
            Do It Later
          </button>
        </div>
        {items.length > 0 && !hasAcceptedObjects ? (
          <p className={styles.characterContinueHint}>
            No objects accepted yet. You can continue, but prompts may be less detailed.
          </p>
        ) : null}
      </footer>

      <ObjectEditModal
        open={Boolean(objectToEdit)}
        object={objectToEdit}
        onClose={() => {
          if (savingEdit) return
          setObjectToEdit(null)
          setEditError(null)
        }}
        onSave={handleEditSave}
        saving={savingEdit}
        error={editError}
      />

      <ObjectDeleteModal
        open={Boolean(objectToDelete)}
        object={objectToDelete}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        deleting={Boolean(deletingObjectId)}
        error={deleteError}
      />
    </div>
  )
}
