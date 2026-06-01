const ToggleFilter = ({ label, checked, onChange }) => {
  return (
    <div className="mb-6 flex items-center justify-between">
      <span className="font-medium">{label}</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={onChange}
          className="sr-only peer" 
        />
        <div className="w-11 h-6 bg-blue-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
      </label>
    </div>
  );
};

export default ToggleFilter
