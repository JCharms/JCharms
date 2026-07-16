import { useRef, useState } from 'react'
import { Plus, Trash2, Eye, EyeOff, Star, ImagePlus, X } from 'lucide-react'
import {
  useAdminReviews,
  useCreateReview,
  useDeleteReview,
  useSetReviewPublished,
  useUpdateReview,
  useUploadReviewImage,
  useRemoveReviewImage,
} from './hooks'
import { reviewScreenshotUrl } from '@/data/reviews'
import { Card, Button, Input, Textarea, Select, LoadingBlock, Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { Review } from '@/types/database'

export function ReviewsPage() {
  const { data: reviews, isLoading } = useAdminReviews()
  const create = useCreateReview()
  const del = useDeleteReview()
  const setPublished = useSetReviewPublished()
  const update = useUpdateReview()
  const uploadImage = useUploadReviewImage()

  const [author, setAuthor] = useState('')
  const [rating, setRating] = useState('5')
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setAuthor('')
    setBody('')
    setRating('5')
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function add() {
    if (!author.trim() || !body.trim()) return
    create.mutate(
      {
        author_name: author.trim(),
        rating: Number(rating),
        body: body.trim(),
        is_published: true,
        sort_order: reviews?.length ?? 0,
      },
      {
        onSuccess: (review) => {
          // Attach the optional photo to the freshly-created review.
          if (file) uploadImage.mutate({ id: review.id, file })
          resetForm()
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-indigo">Reviews</h1>

      <Card className="space-y-4 p-6">
        <h2 className="font-display text-lg text-indigo">Add a testimonial</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <Input label="Author name" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Ananya R." />
          <Select label="Rating" value={rating} onChange={(e) => setRating(e.target.value)}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>
            ))}
          </Select>
        </div>
        <Textarea label="Testimonial" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />

        {/* Optional screenshot — uploaded straight from here, no bucket needed. */}
        <div>
          <span className="mb-1 block text-sm font-medium text-ink-muted">Photo / screenshot (optional)</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center gap-3">
              <img
                src={URL.createObjectURL(file)}
                alt="Selected preview"
                className="h-16 w-16 rounded-lg border border-ivory-300 object-cover"
              />
              <span className="text-sm text-ink-muted">{file.name}</span>
              <button
                type="button"
                onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                className="text-ink-faint hover:text-pink-600"
                aria-label="Remove selected photo"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <Button size="sm" variant="outline" type="button" onClick={() => fileRef.current?.click()}>
              <ImagePlus size={15} /> Choose image
            </Button>
          )}
        </div>

        <Button onClick={add} isLoading={create.isPending || uploadImage.isPending}>
          <Plus size={16} /> Add review
        </Button>
      </Card>

      {isLoading ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-3">
          {reviews?.map((r) => (
            <Card key={r.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-indigo">{r.author_name}</span>
                  {r.rating != null && (
                    <span className="flex">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} size={13} className="fill-marigold text-marigold" />
                      ))}
                    </span>
                  )}
                  <Badge tone={r.is_published ? 'sage' : 'neutral'}>
                    {r.is_published ? 'Published' : 'Hidden'}
                  </Badge>
                </div>
                <Textarea
                  defaultValue={r.body}
                  rows={2}
                  className="mt-2"
                  onBlur={(e) => {
                    if (e.target.value !== r.body) update.mutate({ id: r.id, patch: { body: e.target.value } })
                  }}
                />
                <ReviewImageControls review={r} />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setPublished.mutate({ id: r.id, value: !r.is_published })}
                  aria-label="Toggle published"
                  className={cn('rounded-lg p-2', r.is_published ? 'text-sage-400' : 'text-ink-faint')}
                >
                  {r.is_published ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
                <button
                  onClick={() => { if (confirm('Delete this review?')) del.mutate(r.id) }}
                  aria-label="Delete review"
                  className="rounded-lg p-2 text-ink-faint hover:bg-pink-50 hover:text-pink-600"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/** Per-review photo: shows the current screenshot with replace / remove, or an upload button. */
function ReviewImageControls({ review }: { review: Review }) {
  const upload = useUploadReviewImage()
  const remove = useRemoveReviewImage()
  const fileRef = useRef<HTMLInputElement>(null)
  const url = reviewScreenshotUrl(review.screenshot_path)

  function onPick(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    upload.mutate({ id: review.id, file: f, oldPath: review.screenshot_path })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="mt-2 flex items-center gap-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files)}
      />
      {url ? (
        <>
          <img src={url} alt="Review screenshot" className="h-16 w-16 rounded-lg border border-ivory-300 object-cover" />
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm text-pink-600 hover:underline disabled:opacity-50"
            disabled={upload.isPending}
          >
            Replace
          </button>
          <button
            onClick={() => remove.mutate({ id: review.id, path: review.screenshot_path })}
            className="text-sm text-ink-faint hover:text-pink-600 disabled:opacity-50"
            disabled={remove.isPending}
          >
            Remove
          </button>
        </>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()} isLoading={upload.isPending}>
          <ImagePlus size={14} /> Add photo
        </Button>
      )}
    </div>
  )
}
