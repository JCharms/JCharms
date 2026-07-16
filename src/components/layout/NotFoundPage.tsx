import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { RunningStitch } from '@/components/ui/RunningStitch'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <p className="font-mono text-6xl font-bold text-pink-200">404</p>
      <h1 className="mt-4 font-display text-3xl text-indigo">This thread got tangled</h1>
      <RunningStitch className="mx-auto mt-3 max-w-[140px] text-pink" />
      <p className="mt-4 text-ink-muted">
        We couldn't find that page — but there's plenty of handmade goodness back home.
      </p>
      <Link to="/" className="mt-8">
        <Button size="lg">Take me home</Button>
      </Link>
    </div>
  )
}
