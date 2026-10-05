import type { ComfortRating, JobSkill } from '../../shared/types'

export const NO_STUDY_PRIORITY = 0
export const DEFAULT_SKILL_PRIORITY = 1

export const comfortRatings: ReadonlyArray<{ value: ComfortRating; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'no-study-needed', label: 'No study needed' },
]

const comfortRatingPriorities: Record<ComfortRating, number> = {
  low: DEFAULT_SKILL_PRIORITY,
  medium: 2,
  high: 3,
  'no-study-needed': NO_STUDY_PRIORITY,
}

export function isComfortRating(value: string): value is ComfortRating {
  return comfortRatings.some((rating) => rating.value === value)
}

export function getComfortRating(skill: Pick<JobSkill, 'comfortRating' | 'needsNoStudy' | 'priority'>): ComfortRating {
  if (skill.needsNoStudy || skill.priority === NO_STUDY_PRIORITY) return 'no-study-needed'
  if (skill.comfortRating && isComfortRating(skill.comfortRating)) return skill.comfortRating
  return 'low'
}

export function getComfortRatingPriority(rating: ComfortRating): number {
  return comfortRatingPriorities[rating]
}

export function withComfortRating(skill: JobSkill, comfortRating: ComfortRating): JobSkill {
  const needsNoStudy = comfortRating === 'no-study-needed'
  return {
    ...skill,
    comfortRating,
    needsNoStudy,
    priority: getComfortRatingPriority(comfortRating),
  }
}

export function getSkillPriority(skill: Pick<JobSkill, 'comfortRating' | 'needsNoStudy' | 'priority'>): number {
  return skill.needsNoStudy || skill.priority === NO_STUDY_PRIORITY
    ? NO_STUDY_PRIORITY
    : getComfortRatingPriority(getComfortRating(skill))
}
