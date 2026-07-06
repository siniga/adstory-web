export function getShotEditForm(shot) {
  const durationMatch = String(shot?.duration ?? '').match(/([\d.]+)/)

  return {
    title: shot?.label ?? '',
    description: shot?.notes ?? shot?.description ?? '',
    shotSize: shot?.presets?.shotSize ?? '',
    camera: shot?.presets?.camera ?? '',
    composition: shot?.presets?.composition ?? '',
    lighting: shot?.lighting ?? shot?.presets?.lighting ?? '',
    durationSeconds: durationMatch ? String(Math.round(Number(durationMatch[1]))) : '3',
  }
}

export function buildShotUpdatePayload(form) {
  const duration = Number.parseInt(form.durationSeconds, 10)

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    shot_size: form.shotSize,
    camera: form.camera,
    composition: form.composition,
    lighting: form.lighting,
    duration_seconds: Number.isFinite(duration) ? duration : 3,
  }
}
