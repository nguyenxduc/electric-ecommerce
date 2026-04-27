import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

type Props = {
  text: string
  variant: 'assistant' | 'user'
}

/** Render nội dung tin nhắn AI/user: Markdown + GFM (list, bảng, strikethrough…), không dùng raw HTML. */
export default function AiMessageMarkdown({ text, variant }: Props) {
  const isUser = variant === 'user'
  const linkClass = isUser
    ? 'text-emerald-100 underline break-all hover:text-white'
    : 'text-emerald-700 underline break-all hover:text-emerald-900'
  const codeInline = isUser
    ? 'px-1 py-0.5 rounded bg-emerald-800/80 text-emerald-50 text-[0.85em]'
    : 'px-1 py-0.5 rounded bg-gray-100 text-gray-800 text-[0.85em] ring-1 ring-gray-200'
  const preClass = isUser
    ? 'my-2 p-3 rounded-lg bg-emerald-900/50 text-emerald-50 text-xs overflow-x-auto border border-emerald-700/50'
    : 'my-2 p-3 rounded-lg bg-slate-50 text-slate-800 text-xs overflow-x-auto border border-gray-200'

  const components: Components = {
    a: ({ node: _n, className, children, href, ...rest }) => (
      <a
        {...rest}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${linkClass} ${className ?? ''}`}
      >
        {children}
      </a>
    ),
    code: ({ className, children, ...props }) => {
      const inline = 'inline' in props && Boolean((props as { inline?: boolean }).inline)
      if (inline) {
        return (
          <code className={`${codeInline} font-mono ${className ?? ''}`}>
            {children}
          </code>
        )
      }
      return (
        <pre className={preClass}>
          <code className={`font-mono block whitespace-pre ${className ?? ''}`}>
            {children}
          </code>
        </pre>
      )
    },
    ul: ({ children }) => (
      <ul className="list-disc pl-4 my-2 space-y-0.5">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-4 my-2 space-y-0.5">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-snug">{children}</li>,
    p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0 leading-relaxed">{children}</p>,
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    h1: ({ children }) => (
      <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>
    ),
    h2: ({ children }) => (
      <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className={
          isUser
            ? 'border-l-2 border-emerald-300 pl-2 my-2 text-emerald-100/95'
            : 'border-l-2 border-gray-300 pl-2 my-2 text-gray-600'
        }
      >
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="my-2 overflow-x-auto max-w-full">
        <table
          className={
            isUser
              ? 'text-xs border-collapse border border-emerald-600/50'
              : 'text-xs border-collapse border border-gray-200'
          }
        >
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th
        className={
          isUser
            ? 'border border-emerald-600/50 px-2 py-1 text-left bg-emerald-900/40'
            : 'border border-gray-200 px-2 py-1 text-left bg-gray-100'
        }
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td
        className={
          isUser
            ? 'border border-emerald-600/50 px-2 py-1 align-top'
            : 'border border-gray-200 px-2 py-1 align-top'
        }
      >
        {children}
      </td>
    ),
    hr: () => (
      <hr
        className={
          isUser ? 'my-2 border-emerald-500/40' : 'my-2 border-gray-200'
        }
      />
    ),
    img: ({ src, alt }) =>
      src ? (
        <img
          src={src}
          alt={alt ?? ''}
          className="max-h-48 rounded-md border border-gray-200 my-1"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : null
  }

  return (
    <div className="text-sm break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  )
}
