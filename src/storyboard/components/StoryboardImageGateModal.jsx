import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { mapAdstoryCharacter, mapAdstoryEnvironment, mapAdstoryShot } from '../../services/adstoryApi'
import {
  generateCharacterCostume,
  generateCharacterImage,
  generateEnvironmentImage,
  generateEnvironments,
  generateProjectShotImage,
  getProject,
} from '../../services/projectApi'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import { getCharacterImageUrl, getCostumeImageUrl, getEnvironmentImageUrl } from '../../utils/resolveMediaUrl'
import {
  CHARACTER_IMAGE_BATCH,
  characterHasCostume,
  charactersMissingCostumes,
  charactersMissingPortraits,
  environmentHasImage,
  environmentsMissingImages,
  groupShotsByScene,
  hasAnyShotImage,
  nextSceneNeedingImages,
  sceneKey,
  shotsForScene,
  shotHasImage,
} from '../storyboardImageGate'
import styles from './StoryboardImageGateModal.module.css'

function itemFromCharacter(character) {
  return {
    id: character.id,
    name: character.name || 'Character',
    status: 'pending',
    imageUrl: getCharacterImageUrl(character),
    error: null,
  }
}

function itemFromCostume(character) {
  return {
    id: `costume-${character.id}`,
    name: character.name || 'Character',
    status: characterHasCostume(character) ? 'done' : 'pending',
    imageUrl: getCostumeImageUrl(character) || getCharacterImageUrl(character),
    error: null,
  }
}

function itemFromEnvironment(environment) {
  return {
    id: environment.id,
    name: environment.name || 'Environment',
    status: environmentHasImage(environment) ? 'done' : 'pending',
    imageUrl: getEnvironmentImageUrl(environment),
    error: null,
  }
}

function itemFromShot(shot) {
  return {
    id: shot.id ?? shot.apiId,
    name: shot.title || `Shot ${shot.shot_number ?? ''}`.trim(),
    status: shotHasImage(shot) ? 'done' : 'pending',
    imageUrl: shot.image_url ?? shot.imageUrl ?? null,
    error: null,
  }
}

function sceneLabel(scene) {
  const number = scene?.scene_number != null ? `Scene ${scene.scene_number}` : 'Scene'
  return scene?.title ? `${number} — ${scene.title}` : number
}

