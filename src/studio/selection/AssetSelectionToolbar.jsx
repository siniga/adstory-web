import {
  IconBrush,
  IconComment,
  IconDelete,
  IconEraser,
  IconSelect,
  IconSelectAssets,
  IconShape,
} from '../icons'
import styles from './AssetSelectionToolbar.module.css'

export const CANVAS_TOOLS = [
  { id: 'select', label: 'Select', icon: IconSelect },
  { id: 'selectAssets', label: 'Select Assets', icon: IconSelectAssets },
  { id: 'brush', label: 'Brush', icon: IconBrush },
  { id: 'eraser', label: 'Eraser', icon: IconEraser },
  { id: 'shape', label: 'Shape', icon: IconShape },
  { id: 'comment', label: 'Comment', icon: IconComment },
  { id: 'delete', label: 'Delete', icon: IconDelete },
]

export default function AssetSelectionToolbar({ activeTool, onToolChange }) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Image tools">
      {CANVAS_TOOLS.map((tool) => {
        const Icon = tool.icon
        const isActive = activeTool === tool.id
        return (
          <button
            key={tool.id}
            type="button"
            className={`${styles.toolBtn} ${isActive ? styles.toolBtnActive : ''}`}
            aria-label={tool.label}
            title={tool.label}
            aria-pressed={isActive}
            onClick={() => onToolChange(tool.id)}
          >
            <Icon />
          </button>
        )
      })}
    </div>
  )
}
