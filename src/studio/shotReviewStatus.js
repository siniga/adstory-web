export const SHOT_REVIEW_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  NEEDS_REVISION: 'needs_revision',
}

const REVIEW_STATUS_ALIASES = {
  draft: SHOT_REVIEW_STATUS.DRAFT,
  approved: SHOT_REVIEW_STATUS.APPROVED,
  approve: SHOT_REVIEW_STATUS.APPROVED,
  needs_revision: SHOT_REVIEW_STATUS.NEEDS_REVISION,
  needs_work: SHOT_REVIEW_STATUS.NEEDS_REVISION,
  needswork: SHOT_REVIEW_STATUS.NEEDS_REVISION,
  revision: SHOT_REVIEW_STATUS.NEEDS_REVISION,
}

export function normalizeShotReviewStatus(value) {
  if (value == null || value === '') {
    return SHOT_REVIEW_STATUS.DRAFT
  }

  const normalized = String(value).trim().toLowerCase()
  return REVIEW_STATUS_ALIASES[normalized] ?? SHOT_REVIEW_STATUS.DRAFT
}

export function getShotReviewBadgeLabel(status) {
  switch (normalizeShotReviewStatus(status)) {
    case SHOT_REVIEW_STATUS.APPROVED:
      return 'Approved'
    case SHOT_REVIEW_STATUS.NEEDS_REVISION:
      return 'Needs Work'
    default:
      return 'Draft'
  }
}
