import type { ProductColor } from '../types/product'

const EMPTY_COLORS: ProductColor[] = []

const normalizeColors = (value: unknown): ProductColor[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (color): color is ProductColor =>
        !!color &&
        typeof color === 'object' &&
        typeof color.name === 'string' &&
        typeof color.code === 'string'
    )
  }

  if (typeof value === 'string') {
    try {
      return normalizeColors(JSON.parse(value))
    } catch {
      return EMPTY_COLORS
    }
  }

  if (
    value &&
    typeof value === 'object' &&
    'name' in value &&
    'code' in value &&
    typeof value.name === 'string' &&
    typeof value.code === 'string'
  ) {
    return [value as ProductColor]
  }

  return EMPTY_COLORS
}

export const getProductColors = (
  availableColors: unknown,
  legacyColors: unknown
) => {
  const normalizedAvailableColors = normalizeColors(availableColors)
  return normalizedAvailableColors.length > 0
    ? normalizedAvailableColors
    : normalizeColors(legacyColors)
}
