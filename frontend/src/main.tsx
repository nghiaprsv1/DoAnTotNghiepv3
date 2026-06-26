import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Dữ liệu "tươi" trong 30s. Hết 30s coi là stale → khi component mount lại
      // (chuyển trang) hoặc focus lại tab, React Query tự refetch NGẦM: vẫn hiện
      // data cache ngay lập tức rồi cập nhật khi API trả về (không loading toàn trang).
      staleTime: 3 * 1000,
      // Refetch khi component mount lại — đây là thứ làm "chuyển trang là cập nhật".
      refetchOnMount: true,
      // Refetch khi quay lại tab trình duyệt (vd vừa tạo/sửa ở tab khác).
      refetchOnWindowFocus: true,
      // Refetch khi mạng kết nối lại.
      refetchOnReconnect: true,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
