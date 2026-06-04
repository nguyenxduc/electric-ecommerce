import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import ProductImage from './ProductImage'

type ProductDescriptionProps = {
  description: string
  productName: string
}

const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="text-2xl font-bold text-gray-900 mt-2 mb-4">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">{children}</h3>
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
    return (
      <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
    )
  },
  ul: ({ children }) => (
    <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-700">{children}</ul>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  hr: () => <hr className="my-8 border-gray-200" />,
  img: ({ src, alt }) => (
    <figure className="my-6">
      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
        <ProductImage
          src={src ?? ''}
          alt={alt ?? 'Product'}
          className="w-full max-h-[420px] object-contain p-4"
        />
      </div>
      {alt && alt !== 'Product' && (
        <figcaption className="text-sm text-gray-500 mt-2 text-center">
          {alt}
        </figcaption>
      )}
    </figure>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
}

const ProductDescription = ({
  description,
  productName,
}: ProductDescriptionProps) => {
  if (!description?.trim()) {
    return (
      <p className="text-gray-500 italic">
        No description available for this product.
      </p>
    )
  }

  return (
    <div className="product-description max-w-4xl">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {description}
      </ReactMarkdown>
      <p className="sr-only">Description for {productName}</p>
    </div>
  )
}

export default ProductDescription
