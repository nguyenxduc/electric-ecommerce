export function slugifyName(name: string): string {
  return name
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

