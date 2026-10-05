export type AppPage = 'applications' | 'interviews' | 'skills' | 'company-questions'

export type AppRoute = { page: AppPage; company: string | null; applicationId: string | null }

export function readRoute(hash: string): AppRoute {
  if (hash === '#/interviews') return { page: 'interviews', company: null, applicationId: null }
  const applicationRoute = '#/skills/application/'
  if (hash.startsWith(applicationRoute)) {
    try {
      const applicationId = decodeURIComponent(hash.slice(applicationRoute.length)).trim()
      if (applicationId) return { page: 'skills', company: null, applicationId }
    } catch {
      return { page: 'skills', company: null, applicationId: null }
    }
  }
  const companyRoute = '#/skills/company/'
  if (hash.startsWith(companyRoute)) {
    try {
      const company = decodeURIComponent(hash.slice(companyRoute.length)).trim()
      if (company) return { page: 'company-questions', company, applicationId: null }
    } catch {
      return { page: 'skills', company: null, applicationId: null }
    }
  }
  return hash === '#/skills'
    ? { page: 'skills', company: null, applicationId: null }
    : { page: 'applications', company: null, applicationId: null }
}

export function pageHash(page: AppPage, company?: string): string {
  return page === 'interviews'
    ? '#/interviews'
    : page === 'company-questions' && company
    ? `#/skills/company/${encodeURIComponent(company)}`
    : page === 'skills' || page === 'company-questions' ? '#/skills' : '#/applications'
}

export function applicationSkillsHash(applicationId: string): string {
  return `#/skills/application/${encodeURIComponent(applicationId)}`
}
