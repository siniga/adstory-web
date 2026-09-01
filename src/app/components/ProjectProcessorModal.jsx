import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  countProcessorUnits,
  EXTRA_PHASES,
  getProcessorDisplayPhases,
  nextProcessorStage,
  reviewLandingStep,
  startCreateEpisodeGeneration,
  startCreateStageGeneration,
  startCreateWritingGeneration,
} from './projectProcessor'
import styles from './ProjectProcessorModal.module.css'

const CHOICE_COPY = {
  screenplay: {
    subtitle: 'Review the screenplay, or continue and break it into sequences.',
    message: 'You can open the screenplay and edit it, or continue and generate sequences now.',
    review: 'Review screenplay',
    continue: 'Continue with sequences',
  },
  scenes: {
    subtitle: 'Review the sequences, or continue and extract characters.',
    message: 'You can open the sequence board and edit it, or continue and extract the cast now.',
    review: 'Review sequences',
    continue: 'Continue with characters',
  },
  characters: {
    subtitle: 'Review the characters, or continue and extract environments.',
    message: 'You can open the cast and edit it, or continue and extract locations now.',
    review: 'Review characters',
    continue: 'Continue with environments',
  },
  environments: {
    subtitle: 'Review the environments, or continue and build the storyboard.',
    message: 'You can open the locations and edit them, or continue and create storyboard shots now. Images are not generated yet.',
    review: 'Review environments',
    continue: 'Continue with storyboard',
  },
}

