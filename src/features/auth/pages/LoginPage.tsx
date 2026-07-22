import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn, requestPasswordReset } from '@/data/auth'
import { applySignIn, useAuthStore } from '@/features/auth/authStore'
import { Button, Input, Card } from '@/components/ui'
import { toast } from '@/store/ui'
import { RunningStitch } from '@/components/ui/RunningStitch'

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})
type Values = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const user = useAuthStore((s) => s.user)

  // Already signed in on arrival → don't show the login form; send them on. The
  // ref means this only fires for a pre-existing session, never for the sign-in
  // that happens *on* this page (which routes itself to the right destination).
  const authedOnMount = useRef(user !== null)
  useEffect(() => {
    if (authedOnMount.current) navigate('/account', { replace: true })
  }, [navigate])

  const prefillEmail = (location.state as { email?: string } | null)?.email
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: prefillEmail ? { email: prefillEmail } : undefined,
  })

  async function onSubmit(values: Values) {
    setLoading(true)
    try {
      const { session } = await signIn(values.email, values.password)
      // Settle the auth store before navigating — otherwise the guard on the
      // destination can run against a store that hasn't caught up yet.
      const isAdmin = await applySignIn(session)
      const from = (location.state as { from?: string } | null)?.from

      // Honour a deep link back to wherever they were headed, except when a
      // customer was bounced off /admin — sending them back would just bounce
      // them again.
      const canReturn = !!from && (isAdmin || !from.startsWith('/admin'))
      const dest = canReturn ? from! : isAdmin ? '/admin' : '/account'
      navigate(dest, { replace: true })
    } catch (err) {
      toast.error((err as Error).message || 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  async function onForgot() {
    // This button skips the form's own submit, so it has to check the address
    // itself — otherwise the reset silently goes nowhere.
    const parsed = schema.shape.email.safeParse(getValues('email'))
    if (!parsed.success) {
      return toast.info('Type your email in the box above first, then tap reset.')
    }
    try {
      await requestPasswordReset(parsed.data)
      toast.success('Check your inbox for a reset link.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center">
        <h1 className="font-display text-4xl text-indigo">Welcome back</h1>
        <RunningStitch className="mx-auto mt-3 max-w-[120px] text-pink" />
      </div>
      <Card className="mt-8 space-y-4 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
          <Input label="Password" type="password" autoComplete="current-password" {...register('password')} error={errors.password?.message} />
          <button type="button" onClick={onForgot} className="text-sm text-pink-600 hover:underline">
            Forgot password?
          </button>
          <Button type="submit" fullWidth size="lg" isLoading={loading}>
            Sign in
          </Button>
        </form>
      </Card>
      <p className="mt-6 text-center text-sm text-ink-muted">
        New here?{' '}
        <Link to="/signup" className="stitch-underline font-semibold text-pink-600">
          Create an account
        </Link>{' '}
        — or just{' '}
        <Link to="/shop" className="stitch-underline font-semibold text-indigo">
          shop as a guest
        </Link>
        .
      </p>
    </div>
  )
}
