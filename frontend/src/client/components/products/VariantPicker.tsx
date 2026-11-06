import { useMemo, useState } from 'react'
import type { ProductVariant } from '../../types/product'

interface Props {
  variants: ProductVariant[]
  selectedId: number | null
  onSelect: (id: number | null) => void
}

const btn = (active: boolean, disabled = false) =>
  `px-3 py-2 rounded-lg border text-sm transition-all ${
    active
      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
      : 'border-gray-300 text-gray-700 hover:border-gray-400'
  } ${disabled ? 'opacity-40' : ''}`

const VariantPicker = ({ variants, selectedId, onSelect }: Props) => {
  const keys = useMemo(
    () => Array.from(new Set(variants.flatMap(v => Object.keys(v.attributes || {})))),
    [variants]
  )
  const [picked, setPicked] = useState<Record<string, string>>({})

  // No attributes: plain list by name
  if (keys.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Variant</h3>
        <div className="flex flex-wrap gap-2">
          {variants.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v.id)}
              className={btn(v.id === selectedId, v.quantity <= 0)}
            >
              {v.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const choose = (key: string, value: string) => {
    const next = { ...picked, [key]: value }
    setPicked(next)
    const match = variants.find(v =>
      keys.every(k => (v.attributes || {})[k] === next[k])
    )
    onSelect(match ? match.id : null)
  }

  const complete = keys.every(k => picked[k])
  const unavailable = complete && selectedId === null

  return (
    <div className="space-y-4">
      {keys.map(k => {
        const values = Array.from(
          new Set(variants.map(v => (v.attributes || {})[k]).filter(Boolean))
        )
        return (
          <div key={k}>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 capitalize">
              {k}
            </h3>
            <div className="flex flex-wrap gap-2">
              {values.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => choose(k, val)}
                  className={btn(picked[k] === val)}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        )
      })}
      {unavailable && (
        <p className="text-sm text-red-600">
          This combination is not available.
        </p>
      )}
    </div>
  )
}

export default VariantPicker
