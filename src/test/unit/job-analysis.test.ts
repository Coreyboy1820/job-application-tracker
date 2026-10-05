import { describe, expect, it, vi } from 'vitest'
import { analyzeApplication, type ApplicationForAnalysis } from '../../../supabase/functions/analyze-job-posting/analysis'
import { normalizeExtractedSkills, type ExtractedSkill } from '../../../supabase/functions/analyze-job-posting/skill-extraction'

const description = 'Debugging tools such as GDB, JTAG, and serial debuggers are required.'
const atomicSkills: ExtractedSkill[] = ['GDB', 'JTAG', 'serial debugging'].map((name) => ({
  name, category: 'tools', importance: 'required', evidence: description,
}))

function fixture(overrides: Partial<ApplicationForAnalysis> = {}) {
  const application: ApplicationForAnalysis = {
    id: 'job-one', company: 'Example', role: 'Engineer', url: 'https://example.com/job',
    skills_source_url: 'https://example.com/job', skills_analyzed_at: 'old-date',
    interview_questions_version: 1, job_description: description,
    skills: [{ name: 'debugging tools', needsNoStudy: true, comfortRating: 'high', priority: 1 }],
    ...overrides,
  }
  const deps = {
    fetchJobDescription: vi.fn(async () => ({ text: 'A new posting requires GDB.' })),
    extractSkills: vi.fn(async (_text: string, _company: string, _role: string) => atomicSkills),
    addInterviewQuestions: vi.fn(async (skills: ExtractedSkill[]) => skills.map((skill) => ({
      ...skill, interviewQuestions: [`Explain ${skill.name}`, `Use ${skill.name}`, `Study ${skill.name}`],
    }))),
    saveApplication: vi.fn(async (_id: string, _updates: Record<string, unknown>) => {}),
    now: () => 'new-date',
  }
  return { application, deps }
}

