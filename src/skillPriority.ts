import type { ComfortRating, JobSkill } from './types'

export const NO_STUDY_PRIORITY = 0
export const DEFAULT_SKILL_PRIORITY = 1

export const comfortRatings: ReadonlyArray<{ value: ComfortRating; label: string }> = [
  { value: 'dont-need-to-study', label: "Don't need to study" },
  { value: 'very-comfortable', label: 'Very comfortable' },
  { value: 'somewhat-comfortable', label: 'Somewhat comfortable' },
  { value: 'need-practice', label: 'Need more practice' },
  { value: 'dont-know-at-all', label: "Don't know at all" },
]

const comfortRatingPriorities: Record<ComfortRating, number> = {
  'dont-need-to-study': NO_STUDY_PRIORITY,
  'very-comfortable': 4,
  'somewhat-comfortable': 3,
  'need-practice': 2,
  'dont-know-at-all': 1,
}

export function isComfortRating(value: string): value is ComfortRating {
  return comfortRatings.some((rating) => rating.value === value)
}

export function getComfortRating(skill: Pick<JobSkill, 'comfortRating' | 'needsNoStudy' | 'priority'>): ComfortRating | '' {
  if (skill.needsNoStudy || skill.priority === NO_STUDY_PRIORITY) return 'dont-need-to-study'
  if (skill.comfortRating && isComfortRating(skill.comfortRating)) return skill.comfortRating
  return ''
}

export function getComfortRatingPriority(rating: ComfortRating): number {
  return comfortRatingPriorities[rating]
}

export function withComfortRating(skill: JobSkill, comfortRating: ComfortRating): JobSkill {
  const needsNoStudy = comfortRating === 'dont-need-to-study'
  return {
    ...skill,
    comfortRating,
    needsNoStudy,
    priority: getComfortRatingPriority(comfortRating),
  }
}

export function withNoStudyStatus(skill: JobSkill, needsNoStudy: boolean): JobSkill {
  const comfortRating = !needsNoStudy && skill.comfortRating === 'dont-need-to-study'
    ? undefined
    : skill.comfortRating
  return {
    ...skill,
    comfortRating,
    needsNoStudy,
    priority: needsNoStudy
      ? NO_STUDY_PRIORITY
      : comfortRating ? getComfortRatingPriority(comfortRating) : DEFAULT_SKILL_PRIORITY,
  }
}

export function getSkillPriority(skill: Pick<JobSkill, 'comfortRating' | 'needsNoStudy' | 'priority'>): number {
  const comfortRating = getComfortRating(skill)
  if (comfortRating === 'dont-need-to-study') return NO_STUDY_PRIORITY
  if (comfortRating) return getComfortRatingPriority(comfortRating)
  if (typeof skill.priority === 'number' && Number.isFinite(skill.priority) && skill.priority >= NO_STUDY_PRIORITY) {
    return skill.priority
  }
  return skill.needsNoStudy ? NO_STUDY_PRIORITY : DEFAULT_SKILL_PRIORITY
}
