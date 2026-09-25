import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout, { authField, authLabel, authLink, authPrimary } from '@/components/AuthLayout'
import { supabase } from '@/lib/supabase/client'
import { updatePassword } from '@/lib/supabase/auth'
import { getMyRole } from '@/lib/supabase/queries/portal'

type Status = 'checking' | 'ready' | 'invalid'

const linkParams = () => new URLSearchParams(window.location.hash.slice(1) || window.location.search)
// Supabase reports an expired or reused link in the URL it redirects to.
const linkErrorFromUrl = () => linkParams().get('error_description')?.replace(/\+/g, ' ') ?? ''

// The recovery email links here. Supabase reads the token from the URL and
// signs the user in; this page then lets them choose a new password.
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [linkError] = useState(linkErrorFromUrl)
  const [status, setStatus] = useState<Status>(() => (linkError ? 'invalid' : 'checking'))
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (linkError) return
    const params = linkParams()
    const hasToken = params.has('access_token') || params.has('code')
    let settled = false
    const settle = (next: Status) => { if (!settled) { settled = true; setStatus(next) } }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) settle('ready')
    })
    void supabase.auth.getSession().then(({ data: current }) => {
      if (current.session) settle('ready')
      else if (!hasToken) settle('invalid')
    })
    // A token that never produces a session (expired, already used) must not spin forever.
    const timer = window.setTimeout(() => settle('invalid'), 10000)
    return () => { data.subscription.unsubscribe(); window.clearTimeout(timer) }
  }, [linkError])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    if (password !== confirm) {
      setErrorMessage('The two passwords do not match.')
      return
    }
    setIsSubmitting(true)
    const { error } = await updatePassword(password)
    if (error) {
      setIsSubmitting(false)
      setErrorMessage(error.message)
      return
    }
    try {
      const role = await getMyRole()
      navigate(role === 'admin' ? '/admin/dashboard' : '/portal', { replace: true })
    } catch {
      navigate('/', { replace: true })
    }
  }

  if (status === 'checking') {
    return <AuthLayout title="Checking your link" subtitle="One moment while we verify your reset link."><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-accent)] border-t-[var(--brand-terracotta)]" /></AuthLayout>
  }

  if (status === 'invalid') {
    return (
      <AuthLayout title="This link has expired" subtitle="Reset links work once and expire after an hour.">
        {linkError && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{linkError}</p>}
        <Link to="/" state={{ mode: 'forgot' }} className={authPrimary}>Request a new link</Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Use at least 8 characters. You will be signed in afterwards.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="new-password" className={authLabel}>New password</label>
          <input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className={authField} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="confirm-password" className={authLabel}>Confirm new password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} className={authField} />
        </div>
        {errorMessage && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorMessage}</p>}
        <button type="submit" disabled={isSubmitting} className={authPrimary}>{isSubmitting ? 'Saving…' : 'Save new password'}</button>
      </form>
      <p className="mt-8 text-center"><Link to="/" className={authLink}>Back to sign in</Link></p>
    </AuthLayout>
  )
}
