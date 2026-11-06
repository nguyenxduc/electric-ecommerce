export function slugifyName(name: string): string {
  // 'đ' khong phai nguyen am mang dau nen NFD khong tach ra duoc, buoc loc
  // [^a-z0-9] se xoa luon ca chu: 'dien thoai' thanh 'ien thoai'. Doi truoc
  // khi chuan hoa, giong het unaccent ben Postgres.
  return name
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function makeProductSlug(name: string, id: number | string): string {
  const slug = slugifyName(name || 'product')
  return `${slug}-p${id}`
}

export function parseProductIdFromSlug(slug?: string | null): number | null {
  if (!slug) return null
  const match = slug.match(/-p(\d+)$/)
  if (!match) return null
  const id = Number(match[1])
  return Number.isNaN(id) ? null : id
}

