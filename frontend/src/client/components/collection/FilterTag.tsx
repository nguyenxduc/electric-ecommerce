import { X } from "lucide-react"

const FilterTag = ({ tag, onRemove }) => {
  return (
    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-full px-4 py-2 text-sm">
      <span>{tag}</span>
      <button onClick={() => onRemove(tag)} className="hover:text-red-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default FilterTag