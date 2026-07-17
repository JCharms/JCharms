import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updatePassword } from '@/data/auth'
import { Button, Input, Card } from '@/components/ui'
import { toast } from '@/store/ui'

const schema = z
  .object({
    password: z
      .string()
      .min(6, 'Use at least 6 characters')
      .max(72, 'Passwords can be at most 72 characters'),
    confirmPassword: z.string().min(1, 'Please re-type your new password'),
  })
  // A typo here locks them out of the very account they're recovering.
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
type Values = z.infer<typeof schema>

/**
 * Landing target for Supabase's password-reset email. Supabase establishes a
 * temporary session from the email link; here the user simply sets a new
 * password (spec §5 — we don't build the token flow ourselves).
 */
export function ResetPasswordPage() {
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
      await updatePassword(values.password)
      toast.success('Password updated — you can use it next time.')
      navigate('/account', { replace: true })
    } catch (err) {
      toast.error((err as Error).message || 'Could not update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center font-display text-4xl text-indigo">Set a new password</h1>
      <Card className="mt-8 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            error={errors.password?.message}
            hint="At least 6 characters."
          />
          <Input
            label="Re-type new password"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
          <Button type="submit" fullWidth size="lg" isLoading={loading}>
            Update password
          </Button>
        </form>
      </Card>
    </div>
  )
}
