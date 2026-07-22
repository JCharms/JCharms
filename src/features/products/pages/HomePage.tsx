import { Link } from 'react-router-dom'
import { ArrowRight, Heart, LayoutGrid } from 'lucide-react'
import { useFeaturedProducts, useCategoryTree } from '../hooks'
import { ProductGrid } from '../components/ProductGrid'
import { ReviewsSection } from '@/features/reviews/ReviewsSection'
import { RunningStitch } from '@/components/ui/RunningStitch'
import { useUIStore } from '@/store/ui'
import heroImage from '@/assets/hero.webp'
import heroSmall from '@/assets/hero-sm.webp'

/** Tiles shown before we hand off to the full category browser. */
const MAX_TILES = 5

export function HomePage() {
  const { data: featured, isLoading } = useFeaturedProducts()
  const { data: categories } = useCategoryTree()
  const openCategories = useUIStore((s) => s.setCategoryMenuOpen)

  // A tile per category stops being a shortcut once there are dozens of them —
  // show a handful and let the last tile open the searchable browser.
  const hasOverflow = (categories?.length ?? 0) > MAX_TILES
  const tiles = hasOverflow ? categories!.slice(0, MAX_TILES) : (categories ?? [])

  return (
    <div>
      {/* Hero — full-bleed photo, copy over the calm left third of the frame.
          The photo is composed with the bouquets to the right, so the text
          column and the product never fight for the same pixels. */}
      <section className="relative isolate overflow-hidden">
        <picture>
          {/* Small screens crop hard, so they get a lighter file — no point
              shipping 1672px of detail to a 390px phone. */}
          <source media="(max-width: 640px)" srcSet={heroSmall} type="image/webp" />
          <source srcSet={heroImage} type="image/webp" />
          <img
            src={heroImage}
            alt="Three hand-crocheted rose bouquets — deep pink, cream, and a mixed posy — wrapped in blush tissue and organza ribbon."
            // The hero image is the LCP element: never lazy-load it, and ask the
            // browser to fetch it ahead of the JS bundle.
            fetchPriority="high"
            decoding="async"
            width={1672}
            height={941}
            className="absolute inset-0 -z-10 h-full w-full object-cover object-[72%_center] sm:object-center"
          />
        </picture>

        {/* Legibility scrim. The photo's left side is soft but not uniform, and
            it will change the day she swaps the picture — the gradient keeps the
            text readable regardless of what sits underneath. Heavier on mobile,
            where the crop pulls the bouquets much further left. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-ivory via-ivory/85 to-ivory/20 sm:via-ivory/70 sm:to-transparent"
        />

        <div className="mx-auto flex min-h-[540px] max-w-6xl items-center px-4 py-16 sm:px-6 md:min-h-[620px]">
          <div className="animate-stitch-in max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-marigold-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-marigold-500">
              <Heart size={13} aria-hidden /> Handmade to order
            </span>
            <h1 className="mt-5 font-display text-5xl leading-[1.05] text-indigo sm:text-6xl">
              Stitch . Style. <span className="stitch-underline text-pink">Smile</span>.
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink-muted">
              Crochet flowers, keychains, plushies, bouquets and hair accessories — each one
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
                className="inline-flex items-center rounded-full border border-indigo-200 bg-white/70 px-6 py-3 font-semibold text-indigo backdrop-blur-sm transition hover:bg-white"
              >
                Track my order
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Category tiles */}
      {tiles.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {tiles.map((cat) => (
              <Link
                key={cat.id}
                to={`/shop/${cat.slug}`}
                className="group relative flex h-32 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 to-pink-50 p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
              >
                <span className="font-display text-xl text-indigo">{cat.name}</span>
                <span className="flex items-center gap-1 text-sm text-ink-muted">
                  {cat.children.length > 0
                    ? `${cat.children.length} collection${cat.children.length === 1 ? '' : 's'}`
                    : 'Shop now'}
                  <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}

            {hasOverflow && (
              <button
                onClick={() => openCategories(true)}
                className="group flex h-32 flex-col justify-end rounded-2xl border border-dashed border-indigo-200 bg-white/60 p-5 text-left transition hover:-translate-y-1 hover:border-pink hover:shadow-lift"
              >
                <LayoutGrid size={20} className="mb-auto text-pink" aria-hidden />
                <span className="font-display text-xl text-indigo">All categories</span>
                <span className="flex items-center gap-1 text-sm text-ink-muted">
                  Browse all {categories!.length}
                  <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </span>
              </button>
            )}
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
