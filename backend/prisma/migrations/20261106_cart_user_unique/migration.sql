-- Gop cac gio trung cua cung mot user vao gio cu nhat roi them unique, de
-- "tim hoac tao gio" khong tao duoc hai gio khi request den cung luc.
WITH keep AS (
  SELECT user_id, MIN(id) AS keep_id FROM carts GROUP BY user_id HAVING COUNT(*) > 1
)
UPDATE cart_items ci SET cart_id = keep.keep_id
FROM carts c JOIN keep ON keep.user_id = c.user_id
WHERE ci.cart_id = c.id AND c.id <> keep.keep_id;

DELETE FROM carts c USING (
  SELECT user_id, MIN(id) AS keep_id FROM carts GROUP BY user_id HAVING COUNT(*) > 1
) keep
WHERE c.user_id = keep.user_id AND c.id <> keep.keep_id;

-- CreateIndex
CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");
