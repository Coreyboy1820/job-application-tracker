import { describe, expect, it } from 'vitest'
import { addCachedQuestions, normalizeSkillKey, uniqueSkillsMissingQuestions, validQuestionSet } from '../supabase/functions/analyze-job-posting/skill-questions'

describe('skill interview question cache', () => {
  it('normalizes skill names so duplicates share one cache entry', () => {
    expect(normalizeSkillKey('  ＴｙｐｅScript   ')).toBe('typescript')
    expect(uniqueSkillsMissingQuestions(
      [{ name: 'TypeScript' }, { name: ' typescript ' }, { name: 'React' }],
      new Map([['typescript', ['Question 1', 'Question 2', 'Question 3']]]),
    )).toEqual([{ skillKey: 'react', name: 'React' }])
  })

  it('attaches the same cached questions to repeated skills', () => {
    const questions = ['Question 1', 'Question 2', 'Question 3']
    const skills = [{ name: 'TypeScript', evidence: 'First job.' }, { name: ' typescript ', evidence: 'Second job.' }]

    expect(addCachedQuestions(skills, new Map([['typescript', questions]]))).toEqual([
      { ...skills[0], interviewQuestions: questions },
      { ...skills[1], interviewQuestions: questions },
    ])
  })

  it('accepts only three non-empty interview questions', () => {
    expect(validQuestionSet([' One ', 'Two', 'Three'])).toEqual(['One', 'Two', 'Three'])
    expect(validQuestionSet(['Only two', 'questions'])).toBeNull()
    expect(validQuestionSet(['One', '', 'Three'])).toBeNull()
  })
})
