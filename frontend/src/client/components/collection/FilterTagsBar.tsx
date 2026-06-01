import FilterTag from './FilterTag';

const FilterTagsBar = ({ tags, onRemoveTag }) => {
  return (
    <div className="border-b bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex gap-2 flex-wrap">
          {tags.map((tag, idx) => (
            <FilterTag key={idx} tag={tag} onRemove={onRemoveTag} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterTagsBar;
