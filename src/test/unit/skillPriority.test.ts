import { describe, expect, it } from 'vitest'
import { getComfortRating, getSkillPriority, withComfortRating } from '../../features/skills/skillPriority'
import type { JobSkill } from '../../shared/types'

const skill: JobSkill = {
  name: 'TypeScript',
  category: 'technical',
  importance: 'required',
  evidence: 'Use TypeScript.',
}

describe('skill comfort ratings', () => {
  it('maps ordered comfort ratings into study priority from least to most comfortable', () => {
    expect(getSkillPriority(withComfortRating(skill, 'low'))).toBe(1)
    expect(getSkillPriority(withComfortRating(skill, 'medium'))).toBe(2)
    expect(getSkillPriority(withComfortRating(skill, 'high'))).toBe(3)
    expect(getSkillPriority(withComfortRating(skill, 'no-study-needed'))).toBe(0)
  })

  it('uses No study needed as priority zero and clears legacy no-study flags with a new rating', () => {
    const noStudySkill = withComfortRating(skill, 'no-study-needed')
    expect(noStudySkill.needsNoStudy).toBe(true)
    expect(getComfortRating(noStudySkill)).toBe('no-study-needed')
    expect(getSkillPriority(noStudySkill)).toBe(0)

    const activeSkill = withComfortRating(noStudySkill, 'high')
    expect(activeSkill.needsNoStudy).toBe(false)
    expect(getComfortRating(activeSkill)).toBe('high')
    expect(getSkillPriority(activeSkill)).toBe(3)
  })

  it('shows legacy no-study flags as the No study needed selection', () => {
    expect(getComfortRating({ ...skill, comfortRating: 'low', needsNoStudy: true, priority: 0 }))
      .toBe('no-study-needed')
    expect(getSkillPriority({ ...skill, comfortRating: 'low', needsNoStudy: true, priority: 0 })).toBe(0)
  })

  it('defaults unrated skills to Low while preserving legacy no-study flags', () => {
    expect(getComfortRating(skill)).toBe('low')
    expect(getSkillPriority({ ...skill, priority: 3 })).toBe(1)
    expect(getSkillPriority({ ...skill, needsNoStudy: true })).toBe(0)
  })
})
