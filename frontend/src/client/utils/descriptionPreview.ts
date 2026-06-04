/** Plain-text snippet from markdown product descriptions for cards/lists. */
export function descriptionPreview(markdown: string, maxLength = 100): string {
  const plain = markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/---/g, '')
    .replace(/\n+/g, ' ')
    .trim()

  if (!plain) return ''
  return plain.length > maxLength ? `${plain.slice(0, maxLength)}...` : plain
}
