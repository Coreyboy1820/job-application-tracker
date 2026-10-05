export const interviewTypes = ['Phone screen', 'Recruiter', 'Behavioral', 'Technical', 'Onsite'] as const

export function getInterviewTypeGroup(type?: string): string {
  const normalized = type?.trim().toLowerCase()
  if (!normalized) return 'Not specified'
  return interviewTypes.find((option) => option.toLowerCase() === normalized) ?? 'Other'
}
