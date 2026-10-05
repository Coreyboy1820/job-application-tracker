import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppRoute } from '../../app/useAppRoute'

beforeEach(() => window.history.replaceState(null, '', '/#/applications'))
afterEach(() => vi.restoreAllMocks())

describe('application route navigation', () => {
  it('initializes from a saved application filter and updates on browser navigation', () => {
    window.history.replaceState(null, '', '/#/skills/application/application-1')
    const { result } = renderHook(() => useAppRoute())
    expect(result.current.activePage).toBe('skills')
    expect(result.current.activeSkillApplicationId).toBe('application-1')

    act(() => {
      window.history.replaceState(null, '', '/#/interviews')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(result.current.activePage).toBe('interviews')
    expect(result.current.activeSkillApplicationId).toBeNull()
    expect(result.current.activeCompany).toBeNull()
  })

  it('clears previous filters when moving between application, company, and general skills routes', () => {
    const { result } = renderHook(() => useAppRoute())
    act(() => result.current.openApplicationSkills('application/one'))
    expect(window.location.hash).toBe('#/skills/application/application%2Fone')
    expect(result.current.activeSkillApplicationId).toBe('application/one')

    act(() => result.current.navigateTo('company-questions', 'A&B'))
    expect(window.location.hash).toBe('#/skills/company/A%26B')
    expect(result.current.activePage).toBe('company-questions')
    expect(result.current.activeCompany).toBe('A&B')
    expect(result.current.activeSkillApplicationId).toBeNull()

    act(() => result.current.navigateTo('skills'))
    expect(window.location.hash).toBe('#/skills')
    expect(result.current.activePage).toBe('skills')
    expect(result.current.activeCompany).toBeNull()
    expect(result.current.activeSkillApplicationId).toBeNull()
  })

  it('removes its browser navigation listener on unmount', () => {
    const addListener = vi.spyOn(window, 'addEventListener')
    const removeListener = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useAppRoute())
    const listener = addListener.mock.calls.find(([event]) => event === 'hashchange')?.[1]
    expect(listener).toBeTypeOf('function')
    unmount()
    expect(removeListener).toHaveBeenCalledWith('hashchange', listener)
  })
})
