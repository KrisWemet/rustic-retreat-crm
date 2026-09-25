import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerPortalAccount, signIn } from '@/lib/supabase/auth'
import { getMyRole } from '@/lib/supabase/queries/portal'

const LoginPage = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [notice, setNotice] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setNotice('')
    setIsSubmitting(true)

    if (registering) {
      const { error } = await registerPortalAccount(email, password)
      setIsSubmitting(false)
      if (error) setErrorMessage(error.message)
      else setNotice('Account created. Check your email to verify it, then sign in. The venue team can link your account to your wedding.')
      return
    }

    const { data, error } = await signIn(email, password)

    setIsSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    if (data?.user) {
      try {
        const role = await getMyRole()
        navigate(role === 'admin' ? '/admin/dashboard' : '/portal')
      } catch { setErrorMessage('Signed in, but could not verify your CRM role. Please try again.') }
      return
    }

    setErrorMessage('Unable to sign in. Please try again.')
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-slate-900">{registering ? 'Create portal account' : 'Rustic Retreat sign in'}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {registering ? 'Use your own email address. Each partner can have a separate account.' : 'Sign in to your wedding portal or the venue CRM.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2 text-left">
            <label
              htmlFor="email"
              className="text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="space-y-2 text-left">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {errorMessage ? (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
          {notice && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
          </button>
          <button type="button" onClick={() => { setRegistering(!registering); setErrorMessage(null); setNotice('') }} className="w-full text-sm text-blue-700 underline">{registering ? 'Already have an account? Sign in' : 'Create a wedding portal account'}</button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
