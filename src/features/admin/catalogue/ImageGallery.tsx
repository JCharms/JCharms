import { useRef, useState } from 'react'
import { Upload, Trash2, GripVertical, ArrowLeft, ArrowRight } from 'lucide-react'
import { useUploadImages, useDeleteImage, useReorderImages } from './hooks'
import { Card, Button } from '@/components/ui'
import { ProductImage } from '@/features/products/components/ProductImage'
import { validateImageFiles } from '@/lib/imageFile'
import { toast } from '@/store/ui'
import type { ProductImage as ProductImageRow } from '@/types/database'

/**
 * Product photo gallery: upload straight to Storage, drag-to-reorder (with
 * accessible arrow fallbacks), and delete. The first image is the primary one
 * shown on cards.
 */
export function ImageGallery({
  productId,
  images,
}: {
  productId: string
  images: ProductImageRow[]
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const upload = useUploadImages()
  const del = useDeleteImage()
  const reorder = useReorderImages()
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  function persistOrder(list: ProductImageRow[]) {
    reorder.mutate({
      productId,
      ordered: list.map((img, i) => ({ id: img.id, sort_order: i })),
    })
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length) return
    const next = [...images]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    persistOrder(next)
  }

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const list = Array.from(files)
    // Reject the whole batch up front: a half-uploaded gallery is worse than a
    // clear "that photo's too big, try again".
    const problem = validateImageFiles(list)
    if (problem) {
      toast.error(problem)
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    upload.mutate({ productId, files: list, startOrder: images.length })
    if (fileRef.current) fileRef.current.value = ''
  }

  // Mirror the storefront's choice: it uses the first real photo and ignores
  // placeholders entirely once one exists.
  const realImages = images.filter((img) => !img.is_placeholder)
  const primaryId = (realImages[0] ?? images[0])?.id

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-indigo">Photos</h2>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button size="sm" variant="outline" isLoading={upload.isPending} onClick={() => fileRef.current?.click()}>
          <Upload size={15} /> Upload
        </Button>
      </div>

      {images.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ivory-300 py-10 text-center text-sm text-ink-faint">
          {/* TODO: replace placeholder image once client sends real photos */}
          No photos yet — upload to replace the placeholder tile.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <li
              key={img.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== i) move(dragIndex, i)
                setDragIndex(null)
              }}
              className="group relative overflow-hidden rounded-xl border border-ivory-300 bg-white"
            >
              <div className="aspect-square">
                <ProductImage image={img} name="Product photo" className="h-full w-full" />
              </div>
              {img.is_placeholder ? (
                <span
                  title="Auto stand-in — it disappears from the shop as soon as you upload a real photo."
                  className="absolute left-1 top-1 rounded bg-ink-faint px-1.5 py-0.5 text-[10px] font-semibold text-white"
                >
                  Placeholder
                </span>
              ) : (
                img.id === primaryId && (
                  <span className="absolute left-1 top-1 rounded bg-pink px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Primary
                  </span>
                )
              )}
              <span className="absolute right-1 top-1 cursor-grab text-white/80 opacity-0 group-hover:opacity-100">
                <GripVertical size={14} />
              </span>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-indigo/70 px-1.5 py-1 opacity-0 transition group-hover:opacity-100">
                <button onClick={() => move(i, i - 1)} aria-label="Move left" className="text-white disabled:opacity-40" disabled={i === 0}>
                  <ArrowLeft size={14} />
                </button>
                <button
                  onClick={() => del.mutate({ id: img.id, productId })}
                  aria-label="Delete photo"
                  className="text-white hover:text-pink-200"
                >
                  <Trash2 size={14} />
                </button>
                <button onClick={() => move(i, i + 1)} aria-label="Move right" className="text-white disabled:opacity-40" disabled={i === images.length - 1}>
                  <ArrowRight size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-faint">
        Drag to reorder — the first real photo is the one shown on product cards.
        {images.some((i) => i.is_placeholder) &&
          ' Placeholder tiles vanish from the shop automatically once you upload a real photo.'}
      </p>
    </Card>
  )
}
