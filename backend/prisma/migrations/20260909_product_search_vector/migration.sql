-- Hybrid search cho trợ lý ảo và cho ô tìm kiếm sản phẩm.
--
-- Nhánh vector (pgvector) tìm theo ngữ nghĩa nhưng nắm rất kém mã sản phẩm và
-- số hiệu dòng máy, đúng loại từ khoá mà người mua đồ điện tử hay gõ: "RTX
-- 4060", "XPS 13", "EOS R50". Nhánh full-text bù đúng chỗ đó. Trigram là lớp
-- cứu cuối khi người dùng gõ sai chính tả nhẹ ("labtop", "iphon").

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() chỉ ở mức STABLE nên không dùng thẳng trong generated column hay
-- trong index biểu thức được. Bọc lại ở dạng IMMUTABLE bằng cách gọi tường
-- minh từ điển "unaccent" - đây là cách chính thức được Postgres khuyến nghị.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT unaccent('unaccent', $1)
$$ LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE;

ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Dùng cấu hình 'simple': tiếng Việt không có từ điển stemming trong Postgres,
-- 'simple' chỉ tách token và hạ chữ thường, đúng thứ cần ở đây. Bỏ dấu trước
-- khi lập chỉ mục để "điện thoại" và "dien thoai" cùng khớp.
CREATE OR REPLACE FUNCTION products_search_vector_refresh()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(NEW.name, ''))), 'A') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(NEW.description, ''))), 'B') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(NEW.specs::text, ''))), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_search_vector_trg ON products;
CREATE TRIGGER products_search_vector_trg
BEFORE INSERT OR UPDATE OF name, description, specs ON products
FOR EACH ROW EXECUTE FUNCTION products_search_vector_refresh();

-- Nạp lại cho dữ liệu đã có. Không dùng "UPDATE ... SET name = name" vì như
-- vậy chạm cột updated_at của Prisma.
UPDATE products SET search_vector =
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(description, ''))), 'B') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(specs::text, ''))), 'C');

CREATE INDEX IF NOT EXISTS products_search_vector_idx
  ON products USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS products_name_trgm_idx
  ON products USING GIN (immutable_unaccent(lower(name)) gin_trgm_ops);
