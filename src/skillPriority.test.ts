import { describe, expect, it } from 'vitest'
import { getComfortRating, getSkillPriority, withComfortRating, withNoStudyStatus } from './skillPriority'
import type { JobSkill } from './types'

const skill: JobSkill = {
  name: 'TypeScript',
  category: 'technical',
  importance: 'required',
  evidence: 'Use TypeScript.',
}

describe('skill comfort ratings', () => {
  it('maps ordered comfort ratings into study priority from least to most comfortable', () => {
    expect(getSkillPriority(withComfortRating(skill, 'dont-know-at-all'))).toBe(1)
    expect(getSkillPriority(withComfortRating(skill, 'need-practice'))).toBe(2)
    expect(getSkillPriority(withComfortRating(skill, 'somewhat-comfortable'))).toBe(3)
    expect(getSkillPriority(withComfortRating(skill, 'very-comfortable'))).toBe(4)
    expect(getSkillPriority(withComfortRating(skill, 'dont-need-to-study'))).toBe(0)
  })

  it('uses the no-study endpoint as priority zero and clears an un-rated flag', () => {
    const noStudySkill = withNoStudyStatus(skill, true)
    expect(noStudySkill.needsNoStudy).toBe(true)
    expect(getComfortRating(noStudySkill)).toBe('dont-need-to-study')
    expect(getSkillPriority(noStudySkill)).toBe(0)

    const activeSkill = withNoStudyStatus(noStudySkill, false)
    expect(activeSkill.needsNoStudy).toBe(false)
    expect(activeSkill.comfortRating).toBeUndefined()
    expect(getComfortRating(activeSkill)).toBe('')
    expect(getSkillPriority(activeSkill)).toBe(1)
  })

  it('keeps the no-study comfort rating independently flagged', () => {
    const noStudySkill = withComfortRating(skill, 'dont-need-to-study')
    expect(noStudySkill.needsNoStudy).toBe(true)
    expect(noStudySkill.comfortRating).toBe('dont-need-to-study')
  })

  it('restores the rated priority when an independent no-study flag is cleared', () => {
    const ratedSkill = withComfortRating(skill, 'need-practice')
    const flaggedSkill = withNoStudyStatus(ratedSkill, true)

    expect(getSkillPriority(flaggedSkill)).toBe(0)
    expect(withNoStudyStatus(flaggedSkill, false)).toMatchObject({
      comfortRating: 'need-practice',
      needsNoStudy: false,
      priority: 2,
    })
  })

  it('continues to read legacy numeric priorities for unrated skills', () => {
    expect(getSkillPriority({ ...skill, priority: 3 })).toBe(3)
    expect(getSkillPriority({ ...skill, needsNoStudy: true })).toBe(0)
  })
})
