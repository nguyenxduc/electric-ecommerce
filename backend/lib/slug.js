// Shared slug helpers. Strips Vietnamese diacritics so "Điện Thoại" -> "dien-thoai".
export const createSlug = (name) => {
  if (!name) return null;
  return String(name)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Appends -1, -2, ... until the slug is unique for the given Prisma model
// delegate (e.g. prisma.shop). excludeId skips the row being updated.
export const ensureUniqueSlug = async (modelDelegate, baseSlug, excludeId = null) => {
  if (!baseSlug) return null;
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await modelDelegate.findFirst({
      where: {
        slug,
        ...(excludeId && { id: { not: BigInt(excludeId) } }),
      },
    });
    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
};
