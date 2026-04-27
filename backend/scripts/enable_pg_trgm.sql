-- Enable pg_trgm extension for trigram similarity matching
-- This extension provides functions for determining the similarity of text based on trigram matching
-- and fast searching of similar strings.

-- Create the extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a GIN index on the description column for faster similarity searches
-- This index will significantly improve performance of similarity queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_description_gin_trgm 
ON products USING gin (description gin_trgm_ops);

-- Optional: Create a GiST index as an alternative (choose one based on your use case)
-- GIN is generally better for similarity searches, GiST is better for exact matches
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_description_gist_trgm 
-- ON products USING gist (description gist_trgm_ops);

-- Verify the extension is installed
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm';

-- Test similarity function (optional - for verification)
-- SELECT similarity('sample text', 'sample test');