import { useMemo, useState } from 'react'
import { findCharacterById } from '../characters/characterData'
import { findEnvironmentById } from '../environments/environmentData'
import { getShotAssignment } from '../inspector/shotAssignments'
import { findObjectById } from '../objects/objectData'
import { getAssetTypeLabel } from '../selection/selectableRegionsData'
import AIEditPromptInput from './AIEditPromptInput'
import AIPreviewCard from './AIPreviewCard'
import GenerationSettingsPanel from './GenerationSettingsPanel'
import QuickActionChips from './QuickActionChips'
import RecentPromptsPanel from './RecentPromptsPanel'
import ReferencedAssetsPanel from './ReferencedAssetsPanel'
import TargetSelectionPanel from './TargetSelectionPanel'
import { QUICK_ACTION_PROMPTS } from './aiEditData'
import styles from './AIEditPanel.module.css'

export default function AIEditPanel({ shotId, shotAssignments, selectedRegion }) {
  const [prompt, setPrompt] = useState('')
  const [target, setTarget] = useState('currentShot')
  const [creativity, setCreativity] = useState('Medium')
  const [consistency, setConsistency] = useState('Balanced')

  const assignment = getShotAssignment(shotAssignments, shotId)

  const referenced = useMemo(() => {
    const characters = assignment.characterIds
      .map((id) => findCharacterById(id)?.name)
      .filter(Boolean)
    const environment = assignment.environmentId
      ? findEnvironmentById(assignment.environmentId)?.name
      : null
    const objects = assignment.objectIds
      .map((id) => findObjectById(id)?.name)
      .filter(Boolean)

    const selectedAssetLabel = selectedRegion
      ? `${getAssetTypeLabel(selectedRegion.type)}: ${selectedRegion.name}`
      : null

    return { characters, environment, objects, selectedAssetLabel }
  }, [assignment, selectedRegion])

  const handleQuickAction = (action) => {
    const nextPrompt = QUICK_ACTION_PROMPTS[action] ?? action
    setPrompt(nextPrompt)
  }

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <h3 className={styles.title}>AI Editor</h3>
        <p className={styles.subtitle}>Describe what should change in this shot.</p>
      </header>

      <AIEditPromptInput value={prompt} onChange={setPrompt} />
      <QuickActionChips onSelect={handleQuickAction} />
      <TargetSelectionPanel value={target} onChange={setTarget} />
      <ReferencedAssetsPanel
        characters={referenced.characters}
        environment={referenced.environment}
        objects={referenced.objects}
        selectedAssetLabel={referenced.selectedAssetLabel}
      />
      <AIPreviewCard />
      <GenerationSettingsPanel
        creativity={creativity}
        consistency={consistency}
        onCreativityChange={setCreativity}
        onConsistencyChange={setConsistency}
      />
      <RecentPromptsPanel onSelect={setPrompt} />

      <div className={styles.actions}>
        <button type="button" className={styles.actionSecondary}>
          Preview Changes
        </button>
        <button type="button" className={styles.actionSecondary}>
          Generate Variations
        </button>
        <button type="button" className={styles.actionPrimary}>
          Apply Edit
        </button>
      </div>
    </div>
  )
}
