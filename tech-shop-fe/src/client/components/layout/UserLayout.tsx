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
    <>
      <BehaviorSession />
      <Header />
      <main className="pt-40">
        <Outlet/>
      </main>
      <Footer />
      <ChatWidget />
      <AiChatWidget />
    </>
  )
}

export default UserLayout
