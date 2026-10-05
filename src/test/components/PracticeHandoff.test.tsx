import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PracticeHandoff, { PracticeQuestionChoice } from '../../features/skills/components/PracticeHandoff'
import type { PracticeQuestion } from '../../features/skills/practicePrompt'

const questions: PracticeQuestion[] = [
  { id: 'first', text: 'Explain React rendering.', skillNames: ['React'] },
  { id: 'second', text: 'Explain typed APIs.', skillNames: ['TypeScript'] },
]
function view(items = questions) {
  return <PracticeHandoff questions={items} company="Private Company" roles={['Private Role']}>
    {items.map(question => <PracticeQuestionChoice key={question.id} question={question} />)}
  </PracticeHandoff>
}
function open() {
  fireEvent.click(screen.getByRole('checkbox', { name: questions[0].text }))
  fireEvent.click(screen.getByRole('button', { name: 'Prepare ChatGPT prompt' }))
}
function draft() { return screen.getByRole('textbox', { name: 'Prompt preview' }) as HTMLTextAreaElement }
function clipboard(writeText?: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: writeText ? { writeText } : undefined })
}
afterEach(() => { clipboard(); vi.unstubAllGlobals() })

describe('PracticeHandoff', () => {
  it('requires selection and previews only selected questions with optional context excluded by default', () => {
    const write = vi.fn()
    clipboard(write)
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    render(view())
    expect((screen.getByRole('button', { name: 'Prepare ChatGPT prompt' }) as HTMLButtonElement).disabled).toBe(true)
    open()
    expect(draft().value).toContain(questions[0].text)
    expect(draft().value).not.toContain(questions[1].text)
    expect(draft().value).not.toContain('Private Company')
    expect(draft().value).not.toContain('Private Role')
    const link = screen.getByRole('link', { name: 'Open ChatGPT' })
    expect(link.getAttribute('href')).toBe('https://chatgpt.com/')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(write).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('preserves edits until explicitly replacing the preview after opting into context', () => {
    render(view())
    open()
    fireEvent.change(draft(), { target: { value: 'My edited practice prompt' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include company: Private Company' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include role: Private Role' }))
    expect(draft().value).toBe('My edited practice prompt')
    expect((screen.getByRole('button', { name: 'Copy prompt' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('link', { name: 'Open ChatGPT' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Replace edited preview' }))
    expect(draft().value).toContain('Company: Private Company')
    expect(draft().value).toContain('Roles: Private Role')
    expect(draft().value).not.toContain('My edited practice prompt')
  })

  it('requires an explicit preview update for unedited context changes', () => {
    render(view())
    open()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include company: Private Company' }))
    expect(draft().value).not.toContain('Private Company')
    fireEvent.click(screen.getByRole('button', { name: 'Update preview' }))
    expect(draft().value).toContain('Company: Private Company')
  })

  it('copies the exact edited draft, prevents duplicate pending copies, and reports success in StrictMode', async () => {
    let resolve!: () => void
    const write = vi.fn(() => new Promise<void>(done => { resolve = done }))
    clipboard(write)
    render(<StrictMode>{view()}</StrictMode>)
    open()
    fireEvent.change(draft(), { target: { value: 'Edited text\nwith exact spacing  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }))
    expect(write).toHaveBeenCalledExactlyOnceWith('Edited text\nwith exact spacing  ')
    expect((screen.getByRole('button', { name: 'Copying…' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => { resolve() })
    expect(screen.getByRole('status').textContent).toContain('Copied prompt')
  })

  it.each(['missing', 'rejected'])('keeps the preview editable with manual copy instructions when clipboard is %s', async mode => {
    if (mode === 'rejected') clipboard(vi.fn().mockRejectedValue(new Error('denied')))
    render(view())
    open()
    const original = draft().value
    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('copy it manually'))
    expect(draft().value).toBe(original)
    expect(draft().readOnly).toBe(false)
  })

  it('cancels without copying, restores trigger focus, and retains selection', async () => {
    const write = vi.fn()
    clipboard(write)
    render(view())
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Prepare ChatGPT prompt' })))
    expect((screen.getByRole('checkbox', { name: questions[0].text }) as HTMLInputElement).checked).toBe(true)
    expect(write).not.toHaveBeenCalled()
  })

  it('invalidates pending success if the draft is changed', async () => {
    let resolve!: () => void
    clipboard(vi.fn(() => new Promise<void>(done => { resolve = done })))
    render(view())
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }))
    fireEvent.change(draft(), { target: { value: 'New draft not copied' } })
    await act(async () => { resolve() })
    expect(screen.getByRole('status').textContent).not.toContain('Copied')
  })

  it('treats markup as plain text and preserves whole long questions across numbered batches', () => {
    const items = [
      { id: 'unsafe', text: '<img src=x onerror=alert(1)>', skillNames: ['<script>unsafe</script>'] },
      { id: 'long', text: 'A'.repeat(6500), skillNames: ['Long skill'] },
      { id: 'last', text: 'Final whole question?', skillNames: ['Last skill'] },
    ]
    render(view(items))
    for (const item of items) fireEvent.click(screen.getByRole('checkbox', { name: item.text }))
    fireEvent.click(screen.getByRole('button', { name: 'Prepare ChatGPT prompt' }))
    const previews = screen.getAllByRole('textbox') as HTMLTextAreaElement[]
    expect(previews).toHaveLength(3)
    for (let index = 0; index < 3; index++) {
      expect(previews[index].value).toContain(items[index].text)
      expect(previews[index].value).toContain(`Batch ${index + 1} of 3`)
    }
    expect(document.querySelector('img')).toBeNull()
    expect(document.querySelector('script')).toBeNull()
  })

  it('clears selection explicitly and supports Escape cancellation without copying', () => {
    const write = vi.fn()
    clipboard(write)
    render(view())
    open()
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect((screen.getByRole('checkbox', { name: questions[0].text }) as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('button', { name: 'Prepare ChatGPT prompt' }) as HTMLButtonElement).disabled).toBe(true)
    expect(write).not.toHaveBeenCalled()
  })

  it('preserves an edited preview when only some selected questions disappear until explicitly replacing it', () => {
    const { rerender } = render(view())
    fireEvent.click(screen.getByRole('checkbox', { name: questions[0].text }))
    fireEvent.click(screen.getByRole('checkbox', { name: questions[1].text }))
    fireEvent.click(screen.getByRole('button', { name: 'Prepare ChatGPT prompt' }))
    fireEvent.change(draft(), { target: { value: 'My edited draft with both questions' } })

    rerender(view([questions[1]]))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(draft().value).toBe('My edited draft with both questions')
    expect((screen.getByRole('button', { name: 'Copy prompt' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('link', { name: 'Open ChatGPT' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Replace edited preview' }))

    expect(draft().value).toContain(questions[1].text)
    expect(draft().value).not.toContain(questions[0].text)
    expect(draft().value).not.toContain('My edited draft')
    expect((screen.getByRole('button', { name: 'Copy prompt' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByRole('link', { name: 'Open ChatGPT' }).getAttribute('href')).toBe('https://chatgpt.com/')
  })

  it('drops removed questions from selection and closes a preview with no remaining selected questions', () => {
    const { rerender } = render(view())
    open()
    rerender(view([questions[1]]))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect((screen.getByRole('button', { name: 'Prepare ChatGPT prompt' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
