import { describe, expect, it } from 'vitest'
import { getInterviewTypeGroup } from '../../features/interviews/interviewTypes'

describe('getInterviewTypeGroup', () => {
  it('matches predefined types case-insensitively without rewriting saved strings', () => {
    expect(getInterviewTypeGroup(' technical ')).toBe('Technical')
    expect(getInterviewTypeGroup('Phone screen')).toBe('Phone screen')
  })
  it('groups custom and missing legacy types', () => {
    expect(getInterviewTypeGroup('Portfolio review')).toBe('Other')
    expect(getInterviewTypeGroup('Other')).toBe('Other')
    expect(getInterviewTypeGroup()).toBe('Not specified')
    expect(getInterviewTypeGroup(' ')).toBe('Not specified')
  })
})
