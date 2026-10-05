import { describe, expect, it } from 'vitest'
import { normalizeExtractedSkills } from '../../../supabase/functions/analyze-job-posting/skill-extraction'

const description = 'Use debugging tools such as GDB, JTAG, and serial debuggers. Data tools include Python, SQL, and Excel. Strong debugging tools experience is required.'
const entry = (overrides: Record<string, unknown> = {}) => ({
  name: 'debugging tools', category: 'tools', importance: 'required',
  evidence: 'debugging tools such as GDB, JTAG, and serial debuggers',
  individualSkills: ['GDB', 'JTAG', 'serial debugging'], ...overrides,
})

describe('individual skill extraction', () => {
  it('expands debugging examples into studyable skills with their shared supporting evidence', () => {
    expect(normalizeExtractedSkills([entry()], description)).toEqual(
      ['GDB', 'JTAG', 'serial debugging'].map((name) => ({ name, category: 'tools', importance: 'required', evidence: entry().evidence })),
    )
  })

  it('expands enumerated technologies while retaining atomic compound names', () => {
    const text = 'Data tools include Python, SQL, and Excel. Experience with CI/CD is required.'
    expect(normalizeExtractedSkills([
      entry({ name: 'data tools', evidence: 'Data tools include Python, SQL, and Excel', individualSkills: ['Python', 'SQL', 'Excel'] }),
      entry({ name: 'CI/CD', evidence: 'Experience with CI/CD is required', individualSkills: [] }),
    ], text).map((skill) => skill.name)).toEqual(['Python', 'SQL', 'Excel', 'CI/CD'])
  })

  it('keeps broad standalone skills when no examples are listed', () => {
    expect(normalizeExtractedSkills([entry({ individualSkills: [], evidence: 'Strong debugging tools experience is required' })], description).map((skill) => skill.name)).toEqual(['debugging tools'])
  })

  it('suppresses a repeated standalone category represented by an explicit group in either order', () => {
    const standalone = entry({ individualSkills: [] })
    for (const values of [[standalone, entry()], [entry(), standalone]]) {
      expect(normalizeExtractedSkills(values, description).map((skill) => skill.name)).toEqual(['GDB', 'JTAG', 'serial debugging'])
    }
  })

  it('deduplicates case, full-width names, and whitespace and keeps strongest importance', () => {
    const result = normalizeExtractedSkills([
      entry({ importance: 'mentioned', individualSkills: ['  ＧＤＢ  ', 'JTAG', 'serial   debugging'] }),
      entry({ name: 'gdb', importance: 'preferred', individualSkills: [] }),
      entry({ name: 'GDB', importance: 'required', individualSkills: [] }),
      entry({ individualSkills: ['jtag', 'serial debugging'] }),
    ], description)
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ name: 'GDB', importance: 'required' })
  })

  it('rejects malformed shapes and unsupported evidence', () => {
    expect(normalizeExtractedSkills([
      null, [], 'bad', entry({ category: 'invalid' }), entry({ importance: 'toString' }),
      entry({ evidence: 'invented supporting quote' }), entry({ evidence: 'GDB' }),
      entry({ individualSkills: ['GDB', 1] }), entry({ individualSkills: [' '] }),
      entry({ individualSkills: undefined }), entry({ name: ' ' }),
    ], description)).toEqual([])
    expect(() => normalizeExtractedSkills({ skills: [entry()] }, description)).toThrow('invalid skill list')
    expect(() => normalizeExtractedSkills(undefined, description)).toThrow('invalid skill list')
    expect(normalizeExtractedSkills([], description)).toEqual([])
  })

  it('limits output and deduplicates after truncating names', () => {
    const names = Array.from({ length: 90 }, (_, index) => `Skill ${index}`)
    expect(normalizeExtractedSkills([entry({ individualSkills: names })], description)).toHaveLength(80)
    const longName = 'A'.repeat(100)
    const result = normalizeExtractedSkills([entry({ individualSkills: [longName + '1', longName + '2'] })], description)
    expect(result.map((skill) => skill.name)).toEqual([longName])
  })

  it('validates all evidence before truncating the stored quote', () => {
    const quote = 'A'.repeat(400)
    expect(normalizeExtractedSkills([entry({ evidence: quote })], quote)[0].evidence).toHaveLength(360)
    expect(normalizeExtractedSkills([entry({ evidence: quote + ' fabricated' })], quote)).toEqual([])
  })
})
