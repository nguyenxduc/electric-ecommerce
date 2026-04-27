# Frontend Filter Implementation Example

## 1. Filter State Management

### React Hook cho Filter State:

```typescript
import { useState, useEffect } from "react";

interface FilterOption {
  key: string;
  label: string;
  options: string[];
}

interface FilterState {
  [key: string]: string[]; // key -> selected values array
}

export const useProductFilters = () => {
  const [filters, setFilters] = useState<FilterState>({});
  const [availableFilters, setAvailableFilters] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Load available filters from API
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const response = await fetch("/api/filters/metadata");
        const data = await response.json();
        if (data.success) {
          setAvailableFilters(data.data);
        }
      } catch (error) {
        console.error("Failed to load filters:", error);
      }
    };
    loadFilters();
  }, []);

  // Add/remove filter value (OR logic within same key)
  const toggleFilterValue = (filterKey: string, value: string) => {
    setFilters((prev) => {
      const currentValues = prev[filterKey] || [];
      const isSelected = currentValues.includes(value);

      if (isSelected) {
        // Remove value
        const newValues = currentValues.filter((v) => v !== value);
        if (newValues.length === 0) {
          const { [filterKey]: removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [filterKey]: newValues };
      } else {
        // Add value
        return { ...prev, [filterKey]: [...currentValues, value] };
      }
    });
  };

  // Clear all filters
  const clearFilters = () => setFilters({});

  // Clear specific filter key
  const clearFilterKey = (filterKey: string) => {
    setFilters((prev) => {
      const { [filterKey]: removed, ...rest } = prev;
      return rest;
    });
  };

  // Convert filters to query string
  const getQueryString = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, values]) => {
      if (values.length > 0) {
        params.set(key, values.join(","));
      }
    });
    return params.toString();
  };

  // Check if a filter value is selected
  const isFilterSelected = (filterKey: string, value: string) => {
    return filters[filterKey]?.includes(value) || false;
  };

  // Get selected count for a filter key
  const getSelectedCount = (filterKey: string) => {
    return filters[filterKey]?.length || 0;
  };

  return {
    filters,
    availableFilters,
    loading,
    toggleFilterValue,
    clearFilters,
    clearFilterKey,
    getQueryString,
    isFilterSelected,
    getSelectedCount,
  };
};
```

## 2. Filter UI Components

### Filter Sidebar Component:

```tsx
import React from "react";
import { useProductFilters } from "./useProductFilters";

interface FilterSidebarProps {
  onFiltersChange: (queryString: string) => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  onFiltersChange,
}) => {
  const {
    availableFilters,
    toggleFilterValue,
    clearFilters,
    clearFilterKey,
    getQueryString,
    isFilterSelected,
    getSelectedCount,
  } = useProductFilters();

  // Notify parent when filters change
  React.useEffect(() => {
    onFiltersChange(getQueryString());
  }, [getQueryString, onFiltersChange]);

  return (
    <div className="filter-sidebar">
      <div className="filter-header">
        <h3>Bộ lọc</h3>
        <button onClick={clearFilters} className="clear-all-btn">
          Xóa tất cả
        </button>
      </div>

      {availableFilters.map((filter) => (
        <div key={filter.key} className="filter-group">
          <div className="filter-group-header">
            <h4>{filter.label}</h4>
            {getSelectedCount(filter.key) > 0 && (
              <button
                onClick={() => clearFilterKey(filter.key)}
                className="clear-filter-btn"
              >
                Xóa ({getSelectedCount(filter.key)})
              </button>
            )}
          </div>

          <div className="filter-options">
            {filter.options.map((option) => (
              <label key={option} className="filter-option">
                <input
                  type="checkbox"
                  checked={isFilterSelected(filter.key, option)}
                  onChange={() => toggleFilterValue(filter.key, option)}
                />
                <span className="checkmark"></span>
                <span className="option-label">{option}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Active Filters Display:

```tsx
import React from "react";

interface ActiveFiltersProps {
  filters: { [key: string]: string[] };
  availableFilters: { key: string; label: string; options: string[] }[];
  onRemoveFilter: (filterKey: string, value: string) => void;
  onClearAll: () => void;
}

