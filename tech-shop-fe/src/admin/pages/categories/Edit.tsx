import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdminCategory, useUpdateAdminCategory } from '../../hooks'

export default function AdminCategoryEdit() {
  const { id } = useParams()
  const cid = Number(id)
  const nav = useNavigate()
  const { data } = useAdminCategory(cid)
  const update = useUpdateAdminCategory(cid)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | undefined>(undefined)

  useEffect(() => {
    const c = data?.data?.data
    // depending on service response shape; fallback to data?.data
    const cat: any = c || (data as any)?.data
    if (cat) {
      setName(cat.name || '')
      setImageUrl(cat.image_url || '')
      setDescription(cat.description || '')
    }
  }, [data])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await (update as any).mutateAsync({
      category: { name, image_url: imageUrl, description },
      image: imageFile
    })
    nav('/admin/categories')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit Category</h1>
        <button
          onClick={onSubmit as any}
          className="px-3 py-2 bg-green-600 text-white rounded"
        >
          Save
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-white p-4 rounded border max-w-xl grid gap-3"
      >
        <input
          className="border rounded px-3 py-2"
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <textarea
          className="border rounded px-3 py-2"
          rows={3}
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <div className="grid gap-2">
          <label className="text-sm">Image</label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              className="border rounded px-3 py-2"
              onChange={e => {
                const f = e.target.files?.[0]
                setImageFile(f)
                if (f) setImageUrl('')
              }}
            />
          </div>
        </div>
      </form>
    </div>
  )
}
