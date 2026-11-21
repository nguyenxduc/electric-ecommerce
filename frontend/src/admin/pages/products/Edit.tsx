import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ImageOff } from 'lucide-react'
import {
  useAdminProduct,
  useCreateAdminProduct,
  useUpdateAdminProduct
} from '../../hooks'
import { useCategories } from '../../../client/hooks/useCategories'
import { useValidateToken } from '../../../client/hooks/useAuth'
import adminShopService from '../../services/shopService'
import { apiErrorMessage } from '../../../lib/apiError'
import VariantsEditor from './VariantsEditor'
import {
  VariantRow,
  variantsFromProduct,
  variantsToPayload,
  variantsTotal
} from './variantsUtil'
import { SpecDetailEntry, SpecEntry } from '../../types'

// Mot dong thong so chi tiet tren form; group rong = dong phang {label, value}
type SpecDetailRow = { group: string; label: string; value: string }

// API tra specs_detail dang nhom [{category, items:[{label,value}]}] hoac phang
const specsDetailToRows = (list: unknown): SpecDetailRow[] =>
  (Array.isArray(list) ? (list as SpecDetailEntry[]) : []).flatMap(e =>
    'items' in e && Array.isArray(e.items)
      ? e.items.map(i => ({ group: e.category, label: i.label, value: String(i.value) }))
      : 'label' in e
      ? [{ group: '', label: e.label, value: String(e.value) }]
      : []
  )

// Gom lai theo nhom de giu dung dinh dang trang chi tiet san pham doc
const rowsToSpecsDetail = (rows: SpecDetailRow[]): SpecDetailEntry[] => {
  const out: SpecDetailEntry[] = []
  for (const r of rows) {
    if (!r.group) {
      out.push({ label: r.label, value: r.value })
      continue
    }
    const g = out.find(e => 'items' in e && e.category === r.group)
    if (g && 'items' in g) g.items.push({ label: r.label, value: r.value })
    else out.push({ category: r.group, items: [{ label: r.label, value: r.value }] })
  }
  return out
}

// Anh tren form: URL da co (giu lai) hoac file moi chon (src = blob preview)
type ImageItem = { src: string; file?: File }

type FieldKey = 'shop' | 'name' | 'category' | 'price' | 'discount' | 'stock' | 'images'
// Thu tu cuon toi loi dau tien = thu tu hien tren man hinh
const FIELD_ORDER: FieldKey[] = ['shop', 'name', 'category', 'price', 'discount', 'stock', 'images']

const inputCls = (err?: string) =>
  `w-full border rounded px-3 py-2 ${err ? 'border-red-500' : ''}`

