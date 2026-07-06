import { findCharacterById } from '../characters/characterData'
import { findEnvironmentById } from '../environments/environmentData'
import { findObjectById } from '../objects/objectData'
import { getShotContext } from './applyScopeData'

function baseConfig(partial, shotId) {
  const context = getShotContext(shotId)
  return {
    initialScope: 'currentShot',
    currentShotId: context.shotId,
    sceneId: context.sceneId,
    sceneTitle: context.sceneTitle,
    ...partial,
  }
}

export function buildCharacterApplyConfig(character, editorState, shotId) {
  const previousShirt = character.wardrobe?.shirt ?? 'Blue'
  return baseConfig(
    {
      assetName: character.name,
      changeSummary: `Shirt changed from ${previousShirt} to ${editorState.shirt}`,
      changeType: 'Character Update',
    },
    shotId
  )
}

export function buildEnvironmentApplyConfig(environment, editorState, shotId) {
  return baseConfig(
    {
      assetName: environment.name,
      changeSummary: `${editorState.location} · ${editorState.timeOfDay} · ${editorState.weather}`,
      changeType: 'Environment Update',
    },
    shotId
  )
}

export function buildObjectApplyConfig(object, editorState, shotId) {
  return baseConfig(
    {
      assetName: object.name,
      changeSummary: `${editorState.material} · ${editorState.condition} · ${editorState.scale} scale`,
      changeType: 'Object Update',
    },
    shotId
  )
}

export function buildPresetApplyConfig(shot, fieldKey, fieldLabel, newValue, shotId) {
  const previous = shot.presets?.[fieldKey] ?? shot[fieldKey] ?? '—'
  return baseConfig(
    {
      assetName: `Shot ${shot.id}`,
      changeSummary: `${fieldLabel} changed from ${previous} to ${newValue}`,
      changeType: 'Shot Preset Update',
    },
    shotId
  )
}

export function buildInspectorAssignConfig(type, shotId, assetId) {
  const context = getShotContext(shotId)
  if (type === 'character') {
    const character = findCharacterById(assetId)
    return baseConfig(
      {
        assetName: character?.name ?? 'Character',
        changeSummary: `Assigned ${character?.name ?? 'character'} to Shot ${context.shotId}`,
        changeType: 'Character Assignment',
      },
      shotId
    )
  }
  if (type === 'environment') {
    const environment = findEnvironmentById(assetId)
    return baseConfig(
      {
        assetName: environment?.name ?? 'Environment',
        changeSummary: `Assigned ${environment?.name ?? 'environment'} to Shot ${context.shotId}`,
        changeType: 'Environment Assignment',
      },
      shotId
    )
  }
  const object = findObjectById(assetId)
  return baseConfig(
    {
      assetName: object?.name ?? 'Object',
      changeSummary: `Added ${object?.name ?? 'object'} to Shot ${context.shotId}`,
      changeType: 'Object Assignment',
    },
    shotId
  )
}
