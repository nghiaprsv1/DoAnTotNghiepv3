import { Link } from 'react-router-dom'
import { Button } from '@components/ui'
import { ROUTES } from '@constants/routes'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-9xl font-bold text-primary-200">404</h1>
      <h2 className="text-2xl font-semibold text-gray-900 mt-4 mb-2">
        Trang không tồn tại
      </h2>
      <p className="text-gray-500 mb-8">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
      </p>
      <Link to={ROUTES.HOME}>
        <Button>Về trang chủ</Button>
      </Link>
    </div>
  )
}
