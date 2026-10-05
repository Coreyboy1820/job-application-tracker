import { useState } from 'react'
import type { FormEvent } from 'react'
import { BriefcaseBusiness } from 'lucide-react'
import { supabase } from '../../../shared/lib/supabase'

export default function AuthPanel() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setPending(true)
    setError(null)
    setNotice(null)

    const result = mode === 'sign-up'
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email, password })

    if (result.error) {
      setError(result.error.message)
    } else if (mode === 'sign-up' && !result.data.session) {
      setNotice('Check your email for a confirmation link, then return here to sign in.')
    }
    setPending(false)
  }

  return <div className="auth-screen"><section className="auth-card"><a className="brand" href="#top"><span className="brand-mark"><BriefcaseBusiness size={18} /></span><span>rolecall<span className="brand-period">.</span></span></a><div className="eyebrow">YOUR JOB SEARCH</div><h1>{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h1><p className="auth-subtitle">Sign in to keep your applications in sync across devices.</p>{error && <div className="auth-error" role="alert">{error}</div>}{notice && <div className="storage-message storage-notice" role="status">{notice}</div>}<form onSubmit={(event) => void handleSubmit(event)}><label className="field"><span>Email</span><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label className="field"><span>Password</span><input type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label><button className="primary-button auth-submit" type="submit" disabled={pending}>{pending ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button></form><p className="auth-switch">{mode === 'sign-in' ? 'New to Rolecall?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(null); setNotice(null) }}>{mode === 'sign-in' ? 'Create an account' : 'Sign in'}</button></p></section></div>
}
