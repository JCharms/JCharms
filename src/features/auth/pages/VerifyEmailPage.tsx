import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { resendConfirmation } from '@/data/auth'
import { Button, Card } from '@/components/ui'
import { toast } from '@/store/ui'
import { RunningStitch } from '@/components/ui/RunningStitch'

/**
 * Shown right after signup when email confirmation is required. The account is
 * created but dormant until the emailed link is clicked — that link lands on the
 * landing page (emailRedirectTo in signUp), where a session is established and
 * the welcome email fires.
 */
export function VerifyEmailPage() {
  const location = useLocation()
  const email = (location.state as { email?: string } | null)?.email
  const [resending, setResending] = useState(false)

  async function onResend() {
    if (!email) return toast.info('Head back to sign up and try again.')
    setResending(true)
    try {
      await resendConfirmation(email)
      toast.success('Sent again — check your inbox (and spam).')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-pink-600">
          <MailCheck size={30} />
        </span>
        <h1 className="mt-4 font-display text-4xl text-indigo">Confirm your email</h1>
        <RunningStitch className="mx-auto mt-3 max-w-[120px] text-pink" />
      </div>
      <Card className="mt-8 space-y-4 p-6 text-center">
        <p className="text-ink">
          We&apos;ve sent a confirmation link to{' '}
          {email ? <span className="font-semibold text-indigo">{email}</span> : 'your email'}.
        </p>
        <p className="text-sm text-ink-muted">
          Click the link to activate your account — you&apos;ll be taken straight back to J Charms.
          Don&apos;t forget to peek in your spam folder.
        </p>
        <Button variant="outline" fullWidth onClick={onResend} isLoading={resending}>
          Resend the link
        </Button>
      </Card>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Wrong address?{' '}
        <Link to="/signup" className="stitch-underline font-semibold text-pink-600">
          Sign up again
        </Link>{' '}
        · or{' '}
        <Link to="/shop" className="stitch-underline font-semibold text-indigo">
          keep shopping
        </Link>
        .
      </p>
    </div>
  )
}
