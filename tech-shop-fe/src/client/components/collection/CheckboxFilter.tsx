import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

type CheckboxFilterProps = {
  label: string
  options: string[]
  selectedValues: string[]
  onChange: (value: string) => void
}

const CheckboxFilter = ({
  label,
  options,
  selectedValues,
  onChange
}: CheckboxFilterProps) => {
  const [expanded, setExpanded] = useState(true)

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full mb-3"
      >
        <span className="font-medium">{label}</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      {expanded && (
        <div className="space-y-2">
          {options.map((option, idx) => (
            <label key={idx} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedValues.includes(option)}
                onChange={() => onChange(option)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default CheckboxFilter
