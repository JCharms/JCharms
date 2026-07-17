import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signUp } from '@/data/auth'
import { Button, Input, Card } from '@/components/ui'
import { toast } from '@/store/ui'
import { RunningStitch } from '@/components/ui/RunningStitch'

const schema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Please enter your name')
      .max(80, 'That name is too long')
      // \p{M} keeps Indic names working — see the note in checkout/schema.ts.
      .regex(/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u, 'Use letters only — no numbers or symbols'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Enter a valid email, e.g. you@gmail.com'),
    password: z
      .string()
      .min(6, 'Use at least 6 characters')
      .max(72, 'Passwords can be at most 72 characters'),
    confirmPassword: z.string().min(1, 'Please re-type your password'),
  })
  // Signup is followed by an email round-trip, so a mistyped password isn't
  // discovered until they try to sign in and can't.
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
type Values = z.infer<typeof schema>

export function SignupPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: 'onTouched' })

  async function onSubmit(values: Values) {
    setLoading(true)
    try {
      const result = await signUp(values.email, values.password, values.fullName)
      // With email confirmation on, there's no session yet — send them to the
      // "confirm your email" page. (If confirmation is off, a session already
      // exists and we can drop them straight on the landing page.)
      if (result.session) {
        toast.success('Welcome to J Charms! 💕')
        navigate('/', { replace: true })
      } else {
        navigate('/verify-email', { replace: true, state: { email: values.email } })
      }
    } catch (err) {
      toast.error((err as Error).message || 'Could not create account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center">
        <h1 className="font-display text-4xl text-indigo">Join the yarn club</h1>
        <RunningStitch className="mx-auto mt-3 max-w-[120px] text-pink" />
        <p className="mt-3 text-sm text-ink-muted">
          Optional — accounts just make tracking orders faster next time.
        </p>
      </div>
      <Card className="mt-8 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Full name" autoComplete="name" {...register('fullName')} error={errors.fullName?.message} />
          <Input label="Email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            error={errors.password?.message}
            hint="At least 6 characters."
          />
          <Input
            label="Re-type password"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
          <Button type="submit" fullWidth size="lg" isLoading={loading}>
            Create account
          </Button>
        </form>
      </Card>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have one?{' '}
        <Link to="/login" className="stitch-underline font-semibold text-pink-600">
          Sign in
        </Link>
      </p>
    </div>
  )
}
