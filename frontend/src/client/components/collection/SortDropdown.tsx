import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

type SortOption = { value: string; label: string }

type SortDropdownProps = {
  options: SortOption[]
  selected: string
  onSelect: (value: string) => void
}

// Menu sap xep. z-30: moi the san pham co lop link phu ca the (after:z-10) nam
// sau menu trong DOM, menu z-10 cu bi lop do de len nen bam lua chon khong an.
const SortDropdown = ({ options, selected, onSelect }: SortDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setIsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  const current = options.find(o => o.value === selected) ?? options[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="group inline-flex items-center gap-2 py-2 text-sm text-gray-600 hover:text-ink"
      >
        Sort by
        <span className="font-semibold text-ink">{current?.label}</span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 group-hover:text-ink ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Sort products"
          className="absolute left-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_20px_50px_-20px_rgb(23_24_27/0.35)] ring-1 ring-gray-200/80"
        >
          {options.map(option => {
            const active = option.value === selected
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onSelect(option.value)
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-paper ${
                    active ? 'font-semibold text-ink' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                  {active && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default SortDropdown
