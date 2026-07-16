import { Star, Quote } from 'lucide-react'
import { useReviews } from './hooks'
import { reviewScreenshotUrl } from '@/data/reviews'
import { Card } from '@/components/ui/Card'
import { RunningStitch } from '@/components/ui/RunningStitch'

/** Curated testimonials carousel-ish grid for the homepage. */
export function ReviewsSection() {
  const { data: reviews } = useReviews()
  if (!reviews || reviews.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <h2 className="font-display text-3xl text-indigo">Little love notes</h2>
        <RunningStitch className="mx-auto mt-3 max-w-[160px] text-pink" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => {
          const screenshot = reviewScreenshotUrl(review.screenshot_path)
          return (
            <Card key={review.id} className="flex flex-col gap-3 p-6">
              <Quote className="text-pink-200" size={28} aria-hidden />
              {review.rating != null && (
                <div className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={15}
                      className={i < review.rating! ? 'fill-marigold text-marigold' : 'text-ivory-300'}
                      aria-hidden
                    />
                  ))}
                </div>
              )}
              <p className="text-ink">{review.body}</p>
              {screenshot && (
                <img
                  src={screenshot}
                  alt={`Photo from ${review.author_name}`}
                  loading="lazy"
                  className="mt-1 max-h-64 w-full rounded-xl border border-ivory-300 object-cover"
                />
              )}
              <p className="mt-auto font-display text-sm text-indigo">— {review.author_name}</p>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
