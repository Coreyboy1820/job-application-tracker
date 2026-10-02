export type SkillQuestionRequest = { skillKey: string; name: string }

export function normalizeSkillKey(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

export function validQuestionSet(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length !== 3) return null
  const questions = value.map((question) => typeof question === 'string' ? question.trim().slice(0, 500) : '')
  return questions.every(Boolean) ? questions : null
}

export function uniqueSkillsMissingQuestions<T extends { name: string }>(
  skills: T[],
  cachedQuestions: ReadonlyMap<string, string[]>,
): SkillQuestionRequest[] {
  const uniqueSkills = new Map<string, SkillQuestionRequest>()
  for (const skill of skills) {
    const skillKey = normalizeSkillKey(skill.name)
    if (!skillKey) throw new Error('A skill name is required to generate interview questions.')
    if (!cachedQuestions.has(skillKey) && !uniqueSkills.has(skillKey)) {
      uniqueSkills.set(skillKey, { skillKey, name: skill.name })
    }
  }
  return [...uniqueSkills.values()]
}

export function addCachedQuestions<T extends { name: string }>(
  skills: T[],
  cachedQuestions: ReadonlyMap<string, string[]>,
): Array<T & { interviewQuestions: string[] }> {
  return skills.map((skill) => {
    const interviewQuestions = cachedQuestions.get(normalizeSkillKey(skill.name))
    if (!interviewQuestions) throw new Error(`Interview questions for ${skill.name} are not cached.`)
    return { ...skill, interviewQuestions }
  })
}