export default function StoryboardImageGateModal({
  open,
  projectId,
  scenes = [],
  onCharacterUpdated,
  onEnvironmentUpdated,
  onShotUpdated,
  onClose,
}) {
  const [status, setStatus] = useState('loading')
  const [phase, setPhase] = useState('characters')
  const [liveMessage, setLiveMessage] = useState('Preparing…')
  const [items, setItems] = useState([])
  const [choice, setChoice] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const abortRef = useRef(false)
  const runIdRef = useRef(0)
  const charactersRef = useRef([])
  const environmentsRef = useRef([])
  const shotsBySceneRef = useRef({})
  const scenesRef = useRef(scenes)
  scenesRef.current = scenes

  useEffect(() => {
    if (!open || !projectId) {
      abortRef.current = true
      return undefined
    }

    abortRef.current = false
    const runId = runIdRef.current + 1
    runIdRef.current = runId

    setStatus('loading')
    setPhase('characters')
    setItems([])
    setChoice(null)
    setError(null)
    setProgress({ done: 0, total: 0 })
    setLiveMessage('Loading project…')

    ;(async () => {
      try {
        const project = await getProject(projectId)
        if (abortRef.current || runIdRef.current !== runId) return

        const liveCharacters = (project.characters ?? []).map((character, index) =>
          mapAdstoryCharacter(character, index)
        )
        const liveScenes = scenesRef.current.length ? scenesRef.current : project.scenes ?? []
        const liveShots = (project.shots ?? []).map((shot, index) =>
          mapAdstoryShot(shot, {
            sceneNumber: shot.scene_number,
            indexInScene: index,
          })
        )
        const grouped = groupShotsByScene(liveScenes, liveShots)
        charactersRef.current = liveCharacters
        environmentsRef.current = (project.environments ?? []).map((environment, index) =>
          mapAdstoryEnvironment(environment, index)
        )
        shotsBySceneRef.current = grouped

        const allShots = liveShots
        if (!allShots.length) {
          setStatus('failed')
          setError('Generate storyboard shots before creating images.')
          return
        }

        const missingPortraits = charactersMissingPortraits(liveCharacters)
        if (!hasAnyShotImage(allShots) && missingPortraits.length) {
          await runCharacterBatch(missingPortraits, runId)
          return
        }

        await runAfterPortraits(runId)
      } catch (err) {
        if (abortRef.current || runIdRef.current !== runId) return
        setStatus('failed')
        setError(
          formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to start image generation'
          ).message
        )
      }
    })()

    return () => {
      abortRef.current = true
    }
  }, [open, projectId])

  const patchItem = (id, patch) => {
    setItems((current) =>
      current.map((item) => (String(item.id) === String(id) ? { ...item, ...patch } : item))
    )
  }

  const runCharacterBatch = async (missing, runId) => {
    const batch = missing.slice(0, CHARACTER_IMAGE_BATCH)
    setPhase('characters')
    setStatus('running')
    setChoice(null)
    setItems(batch.map(itemFromCharacter))
    setProgress({ done: 0, total: batch.length })

    let done = 0
    for (const character of batch) {
      if (abortRef.current || runIdRef.current !== runId) return
      setLiveMessage(`Generating ${character.name}…`)
      patchItem(character.id, { status: 'running' })
      try {
        const result = await generateCharacterImage({
          project_id: projectId,
          character_id: character.id,
        })
        if (abortRef.current || runIdRef.current !== runId) return
        const updated = mapAdstoryCharacter(result.character ?? character)
        charactersRef.current = charactersRef.current.map((item) =>
          String(item.id) === String(updated.id) ? updated : item
        )
        onCharacterUpdated?.(updated)
        patchItem(character.id, {
          status: 'done',
          imageUrl: getCharacterImageUrl(updated),
          error: null,
        })
      } catch (err) {
        if (abortRef.current || runIdRef.current !== runId) return
        patchItem(character.id, {
          status: 'failed',
          error: formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to generate portrait'
          ).message,
        })
      }
      done += 1
      setProgress({ done, total: batch.length })
    }

    if (abortRef.current || runIdRef.current !== runId) return

    const stillMissing = charactersMissingPortraits(charactersRef.current)
    if (stillMissing.length) {
      setStatus('choice')
      setChoice({
        type: 'more_characters',
        remaining: stillMissing.length,
      })
      setLiveMessage('Character portraits ready so far.')
      return
    }

    await runAfterPortraits(runId)
  }

  const runAfterPortraits = async (runId) => {
    if (abortRef.current || runIdRef.current !== runId) return

    const missingCostumes = charactersMissingCostumes(charactersRef.current)
    if (missingCostumes.length) {
      await runCostumeBatch(missingCostumes, runId)
      return
    }

    await runAfterCostumes(runId)
  }

  const runCostumeBatch = async (missing, runId) => {
    setPhase('costumes')
    setStatus('running')
    setChoice(null)
    setItems(missing.map(itemFromCostume))
    setProgress({ done: 0, total: missing.length })

    let done = 0
    for (const character of missing) {
      if (abortRef.current || runIdRef.current !== runId) return
      setLiveMessage(`Costume sheet for ${character.name}…`)
      patchItem(`costume-${character.id}`, { status: 'running' })
      try {
        const result = await generateCharacterCostume({
          project_id: projectId,
          character_id: character.id,
          character,
        })
        if (abortRef.current || runIdRef.current !== runId) return
        const updated = mapAdstoryCharacter(result.character ?? character)
        charactersRef.current = charactersRef.current.map((item) =>
          String(item.id) === String(updated.id) ? updated : item
        )
        onCharacterUpdated?.(updated)
        patchItem(`costume-${character.id}`, {
          status: 'done',
          imageUrl: getCostumeImageUrl(updated) || getCharacterImageUrl(updated),
          error: null,
        })
      } catch (err) {
        if (abortRef.current || runIdRef.current !== runId) return
        patchItem(`costume-${character.id}`, {
          status: 'failed',
          error: formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to generate costume sheet'
          ).message,
        })
      }
      done += 1
      setProgress({ done, total: missing.length })
    }

    if (abortRef.current || runIdRef.current !== runId) return
    await runAfterCostumes(runId)
  }

  const runAfterCostumes = async (runId) => {
    if (abortRef.current || runIdRef.current !== runId) return

    if (!environmentsRef.current.length) {
      setPhase('environments')
      setStatus('running')
      setChoice(null)
      setItems([])
      setProgress({ done: 0, total: 0 })
      setLiveMessage('Extracting environments…')
      try {
        const result = await generateEnvironments({ project_id: projectId })
        environmentsRef.current = (result.environments ?? []).map((environment, index) =>
          mapAdstoryEnvironment(environment, index)
        )
        if (environmentsRef.current.length) {
          onEnvironmentUpdated?.(environmentsRef.current)
        }
      } catch (err) {
        if (abortRef.current || runIdRef.current !== runId) return
        setLiveMessage(
          formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to extract environments'
          ).message
        )
      }
    }

    if (abortRef.current || runIdRef.current !== runId) return

    const missingEnvironments = environmentsMissingImages(environmentsRef.current)
    if (missingEnvironments.length) {
      await runEnvironmentBatch(missingEnvironments, runId)
      return
    }

    await runNextScene(runId)
  }

  const runEnvironmentBatch = async (missing, runId) => {
    setPhase('environments')
    setStatus('running')
    setChoice(null)
    setItems(missing.map(itemFromEnvironment))
    setProgress({ done: 0, total: missing.length })

    let done = 0
    for (const environment of missing) {
      if (abortRef.current || runIdRef.current !== runId) return
      setLiveMessage(`Generating ${environment.name}…`)
      patchItem(environment.id, { status: 'running' })
      try {
        const result = await generateEnvironmentImage({
          project_id: projectId,
          environment_id: environment.id,
          environment,
        })
        if (abortRef.current || runIdRef.current !== runId) return
        const updated = mapAdstoryEnvironment(result.environment ?? environment)
        environmentsRef.current = environmentsRef.current.map((item) =>
          String(item.id) === String(updated.id) ? { ...item, ...updated } : item
        )
        onEnvironmentUpdated?.(updated)
        patchItem(environment.id, {
          status: 'done',
          imageUrl: getEnvironmentImageUrl(updated),
          error: null,
        })
      } catch (err) {
        if (abortRef.current || runIdRef.current !== runId) return
        patchItem(environment.id, {
          status: 'failed',
          error: formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to generate environment image'
          ).message,
        })
      }
      done += 1
      setProgress({ done, total: missing.length })
    }

    if (abortRef.current || runIdRef.current !== runId) return
    await runNextScene(runId)
  }

  const runNextScene = async (runId, { excludeSceneId } = {}) => {
    const scene = nextSceneNeedingImages(
      scenesRef.current,
      shotsBySceneRef.current,
      excludeSceneId
    )
    if (!scene) {
      setPhase('scenes')
      setStatus('done')
      setChoice(null)
      setLiveMessage(
        excludeSceneId
          ? 'Stopped here. Remaining shots in the skipped scene were left pending.'
          : 'Every scene already has images.'
      )
      return
    }

    const shots = shotsForScene(scene, shotsBySceneRef.current).filter((shot) => !shotHasImage(shot))
    setPhase('scenes')
    setStatus('running')
    setChoice(null)
    setItems(shots.map(itemFromShot))
    setProgress({ done: 0, total: shots.length })
    setLiveMessage(`Generating ${sceneLabel(scene)}…`)

    const currentSceneId = sceneKey(scene)
    let done = 0
    let failedCount = 0
    let lastError = null
    for (const shot of shots) {
      if (abortRef.current || runIdRef.current !== runId) return
      setLiveMessage(`Generating ${shot.title || `shot ${shot.shot_number}`}…`)
      patchItem(shot.id ?? shot.apiId, { status: 'running' })
      try {
        const result = await generateProjectShotImage(projectId, shot.id ?? shot.apiId)
        if (abortRef.current || runIdRef.current !== runId) return
        const updated = mapAdstoryShot(result.shot ?? shot, {
          sceneNumber: scene.scene_number,
          indexInScene: done,
        })
        const grouped = shotsBySceneRef.current
        const current = shotsForScene(scene, grouped).map((item) =>
          String(item.id ?? item.apiId) === String(updated.id ?? updated.apiId) ? updated : item
        )
        shotsBySceneRef.current = {
          ...grouped,
          [currentSceneId]: current,
          [String(currentSceneId)]: current,
        }
        onShotUpdated?.(updated, currentSceneId)
        patchItem(shot.id ?? shot.apiId, {
          status: 'done',
          imageUrl: updated.image_url ?? updated.imageUrl,
          error: null,
        })
      } catch (err) {
        if (abortRef.current || runIdRef.current !== runId) return
        const friendly = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to generate shot image'
        ).message
        lastError = friendly
        failedCount += 1
        patchItem(shot.id ?? shot.apiId, {
          status: 'failed',
          error: friendly,
        })
      }
      done += 1
      setProgress({ done, total: shots.length })
    }

    if (abortRef.current || runIdRef.current !== runId) return

    const laterScene = nextSceneNeedingImages(
      scenesRef.current,
      shotsBySceneRef.current,
      currentSceneId
    )

    if (failedCount > 0) {
      setStatus('choice')
      setChoice({
        type: 'retry_scene',
        scene,
        nextScene: laterScene,
        failedCount,
        total: shots.length,
        lastError,
      })
      setLiveMessage(
        failedCount === shots.length
          ? `${sceneLabel(scene)} failed.`
          : `${sceneLabel(scene)} finished with ${failedCount} failed shot${failedCount === 1 ? '' : 's'}.`
      )
      return
    }

    if (laterScene) {
      setStatus('choice')
      setChoice({
        type: 'next_scene',
        scene: laterScene,
      })
      setLiveMessage(`${sceneLabel(scene)} is ready.`)
      return
    }

    setStatus('done')
    setLiveMessage('All scene images are ready.')
  }

  const continueCharacters = () => {
    const missing = charactersMissingPortraits(charactersRef.current)
    if (!missing.length) {
      runAfterPortraits(runIdRef.current)
      return
    }
    runCharacterBatch(missing, runIdRef.current)
  }

  const continueToEnvironments = () => {
    runAfterPortraits(runIdRef.current)
  }

  const skipToScenes = () => {
    runNextScene(runIdRef.current)
  }

  const retryScene = () => {
    runNextScene(runIdRef.current)
  }

  const skipFailedScene = () => {
    const skipId = sceneKey(choice?.scene)
    runNextScene(runIdRef.current, { excludeSceneId: skipId })
  }

  if (!open) return null

  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  const title =
    phase === 'characters'
      ? 'Character portraits'
      : phase === 'costumes'
        ? 'Costume sheets'
        : phase === 'environments'
          ? 'Environments'
          : 'Scene images'
  const subtitle =
    phase === 'characters'
      ? 'Portraits are generated first so later stills keep the same faces.'
      : phase === 'costumes'
        ? 'Full-body sheets lock clothes and accessories for every shot.'
        : phase === 'environments'
          ? 'Location plates are generated for the library. Storyboard shots do not copy these rooms.'
          : 'One scene at a time. Each shot is a new frame; costume sheets keep outfits the same.'

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="image-gate-title">
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Generate images</p>
        <h2 id="image-gate-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.subtitle}>{subtitle}</p>

        {status === 'running' || progress.total ? (
          <div className={styles.meter} aria-hidden="true">
            <div className={styles.meterFill} style={{ width: `${percent}%` }} />
          </div>
        ) : null}
        <p className={styles.live}>{liveMessage}</p>

        {items.length ? (
          <div className={styles.grid}>
            {items.map((item) => (
              <article key={item.id} className={styles.card}>
                <div className={styles.frame}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className={styles.image} />
                  ) : item.status === 'failed' ? (
                    <span className={styles.failed}>{item.error || 'Failed'}</span>
                  ) : (
                    <span className={styles.placeholder}>
                      {item.status === 'running' ? 'Generating…' : 'Waiting'}
                    </span>
                  )}
                </div>
                <p className={styles.caption}>{item.name}</p>
              </article>
            ))}
          </div>
        ) : null}

        {status === 'failed' ? (
          <div className={styles.failBox}>
            <p className={styles.failTitle}>Could not continue</p>
            <p className={styles.failMessage}>{error}</p>
          </div>
        ) : null}

        {status === 'choice' && choice?.type === 'more_characters' ? (
          <div className={styles.choiceBox}>
            <p className={styles.choiceTitle}>Continue with more characters?</p>
            <p className={styles.choiceMessage}>
              {choice.remaining} character{choice.remaining === 1 ? '' : 's'} still need a
              portrait. You can generate the next {Math.min(choice.remaining, CHARACTER_IMAGE_BATCH)},
              or continue to costume sheets and scene images now.
            </p>
          </div>
        ) : null}

        {status === 'choice' && choice?.type === 'retry_scene' ? (
          <div className={styles.failBox}>
            <p className={styles.failTitle}>Retry {sceneLabel(choice.scene)}?</p>
            <p className={styles.failMessage}>
              {choice.failedCount} of {choice.total} shot{choice.total === 1 ? '' : 's'} failed
              {choice.lastError ? `: ${choice.lastError}` : '.'} You can try again
              {choice.nextScene ? `, skip to ${sceneLabel(choice.nextScene)}` : ''}, or close.
            </p>
          </div>
        ) : null}

        {status === 'choice' && choice?.type === 'next_scene' ? (
          <div className={styles.choiceBox}>
            <p className={styles.choiceTitle}>Generate {sceneLabel(choice.scene)}?</p>
            <p className={styles.choiceMessage}>
              The next scene still needs shot images. Each still is a new frame; costume sheets keep clothes and accessories the same.
            </p>
          </div>
        ) : null}

        {status === 'done' ? (
          <div className={styles.doneBox}>
            <p className={styles.choiceTitle}>Done for now</p>
            <p className={styles.choiceMessage}>{liveMessage}</p>
          </div>
        ) : null}

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>
            {status === 'running' ? 'Stop' : 'Close'}
          </button>
          {status === 'choice' && choice?.type === 'more_characters' ? (
            <>
              <button type="button" className={styles.secondaryBtn} onClick={continueToEnvironments}>
                Continue to environments
              </button>
              <button type="button" className={styles.primaryBtn} onClick={continueCharacters}>
                Continue with more characters
              </button>
            </>
          ) : null}
          {status === 'choice' && choice?.type === 'retry_scene' ? (
            <>
              {choice.nextScene ? (
                <button type="button" className={styles.secondaryBtn} onClick={skipFailedScene}>
                  Skip to {sceneLabel(choice.nextScene)}
                </button>
              ) : null}
              <button type="button" className={styles.primaryBtn} onClick={retryScene}>
                Retry {sceneLabel(choice.scene)}
              </button>
            </>
          ) : null}
          {status === 'choice' && choice?.type === 'next_scene' ? (
            <button type="button" className={styles.primaryBtn} onClick={skipToScenes}>
              Generate {sceneLabel(choice.scene)}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  )
}
