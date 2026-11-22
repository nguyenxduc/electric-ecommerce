import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { Check } from 'lucide-react'
import ProductImage from './ProductImage'

type ProductDescriptionProps = {
  description: string
  productName: string
}

// Mo ta san pham (markdown) theo giao dien moi: khong khung trang, chu de doc,
// anh hoa vao nen be (mix-blend-multiply nhu anh chinh), danh sach thanh o co dau check.
const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mb-3 text-[28px] font-bold leading-tight tracking-tight text-ink">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-3 mt-10 text-lg font-semibold tracking-tight text-ink">{children}</h3>
  ),
  p: ({ node, children }) => {
    const hasBlockChild = node?.children?.some(
      child =>
        child.type === 'element' &&
        (child.tagName === 'img' || child.tagName === 'figure')
    )
    if (hasBlockChild) {
      return <div className="mb-4">{children}</div>
    }
    return <p className="mb-4 text-[15px] leading-7 text-gray-700">{children}</p>
  },
  ul: ({ children }) => (
    <ul className="mb-6 grid gap-2 sm:grid-cols-2">{children}</ul>
  ),
  li: ({ children }) => (
    <li className="flex items-start gap-3 rounded-2xl px-4 py-3 text-[15px] leading-6 text-gray-800 ring-1 ring-gray-200">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-white">
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
      </span>
      <span>{children}</span>
    </li>
  ),
  hr: () => <hr className="my-10 border-gray-200" />,
  img: ({ src, alt }) => (
    <figure className="my-8">
      <div className="overflow-hidden rounded-3xl bg-[#f3f1ec] ring-1 ring-gray-200">
        <ProductImage
          src={src ?? ''}
          alt={alt ?? 'Product'}
          className="mx-auto max-h-[440px] w-full object-contain p-8 mix-blend-multiply"
        />
      </div>
      {alt && alt !== 'Product' && (
        <figcaption className="mt-3 text-center text-xs text-gray-500">{alt}</figcaption>
      )}
    </figure>
  ),
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
}

const ProductDescription = ({ description, productName }: ProductDescriptionProps) => {
  if (!description?.trim()) {
    return <p className="italic text-gray-500">No description available for this product.</p>
  }

  return (
    <div className="product-description max-w-3xl">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {description}
      </ReactMarkdown>
      <p className="sr-only">Description for {productName}</p>
    </div>
  )
}

export default ProductDescription