export default function ProjectProcessorModal({
  open,
  projectId,
  projectName,
  startWith = 'story',
  style,
  story = '',
  screenplay = '',
  onComplete,
  onDismiss,
}) {
  const [through, setThrough] = useState(null)
  const phases = useMemo(
    () => getProcessorDisplayPhases(startWith, { through }),
    [startWith, through]
  )
  const totalUnits = useMemo(() => countProcessorUnits(phases), [phases])

  const [phaseIndex, setPhaseIndex] = useState(0)
  const [completedUnits, setCompletedUnits] = useState(0)
  const [intraProgress, setIntraProgress] = useState(0)
  const [status, setStatus] = useState('running')
  const [liveMessage, setLiveMessage] = useState('Preparing…')
  const [error, setError] = useState(null)
  const [failedPhase, setFailedPhase] = useState(null)
  const [choiceAfter, setChoiceAfter] = useState(null)
  const [writeAttempt, setWriteAttempt] = useState(0)
  const [stageAttempts, setStageAttempts] = useState({
    scenes: 0,
    characters: 0,
    environments: 0,
    shots: 0,
  })
  const [episodeAttempt, setEpisodeAttempt] = useState(0)
  const [estimatedEpisodes, setEstimatedEpisodes] = useState(2)
  const dividingEpisodes = episodeAttempt > 0

  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const applyProgress = (progress) => {
    setStatus(progress.status)
    setPhaseIndex(progress.phaseIndex ?? 0)
    setCompletedUnits(progress.completedUnits ?? 0)
    setIntraProgress(progress.intraProgress ?? 0)
    setLiveMessage(progress.liveMessage ?? 'Preparing…')
    setError(progress.error ?? null)
    setFailedPhase(progress.failedPhase ?? null)
    if (progress.choiceAfter) {
      setChoiceAfter(progress.choiceAfter)
    }
    if (progress.estimatedEpisodes) {
      setEstimatedEpisodes(progress.estimatedEpisodes)
    }
  }

  const percent =
    status === 'complete'
      ? 100
      : totalUnits <= 0
        ? 0
        : Math.min(99, Math.round(((completedUnits + intraProgress) / totalUnits) * 100))

  useEffect(() => {
    if (!open) return undefined
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setThrough(null)
      setFailedPhase(null)
      setChoiceAfter(null)
      setStatus('running')
      setEpisodeAttempt(0)
      setStageAttempts({
        scenes: 0,
        characters: 0,
        environments: 0,
        shots: 0,
      })
    }
  }, [open])

  useEffect(() => {
    if (!open || !projectId || through || dividingEpisodes) return undefined

    startCreateWritingGeneration(
      { projectId, attempt: writeAttempt, startWith, style, story, screenplay },
      { onProgress: applyProgress }
    )

    return undefined
  }, [dividingEpisodes, open, projectId, screenplay, startWith, story, style, through, writeAttempt])

  useEffect(() => {
    if (!open || !projectId || !dividingEpisodes || through) return undefined

    startCreateEpisodeGeneration(
      { projectId, attempt: episodeAttempt, startWith, style },
      { onProgress: applyProgress }
    )

    return undefined
  }, [dividingEpisodes, episodeAttempt, open, projectId, startWith, style, through])

  useEffect(() => {
    if (!open || !projectId || !through) return undefined
    const attempt = stageAttempts[through] ?? 0
    if (attempt < 1) return undefined

    startCreateStageGeneration(
      { projectId, stage: through, attempt, startWith, style },
      {
        onProgress: applyProgress,
        onComplete(result) {
          onCompleteRef.current?.(result)
        },
      }
    )

    return undefined
  }, [open, projectId, stageAttempts, startWith, style, through])

  if (!open) return null

  const choice = CHOICE_COPY[choiceAfter] ?? CHOICE_COPY.screenplay
  const runningPhase = through ? EXTRA_PHASES[through] : null

  const subtitle =
    status === 'failed'
      ? 'Generation stopped. You can try again or open the project later.'
      : status === 'episodes-required'
        ? 'This story is too long to write as one screenplay.'
        : status === 'choice'
          ? choice.subtitle
          : dividingEpisodes
            ? 'Dividing your story into episodes, then writing episode 1.'
            : runningPhase
              ? runningPhase.message
              : 'Saving your story, then writing the screenplay.'

  const handleReview = () => {
    onCompleteRef.current?.({ landingStep: reviewLandingStep(choiceAfter ?? 'screenplay') })
  }

  const handleContinue = () => {
    const next = nextProcessorStage(choiceAfter ?? 'screenplay')
    if (!next) {
      onCompleteRef.current?.({ landingStep: 'storyboard' })
      return
    }
    setThrough(next)
    setChoiceAfter(null)
    setStatus('running')
    setLiveMessage(EXTRA_PHASES[next]?.message ?? 'Continuing…')
    setStageAttempts((current) => ({
      ...current,
      [next]: (current[next] ?? 0) + 1,
    }))
  }

  const handleDivideEpisodes = () => {
    setStatus('running')
    setLiveMessage('Dividing your story into episodes…')
    setEpisodeAttempt((current) => current + 1)
  }

  const handleRetry = () => {
    if (failedPhase && EXTRA_PHASES[failedPhase]) {
      setThrough(failedPhase)
      setStageAttempts((current) => ({
        ...current,
        [failedPhase]: (current[failedPhase] ?? 0) + 1,
      }))
      return
    }
    if (failedPhase === 'episodes' || dividingEpisodes) {
      setEpisodeAttempt((current) => current + 1)
      return
    }
    setWriteAttempt((current) => current + 1)
  }

  return createPortal(
    <div className={styles.overlay} role="presentation">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-processor-title"
        aria-describedby="project-processor-live"
      >
        <p className={styles.eyebrow}>Project processor</p>
        <h2 id="project-processor-title" className={styles.title}>
          Building {projectName || 'your project'}
        </h2>
        <p className={styles.subtitle}>{subtitle}</p>

        <div className={styles.meter} aria-hidden="true">
          <div className={styles.meterFill} style={{ width: `${percent}%` }} />
        </div>
        <div className={styles.meterMeta}>
          <p id="project-processor-live" className={styles.live} aria-live="polite">
            {liveMessage}
          </p>
          <span className={styles.percent}>{percent}%</span>
        </div>

        <ol className={styles.phases}>
          {phases.map((phase, index) => {
            const isDone =
              status === 'complete' ||
              (status === 'choice' && index <= phaseIndex) ||
              (status === 'episodes-required' && index < phaseIndex) ||
              (status !== 'choice' &&
                status !== 'episodes-required' &&
                status !== 'complete' &&
                index < phaseIndex) ||
              (status === 'failed' && index < phaseIndex)
            const isCurrent =
              status !== 'complete' &&
              status !== 'choice' &&
              index === phaseIndex
            const isFailed = status === 'failed' && index === phaseIndex

            return (
              <li
                key={phase.id}
                className={`${styles.phase} ${isDone ? styles.phaseDone : ''} ${
                  isCurrent ? styles.phaseCurrent : ''
                } ${isFailed ? styles.phaseFailed : ''}`}
              >
                <span className={styles.phaseMark} aria-hidden="true">
                  {isDone ? '✓' : isFailed ? '!' : isCurrent ? '●' : ''}
                </span>
                <span className={styles.phaseTitle}>{phase.title}</span>
              </li>
            )
          })}
        </ol>

        {status === 'episodes-required' ? (
          <div className={styles.choiceBox}>
            <p className={styles.choiceTitle}>Your story is too big</p>
            <p className={styles.choiceMessage}>
              We need to divide it into {estimatedEpisodes} episodes so each screenplay stays
              short enough to generate reliably. Episode 1 will be written first. You can review
              it, then continue to sequences or generate the next episode later.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => onDismiss?.()}>
                Close
              </button>
              <button type="button" className={styles.primaryBtn} onClick={handleDivideEpisodes}>
                Divide into episodes
              </button>
            </div>
          </div>
        ) : null}

        {status === 'choice' ? (
          <div className={styles.choiceBox}>
            <p className={styles.choiceTitle}>What do you want to do next?</p>
            <p className={styles.choiceMessage}>{choice.message}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryBtn} onClick={handleReview}>
                {choice.review}
              </button>
              <button type="button" className={styles.primaryBtn} onClick={handleContinue}>
                {choice.continue}
              </button>
            </div>
          </div>
        ) : null}

        {status === 'failed' ? (
          <div className={styles.failBox}>
            <p className={styles.failTitle}>{error?.title ?? 'Generation failed'}</p>
            <p className={styles.failMessage}>{error?.message ?? 'Please try again.'}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => onDismiss?.()}>
                Close
              </button>
              <button type="button" className={styles.primaryBtn} onClick={handleRetry}>
                Try again
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}
