import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { Star, ShoppingBag } from 'lucide-react'
import { useProductById } from '../../hooks/useProducts'
import { parseProductIdFromSlug } from '../../utils/productSlug'

type Props = {
  text: string
  variant: 'assistant' | 'user'
}

type ProductEntry = {
  link: string
  image?: string
}

const URL_RE = /https?:\/\/[^\s<>"']+/g
const IMAGE_EXT_RE = /\.(?:png|jpe?g|gif|webp|bmp|svg)(?:[?#]|$)/i

const sanitizeUrlToken = (value: string) =>
  value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/[),.;]+$/, '')

const isLikelyImageUrl = (href?: string) => {
  if (!href) return false
  const sanitized = sanitizeUrlToken(href)
  return IMAGE_EXT_RE.test(sanitized) || /\/media\/catalog\/product\//i.test(sanitized)
}

const getImageCandidates = (rawUrl?: string) => {
  if (!rawUrl) return []
  const normalized = sanitizeUrlToken(rawUrl)
  const candidates = [normalized]
  const proxyMatch = normalized.match(/\/plain\/(https?:\/\/.+)$/i)
  if (proxyMatch?.[1]) candidates.push(sanitizeUrlToken(proxyMatch[1]))
  return Array.from(new Set(candidates))
}

const getProductSlugFromUrl = (href?: string) => {
  if (!href) return null
  const sanitized = sanitizeUrlToken(href)
  const match = sanitized.match(/\/product\/([^/?#\s]+)/i)
  return match?.[1] ?? null
}

const prettifyProductName = (slug: string) => {
  const namePart = slug.replace(/-p\d+$/, '')
  return namePart
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const mergeWrappedLines = (raw: string) => {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const merged: string[] = []

  for (let i = 0; i < lines.length; i += 1) {
    let current = lines[i]
    while (i + 1 < lines.length) {
      const next = lines[i + 1].trim()
      const currentHasUrl = /https?:\/\/\S+$/i.test(current.trim())
      const nextLooksLikeContinuation =
        next.length > 0 &&
        !/^(\u1ea3nh|anh|h\u00ecnh|hinh|link(?:\s+s\u1ea3n\s+ph\u1ea9m)?)\s*:/i.test(next) &&
        /^[a-z0-9\-._~/?#[\]@!$&'()*+,;=%]+$/i.test(next)

      if (!currentHasUrl || !nextLooksLikeContinuation) break
      current = `${current}${next}`
      i += 1
    }
    merged.push(current)
  }

  return merged
}

const extractProductEntries = (raw: string): ProductEntry[] => {
  const merged = mergeWrappedLines(raw)
  const allUrls = (merged.join('\n').match(URL_RE) ?? []).map(url => sanitizeUrlToken(url))
  const productLinks = allUrls.filter(url => Boolean(getProductSlugFromUrl(url)))
  const imageLinks = allUrls.filter(url => isLikelyImageUrl(url))

  // Pair product links with image links by relative order in message.
  const entries = productLinks.map((link, idx) => ({
    link,
    image: imageLinks[idx]
  }))

  // Deduplicate product links while keeping first matched image.
  const map = new Map<string, ProductEntry>()
  entries.forEach(entry => {
    if (!map.has(entry.link)) map.set(entry.link, entry)
  })
  return Array.from(map.values())
}

const extractStandaloneImageUrls = (raw: string, productEntries: ProductEntry[]) => {
  const attached = new Set(productEntries.map(e => e.image).filter(Boolean) as string[])
  const urls = (mergeWrappedLines(raw).join('\n').match(URL_RE) ?? [])
    .map(url => sanitizeUrlToken(url))
    .filter(url => isLikelyImageUrl(url) && !attached.has(url))
  return Array.from(new Set(urls))
}

const MEDIA_LABEL_RE =
  /^\s*[-*\u2022]?\s*\**\s*(\u1ea3nh|anh|h\u00ecnh(?:\s+\u1ea3nh)?|hinh(?:\s+anh)?|image|img|link(?:\s+s\u1ea3n\s+ph\u1ea9m)?|trang\s+s\u1ea3n\s+ph\u1ea9m|xem\s+(?:th\u00eam|t\u1ea1i)|product\s+link|url)\s*:?\**\s*:/i

const URL_ONLY_LINE_RE = /^\s*[-*\u2022]?\s*\**\s*https?:\/\/\S+\s*\**\s*$/i

const stripRawMediaLines = (raw: string) =>
  mergeWrappedLines(raw)
    .filter(line => {
      const trimmed = line.trim()
      if (!trimmed) return true
      if (MEDIA_LABEL_RE.test(trimmed)) return false
      if (URL_ONLY_LINE_RE.test(trimmed)) return false
      return true
    })
    .join('\n')

const normalizeTextToMarkdown = (raw: string) =>
  mergeWrappedLines(raw)
    .map(line =>
      line.replace(URL_RE, (url, offset, source) => {
        const prev = source.slice(Math.max(0, offset - 2), offset)
        if (prev === '](') return url
        const sanitized = sanitizeUrlToken(url)
        return `[${sanitized}](${sanitized})`
      })
    )
    .join('\n')

function FallbackImage({
  src,
  alt,
  className
}: {
  src?: string
  alt: string
  className: string
}) {
  const candidates = useMemo(() => getImageCandidates(src), [src])
  const [index, setIndex] = useState(0)
  const current = candidates[index]

  if (!current) return <div className="h-full w-full bg-gray-100" />

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (index < candidates.length - 1) setIndex(i => i + 1)
      }}
    />
  )
}

function ProductPreviewCard({ entry, isUser }: { entry: ProductEntry; isUser: boolean }) {
  const slug = getProductSlugFromUrl(entry.link)
  const productId = parseProductIdFromSlug(slug)
  const { data: product, isLoading } = useProductById(productId || 0)
  if (!slug) return null

  const title = product?.name || prettifyProductName(slug)
  const price = Number(product?.price) || 0
  const finalPrice = Number(product?.final_price) || price
  const displayPrice = (finalPrice > 0 ? finalPrice : price).toFixed(2)
  const rating = Number(product?.rating) || 0

  const wrapClass = isUser
    ? 'rounded-lg bg-white/10 ring-1 ring-white/20'
    : 'rounded-lg bg-gray-50/80 ring-1 ring-gray-200/70'

  return (
    <a
      href={entry.link}
      className={`${wrapClass} flex gap-2.5 p-2 transition hover:opacity-95`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
        <FallbackImage
          src={entry.image || product?.img?.[0]}
          alt={title}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`line-clamp-2 text-xs font-medium leading-snug ${
            isUser ? 'text-white' : 'text-gray-900'
          }`}
        >
          {title}
        </p>
        <div
          className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0 text-xs ${
            isUser ? 'text-blue-50' : 'text-gray-600'
          }`}
        >
          <span className={`font-semibold ${isUser ? 'text-white' : 'text-gray-900'}`}>
            {isLoading ? '…' : `$${displayPrice}`}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {rating.toFixed(1)}
          </span>
        </div>
        <span
          className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium ${
            isUser ? 'text-blue-100' : 'text-blue-600'
          }`}
        >
          <ShoppingBag className="h-3 w-3" />
          View product
        </span>
      </div>
    </a>
  )
}

export default function AiMessageMarkdown({ text, variant }: Props) {
  const isUser = variant === 'user'
  const productEntries = extractProductEntries(text)
  const standaloneImageUrls = extractStandaloneImageUrls(text, productEntries)
  const displayText = stripRawMediaLines(text)

  const linkClass = isUser
    ? 'text-blue-100 underline break-all hover:text-white'
    : 'text-blue-600 underline break-all hover:text-blue-800'

  const components: Components = {
    a: ({ node: _n, className, children, href, ...rest }) => {
      const normalized = href ? sanitizeUrlToken(href) : ''
      const isExternal = normalized.startsWith('http')
      return (
        <a
          {...rest}
          href={normalized || href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className={`${linkClass} ${className ?? ''}`}
        >
          {children}
        </a>
      )
    },
    ul: ({ children }) => <ul className="list-disc pl-4 my-2 space-y-0.5">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-4 my-2 space-y-0.5">{children}</ol>,
    li: ({ children }) => <li className="leading-snug">{children}</li>,
    p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0 leading-relaxed">{children}</p>
  }

  return (
    <div className="text-sm break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {normalizeTextToMarkdown(displayText)}
      </ReactMarkdown>

      {standaloneImageUrls.length > 0 && (
        <div className="mt-3 space-y-2">
          {standaloneImageUrls.map(url => (
            <FallbackImage
              key={url}
              src={url}
              alt="preview"
              className="max-h-56 rounded-md border border-gray-200"
            />
          ))}
        </div>
      )}

      {productEntries.length > 0 && (
        <div className="mt-2 space-y-2">
          {productEntries.map(entry => (
            <ProductPreviewCard key={entry.link} entry={entry} isUser={isUser} />
          ))}
        </div>
      )}
    </div>
  )
}
