import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useAdminPlaces, useDeletePlace } from '@hooks/useAdminPlaces'
import { PlaceFormDialog } from './components/PlaceFormDialog'
import type { AdminPlaceRow } from '@services/placeService'

/**
 * Admin places management — list every place with search, plus create / edit /
 * delete actions wired to the (existing) admin-only places endpoints.
 */
export function AdminPlacesPage() {
  const [keyword, setKeyword] = useState('')
  const [editing, setEditing] = useState<AdminPlaceRow | null>(null)
  const [creating, setCreating] = useState(false)

  const { data: places = [], isLoading } = useAdminPlaces(keyword)
  const del = useDeletePlace()

  const onDelete = (p: AdminPlaceRow) => {
    if (!confirm(`Xoá địa điểm "${p.name}"? Hành động này không thể hoàn tác.`)) return
    del.mutate(p.id)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-headline font-extrabold text-3xl text-on-surface">Địa điểm</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Thêm, chỉnh sửa, xoá các địa điểm du lịch hiển thị trên nền tảng.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Icon name="add" />
          Thêm địa điểm
        </Button>
      </header>

      <div className="flex items-center gap-2 bg-surface-container-lowest rounded-full px-4 py-2 shadow-editorial max-w-md">
        <Icon name="search" className="text-on-surface-variant" size={18} />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo tên địa điểm…"
          className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-on-surface-variant/60"
        />
      </div>

      {isLoading ? (
        <LoadingState count={6} />
      ) : places.length === 0 ? (
        <EmptyState icon="wrong_location" title="Chưa có địa điểm nào khớp" />
      ) : (
        <div className="bg-surface-container-lowest rounded-3xl shadow-editorial overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="text-left px-4 py-3">Địa điểm</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Danh mục</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Tỉnh/Thành</th>
                <th className="text-right px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {places.map((p) => (
                <tr key={p.id} className="border-t border-outline-variant/10">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.coverImage}
                        alt={p.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-headline font-bold text-on-surface truncate">{p.name}</p>
                        <p className="text-xs text-on-surface-variant truncate">/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-on-surface-variant">
                    {p.categoryLabel}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-on-surface-variant">
                    {p.provinceName}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button size="sm" variant="ghost" rounded="full" onClick={() => setEditing(p)}>
                        <Icon name="edit" size={14} />
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        rounded="full"
                        onClick={() => onDelete(p)}
                        disabled={del.isPending}
                      >
                        <Icon name="delete" size={14} />
                        Xoá
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PlaceFormDialog
        open={creating || !!editing}
        place={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
