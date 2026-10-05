import { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { buildPracticePrompts, PRACTICE_BATCH_CHARACTERS } from '../practicePrompt'
import type { PracticeQuestion } from '../practicePrompt'
import '../practiceHandoff.css'

const SelectionContext = createContext<{
  selected: Set<string>
  toggle: (id: string) => void
} | null>(null)

export function PracticeQuestionChoice({ question }: { question: PracticeQuestion }) {
  const selection = useContext(SelectionContext)
  if (!selection) return <>{question.text}</>
  return <label className="practice-question-choice">
    <input type="checkbox" checked={selection.selected.has(question.id)} onChange={() => selection.toggle(question.id)} />
    <span>{question.text}</span>
  </label>
}

export default function PracticeHandoff({ questions, company, roles, rolesByQuestionId, children }: {
  questions: PracticeQuestion[]
  company: string
  roles: string[]
  rolesByQuestionId?: ReadonlyMap<string, readonly string[]>
  children: ReactNode
}) {
  const [selectedIds, setSelectedIds] = useState(new Set<string>())
  const validIds = new Set(questions.map((question) => question.id))
  const selected = new Set([...selectedIds].filter((id) => validIds.has(id)))
  const selectedQuestions = questions.filter((question) => selected.has(question.id))
  const selectedRoles = [...new Set(selectedQuestions.flatMap((question) => rolesByQuestionId?.get(question.id) ?? roles))]
  const [open, setOpen] = useState(false)
  const prepareButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open && !selectedQuestions.length) {
      setOpen(false)
      requestAnimationFrame(() => prepareButton.current?.focus())
    }
  }, [open, selectedQuestions.length])

  function close() {
    setOpen(false)
    requestAnimationFrame(() => prepareButton.current?.focus())
  }

  return <SelectionContext.Provider value={{ selected, toggle: (id) => {
    setSelectedIds((current) => {
      const next = new Set([...current].filter((item) => validIds.has(item)))
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  } }}>
    {children}
    {questions.length > 0 && <div className="practice-handoff-toolbar">
      <span>{selected.size} question{selected.size === 1 ? '' : 's'} selected for ChatGPT</span>
      <button ref={prepareButton} type="button" className="secondary-button" disabled={!selected.size} onClick={() => setOpen(true)}>Prepare ChatGPT prompt</button>
      {selected.size > 0 && <button type="button" className="text-button" onClick={() => setSelectedIds(new Set())}>Clear selection</button>}
    </div>}
    {open && selectedQuestions.length > 0 && <PromptPreview questions={selectedQuestions} company={company} roles={selectedRoles} onClose={close} />}
  </SelectionContext.Provider>
}

function PromptPreview({ questions, company, roles, onClose }: {
  questions: PracticeQuestion[]
  company: string
  roles: string[]
  onClose: () => void
}) {
  const [includeCompany, setIncludeCompany] = useState(false)
  const [includeRoles, setIncludeRoles] = useState(false)
  const context = { company: includeCompany ? company : undefined, roles: includeRoles ? roles : undefined }
  const generated = buildPracticePrompts(questions, context)
  const signature = JSON.stringify([questions, context])
  const [preparedSignature, setPreparedSignature] = useState(signature)
  const [drafts, setDrafts] = useState(generated.prompts)
  const [edited, setEdited] = useState(false)
  const [copying, setCopying] = useState(false)
  const [status, setStatus] = useState('')
  const copyAttempt = useRef(0)
  const changed = signature !== preparedSignature
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const titleId = useId()
  const disclosureId = useId()
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const node = dialog.current
    if (node && !node.open) {
      if (typeof node.showModal === 'function') node.showModal()
      else node.setAttribute('open', '')
    }
    heading.current?.focus()
    return () => { mounted.current = false }
  }, [])

  // A pending clipboard result must not report success for an edited/rebuilt draft.
  useEffect(() => {
    copyAttempt.current += 1
    setCopying(false)
    setStatus('')
  }, [drafts, signature])

  function regenerate() {
    setDrafts(generated.prompts)
    setPreparedSignature(signature)
    setEdited(false)
  }

  async function copyPrompt(text: string, index: number) {
    const attempt = ++copyAttempt.current
    if (!navigator.clipboard?.writeText) {
      setStatus('Copy is unavailable. Select the preview text and copy it manually, then paste it into ChatGPT.')
      return
    }
    setCopying(true)
    setStatus('')
    try {
      await navigator.clipboard.writeText(text)
      if (mounted.current && attempt === copyAttempt.current) setStatus(`Copied${drafts.length > 1 ? ` batch ${index + 1}` : ' prompt'}. Paste it into ChatGPT, review, and send.`)
    } catch {
      if (mounted.current && attempt === copyAttempt.current) setStatus('Could not copy. Select the preview text and copy it manually, then paste it into ChatGPT.')
    } finally {
      if (mounted.current && attempt === copyAttempt.current) setCopying(false)
    }
  }

  return <dialog ref={dialog} className="practice-prompt-dialog" aria-labelledby={titleId} aria-describedby={disclosureId} onCancel={(event) => { event.preventDefault(); onClose() }}>
    <header className="practice-prompt-heading">
      <h2 id={titleId} ref={heading} tabIndex={-1}>Review your ChatGPT prompt</h2>
      <button type="button" className="text-button" onClick={onClose}>Cancel</button>
    </header>
    <p id={disclosureId}>Copying puts this text on your device clipboard. Opening ChatGPT does not send the prompt. When you paste and send it there, you share the shown content with OpenAI under your ChatGPT account’s settings. Remove anything you do not want to share.</p>
    <fieldset className="practice-context"><legend>Optional context</legend>
      <label><input type="checkbox" checked={includeCompany} onChange={(event) => setIncludeCompany(event.target.checked)} /> Include company: {company}</label>
      {roles.length > 0 && <label><input type="checkbox" checked={includeRoles} onChange={(event) => setIncludeRoles(event.target.checked)} /> Include role{roles.length === 1 ? '' : 's'}: {roles.join(', ')}</label>}
    </fieldset>
    <p>{generated.questionCount} unique question{generated.questionCount === 1 ? '' : 's'} selected{generated.duplicateCount > 0 ? `; ${generated.duplicateCount} exact duplicate${generated.duplicateCount === 1 ? '' : 's'} combined with their skill names` : ''}.</p>
    {changed && <div className="practice-preview-changed" role="alert">
      <p>Questions or context changed. {edited ? 'Your edits are preserved. Replace the preview to apply the new selection and context.' : 'Update the preview to apply the new selection and context.'}</p>
      <button type="button" className="secondary-button" onClick={regenerate}>{edited ? 'Replace edited preview' : 'Update preview'}</button>
    </div>}
    {drafts.length > 1 && <p>Use these numbered batches one at a time. Rolecall aims for {PRACTICE_BATCH_CHARACTERS.toLocaleString()} characters per batch for easier copying; this is not a ChatGPT limit. Long individual questions remain whole.</p>}
    {drafts.map((draft, index) => <section className="practice-prompt-batch" key={index}>
      <label htmlFor={`${titleId}-batch-${index}`}>{drafts.length > 1 ? `Prompt batch ${index + 1} of ${drafts.length}` : 'Prompt preview'}</label>
      <textarea id={`${titleId}-batch-${index}`} value={draft} spellCheck={false} onChange={(event) => {
        setDrafts((current) => current.map((text, batchIndex) => batchIndex === index ? event.target.value : text))
        setEdited(true)
      }} />
      <div className="practice-prompt-batch-footer"><span>{draft.length.toLocaleString()} characters</span><button type="button" className="secondary-button" disabled={changed || copying || !draft.trim()} onClick={() => { void copyPrompt(draft, index) }}>{copying ? 'Copying…' : drafts.length > 1 ? `Copy batch ${index + 1}` : 'Copy prompt'}</button></div>
    </section>)}
    <p role="status" aria-live="polite" className="practice-copy-status">{status}</p>
    <footer className="practice-prompt-footer">
      <span>Paste, review, and send in ChatGPT. If opening fails or sign-in is needed, keep this preview and open ChatGPT yourself.</span>
      {changed || drafts.every((draft) => !draft.trim()) ? <span className="practice-open-disabled">Open ChatGPT (update preview first)</span> : <a className="secondary-button" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT</a>}
    </footer>
  </dialog>
}
