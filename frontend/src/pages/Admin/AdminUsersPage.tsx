import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { Button } from '@components/ui/Button'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useAdminUsers, useLockUser } from '@hooks/useAdmin'
import { TopUpDialog } from './components/TopUpDialog'
import { BulkTopUpDialog } from './components/BulkTopUpDialog'
import { cn } from '@utils/cn'
import type { UserRole } from '@types/user'
import type { AdminUser } from '@services/adminService'

const ROLES: { key: UserRole | 'all'; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'user', label: 'Traveler' },
  { key: 'guide', label: 'HDV' },
  { key: 'admin', label: 'Admin' },
]

const STATUS: { key: 'all' | 'active' | 'banned'; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Hoạt động' },
  { key: 'banned', label: 'Đã khoá' },
]

const ROLE_BADGE: Record<UserRole, string> = {
  admin: 'bg-error/10 text-error border-error/30',
  guide: 'bg-primary/10 text-primary border-primary/30',
  moderator: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  user: 'bg-surface-container text-on-surface-variant border-outline-variant/30',
}

export function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRole | 'all'>('all')
  const [status, setStatus] = useState<'all' | 'active' | 'banned'>('all')
  const [page, setPage] = useState(1)
  const [topUpUser, setTopUpUser] = useState<AdminUser | null>(null)
  // Multi-select for bulk top-up. Holds selected user objects across the page.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const pageSize = 20

  const { data, isLoading } = useAdminUsers({
    page,
    pageSize,
    search: search.trim() || undefined,
    role: role === 'all' ? undefined : role,
    status: status === 'all' ? undefined : status,
  })
  const lockMut = useLockUser()

  const users = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allOnPageSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id))
  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) {
        users.forEach((u) => next.delete(u.id))
      } else {
        users.forEach((u) => next.add(u.id))
      }
      return next
    })
  }

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      setCopiedId(id)
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const toggleLock = (id: string, isLocked: boolean) => {
    if (isLocked) {
      if (!confirm('Mở khoá tài khoản này?')) return
    } else {
      if (!confirm('Khoá tài khoản này? Người dùng sẽ không thể đăng nhập.')) return
    }
    lockMut.mutate({ id, lock: !isLocked })
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-headline font-extrabold text-3xl text-on-surface">Người dùng</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Tìm kiếm, lọc theo vai trò, khoá / mở khoá tài khoản.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-lowest rounded-full px-4 py-2 shadow-editorial w-full md:w-80">
          <Icon name="search" className="text-on-surface-variant" size={18} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Tìm theo tên, email, handle…"
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-on-surface-variant/60"
          />
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <Chip
            key={r.key}
            active={role === r.key}
            onClick={() => {
              setRole(r.key)
              setPage(1)
            }}
          >
            {r.label}
          </Chip>
        ))}
        <span className="w-px bg-outline-variant/30 mx-1" />
        {STATUS.map((s) => (
          <Chip
            key={s.key}
            active={status === s.key}
            onClick={() => {
              setStatus(s.key)
              setPage(1)
            }}
          >
            {s.label}
          </Chip>
        ))}
      </div>

      {/* Bulk action bar — appears when ≥1 user is selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3">
          <span className="text-sm font-bold text-on-surface">
            Đã chọn {selectedIds.size} người dùng
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" rounded="full" onClick={() => setSelectedIds(new Set())}>
              Bỏ chọn
            </Button>
            <Button size="sm" rounded="full" onClick={() => setBulkOpen(true)}>
              <Icon name="payments" size={14} />
              Nạp tiền hàng loạt
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <LoadingState count={6} />
      ) : users.length === 0 ? (
        <EmptyState icon="group_off" title="Không có user khớp bộ lọc" />
      ) : (
        <div className="bg-surface-container-lowest rounded-3xl shadow-editorial overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    aria-label="Chọn tất cả trên trang"
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3">Người dùng</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">UUID</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3">Vai trò</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Tham gia</th>
                <th className="text-right px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-outline-variant/10">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                      aria-label={`Chọn ${u.name}`}
                      className="w-4 h-4 rounded accent-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={u.avatar} alt={u.name} size="sm" />
                      <div className="min-w-0">
                        <p className="font-headline font-bold text-on-surface truncate">
                          {u.name}
                        </p>
                        {u.handle && (
                          <p className="text-xs text-on-surface-variant truncate">@{u.handle}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <button
                      type="button"
                      onClick={() => copyId(u.id)}
                      title="Bấm để sao chép UUID"
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-on-surface-variant hover:text-primary transition group"
                    >
                      <span className="truncate max-w-[140px]">{u.id}</span>
                      <Icon
                        name={copiedId === u.id ? 'check' : 'content_copy'}
                        size={13}
                        className={copiedId === u.id ? 'text-green-600' : 'opacity-50 group-hover:opacity-100'}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-on-surface-variant">
                    {u.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                        ROLE_BADGE[u.role] ?? ROLE_BADGE.user,
                      )}
                    >
                      {u.role}
                    </span>
                    {u.isLocked && (
                      <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-error/10 text-error">
                        <Icon name="lock" size={10} className="mr-1" />
                        Khoá
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-on-surface-variant">
                    {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        rounded="full"
                        onClick={() => setTopUpUser(u)}
                      >
                        <Icon name="add_circle" size={14} />
                        Nạp tiền
                      </Button>
                      <Button
                        size="sm"
                        variant={u.isLocked ? 'ghost' : 'outline'}
                        rounded="full"
                        onClick={() => toggleLock(u.id, u.isLocked)}
                        disabled={lockMut.isPending}
                      >
                        <Icon name={u.isLocked ? 'lock_open' : 'lock'} size={14} />
                        {u.isLocked ? 'Mở khoá' : 'Khoá'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button
            size="sm"
            variant="outline"
            rounded="full"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <Icon name="chevron_left" size={16} />
            Trước
          </Button>
          <span className="text-on-surface-variant">
            Trang {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            rounded="full"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
            <Icon name="chevron_right" size={16} />
          </Button>
        </div>
      )}

      <TopUpDialog
        open={!!topUpUser}
        onClose={() => setTopUpUser(null)}
        user={
          topUpUser
            ? {
                id: topUpUser.id,
                name: topUpUser.name,
                email: topUpUser.email,
                avatar: topUpUser.avatar,
              }
            : undefined
        }
      />

      <BulkTopUpDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        userIds={Array.from(selectedIds)}
        onDone={() => setSelectedIds(new Set())}
      />
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition border',
        active
          ? 'bg-primary text-on-primary border-primary shadow-editorial'
          : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:border-primary/40',
      )}
    >
      {children}
    </button>
  )
}
