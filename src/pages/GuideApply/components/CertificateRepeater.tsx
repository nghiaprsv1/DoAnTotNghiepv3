import { useState } from 'react'
import { Icon } from '@components/ui/Icon'

export interface CertificateItem {
  id: string
  name: string
  issuer: string
  year: string
}

const PRESET: Omit<CertificateItem, 'id'>[] = [
  { name: 'Thẻ HDV du lịch nội địa', issuer: 'Tổng cục Du lịch', year: '' },
  { name: 'Chứng chỉ sơ cấp cứu', issuer: 'Hội Chữ thập đỏ', year: '' },
  { name: 'IELTS / TOEIC', issuer: 'British Council / IIG', year: '' },
]

export function CertificateRepeater() {
  const [items, setItems] = useState<CertificateItem[]>([
    {
      id: 'c1',
      name: 'Thẻ HDV du lịch nội địa',
      issuer: 'Tổng cục Du lịch Việt Nam',
      year: '2022',
    },
  ])

  const update = (id: string, patch: Partial<CertificateItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))

  const addCustom = () =>
    setItems((prev) => [
      ...prev,
      { id: `c-${Date.now()}`, name: '', issuer: '', year: '' },
    ])

  const addPreset = (i: number) => {
    const p = PRESET[i]
    setItems((prev) => [...prev, { id: `c-${Date.now()}`, ...p }])
  }

  const remove = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id))

  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div
          key={it.id}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/15"
        >
          <div className="md:col-span-5">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              Chứng chỉ #{idx + 1}
            </label>
            <input
              value={it.name}
              onChange={(e) => update(it.id, { name: e.target.value })}
              placeholder="VD: Thẻ HDV du lịch quốc tế"
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="md:col-span-5">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              Đơn vị cấp
            </label>
            <input
              value={it.issuer}
              onChange={(e) => update(it.id, { issuer: e.target.value })}
              placeholder="VD: Tổng cục Du lịch"
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                Năm
              </label>
              <input
                value={it.year}
                onChange={(e) => update(it.id, { year: e.target.value })}
                placeholder="2024"
                inputMode="numeric"
                className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="button"
              onClick={() => remove(it.id)}
              aria-label="Xoá chứng chỉ"
              className="self-end mb-0.5 w-10 h-10 rounded-xl bg-error/10 text-error hover:bg-error/20 flex items-center justify-center transition"
            >
              <Icon name="delete" size={18} />
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={addCustom}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-headline font-bold bg-primary text-on-primary shadow-editorial active:scale-95 transition"
        >
          <Icon name="add" size={16} />
          Thêm chứng chỉ
        </button>
        <span className="text-xs text-on-surface-variant ml-1">Mẫu nhanh:</span>
        {PRESET.map((p, i) => (
          <button
            key={p.name}
            type="button"
            onClick={() => addPreset(i)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border border-outline-variant/30 bg-surface-container-lowest hover:border-primary/40 hover:text-primary transition"
          >
            <Icon name="add" size={14} />
            {p.name}
          </button>
        ))}
      </div>
    </div>
  )
}