function Field({
  label,
  required,
  error,
  className = '',
  children
}: {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="block text-sm mb-1">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export default function AdminProductEdit({
  basePath = '/admin/products'
}: {
  basePath?: string
} = {}) {
  const { id } = useParams()
  // Route /products/new khong co :id; Create.tsx dung lai form nay
  const isNew = !id || id === 'new'
  const pid = isNew ? undefined : Number(id)
  const { data } = useAdminProduct(pid as number)
  const create = useCreateAdminProduct()
  const update = useUpdateAdminProduct(pid as number)
  const nav = useNavigate()

  // Endpoint cong khai: nguoi ban khong co quyen goi /categories/admin
  const { data: categories = [] } = useCategories()
  const { data: userData } = useValidateToken()
  const isAdmin = userData?.user?.role === 'admin'
  // Admin tao san pham phai chon shop; nguoi ban luon tao cho shop cua minh
  const { data: shopsData } = useQuery({
    queryKey: ['admin-shops', 'picker'],
    queryFn: () => adminShopService.list({ limit: 100 }),
    enabled: isAdmin && isNew
  })
  const [shopId, setShopId] = useState<number | ''>('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [discount, setDiscount] = useState<number | ''>('')
  const [stock, setStock] = useState<number | ''>('')
  const [weightGrams, setWeightGrams] = useState<number>(500)
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [subCategoryId, setSubCategoryId] = useState<number | ''>('')
  const [colors, setColors] = useState<
    { name: string; code: string; quantity?: number }[]
  >([])
  const [specs, setSpecs] = useState<SpecEntry[]>([])
  const [specsDetail, setSpecsDetail] = useState<SpecDetailRow[]>([])
  const [variants, setVariants] = useState<VariantRow[]>([])
  const [images, setImages] = useState<ImageItem[]>([])
  const [broken, setBroken] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newSpecLabel, setNewSpecLabel] = useState('')
  const [newSpecValue, setNewSpecValue] = useState('')
  const [newDetailGroup, setNewDetailGroup] = useState('')
  const [newSpecDetailLabel, setNewSpecDetailLabel] = useState('')
  const [newSpecDetailValue, setNewSpecDetailValue] = useState('')
  const [colorName, setColorName] = useState('')
  const [colorCode, setColorCode] = useState('#000000')
  const [colorQty, setColorQty] = useState<number | ''>('')
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const clearError = (k: FieldKey) =>
    setErrors(prev => (prev[k] ? { ...prev, [k]: undefined } : prev))

  useEffect(() => {
    if (!isNew && data?.data) {
      const p = data.data
      setName(p.name)
      setDescription(p.description ?? '')
      setPrice(Number(p.price))
      setDiscount(Number(p.discount || 0))
      setStock(Number(p.quantity || 0))
      setWeightGrams(Number(p.weight_grams) || 500)
      setCategoryId(Number(p.category_id))
      setSubCategoryId(p.sub_category_id ? Number(p.sub_category_id) : '')
      setColors(
        Array.isArray(p.available_colors) && p.available_colors.length > 0
          ? p.available_colors
          : Array.isArray(p.color)
          ? p.color
          : []
      )
      setVariants(variantsFromProduct(p.variants))
      setSpecs(Array.isArray(p.specs) ? p.specs : [])
      setSpecsDetail(specsDetailToRows(p.specs_detail))
      setImages((Array.isArray(p.img) ? p.img : []).map(src => ({ src })))
      setBroken([])
    }
  }, [data, isNew])

  const subCategories =
    categories.find(c => c.id === Number(categoryId))?.sub_categories ?? []

  // Ton kho lay tu bien the/mau neu co; khong thi nhap tay
  const derivedStock = variants.length
    ? variantsTotal(variants)
    : colors.length
    ? colors.reduce((s, c) => s + Number(c.quantity || 0), 0)
    : null

  // URL giu lai luu truoc, file moi noi sau (dung thu tu backend ghi) - anh dau la Cover
  const orderedImages = [
    ...images.filter(i => !i.file),
    ...images.filter(i => i.file)
  ]

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!arr.length) return
    // Noi them, khong thay the anh da chon
    setImages(prev => [
      ...prev,
      ...arr.map(file => ({ src: URL.createObjectURL(file), file }))
    ])
    clearError('images')
  }
  const addImageUrl = () => {
    const url = newImageUrl.trim()
    if (!url) return
    setImages(prev => [...prev, { src: url }])
    setNewImageUrl('')
    clearError('images')
  }
  const removeImage = (item: ImageItem) => {
    if (item.file) URL.revokeObjectURL(item.src)
    setImages(prev => prev.filter(i => i !== item))
  }

  const validate = () => {
    const e: Partial<Record<FieldKey, string>> = {}
    const priceNum = Number(price)
    const discountNum = Number(discount || 0)
    if (isAdmin && isNew && shopId === '') e.shop = 'Select a shop'
    if (!name.trim()) e.name = 'Product name is required'
    if (categoryId === '') e.category = 'Select a category'
    if (price === '' || !(priceNum > 0)) e.price = 'Price must be greater than 0'
    if (discountNum < 0 || (priceNum > 0 && discountNum >= priceNum))
      e.discount = 'Discount must be at least 0 and less than the price'
    if (derivedStock === null && (stock === '' || !Number.isInteger(Number(stock)) || Number(stock) < 0))
      e.stock = 'Stock must be a whole number of 0 or more'
    if (images.length === 0) e.images = 'Add at least one image'
    return e
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    const first = FIELD_ORDER.find(k => found[k])
    if (first) {
      const el = document.getElementById(`pf-${first}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) el.focus({ preventScroll: true })
      return
    }
    const colorsPayload = colors.map(c => ({
      name: c.name,
      code: c.code,
      quantity: Number(c.quantity || 0)
    }))
    const variantsPayload = variantsToPayload(variants)
    const payload = {
      name: name.trim(),
      description,
      price: Number(price),
      discount: Number(discount || 0),
      quantity: derivedStock ?? Number(stock),
      weight_grams: weightGrams || undefined,
      category_id: Number(categoryId),
      color: colorsPayload,
      product_colors: colorsPayload,
      specs,
      specs_detail: rowsToSpecsDetail(specsDetail),
      img: images.filter(i => !i.file).map(i => i.src),
      images: images.flatMap(i => (i.file ? [i.file] : []))
    }
    try {
      if (isNew) {
        await create.mutateAsync({
          ...payload,
          shop_id: isAdmin && shopId !== '' ? Number(shopId) : undefined,
          sub_category_id: subCategoryId === '' ? undefined : Number(subCategoryId),
          variants: variantsPayload.length ? variantsPayload : undefined
        })
      } else {
        await update.mutateAsync({
          ...payload,
          sub_category_id: subCategoryId === '' ? null : Number(subCategoryId),
          variants: variantsPayload // full set; missing ones are removed
        })
      }
      toast.success(isNew ? 'Product created' : 'Product updated')
      // Try to preserve page from referrer or go back in history
      if (document.referrer && document.referrer.includes(basePath)) {
        const referrerUrl = new URL(document.referrer)
        const referrerParams = referrerUrl.searchParams
        const page = referrerParams.get('page')
        const q = referrerParams.get('q')

        let backUrl = basePath
        const params = new URLSearchParams()
        if (page) params.set('page', page)
        if (q) params.set('q', q)
        if (params.toString()) backUrl += `?${params.toString()}`

        nav(backUrl)
      } else {
        nav(basePath)
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save product'))
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">
          {isNew ? 'Add Product' : 'Edit Product'}
        </h1>
        <button
          type="submit"
          form="product-form"
          className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-60"
          disabled={saving}
        >
          {saving ? 'Saving...' : isNew ? 'Publish Product' : 'Save'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <form id="product-form" onSubmit={onSubmit} noValidate className="space-y-4 min-w-0">
          <div className="bg-white rounded border p-4">
            <div className="font-semibold mb-3">Basic Information</div>
            <div className="grid md:grid-cols-2 gap-3">
              {isAdmin && isNew && (
                <Field label="Shop" required error={errors.shop} className="md:col-span-2">
                  <select
                    id="pf-shop"
                    className={inputCls(errors.shop)}
                    value={shopId}
                    onChange={e => {
                      setShopId(e.target.value ? Number(e.target.value) : '')
                      clearError('shop')
                    }}
                  >
                    <option value="">Select shop</option>
                    {shopsData?.data?.data?.shops?.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Product Name" required error={errors.name} className="md:col-span-2">
                <input
                  id="pf-name"
                  className={inputCls(errors.name)}
                  value={name}
                  onChange={e => {
                    setName(e.target.value)
                    clearError('name')
                  }}
                />
              </Field>
              <Field label="Category" required error={errors.category}>
                <select
                  id="pf-category"
                  className={inputCls(errors.category)}
                  value={categoryId}
                  onChange={e => {
                    setCategoryId(e.target.value ? Number(e.target.value) : '')
                    setSubCategoryId('')
                    clearError('category')
                  }}
                >
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Subcategory">
                <select
                  className={inputCls()}
                  value={subCategoryId}
                  disabled={subCategories.length === 0}
                  onChange={e =>
                    setSubCategoryId(e.target.value ? Number(e.target.value) : '')
                  }
                >
                  <option value="">None</option>
                  {subCategories.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Product Price" required error={errors.price}>
                <input
                  id="pf-price"
                  type="number"
                  min={0}
                  className={inputCls(errors.price)}
                  value={price}
                  onChange={e => {
                    setPrice(e.target.value === '' ? '' : Number(e.target.value))
                    clearError('price')
                  }}
                />
              </Field>
              <Field label="Discount (amount off price)" error={errors.discount}>
                <input
                  id="pf-discount"
                  type="number"
                  min={0}
                  className={inputCls(errors.discount)}
                  value={discount}
                  onChange={e => {
                    setDiscount(e.target.value === '' ? '' : Number(e.target.value))
                    clearError('discount')
                  }}
                />
              </Field>
              <Field label="Stock" required error={errors.stock}>
                <input
                  id="pf-stock"
                  type="number"
                  min={0}
                  step={1}
                  className={inputCls(errors.stock)}
                  value={derivedStock ?? stock}
                  disabled={derivedStock !== null}
                  onChange={e => {
                    setStock(e.target.value === '' ? '' : Number(e.target.value))
                    clearError('stock')
                  }}
                />
                {derivedStock !== null && (
                  <p className="text-xs text-gray-500 mt-1">
                    Total of {variants.length ? 'variants' : 'colors'}
                  </p>
                )}
              </Field>
              <Field label="Weight (grams, for shipping)">
                <input
                  type="number"
                  min={1}
                  className={inputCls()}
                  value={weightGrams}
                  onChange={e => setWeightGrams(Number(e.target.value))}
                />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <textarea
                  rows={5}
                  className={inputCls()}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </Field>
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
                        onClick={() => setSpecs(prev => prev.filter((_, i) => i !== idx))}
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
                    className="border rounded px-2 py-1 text-sm min-w-0"
                    value={newSpecLabel}
                    onChange={e => setNewSpecLabel(e.target.value)}
                  />
                  <input
                    placeholder="Value"
                    className="border rounded px-2 py-1 text-sm min-w-0"
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
                      {s.group && <span className="text-gray-500">{s.group} ·</span>}
                      <span className="font-medium">{s.label}:</span>
                      <span>{s.value}</span>
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center"
                        onClick={() => setSpecsDetail(prev => prev.filter((_, i) => i !== idx))}
                        aria-label="Remove spec detail"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                  <input
                    placeholder="Group (e.g. Display)"
                    className="border rounded px-2 py-1 text-sm min-w-0"
                    value={newDetailGroup}
                    onChange={e => setNewDetailGroup(e.target.value)}
                  />
                  <input
                    placeholder="Label"
                    className="border rounded px-2 py-1 text-sm min-w-0"
                    value={newSpecDetailLabel}
                    onChange={e => setNewSpecDetailLabel(e.target.value)}
                  />
                  <input
                    placeholder="Value"
                    className="border rounded px-2 py-1 text-sm min-w-0"
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
                            group: newDetailGroup.trim(),
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
          <VariantsEditor rows={variants} onChange={setVariants} skuBase={name} />
        </form>

        <div className="space-y-4 min-w-0">
          <div className="bg-white rounded border p-4">
            <div className="font-semibold mb-3">
              Images<span className="text-red-600"> *</span>
            </div>

            <div
              id="pf-images"
              onDragOver={e => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(false)
                addFiles(e.dataTransfer.files)
              }}
              className={`mb-3 border-2 border-dashed rounded-lg p-4 text-center ${
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : errors.images
                  ? 'border-red-400'
                  : 'border-gray-300'
              }`}
            >
              <label className="cursor-pointer block">
                <input
                  multiple
                  type="file"
                  accept="image/*"
                  className="hidden"
                  data-testid="product-image-input"
                  onChange={e => {
                    addFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
                <div className="text-gray-500 text-sm">
                  <div>Click to browse or drag and drop images</div>
                  <div className="text-xs mt-1">PNG, JPG, GIF up to 10MB. First image is the cover.</div>
                </div>
              </label>
            </div>
            {errors.images && <p className="text-xs text-red-600 -mt-2 mb-3">{errors.images}</p>}

            <div className="mb-3 flex gap-2">
              <input
                className="border rounded px-3 py-2 flex-1 min-w-0 text-sm"
                placeholder="Or paste image URL"
                value={newImageUrl}
                onChange={e => setNewImageUrl(e.target.value)}
              />
              <button type="button" className="px-3 py-2 border rounded text-sm" onClick={addImageUrl}>
                Add URL
              </button>
            </div>

            <div className="flex gap-2 flex-wrap">
              {orderedImages.map((item, i) => (
                <div key={`${i}-${item.src}`} className="relative">
                  {broken.includes(item.src) ? (
                    <div
                      className="h-20 w-20 rounded border bg-gray-100 text-gray-400 flex flex-col items-center justify-center text-[10px]"
                      title={item.src}
                    >
                      <ImageOff size={18} />
                      Broken link
                    </div>
                  ) : (
                    <img
                      src={item.src}
                      alt=""
                      className="h-20 w-20 object-cover rounded border bg-gray-100"
                      onError={() => setBroken(prev => [...prev, item.src])}
                    />
                  )}
                  {i === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center rounded-b">
                      Cover
                    </div>
                  )}
                  {item.file && (
                    <div className="absolute top-0 left-0 bg-green-500 text-white text-[10px] px-1 rounded-br">
                      NEW
                    </div>
                  )}
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center"
                    onClick={() => removeImage(item)}
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
              {orderedImages.length === 0 && (
                <div className="h-20 w-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">
                  No images
                </div>
              )}
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
                      onClick={() => setColors(prev => prev.filter((_, i) => i !== idx))}
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
