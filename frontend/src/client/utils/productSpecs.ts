import type { ProductSpec, ProductSpecDetail } from '../types/product'

const isProductSpecGroup = (
  detail: ProductSpecDetail
): detail is Exclude<ProductSpecDetail, ProductSpec> => 'items' in detail

export const flattenProductSpecs = (
  specs: ProductSpec[] = [],
  specsDetail: ProductSpecDetail[] = []
) => {
  const mergedSpecs = new Map<string, ProductSpec>()

  specs.forEach(spec => {
    if (spec?.label) mergedSpecs.set(spec.label, spec)
  })

  specsDetail.forEach(detail => {
    const detailSpecs = isProductSpecGroup(detail) ? detail.items : [detail]
    detailSpecs.forEach(spec => {
      if (spec?.label) mergedSpecs.set(spec.label, spec)
    })
  })

  return Array.from(mergedSpecs.values())
}
