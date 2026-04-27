import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  useAdminProduct,
  useCreateAdminProduct,
  useUpdateAdminProduct,
  useAdminCategories
} from '../../hooks'

export default function AdminProductEdit() {
  const { id } = useParams()
  const isNew = id === 'new'
  const pid = isNew ? undefined : Number(id)
  const { data, isLoading } = useAdminProduct(pid as number)
  const create = useCreateAdminProduct()
  const update = useUpdateAdminProduct(pid as number)
  const nav = useNavigate()

  const { data: catData } = useAdminCategories({ limit: 100 })

  const [name, setName] = useState('')
  const [price, setPrice] = useState<number>(0)
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [quantity, setQuantity] = useState<number>(0)
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [subCategoryId, setSubCategoryId] = useState<number | ''>('')
  const [colors, setColors] = useState<
    { name: string; code: string; quantity?: number }[]
  >([])
  const [specs, setSpecs] = useState<{ label: string; value: any }[]>([])
  const [specsDetail, setSpecsDetail] = useState<
    { label: string; value: any }[]
  >([])
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newSpecLabel, setNewSpecLabel] = useState('')
  const [newSpecValue, setNewSpecValue] = useState('')
  const [newSpecDetailLabel, setNewSpecDetailLabel] = useState('')
  const [newSpecDetailValue, setNewSpecDetailValue] = useState('')
  const [colorName, setColorName] = useState('')
  const [colorCode, setColorCode] = useState('#000000')
  const [colorQty, setColorQty] = useState<number | ''>('')

  useEffect(() => {
    if (!isNew && data?.data) {
      const p = data.data
      setName(p.name)
      setPrice(Number(p.price))
      setDiscountPercent(
        p.price
          ? Math.round((Number(p.discount || 0) / Number(p.price)) * 100)
          : 0
      )
      setQuantity(Number(p.quantity || 0))
      setCategoryId(Number(p.category_id))
      setSubCategoryId(p.sub_category_id ? Number(p.sub_category_id) : '')
      const colorArr = (
        Array.isArray(p.available_colors) && p.available_colors.length > 0
          ? p.available_colors
          : Array.isArray(p.color)
          ? p.color
          : []
      ) as any
      setColors(colorArr)
      setSpecs(Array.isArray(p.specs) ? (p.specs as any) : [])
      setSpecsDetail(
        Array.isArray(p.specs_detail) ? (p.specs_detail as any) : []
      )
      // Set existing images from the product data
      setExistingImages(Array.isArray(p.img) ? p.img : [])
      // Clear any previous file uploads when loading existing product
      setImages([])
      setImagePreviews([])
    }
  }, [data, isNew])

  const onFilesChange = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files)
    // Append new files to existing ones instead of replacing
    setImages(prev => [...prev, ...arr])
    setImagePreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))])
  }
  const addImageUrl = () => {
    const url = newImageUrl.trim()
    if (!url) return
    setImageUrls(prev => [...prev, url])
    setNewImageUrl('')
  }
  const removeImageUrl = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index))
  }
  const removeImagePreview = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    setImages(prev => prev.filter((_, i) => i !== index))
  }
  const removeColor = (index: number) => {
    setColors(prev => prev.filter((_, i) => i !== index))
  }
  const removeSpec = (index: number) => {
    setSpecs(prev => prev.filter((_, i) => i !== index))
  }
  const removeSpecDetail = (index: number) => {
    setSpecsDetail(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const colorsPayload = colors.map(c => ({
      name: c.name,
      code: c.code,
      quantity: Number(c.quantity || 0)
    }))
    const totalQty = colorsPayload.reduce(
      (s, c) => s + Number(c.quantity || 0),
      0
    )
    try {
      if (isNew) {
        await (create as any).mutateAsync({
          name,
          price: Number(price),
          quantity: totalQty,
          category_id: Number(categoryId || 0),
          sub_category_id:
            subCategoryId === '' ? undefined : Number(subCategoryId),
          img: imageUrls,
          color: colorsPayload,
          product_colors: colorsPayload,
          specs,
          specs_detail: specsDetail
        })
      } else {
        const discountAmount =
          (Number(price) * Number(discountPercent || 0)) / 100
        await (update as any).mutateAsync({
          name,
          price: Number(price),
          discount: Number(discountAmount.toFixed(2)),
          quantity: totalQty,
          category_id: categoryId === '' ? undefined : Number(categoryId),
          sub_category_id: subCategoryId === '' ? null : Number(subCategoryId),
          color: colorsPayload,
          product_colors: colorsPayload,
          img: [...existingImages, ...imageUrls], // Combine existing and new URL images
          images, // New file uploads
          specs, // ✅ ADD: specs
          specs_detail: specsDetail // ✅ ADD: specs_detail
        })
      }
      toast.success(isNew ? 'Product created' : 'Product updated')
      // Try to preserve page from referrer or go back in history
      if (document.referrer && document.referrer.includes('/admin/products')) {
        const referrerUrl = new URL(document.referrer)
        const referrerParams = referrerUrl.searchParams
        const page = referrerParams.get('page')
        const q = referrerParams.get('q')

        let backUrl = '/admin/products'
        const params = new URLSearchParams()
        if (page) params.set('page', page)
        if (q) params.set('q', q)
        if (params.toString()) backUrl += `?${params.toString()}`

        nav(backUrl)
      } else {
        nav('/admin/products')
      }
    } catch (err) {
      toast.error('Failed to save product')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">
            {isNew ? 'Add Product' : 'Edit Product'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button className="px-3 py-2 border rounded">Save to draft</button>
          )}
          <button
            onClick={onSubmit as any}
            className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-60"
            disabled={create.isPending || update.isPending}
          >
            {create.isPending || update.isPending
              ? 'Saving...'
              : isNew
              ? 'Publish Product'
              : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="bg-white rounded border p-4">
            <div className="font-semibold mb-3">Basic Information</div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Product Name</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Category</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={categoryId}
                  onChange={e =>
                    setCategoryId(e.target.value ? Number(e.target.value) : '')
                  }
                >
                  <option value="">Select category</option>
                  {catData?.data?.categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Product Price</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  value={price === 0 ? '' : price}
                  onChange={e =>
                    setPrice(e.target.value === '' ? 0 : Number(e.target.value))
                  }
                />
              </div>
              {!isNew && (
                <div>
                  <label className="block text-sm mb-1">Discount (%)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={discountPercent}
                    onChange={e => setDiscountPercent(Number(e.target.value))}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded border p-4">
            <div className="font-semibold mb-3">Specifications</div>
            <div className="grid gap-6">
              <div>
                <label className="block text-sm mb-2">Specs</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {specs.map((s, idx) => (
                    <div
                      key={idx}
                      className="relative text-sm flex items-center gap-2 pr-6 border rounded px-2 py-1"
                    >
                      <span className="font-medium">{s.label}:</span>
                      <span>{String(s.value)}</span>
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center"
                        onClick={() => removeSpec(idx)}
                        aria-label="Remove spec"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <input
                    placeholder="Label"
                    className="border rounded px-2 py-1 text-sm"
                    value={newSpecLabel}
                    onChange={e => setNewSpecLabel(e.target.value)}
                  />
                  <input
                    placeholder="Value"
                    className="border rounded px-2 py-1 text-sm"
                    value={newSpecValue}
                    onChange={e => setNewSpecValue(e.target.value)}
                  />
                  <button
                    type="button"
                    className="px-2 py-1 border rounded text-sm"
                    onClick={() => {
                      if (newSpecLabel && newSpecValue) {
                        setSpecs(prev => [
                          ...prev,
                          { label: newSpecLabel, value: newSpecValue }
                        ])
                        setNewSpecLabel('')
                        setNewSpecValue('')
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm mb-2">Specs Detail</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {specsDetail.map((s, idx) => (
                    <div
                      key={idx}
                      className="relative text-sm flex items-center gap-2 pr-6 border rounded px-2 py-1"
                    >
                      <span className="font-medium">{s.label}:</span>
                      <span>{String(s.value)}</span>
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center"
                        onClick={() => removeSpecDetail(idx)}
                        aria-label="Remove spec detail"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <input
                    placeholder="Label"
                    className="border rounded px-2 py-1 text-sm"
                    value={newSpecDetailLabel}
                    onChange={e => setNewSpecDetailLabel(e.target.value)}
                  />
                  <input
                    placeholder="Value"
                    className="border rounded px-2 py-1 text-sm"
                    value={newSpecDetailValue}
                    onChange={e => setNewSpecDetailValue(e.target.value)}
                  />
                  <button
                    type="button"
                    className="px-2 py-1 border rounded text-sm"
                    onClick={() => {
                      if (newSpecDetailLabel && newSpecDetailValue) {
                        setSpecsDetail(prev => [
                          ...prev,
                          {
                            label: newSpecDetailLabel,
                            value: newSpecDetailValue
                          }
                        ])
                        setNewSpecDetailLabel('')
                        setNewSpecDetailValue('')
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="space-y-4">
          <div className="bg-white rounded border p-4">
            <div className="font-semibold mb-3">Images</div>

            {/* Image URL Input */}
            <div className="mb-4">
              <label className="block text-sm mb-2">Add Image URL</label>
              <div className="flex gap-2">
                <input
                  className="border rounded px-3 py-2 flex-1"
                  placeholder="Paste image URL"
                  value={newImageUrl}
                  onChange={e => setNewImageUrl(e.target.value)}
                />
                <button
                  type="button"
                  className="px-3 py-2 border rounded"
                  onClick={addImageUrl}
                >
                  Add URL
                </button>
              </div>
            </div>

            {/* File Upload */}
            {!isNew && (
              <div className="mb-4">
                <label className="block text-sm mb-2">Upload New Images</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <label className="cursor-pointer">
                    <input
                      multiple
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => onFilesChange(e.target.files)}
                    />
                    <div className="text-gray-500">
                      <div className="text-lg mb-2">📁</div>
                      <div>Click to browse files or drag and drop</div>
                      <div className="text-xs mt-1">
                        PNG, JPG, GIF up to 10MB
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Current Images */}
            <div>
              <label className="block text-sm mb-2">Current Images</label>
              <div className="flex gap-2 flex-wrap">
                {/* Existing Images from Product */}
                {existingImages.map((src, i) => (
                  <div key={`existing-${i}`} className="relative group">
                    <img
                      src={src}
                      className="h-20 w-20 object-cover rounded border"
                      onError={e => {
                        e.currentTarget.src =
                          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiAxNkM4LjY4NjI5IDE2IDYgMTMuMzEzNyA2IDEwQzYgNi42ODYyOSA4LjY4NjI5IDQgMTIgNEMxNS4zMTM3IDQgMTggNi42ODYyOSAxOCAxMEMxOCAxMy4zMTM3IDE1LjMxMzcgMTYgMTIgMTZaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0xMiAxNEMxMy4xMDQ2IDE0IDE0IDEzLjEwNDYgMTQgMTJDMTQgMTAuODk1NCAxMy4xMDQ2IDEwIDEyIDEwQzEwLjg5NTQgMTAgMTAgMTAuODk1NCAxMCAxMkMxMCAxMy4xMDQ2IDEwLjg5NTQgMTQgMTIgMTRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'
                      }}
                    />
                    <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs px-1 rounded-bl">
                      EXISTING
                    </div>
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() =>
                        setExistingImages(prev =>
                          prev.filter((_, idx) => idx !== i)
                        )
                      }
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* URL Images */}
                {imageUrls.map((src, i) => (
                  <div key={`url-${i}`} className="relative group">
                    <img
                      src={src}
                      className="h-20 w-20 object-cover rounded border"
                      onError={e => {
                        e.currentTarget.src =
                          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiAxNkM4LjY4NjI5IDE2IDYgMTMuMzEzNyA2IDEwQzYgNi42ODYyOSA4LjY4NjI5IDQgMTIgNEMxNS4zMTM3IDQgMTggNi42ODYyOSAxOCAxMEMxOCAxMy4zMTM3IDE1LjMxMzcgMTYgMTIgMTZaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0xMiAxNEMxMy4xMDQ2IDE0IDE0IDEzLjEwNDYgMTQgMTJDMTQgMTAuODk1NCAxMy4xMDQ2IDEwIDEyIDEwQzEwLjg5NTQgMTAgMTAgMTAuODk1NCAxMCAxMkMxMCAxMy4xMDQ2IDEwLjg5NTQgMTQgMTIgMTRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'
                      }}
                    />
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-1 rounded-bl">
                      URL
                    </div>
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImageUrl(i)}
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* File Images */}
                {imagePreviews.map((src, i) => (
                  <div key={`file-${i}`} className="relative group">
                    <img
                      src={src}
                      className="h-20 w-20 object-cover rounded border"
                    />
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-1 rounded-bl">
                      NEW FILE
                    </div>
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImagePreview(i)}
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Empty state */}
                {existingImages.length === 0 &&
                  imageUrls.length === 0 &&
                  imagePreviews.length === 0 && (
                    <div className="h-20 w-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">
                      No images
                    </div>
                  )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded border p-4">
            <div className="font-semibold mb-3">Colors</div>
            <div className="grid gap-4">
              <div className="flex gap-2 flex-wrap">
                {colors.map((c, idx) => (
                  <div
                    key={idx}
                    className="relative flex items-center gap-2 text-sm border rounded pl-2 pr-6 py-1"
                  >
                    <div
                      className="h-4 w-4 rounded"
                      style={{ background: c.code }}
                    />
                    <span>{c.name}</span>
                    <span className="text-gray-500">x{c.quantity ?? 0}</span>
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center"
                      onClick={() => removeColor(idx)}
                      aria-label="Remove color"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid gap-2">
                <input
                  placeholder="Color name"
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={colorName}
                  onChange={e => setColorName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2 items-center">
                  <input
                    type="color"
                    className="border rounded h-8 w-full"
                    value={colorCode}
                    onChange={e => setColorCode(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    min={0}
                    className="border rounded px-2 py-1 text-sm w-full"
                    value={colorQty}
                    onChange={e =>
                      setColorQty(
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                  />
                </div>
                <button
                  type="button"
                  className="px-2 py-1 border rounded text-sm w-full"
                  onClick={() => {
                    if (!colorName.trim() || !colorCode) return
                    const quantity = colorQty === '' ? 0 : Number(colorQty)
                    setColors(prev => [
                      ...prev,
                      { name: colorName.trim(), code: colorCode, quantity }
                    ])
                    setColorName('')
                    setColorCode('#000000')
                    setColorQty('')
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
