import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster, toast } from 'sonner'
import 'antd/dist/reset.css'

import UserLayout from './client/layout/UserLayout'
import Home from './client/pages/Home'
import Detail from './client/pages/Detail'
import Profile from './client/pages/Profile'
import Collection from './client/pages/Collection'
import Checkout from './client/pages/Checkout'
import PaymentResult from './client/pages/PaymentResult'
import AdminLayout from './admin/components/AdminLayout'
import AdminProductsList from './admin/pages/products/List'
import AdminProductEdit from './admin/pages/products/Edit'
import AdminProductCreate from './admin/pages/products/Create'
import AdminCategoriesList from './admin/pages/categories/List'
import AdminCategoryCreate from './admin/pages/categories/Create'
import AdminCategoryEdit from './admin/pages/categories/Edit'
import AdminOrdersList from './admin/pages/orders/List'
import AdminOrderDetail from './admin/pages/orders/Detail'
import AdminProductReviews from './admin/pages/reviews/ProductReviews'
import AdminDashboard from './admin/pages/dashboard'
import AdminCouponsList from './admin/pages/coupons/List'
import AdminCouponEdit from './admin/pages/coupons/Edit'
import AdminCouponCreate from './admin/pages/coupons/Create'
import AdminCustomersList from './admin/pages/customers/List'
import AdminCustomerTiersPage from './admin/pages/customers/Tiers'
import AdminFiltersList from './admin/pages/filters/List'
import AdminFilterCreate from './admin/pages/filters/Create'
import AdminFilterEdit from './admin/pages/filters/Edit'
import AdminFilterKeysList from './admin/pages/filterKeys/List'
import AdminFilterKeyCreate from './admin/pages/filterKeys/Create'
import AdminFilterKeyEdit from './admin/pages/filterKeys/Edit'
import AdminSettingsList from './admin/pages/settings/List'
import AdminChatList from './admin/pages/chat/List'
import AdminAuditLogList from './admin/pages/audit/List'
import AdminAiFeedbackList from './admin/pages/ai-feedback/List'
import AdminNotificationsList from './admin/pages/notifications/List'
import Cart from './client/pages/Cart'

const queryClient = new QueryClient()

function App() {
  useEffect(() => {
    // Use MutationObserver to detect when toast elements are added to DOM
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement
            // Check if this is a toast element (Sonner uses [data-sonner-toast] attribute)
            const toastElement =
              element.querySelector('[data-sonner-toast]') ||
              (element.hasAttribute('[data-sonner-toast]') ? element : null) ||
              (element.classList.contains('sonner-toast') ? element : null)

            if (
              toastElement &&
              !toastElement.hasAttribute('data-click-handler')
            ) {
              const htmlElement = toastElement as HTMLElement
              // Mark as handled
              htmlElement.setAttribute('data-click-handler', 'true')

              // Add click handler
              htmlElement.addEventListener('click', e => {
                const target = e.target as HTMLElement
                // Don't dismiss if clicking buttons
                if (!target.closest('button')) {
                  // Get toast ID from element
                  const toastId =
                    htmlElement.getAttribute('data-toast-id') ||
                    htmlElement.id?.replace('sonner-toast-', '')
                  if (toastId) {
                    toast.dismiss(toastId)
                  } else {
                    // Fallback: dismiss the specific toast element
                    toast.dismiss()
                  }
                }
              })

              // Add cursor pointer style
              if (!htmlElement.style.cursor) {
                htmlElement.style.cursor = 'pointer'
              }
            }
          }
        })
      })
    })

    // Start observing the document body for added nodes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            style: {
              cursor: 'pointer'
            }
          }}
        />
        <Routes>
          <Route path="/" element={<UserLayout />}>
            {/* User Layout */}
            <Route index element={<Home />} />
            <Route path="/product/:slug" element={<Detail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/collection/:collection" element={<Collection />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/payment-result" element={<PaymentResult />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products">
              <Route index element={<AdminProductsList />} />
              <Route path="new" element={<AdminProductCreate />} />
              <Route path=":id" element={<AdminProductEdit />} />
              <Route path=":id/reviews" element={<AdminProductReviews />} />
            </Route>
            <Route path="coupons">
              <Route index element={<AdminCouponsList />} />
              <Route path=":id" element={<AdminCouponEdit />} />
              <Route path="new" element={<AdminCouponCreate />} />
            </Route>
            <Route path="customers">
              <Route index element={<AdminCustomersList />} />
              <Route path="tiers" element={<AdminCustomerTiersPage />} />
            </Route>
            <Route path="categories">
              <Route index element={<AdminCategoriesList />} />
              <Route path="new" element={<AdminCategoryCreate />} />
              <Route path=":id" element={<AdminCategoryEdit />} />
            </Route>
            <Route path="filters">
              <Route index element={<AdminFiltersList />} />
              <Route path="new" element={<AdminFilterCreate />} />
              <Route path=":id" element={<AdminFilterEdit />} />
            </Route>
            <Route path="filter-keys">
              <Route index element={<AdminFilterKeysList />} />
              <Route path="create" element={<AdminFilterKeyCreate />} />
              <Route path=":id/edit" element={<AdminFilterKeyEdit />} />
            </Route>
            <Route path="orders">
              <Route index element={<AdminOrdersList />} />
              <Route path=":id" element={<AdminOrderDetail />} />
            </Route>
            <Route path="chat" element={<AdminChatList />} />
            <Route path="audit-logs" element={<AdminAuditLogList />} />
            <Route path="ai-feedback" element={<AdminAiFeedbackList />} />
            <Route path="notifications" element={<AdminNotificationsList />} />
            <Route path="settings" element={<AdminSettingsList />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
