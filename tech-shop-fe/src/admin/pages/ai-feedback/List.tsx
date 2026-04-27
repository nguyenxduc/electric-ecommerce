import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bot,
  RefreshCw,
  ThumbsDown,
  TrendingUp,
  MessageSquareWarning
} from 'lucide-react'
import {
  fetchAiFeedbackStats,
  fetchAiFeedbackList,
  type AiFeedbackRow
} from '../../services/aiFeedbackAdminService'
import SkeletonTable from '../../components/common/SkeletonTable'

export default function AdminAiFeedbackPage() {
  const [days, setDays] = useState(14)
  const [page, setPage] = useState(1)

  const statsQuery = useQuery({
    queryKey: ['admin', 'ai-feedback-stats', days],
    queryFn: () => fetchAiFeedbackStats(days)
  })

  const listQuery = useQuery({
    queryKey: ['admin', 'ai-feedback-list', page],
    queryFn: () => fetchAiFeedbackList({ page, limit: 25 })
  })

  const summary = statsQuery.data?.summary
  const byRating = statsQuery.data?.byRating ?? []
  const recentBad = statsQuery.data?.recentBad ?? []

  const pagination = listQuery.data?.pagination
  const items = listQuery.data?.items ?? []
  const pages = useMemo(
    () => Math.max(1, pagination?.pages ?? 1),
    [pagination]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-emerald-600" />
          <h1 className="text-xl font-semibold text-gray-800">
            Chatbot feedback
          </h1>
          <span className="text-sm text-gray-500">
            Phân tích để cải thiện prompt & knowledge base
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Khoảng thời gian</label>
          <select
            value={days}
            onChange={e => {
              setDays(Number(e.target.value))
            }}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value={7}>7 ngày</option>
            <option value={14}>14 ngày</option>
            <option value={30}>30 ngày</option>
            <option value={90}>90 ngày</option>
          </select>
          <button
            type="button"
            onClick={() => {
              statsQuery.refetch()
              listQuery.refetch()
            }}
            className="flex items-center gap-1 px-3 py-1.5 border rounded text-sm hover:bg-gray-50"
          >
            <RefreshCw
              size={14}
              className={
                statsQuery.isFetching || listQuery.isFetching
                  ? 'animate-spin'
                  : ''
              }
            />
            Refresh
          </button>
        </div>
      </div>

      {statsQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase">Tổng feedback</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {summary?.total?.toLocaleString() ?? 0}
            </p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-1 text-xs text-gray-500 uppercase">
              <TrendingUp size={12} /> Điểm TB
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {summary?.avg_rating != null
                ? Number(summary.avg_rating).toFixed(2)
                : '—'}
            </p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase">Tích cực (4–5★)</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {summary?.positive?.toLocaleString() ?? 0}
            </p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase">Tiêu cực (1–2★)</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {summary?.negative?.toLocaleString() ?? 0}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <MessageSquareWarning size={16} />
            Gợi ý cải thiện (mẫu tiêu cực gần đây)
          </h2>
          {recentBad.length === 0 ? (
            <p className="text-sm text-gray-400">Không có mẫu thấp điểm.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
              {recentBad.map(r => (
                <li
                  key={String(r.id)}
                  className="border-b border-gray-50 pb-2 last:border-0"
                >
                  <span className="text-red-600 font-semibold">
                    {r.rating}★
                  </span>
                  <span className="text-gray-400 text-xs ml-2">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                  {r.comment && (
                    <p className="text-gray-600 mt-1">{r.comment}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Phân bố sao</h2>
          {byRating.length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có dữ liệu.</p>
          ) : (
            <div className="space-y-2">
              {byRating.map(row => (
                <div
                  key={row.rating}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{row.rating} sao</span>
                  <div className="flex-1 mx-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (Number(row.count) /
                            (summary?.total || Number(row.count) || 1)) *
                            100
                        )}%`
                      }}
                    />
                  </div>
                  <span className="text-gray-500 w-8 text-right">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <ThumbsDown size={16} className="text-gray-500" />
          <h2 className="font-semibold text-gray-800">Chi tiết feedback</h2>
        </div>
        {listQuery.isLoading ? (
          <SkeletonTable rows={6} cols={5} />
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">
            Chưa có bản ghi.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-3">Thời gian</th>
                    <th className="text-left p-3">Sao</th>
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Chat</th>
                    <th className="text-left p-3">Tin nhắn (preview)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row: AiFeedbackRow) => (
                    <tr key={String(row.id)} className="border-t hover:bg-gray-50">
                      <td className="p-3 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 font-semibold text-amber-600">
                        {row.rating}
                      </td>
                      <td className="p-3 font-mono text-xs">
                        {row.user_id_feedback}
                      </td>
                      <td className="p-3 text-gray-600 max-w-[120px] truncate">
                        {row.chat_title || `#${row.chat_id}`}
                      </td>
                      <td className="p-3 text-gray-700 max-w-md">
                        <span className="line-clamp-2">
                          {row.message_preview || '—'}
                        </span>
                        {row.comment && (
                          <span className="block text-xs text-gray-400 mt-1">
                            Ghi chú: {row.comment}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <span className="text-gray-400">
                Trang {pagination?.page ?? 1} / {pages} —{' '}
                {pagination?.total ?? 0} bản ghi
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="px-3 py-1 border rounded disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="px-3 py-1 border rounded disabled:opacity-40"
                  disabled={page >= pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-gray-500 max-w-3xl">
        Dùng các đoạn preview và feedback tiêu cực để bổ sung FAQ, điều chỉnh
        prompt hệ thống, hoặc cập nhật knowledge base sản phẩm trong admin /
        pipeline RAG.
      </p>
    </div>
  )
}
