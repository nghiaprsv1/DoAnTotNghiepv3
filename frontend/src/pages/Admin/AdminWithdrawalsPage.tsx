import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { Button } from '@components/ui/Button'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useDecideWithdrawal, usePendingWithdrawals } from '@hooks/useAdmin'
import { AdminDetailDialog, AdminSection, AdminRow } from './components/AdminDetailDialog'

const formatVnd = (n: number) => `₫${Math.abs(Number(n)).toLocaleString('vi-VN')}`

export function AdminWithdrawalsPage() {
  const { data: list = [], isLoading } = usePendingWithdrawals()
  const decide = useDecideWithdrawal()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const detail = list.find((t) => t.id === viewId) ?? null

  const handleApprove = async (id: string) => {
    if (!confirm('Phê duyệt rút tiền? Tiền đã được trừ khỏi ví khả dụng khi tạo yêu cầu.'))
      return
    setBusyId(id)
    try {
      await decide.mutateAsync({ id, action: 'approve' })
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (id: string) => {
    const reason = prompt('Lý do từ chối:', '') ?? ''
    if (!reason.trim()) return
    setBusyId(id)
    try {
      await decide.mutateAsync({ id, action: 'reject', reason: reason.trim() })
    } finally {
      setBusyId(null)
    }
  }

  const totalPending = list.reduce((s, t) => s + Math.abs(Number(t.amount)), 0)

  return (
    <div className="space-y-5">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-headline font-extrabold text-3xl text-on-surface">
            Yêu cầu rút tiền
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {list.length} yêu cầu chờ xử lý — Tổng:{' '}
            <strong className="text-on-surface">{formatVnd(totalPending)}</strong>
          </p>
        </div>
      </header>

      {isLoading ? (
        <LoadingState count={3} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="account_balance_wallet"
          title="Không có yêu cầu rút tiền"
          description="Khi HDV gửi yêu cầu rút, các giao dịch sẽ xuất hiện tại đây."
        />
      ) : (
        <div className="space-y-3">
          {list.map((t) => (
            <article
              key={t.id}
              className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5 flex flex-col md:flex-row md:items-center gap-4"
            >
              <div className="flex items-center gap-3 md:flex-1 min-w-0">
                <Avatar src={t.user?.avatar} alt={t.user?.name ?? ''} size="md" />
                <div className="min-w-0">
                  <p className="font-headline font-extrabold text-on-surface truncate">
                    {t.user?.name ?? 'Không rõ'}
                  </p>
                  <p className="text-sm text-on-surface-variant truncate">{t.user?.email}</p>
                </div>
              </div>

              <div className="text-right md:text-left">
                <p className="font-headline font-extrabold text-2xl text-on-surface">
                  {formatVnd(t.amount)}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                  {new Date(t.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>

              <div className="md:max-w-xs text-sm text-on-surface-variant">
                <p className="text-[10px] uppercase tracking-widest">Tài khoản nhận</p>
                <p className="text-on-surface truncate">
                  {t.bankAccount || 'Chưa cung cấp'}
                </p>
              </div>

              <div className="flex items-center gap-2 md:ml-auto">
                <Button size="sm" variant="outline" rounded="full" onClick={() => setViewId(t.id)}>
                  <Icon name="visibility" size={16} />
                  Chi tiết
                </Button>
                <Button
                  size="sm"
                  rounded="full"
                  onClick={() => handleApprove(t.id)}
                  disabled={busyId === t.id}
                >
                  <Icon name="check" size={16} />
                  Duyệt
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  rounded="full"
                  onClick={() => handleReject(t.id)}
                  disabled={busyId === t.id}
                >
                  <Icon name="close" size={16} />
                  Từ chối
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {detail && (
        <AdminDetailDialog
          title={detail.user?.name ?? 'Không rõ'}
          subtitle={detail.user?.email}
          media={<Avatar src={detail.user?.avatar} alt={detail.user?.name ?? ''} size="md" ring />}
          onClose={() => setViewId(null)}
          footer={
            <>
              <Button
                size="md"
                variant="ghost"
                rounded="full"
                onClick={() => {
                  handleReject(detail.id)
                  setViewId(null)
                }}
                disabled={busyId === detail.id}
              >
                <Icon name="close" size={16} />
                Từ chối
              </Button>
              <Button
                size="md"
                rounded="full"
                onClick={() => {
                  handleApprove(detail.id)
                  setViewId(null)
                }}
                disabled={busyId === detail.id}
              >
                <Icon name="check" size={16} />
                Duyệt rút tiền
              </Button>
            </>
          }
        >
          <div className="text-center py-2">
            <p className="font-headline font-extrabold text-4xl text-on-surface">
              {formatVnd(detail.amount)}
            </p>
            <p className="text-xs uppercase tracking-widest text-on-surface-variant mt-1">
              Số tiền yêu cầu rút
            </p>
          </div>
          <AdminSection title="Thông tin yêu cầu">
            <AdminRow label="Người yêu cầu" value={detail.user?.name ?? '—'} />
            <AdminRow label="Email" value={detail.user?.email ?? '—'} />
            <AdminRow label="Tài khoản nhận" value={detail.bankAccount || 'Chưa cung cấp'} />
            <AdminRow label="Trạng thái" value={detail.status} />
            <AdminRow label="Thời gian" value={new Date(detail.createdAt).toLocaleString('vi-VN')} />
            {detail.note && <AdminRow label="Ghi chú" value={detail.note} />}
          </AdminSection>
        </AdminDetailDialog>
      )}
    </div>
  )
}
