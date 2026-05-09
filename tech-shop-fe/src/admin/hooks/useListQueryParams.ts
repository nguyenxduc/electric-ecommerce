import { useSearchParams } from 'react-router-dom'

export function useListQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = parseInt(searchParams.get('page') || '1', 10)
  const q = searchParams.get('q') || ''

  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(newPage))
    setSearchParams(params)
  }

  const setQ = (newQuery: string) => {
    const params = new URLSearchParams(searchParams)
    if (newQuery) params.set('q', newQuery)
    else params.delete('q')
    params.set('page', '1')
    setSearchParams(params)
  }

  return {
    searchParams,
    setSearchParams,
    page,
    q,
    setPage,
    setQ
  }
}

