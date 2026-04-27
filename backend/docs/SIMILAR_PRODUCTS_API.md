# Similar Products API Documentation

## Overview

The Similar Products API uses PostgreSQL's `pg_trgm` extension to find products with similar descriptions based on trigram similarity matching. This provides more intelligent product recommendations compared to simple category-based filtering.

## API Endpoint

### GET /products/:id/similar

Returns products similar to the specified product based on description similarity.

**Parameters:**

- `id` (path parameter): The ID of the product to find similar products for
- `limit` (query parameter, optional): Maximum number of similar products to return (default: 6)

**Response:**

```json
{
  "products": [
    {
      "id": 1,
      "name": "Product Name",
      "price": 999.99,
      "final_price": 899.99,
      "discount": 100.00,
      "discount_percentage": 10,
      "description": "Product description...",
      "img": ["url1", "url2"],
      "specs": [...],
      "rating": 4.5,
      // ... other product fields
    }
  ],
  "similarity_method": "description_based", // or "category_based" or "category_fallback"
  "similarity_threshold": 0.1
}
```

**Similarity Methods:**

1. `description_based`: Products found using pg_trgm similarity on descriptions
2. `category_fallback`: Fallback to category-based similarity when no description matches found
3. `category_based`: Used when the source product has no description

## How It Works

1. **Primary Method - Description Similarity:**

   - Uses PostgreSQL's `similarity()` function from pg_trgm extension
   - Compares product descriptions using trigram matching
   - Returns similarity score between 0 and 1 (1 = identical)
   - Minimum threshold: 0.1 (configurable)

2. **Fallback Method - Category-Based:**

   - When no similar descriptions found, falls back to category matching
   - Returns products from the same category, ordered by rating

3. **Performance Optimization:**
   - GIN index on description column for fast similarity searches
   - Efficient trigram matching with `gin_trgm_ops`

## Setup Requirements

### 1. Enable pg_trgm Extension

```bash
# Run the setup script
npm run setup:similarity

# Or manually execute SQL
psql -d your_database -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

### 2. Create Index (Automatic)

The setup script creates a GIN index for optimal performance:

```sql
CREATE INDEX CONCURRENTLY idx_products_description_gin_trgm
ON products USING gin (description gin_trgm_ops);
```

## Frontend Integration

### Service Function

```typescript
export const fetchSimilarProducts = async (
  productId: number,
  limit: number = 6
): Promise<ListProductRes> => {
  const { data } = await axiosClient.get<ListProductRes>(
    `/products/${productId}/similar`,
    {
      params: { limit },
    }
  );
  return data;
};
```

### React Hook

```typescript
export const useSimilarProducts = (productId: number, limit?: number) =>
  useQuery<ListProductRes>({
    queryKey: ["similarProducts", productId, limit],
    queryFn: () => fetchSimilarProducts(productId, limit),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
```

### Usage Example

```typescript
const { data: similarProducts, isLoading } = useSimilarProducts(productId, 6);

if (similarProducts?.products.length > 0) {
  // Display similar products
}
```

## Database Schema Updates

### Product Model

Added `description` field to the Product model:

```prisma
model Product {
  // ... existing fields
  description String
  // ... rest of fields
}
```

### Required Migration

Ensure all existing products have descriptions. The seed file has been updated with sample descriptions.

## Performance Considerations

1. **Index Usage:** The GIN index significantly improves similarity query performance
2. **Similarity Threshold:** Adjust the 0.1 threshold based on your data quality
3. **Limit Results:** Use reasonable limits (6-12) to avoid performance issues
4. **Caching:** Consider caching results for frequently accessed products

## Error Handling

The API gracefully handles various scenarios:

- Product not found: Returns 404
- No description: Falls back to category-based similarity
- No similar products: Returns empty array
- Database errors: Returns 500 with error message

## Testing

Test the similarity function:

```sql
SELECT similarity('smartphone with great camera', 'phone with excellent camera quality');
-- Returns: 0.4 (example similarity score)
```

## Configuration

Adjust similarity threshold in the controller:

```javascript
// In getSimilarProducts function
AND similarity(p.description, ${currentProduct.description}) > 0.1
//                                                              ^^^
//                                                         Adjust this value
```

Lower values = more results but less similar
Higher values = fewer results but more similar