describe('job analysis refresh', () => {
  it('leaves previous skills and version untouched when the model omits its skill list', async () => {
    const { application, deps } = fixture({ skill_extraction_version: 0 })
    const previousSkills = application.skills
    deps.extractSkills.mockImplementation(async (text) => normalizeExtractedSkills(undefined, text))
    await expect(analyzeApplication(application, deps)).rejects.toThrow('invalid skill list')
    expect(deps.saveApplication).not.toHaveBeenCalled()
    expect(application.skills).toBe(previousSkills)
    expect(application.skill_extraction_version).toBe(0)
  })

  it('refreshes legacy grouped skills using the saved posting and generates questions for each atomic skill', async () => {
    const { application, deps } = fixture()
    const result = await analyzeApplication(application, deps)
    expect(deps.fetchJobDescription).not.toHaveBeenCalled()
    expect(deps.extractSkills).toHaveBeenCalledWith(description, 'Example', 'Engineer')
    expect(deps.addInterviewQuestions).toHaveBeenCalledWith(atomicSkills)
    expect(result.skills.map((skill) => skill.name)).toEqual(['GDB', 'JTAG', 'serial debugging'])
    expect(result.skills.every((skill) => Array.isArray(skill.interviewQuestions) && skill.interviewQuestions.length === 3)).toBe(true)
    expect(deps.saveApplication).toHaveBeenCalledWith('job-one', {
      skills: result.skills, job_description: description, skills_analyzed_at: 'new-date',
      skills_source_url: application.url, interview_questions_version: 1, skill_extraction_version: 1,
    })
    expect(result).toMatchObject({ skillExtractionVersion: 1, interviewQuestionsVersion: 1, analyzedAt: 'new-date' })
    for (const skill of result.skills) {
      expect(skill).not.toHaveProperty('comfortRating')
      expect(skill).not.toHaveProperty('needsNoStudy')
      expect(skill).not.toHaveProperty('priority')
    }
  })

  it('composes grouped extraction normalization with persistence and individual study questions', async () => {
    const { application, deps } = fixture()
    deps.extractSkills.mockImplementation(async (text) => normalizeExtractedSkills([
      { name: 'debugging tools', category: 'tools', importance: 'required', evidence: description,
        individualSkills: ['GDB', 'JTAG', 'serial debugging'] },
      { name: 'GDB', category: 'tools', importance: 'required', evidence: description, individualSkills: [] },
    ], text))
    const result = await analyzeApplication(application, deps)
    expect(result.skills.map((skill) => skill.name)).toEqual(['GDB', 'JTAG', 'serial debugging'])
    expect(result.skills.map((skill) => skill.interviewQuestions)).toEqual([
      ['Explain GDB', 'Use GDB', 'Study GDB'],
      ['Explain JTAG', 'Use JTAG', 'Study JTAG'],
      ['Explain serial debugging', 'Use serial debugging', 'Study serial debugging'],
    ])
    expect(deps.saveApplication).toHaveBeenCalledWith(application.id, expect.objectContaining({ skills: result.skills }))
  })

  it('returns current cached skills without fetching, extracting, generating, or saving', async () => {
    const { application, deps } = fixture({ skill_extraction_version: 1, skills: atomicSkills })
    const result = await analyzeApplication(application, deps)
    expect(result).toMatchObject({ cached: true, analyzedAt: 'old-date', skills: atomicSkills })
    expect(deps.fetchJobDescription).not.toHaveBeenCalled()
    expect(deps.extractSkills).not.toHaveBeenCalled()
    expect(deps.addInterviewQuestions).not.toHaveBeenCalled()
    expect(deps.saveApplication).not.toHaveBeenCalled()
  })

  it('fetches the current URL when the posting URL changed', async () => {
    const { application, deps } = fixture({ url: 'https://example.com/new-job', skill_extraction_version: 1 })
    const result = await analyzeApplication(application, deps)
    expect(deps.fetchJobDescription).toHaveBeenCalledWith(application.url)
    expect(deps.extractSkills).toHaveBeenCalledWith('A new posting requires GDB.', 'Example', 'Engineer')
    expect(result).toMatchObject({ cached: false, sourceUrl: application.url })
  })

  it('fetches when the stored description is blank', async () => {
    const { application, deps } = fixture({ job_description: '  ' })
    await analyzeApplication(application, deps)
    expect(deps.fetchJobDescription).toHaveBeenCalledOnce()
  })

  it('preserves study metadata only for normalized exact matching skill names', async () => {
    const { application, deps } = fixture({ skills: [
      { name: '  gdb ', comfortRating: 'high', needsNoStudy: false, priority: 4 },
      { name: 'debugging tools', comfortRating: 'high', needsNoStudy: true, priority: 1 },
    ] })
    const result = await analyzeApplication(application, deps)
    expect(result.skills[0]).toMatchObject({ name: 'GDB', comfortRating: 'high', needsNoStudy: false, priority: 4 })
    expect(result.skills[1]).not.toHaveProperty('comfortRating')
    expect(result.skills[2]).not.toHaveProperty('needsNoStudy')
  })

  it('discards invalid saved knowledge ratings while preserving the other study fields', async () => {
    const { application, deps } = fixture({ skills: [
      { name: 'GDB', comfortRating: 'invalid', needsNoStudy: true, priority: 2 },
    ] })
    const result = await analyzeApplication(application, deps)
    expect(result.skills[0]).not.toHaveProperty('comfortRating')
    expect(result.skills[0]).toMatchObject({ needsNoStudy: true, priority: 2 })
  })

  it.each([null, {}, 'invalid', [null, false, [], { name: 3 }]])('safely refreshes malformed stored skills: %j', async (skills) => {
    const { application, deps } = fixture({ skills })
    const result = await analyzeApplication(application, deps)
    expect(result.skills).toHaveLength(3)
  })

  it('safely returns an empty list for malformed current cached skills', async () => {
    const { application, deps } = fixture({ skills: {}, skill_extraction_version: 1 })
    expect((await analyzeApplication(application, deps)).skills).toEqual([])
  })

  it.each(['extract', 'questions'] as const)('does not mark analysis fresh after a %s failure', async (stage) => {
    const { application, deps } = fixture()
    if (stage === 'extract') deps.extractSkills.mockRejectedValue(new Error('Extraction failed'))
    else deps.addInterviewQuestions.mockRejectedValue(new Error('Questions failed'))
    await expect(analyzeApplication(application, deps)).rejects.toThrow('failed')
    expect(deps.saveApplication).not.toHaveBeenCalled()
  })

  it('propagates save failures instead of reporting a successful refresh', async () => {
    const { application, deps } = fixture()
    deps.saveApplication.mockRejectedValue(new Error('Skills could not be saved. Please retry.'))
    await expect(analyzeApplication(application, deps)).rejects.toThrow('could not be saved')
  })
})
