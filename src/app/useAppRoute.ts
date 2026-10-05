import { useEffect, useState } from 'react'
import { applicationSkillsHash, pageHash, readRoute } from './routing'
import type { AppPage } from './routing'

export function useAppRoute() {
  const [route, setRoute] = useState(() => readRoute(window.location.hash))

  useEffect(() => {
    function syncPageFromHash() {
      setRoute(readRoute(window.location.hash))
    }
    window.addEventListener('hashchange', syncPageFromHash)
    return () => window.removeEventListener('hashchange', syncPageFromHash)
  }, [])

  function navigateTo(page: AppPage, company?: string) {
    const nextHash = pageHash(page, company)
    if (window.location.hash !== nextHash) window.location.hash = nextHash
    setRoute({ page, company: page === 'company-questions' && company ? company : null, applicationId: null })
  }

  function openApplicationSkills(applicationId: string) {
    const nextHash = applicationSkillsHash(applicationId)
    if (window.location.hash !== nextHash) window.location.hash = nextHash
    setRoute({ page: 'skills', company: null, applicationId })
  }

  return { activePage: route.page, activeCompany: route.company, activeSkillApplicationId: route.applicationId, navigateTo, openApplicationSkills }
}
