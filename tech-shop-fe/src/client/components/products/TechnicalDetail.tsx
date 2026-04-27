import { useState } from 'react'

type TechnicalDetail = {
  label: string
  value: string
}

interface TechnicalDetailProps {
  specs: TechnicalDetail[]
}

const TechnicalDetail = ({ specs }: TechnicalDetailProps) => {
  console.log("specs detail", specs)
  const [expanded, setExpanded] = useState(false)
  const visibleCount = expanded ? specs.length : 5
  return (
    <div className="w-full min-w-[500px] rounded-2xl bg-white p-5 sm:p-6 border-gray-100">
      <h2 className="text-xl sm:text-3xl font-semibold text-gray-900 mb-4">
        Technical Details
      </h2>

      <dl className="divide-y divide-gray-100">
        {specs?.slice(0, visibleCount).map((item, i) => (
          <div
            key={i}
            className={`flex justify-between py-3 px-3 ${
              i % 2 === 0 ? 'bg-gray-50' : ''
            }`}
          >
            <dt className="text-gray-600 font-medium w-1/3">{item.label}</dt>
            <dd className="text-gray-900 w-2/3 text-left">{item.value}</dd>
          </div>
        ))}
      </dl>

      {specs?.length > 5 && (
        <button
          className="mt-4 text-blue-600 hover:underline text-sm font-medium flex items-center gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              Show Less <span>▲</span>
            </>
          ) : (
            <>
              Show More <span>▼</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}

export default TechnicalDetail
