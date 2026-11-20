import { useEffect, useState } from 'react'

// SVG noi tuyen: placeholder khong the tu hong (URL ngoai co the bi chan)
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#f3f4f6"/><path d="M30 84l20-24 14 16 10-12 16 20z" fill="#d1d5db"/><circle cx="44" cy="40" r="8" fill="#d1d5db"/></svg>'
  )

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
