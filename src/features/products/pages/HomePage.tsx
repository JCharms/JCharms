import { Link } from 'react-router-dom'
import { ArrowRight, Heart } from 'lucide-react'
import { useFeaturedProducts, useCategoryTree } from '../hooks'
import { ProductGrid } from '../components/ProductGrid'
import { ReviewsSection } from '@/features/reviews/ReviewsSection'
import { RunningStitch } from '@/components/ui/RunningStitch'

export function HomePage() {
  const { data: featured, isLoading } = useFeaturedProducts()
  const { data: categories } = useCategoryTree()

  return (
    <div>
      {/* Hero — slightly asymmetric, generous whitespace. */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-8 pt-12 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:pt-16">
        <div className="animate-stitch-in">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-marigold-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-marigold-500">
            <Heart size={13} aria-hidden /> Handmade to order
          </span>
          <h1 className="mt-5 font-display text-5xl leading-[1.05] text-indigo sm:text-6xl">
            Little bundles of <span className="stitch-underline text-pink">yarn&nbsp;joy</span>.
          </h1>
          <p className="mt-5 max-w-md text-lg text-ink-muted">
            Crochet keychains, plushies, bouquets and hair accessories — each one
            stitched by hand, made to be gifted (or kept).
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-pink px-6 py-3 font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-pink-500 hover:shadow-lift"
            >
              Browse the shop <ArrowRight size={18} aria-hidden />
            </Link>
            <Link
              to="/track"
              className="inline-flex items-center rounded-full border border-indigo-200 px-6 py-3 font-semibold text-indigo transition hover:bg-indigo-50"
            >
              Track my order
            </Link>
          </div>
        </div>

        <div className="relative hidden md:block">
          <div className="stitch-border animate-floaty bg-white p-3 shadow-lift">
            <div
              className="flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br from-pink-100 via-ivory-200 to-marigold-100"
              role="img"
              aria-label="Placeholder: handmade crochet product photo"
            >
              {/* TODO: replace placeholder image once client sends real photos */}
              <span className="font-display text-2xl text-indigo-300">photo coming soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* Category tiles */}
      {categories && categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/shop/${cat.slug}`}
                className="group relative flex h-32 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 to-pink-50 p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
              >
                <span className="font-display text-xl text-indigo">{cat.name}</span>
                <span className="flex items-center gap-1 text-sm text-ink-muted">
                  Shop now <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl text-indigo">Freshly stitched</h2>
            <RunningStitch className="mt-3 max-w-[140px] text-pink" />
          </div>
          <Link to="/shop" className="stitch-underline text-sm font-semibold text-pink-600">
            View all
          </Link>
        </div>
        <ProductGrid products={featured} isLoading={isLoading} emptyLabel="Featured picks coming soon" />
      </section>

      <ReviewsSection />
    </div>
  )
}
