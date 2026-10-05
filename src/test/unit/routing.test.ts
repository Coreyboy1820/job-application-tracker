import { describe, expect, it } from 'vitest'
import { applicationSkillsHash, pageHash, readRoute } from '../../app/routing'

describe('application routes', () => {
  it.each([
    ['#/applications', 'applications'],
    ['#/interviews', 'interviews'],
    ['#/skills', 'skills'],
    ['', 'applications'],
    ['#/unknown', 'applications'],
  ])('opens %s as %s', (hash, page) => {
    expect(readRoute(hash)).toEqual({ page, company: null, applicationId: null })
  })

  it('round trips application filters containing URL special characters', () => {
    const applicationId = 'application/one + two'
    expect(readRoute(applicationSkillsHash(applicationId))).toEqual({ page: 'skills', company: null, applicationId })
  })

  it('round trips company names containing URL special characters', () => {
    const company = 'A&B / Consulting'
    expect(readRoute(pageHash('company-questions', company))).toEqual({ page: 'company-questions', company, applicationId: null })
  })

  it.each(['#/skills/application/%E0%A4%A', '#/skills/company/%E0%A4%A'])('handles malformed encoding in %s', (hash) => {
    expect(readRoute(hash)).toEqual({ page: 'skills', company: null, applicationId: null })
  })

  it.each(['#/skills/application/%20', '#/skills/company/%20'])('ignores empty filters in %s', (hash) => {
    expect(readRoute(hash)).toEqual({ page: 'applications', company: null, applicationId: null })
  })
})
