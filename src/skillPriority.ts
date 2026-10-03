import type { JobSkill } from './types'

export const NO_STUDY_PRIORITY = 0
export const DEFAULT_SKILL_PRIORITY = 1

export function getSkillPriority(skill: Pick<JobSkill, 'needsNoStudy' | 'priority'>): number {
  if (typeof skill.priority === 'number' && Number.isFinite(skill.priority) && skill.priority >= NO_STUDY_PRIORITY) {
    return skill.priority
  }
  return skill.needsNoStudy ? NO_STUDY_PRIORITY : DEFAULT_SKILL_PRIORITY
}