export const ActiveFilters: React.FC<ActiveFiltersProps> = ({
  filters,
  availableFilters,
  onRemoveFilter,
  onClearAll,
}) => {
  const activeFilterCount = Object.values(filters).reduce(
    (sum, values) => sum + values.length,
    0
  );

  if (activeFilterCount === 0) return null;

  const getFilterLabel = (key: string) => {
    return availableFilters.find((f) => f.key === key)?.label || key;
  };

  return (
    <div className="active-filters">
      <div className="active-filters-header">
        <span>Đang lọc ({activeFilterCount})</span>
        <button onClick={onClearAll} className="clear-all-btn">
          Xóa tất cả
        </button>
      </div>

      <div className="active-filter-tags">
        {Object.entries(filters).map(([filterKey, values]) =>
          values.map((value) => (
            <div key={`${filterKey}-${value}`} className="filter-tag">
              <span className="filter-tag-label">
                {getFilterLabel(filterKey)}: {value}
              </span>
              <button
                onClick={() => onRemoveFilter(filterKey, value)}
                className="filter-tag-remove"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
```

## 3. Product List Integration

### Product List Component:

```tsx
import React, { useState, useEffect } from "react";
import { FilterSidebar } from "./FilterSidebar";
import { ActiveFilters } from "./ActiveFilters";
import { useProductFilters } from "./useProductFilters";

interface Product {
  id: string;
  name: string;
  price: number;
  final_price: number;
  discount_percentage: number;
  img: string[];
  rating: number;
}

export const ProductListPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
  });

  const {
    filters,
    availableFilters,
    toggleFilterValue,
    clearFilters,
    getQueryString,
  } = useProductFilters();

  // Load products when filters change
  const loadProducts = async (queryString: string, page: number = 1) => {
    setLoading(true);
    try {
      const url = `/api/products?page=${page}&limit=20${
        queryString ? "&" + queryString : ""
      }`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setProducts(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load products when filters change
  useEffect(() => {
    loadProducts(getQueryString());
  }, [getQueryString]);

  return (
    <div className="product-list-page">
      <div className="page-container">
        <div className="sidebar">
          <FilterSidebar onFiltersChange={() => {}} />
        </div>

        <div className="main-content">
          <ActiveFilters
            filters={filters}
            availableFilters={availableFilters}
            onRemoveFilter={toggleFilterValue}
            onClearAll={clearFilters}
          />

          <div className="products-header">
            <h2>Sản phẩm ({pagination.total_count})</h2>
            {loading && <span className="loading">Đang tải...</span>}
          </div>

          <div className="products-grid">
            {products.map((product) => (
              <div key={product.id} className="product-card">
                <img src={product.img[0]} alt={product.name} />
                <h3>{product.name}</h3>
                <div className="price">
                  <span className="final-price">
                    {product.final_price.toLocaleString()}đ
                  </span>
                  {product.discount_percentage > 0 && (
                    <>
                      <span className="original-price">
                        {product.price.toLocaleString()}đ
                      </span>
                      <span className="discount">
                        -{product.discount_percentage}%
                      </span>
                    </>
                  )}
                </div>
                <div className="rating">⭐ {product.rating}</div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="pagination">
            {Array.from(
              { length: pagination.total_pages },
              (_, i) => i + 1
            ).map((page) => (
              <button
                key={page}
                className={page === pagination.current_page ? "active" : ""}
                onClick={() => loadProducts(getQueryString(), page)}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
```

## 4. CSS Styles

```css
.filter-sidebar {
  width: 280px;
  padding: 20px;
  border-right: 1px solid #e0e0e0;
  background: #f9f9f9;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.filter-group {
  margin-bottom: 24px;
}

.filter-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.filter-group-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.clear-filter-btn {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  font-size: 12px;
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 0;
}

.filter-option input[type="checkbox"] {
  margin: 0;
}

.active-filters {
  margin-bottom: 20px;
  padding: 16px;
  background: #f0f8ff;
  border-radius: 8px;
}

.active-filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.active-filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tag {
  display: flex;
  align-items: center;
  background: #007bff;
  color: white;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 12px;
}

.filter-tag-remove {
  background: none;
  border: none;
  color: white;
  margin-left: 4px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.product-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: white;
  transition: box-shadow 0.2s;
}

.product-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 40px;
}

.pagination button {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  background: white;
  cursor: pointer;
  border-radius: 4px;
}

.pagination button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}
```

## 5. API Integration Examples

### Fetch Products với Multiple Filters:

```javascript
// Example API calls with new filter logic

// Single filter
GET /api/products?brand=apple

// Multiple values in same filter (OR logic)
GET /api/products?brand=apple,samsung,xiaomi

// Multiple filters (AND logic between keys)
GET /api/products?brand=apple,samsung&ram=8,16&price_range=500-1000

// Complex filtering
GET /api/products?brand=apple,samsung&ram=8,16,32&rating=4+&discount=true&category=smartphones
```

### Filter Metadata API:

```javascript
// Get available filters for a category
GET /api/filters/metadata?category_id=1

// Response:
{
  "success": true,
  "data": [
    {
      "key": "brand",
      "label": "Thương hiệu",
      "options": ["Apple", "Samsung", "Xiaomi", "Dell", "HP"]
    },
    {
      "key": "ram",
      "label": "RAM",
      "options": ["4GB", "8GB", "16GB", "32GB"]
    },
    {
      "key": "price_range",
      "label": "Khoảng giá",
      "options": ["Dưới 500.000đ", "500.000đ - 1.000.000đ", "1.000.000đ - 2.000.000đ", "Trên 2.000.000đ"]
    }
  ]
}
```

Hệ thống filter này cung cấp:

- **OR logic** trong cùng filter key (chọn nhiều brand, nhiều RAM)
- **AND logic** giữa các filter keys khác nhau
- UI thân thiện với checkbox và active filter tags
- Performance tốt với pagination
- Dễ dàng mở rộng thêm filter types mới
