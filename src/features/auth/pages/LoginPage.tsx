import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn, requestPasswordReset } from '@/data/auth'
import { checkIsAdmin } from '@/data/auth'
import { Button, Input, Card } from '@/components/ui'
import { toast } from '@/store/ui'
import { RunningStitch } from '@/components/ui/RunningStitch'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})
type Values = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  async function onSubmit(values: Values) {
    setLoading(true)
    try {
      const { user } = await signIn(values.email, values.password)
      const dest =
        (location.state as { from?: string } | null)?.from ??
        (user && (await checkIsAdmin(user.id)) ? '/admin' : '/account')
      navigate(dest, { replace: true })
    } catch (err) {
      toast.error((err as Error).message || 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  async function onForgot() {
    const email = getValues('email')
    if (!email) return toast.info('Enter your email first, then tap reset.')
    try {
      await requestPasswordReset(email)
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
