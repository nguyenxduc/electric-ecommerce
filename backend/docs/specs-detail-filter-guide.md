# Specs Detail Filter Guide

## 🎯 Mục Đích

Hướng dẫn cách hệ thống filter xử lý cả `specs` và `specs_detail` với cấu trúc nested để tạo filter options tự động.

## 📊 Cấu Trúc Dữ Liệu

### 1. Specs (Flat Structure)

```json
{
  "specs": [
    { "label": "Brand", "value": "Apple" },
    { "label": "RAM", "value": "8GB" },
    { "label": "Processor", "value": "A17 Pro" }
  ]
}
```

### 2. Specs Detail (Nested Structure)

```json
{
  "specs_detail": [
    {
      "category": "Display",
      "items": [
        { "label": "Screen Size", "value": "6.7 inch" },
        { "label": "Technology", "value": "Super Retina XDR" },
        { "label": "Resolution", "value": "2796 x 1290" }
      ]
    },
    {
      "category": "Performance",
      "items": [
        { "label": "Chip", "value": "A17 Pro" },
        { "label": "RAM", "value": "8GB" },
        { "label": "Storage", "value": "256GB" }
      ]
    }
  ]
}
```

## 🔧 Sync Process

### 1. Automatic Label Mapping

Hệ thống tự động map labels thành filter keys:

| Label Contains            | Filter Key       | Display Label    |
| ------------------------- | ---------------- | ---------------- |
| "brand"                   | brand            | Brand            |
| "ram"                     | ram              | RAM              |
| "screen", "display"       | screen_size      | Screen Size      |
| "processor", "cpu"        | processor        | Processor        |
| "chip"                    | chip             | Chip             |
| "gpu", "graphics"         | gpu_brand        | GPU Brand        |
| "storage", "ssd", "drive" | drive_size       | Drive Size       |
| "camera"                  | camera           | Camera           |
| "battery"                 | battery          | Battery          |
| "os", "operating"         | operating_system | Operating System |

### 2. Processing Logic

```javascript
// Process specs (flat)
specs.forEach((spec) => processSpec(spec, categoryId, filterMap));

// Process specs_detail (nested)
specs_detail.forEach((category) => {
  category.items?.forEach((item) => processSpec(item, categoryId, filterMap));
});
```

## 🧪 Testing

### 1. Create Sample Data

```bash
cd backend
node test-specs-sync.js --create-samples
```

### 2. Test Sync Function

```bash
node test-specs-sync.js --test
```

### 3. Manual API Test

```bash
# Sync filters from products
curl -X POST "http://localhost:5000/api/filters/sync" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get filter metadata
curl "http://localhost:5000/api/filters/metadata"
```

## 📋 Expected Results

### Before Sync:

- No filter keys/options exist
- Products have specs and specs_detail data

### After Sync:

- Filter keys created automatically based on labels
- Filter options populated with unique values
- Both flat specs and nested specs_detail processed

### Example Output:

```json
{
  "success": true,
  "message": "Synced filter options: 8 keys created, 45 options created, 0 options updated",
  "data": {
    "keysCreated": 8,
    "optionsCreated": 45,
    "optionsUpdated": 0,
    "total": 45
  }
}
```

## 🎨 Filter Keys Generated

### From Sample Data:

1. **Brand**: Apple, Samsung
2. **RAM**: 8GB, 12GB, 18GB
3. **Chip**: A17 Pro, M3 Pro
4. **Processor**: Snapdragon 8 Gen 3
5. **Screen Size**: 6.7 inch, 6.8 inch, 16 inch
6. **Storage**: 256GB, 512GB, 512GB SSD
7. **Camera**: 48MP, 200MP, 12MP
8. **Battery**: 4441mAh, 5000mAh, 100Wh
9. **Operating System**: macOS Sonoma

## 🔍 Verification Steps

### 1. Check Filter Keys

```sql
SELECT * FROM filter_keys ORDER BY "order", key;
```

### 2. Check Filter Options

```sql
SELECT
  fk.key,
  fk.label,
  fo.value,
  fo.display_value
FROM filter_options fo
JOIN filter_keys fk ON fo.filter_key_id = fk.id
ORDER BY fk.key, fo.value;
```

### 3. Test Product Filtering

```bash
# Test brand filter
curl "http://localhost:5000/api/products?brand=apple"

# Test multiple filters
curl "http://localhost:5000/api/products?brand=apple,samsung&ram=8,12"
```

## 🚀 Production Usage

### 1. Initial Setup

```bash
# Run seed to create sample products
npm run seed

# Sync filters from existing products
curl -X POST "http://localhost:5000/api/filters/sync" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 2. Regular Maintenance

```bash
# Re-sync when new products are added
curl -X POST "http://localhost:5000/api/filters/sync" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 3. Category-Specific Sync

```bash
# Sync filters for specific category
curl -X POST "http://localhost:5000/api/filters/sync?category_id=1" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## 📝 Best Practices

### 1. Product Data Structure

- Use consistent label naming in specs
- Include both specs and specs_detail for comprehensive filtering
- Group related specs in specs_detail categories

### 2. Label Conventions

```json
// Good - consistent naming
{ "label": "RAM", "value": "8GB" }
{ "label": "Screen Size", "value": "6.7 inch" }
{ "label": "Brand", "value": "Apple" }

// Avoid - inconsistent naming
{ "label": "Memory", "value": "8GB" }  // Use "RAM" instead
{ "label": "Display", "value": "6.7 inch" }  // Use "Screen Size" instead
```

### 3. Value Formatting

```json
// Good - standardized values
{ "label": "RAM", "value": "8GB" }
{ "label": "Storage", "value": "256GB" }

// Avoid - inconsistent formatting
{ "label": "RAM", "value": "8 GB" }  // Extra space
{ "label": "Storage", "value": "256gb" }  // Lowercase
```

## 🔧 Troubleshooting

### 1. No Filter Options Created

**Problem**: Sync runs but no options created
**Solution**:

- Check product specs/specs_detail format
- Verify labels match mapping rules
- Check for empty/null values

### 2. Duplicate Filter Options

**Problem**: Same option appears multiple times
**Solution**:

- Sync function handles duplicates automatically
- Check unique constraint on filter_options table

### 3. Missing Filter Keys

**Problem**: Expected filter key not created
**Solution**:

- Add label mapping in `processSpec` function
- Ensure label contains expected keywords

### 4. Performance Issues

**Problem**: Sync takes too long
**Solution**:

- Run sync for specific categories
- Optimize product query with proper indexes
- Consider batch processing for large datasets

## 📊 Monitoring

### 1. Sync Performance

```javascript
// Monitor sync execution time
console.time("filter-sync");
await syncFilterOptionsFromProducts();
console.timeEnd("filter-sync");
```

### 2. Filter Usage Analytics

```sql
-- Most used filters
SELECT
  fk.key,
  fk.label,
  COUNT(*) as usage_count
FROM product_filter_values pfv
JOIN filter_keys fk ON pfv.filter_key_id = fk.id
GROUP BY fk.key, fk.label
ORDER BY usage_count DESC;
```

### 3. Data Quality Checks

```sql
-- Check for missing filter values
SELECT
  p.id,
  p.name
FROM products p
LEFT JOIN product_filter_values pfv ON p.id = pfv.product_id
WHERE pfv.id IS NULL;
```
