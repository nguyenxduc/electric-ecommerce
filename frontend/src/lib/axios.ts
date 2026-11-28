import axios from 'axios'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
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
      // Cung gia tri, ten rieng cho chong gian lan: backend doi chieu thiet bi
      // giua cac tai khoan (dung chung voucher, tu dat don cho shop minh).
      config.headers['X-Device-Id'] = sid
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
    // Tai khoan bi admin khoa: bo token ngay de UI ve trang thai chua dang nhap
    // Token bi thu hoi vi mat khau da doi o noi khac: cung dang xuat nhu vay
    const code = error?.response?.data?.code
    if ((code === 'ACCOUNT_SUSPENDED' || code === 'SESSION_REVOKED') && localStorage.getItem('accessToken')) {
      localStorage.removeItem('accessToken')
      // Trang tai lai mat toast: gui ly do qua sessionStorage de App hien sau khi tai
      try {
        sessionStorage.setItem(
          'auth_notice',
          error.response.data.error || error.response.data.message || 'Your account has been suspended'
        )
      } catch {
        // private mode: van dang xuat, chi khong hien ly do
      }
      window.location.assign('/')
    }
    return Promise.reject(error)
  }
)

export default axiosClient
