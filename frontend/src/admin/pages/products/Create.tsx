import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateAdminProduct, useAdminCategories } from '../../hooks'

export default function AdminProductCreate() {
  const nav = useNavigate()
  const create = useCreateAdminProduct()
  const { data: catData } = useAdminCategories({ limit: 100 })

  const [name, setName] = useState('')
  const [price, setPrice] = useState<number>(0)
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
  const [newSpecLabel, setNewSpecLabel] = useState('')
  const [newSpecValue, setNewSpecValue] = useState('')
  const [newSpecDetailLabel, setNewSpecDetailLabel] = useState('')
  const [newSpecDetailValue, setNewSpecDetailValue] = useState('')

  const onFilesChange = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files)
    setImages(arr)
    setImagePreviews(arr.map(f => URL.createObjectURL(f)))
  }
  const removeImagePreview = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    setImages(prev => prev.filter((_, i) => i !== index))
  }
  const removeColor = (index: number) =>
    setColors(prev => prev.filter((_, i) => i !== index))
  const removeSpec = (index: number) =>
    setSpecs(prev => prev.filter((_, i) => i !== index))
  const removeSpecDetail = (index: number) =>
    setSpecsDetail(prev => prev.filter((_, i) => i !== index))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const totalQty = colors.reduce((sum, c) => sum + Number(c.quantity || 0), 0)
    await (create as any).mutateAsync({
      name,
      price: Number(price),
      quantity: totalQty,
      category_id: Number(categoryId || 0),
      sub_category_id: subCategoryId === '' ? undefined : Number(subCategoryId),
      images,
      color: colors,
      product_colors: colors,
      specs,
      specs_detail: specsDetail
    })
    nav('/admin/products')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Add Product</h1>
        <button
          onClick={onSubmit as any}
          className="px-3 py-2 bg-green-600 text-white rounded"
        >
          Publish Product
        </button>
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
            <div className="h-32 rounded border flex items-center justify-center text-sm text-gray-500 mb-3">
              <label className="px-3 py-2 border rounded cursor-pointer">
                <input
                  multiple
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => onFilesChange(e.target.files)}
                />
                Browse
              </label>
            </div>
            <div className="flex gap-2 flex-wrap">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative">
                  <img
                    src={src}
                    className="h-16 w-16 object-cover rounded border"
                  />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center"
                    onClick={() => removeImagePreview(i)}
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
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
                  id="colorName"
                />
                <div className="grid grid-cols-2 gap-2 items-center">
                  <input
                    type="color"
                    className="border rounded h-8 w-full"
                    id="colorCode"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    className="border rounded px-2 py-1 text-sm w-full"
                    id="colorQty"
                  />
                </div>
                <button
                  type="button"
                  className="px-2 py-1 border rounded text-sm w-full"
                  onClick={() => {
                    const name = (
                      document.getElementById('colorName') as HTMLInputElement
                    ).value
                    const code = (
                      document.getElementById('colorCode') as HTMLInputElement
                    ).value
                    const qtyStr = (
                      document.getElementById('colorQty') as HTMLInputElement
                    ).value
                    const quantity = qtyStr ? Number(qtyStr) : 0
                    if (name && code)
                      setColors(prev => [...prev, { name, code, quantity }])
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
