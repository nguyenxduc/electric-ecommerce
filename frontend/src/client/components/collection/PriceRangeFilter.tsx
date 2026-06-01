import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

const PriceRangeFilter = ({ min, max, onChange }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-6">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full mb-3"
      >
        <span className="font-medium">Price</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <div>
          <div className="flex gap-2 mb-3">
            <input 
              type="text" 
              placeholder="min..." 
              value={min}
              onChange={(e) => onChange(e.target.value, max)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input 
              type="text" 
              placeholder="max..." 
              value={max}
              onChange={(e) => onChange(min, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <input 
            type="range" 
            min="0" 
            max="5000" 
            className="w-full accent-blue-600"
          />
        </div>
      )}
    </div>
  );
};

export default PriceRangeFilter