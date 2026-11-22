import { Outlet } from 'react-router-dom'
import Footer from '../common/Footer'
import Header from '../common/Header'
import ChatWidget from '../chat/ChatWidget'
import AiChatWidget from '../chat/AiChatWidget'
import { useBehaviorTracking } from '../../hooks/useBehaviorTracking'

function BehaviorSession() {
  useBehaviorTracking()
  return null
}

const UserLayout = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <BehaviorSession />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
      <AiChatWidget />
    </div>
  )
}

export default UserLayout
