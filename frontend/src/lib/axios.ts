import axios from 'axios'

const axiosClient = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

axiosClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    try {
      const key = 'analytics_session_id'
      let sid = localStorage.getItem(key)
      if (!sid) {
        sid =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`
        localStorage.setItem(key, sid)
      }
      config.headers['X-Session-Id'] = sid
    } catch {
      /* ignore */
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
axiosClient.interceptors.response.use(
  response => response,
  async error => {
    // Do not auto-remove token on 401 to avoid logging out during protected flows
    return Promise.reject(error)
  }
)

export default axiosClient
