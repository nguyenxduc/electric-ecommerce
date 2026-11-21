import { useEffect, useState } from 'react'
import { PLACEHOLDER_IMAGE } from '../../utils/placeholderImage'

const PLACEHOLDER = PLACEHOLDER_IMAGE

type ProductImageProps = {
  src: string
  alt: string
  className?: string
}

/** External product CDNs (Best Buy, Apple, etc.) often block hotlinking without referrer policy. */
const ProductImage = ({ src, alt, className = '' }: ProductImageProps) => {
  const [currentSrc, setCurrentSrc] = useState(src || PLACEHOLDER)

  useEffect(() => {
    setCurrentSrc(src || PLACEHOLDER)
  }, [src])

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={className}
      onError={() => {
        if (currentSrc !== PLACEHOLDER) setCurrentSrc(PLACEHOLDER)
      }}
    />
  )
}

export default ProductImage
