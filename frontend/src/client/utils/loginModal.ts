// Mo modal dang nhap cua Navbar tu bat ky dau (Navbar lang nghe su kien nay)
export const OPEN_LOGIN_EVENT = 'open-login'
export const openLoginModal = () => window.dispatchEvent(new Event(OPEN_LOGIN_EVENT))
