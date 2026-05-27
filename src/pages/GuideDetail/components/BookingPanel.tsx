import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { messageThreadPath } from '@constants/routes'
import { cn } from '@utils/cn'
import type { HireableGuide } from '@types/trip'

interface Props {
  guide: HireableGuide
}

const availabilityStyles: Record<HireableGuide['availability'], string> = {
  available: 'bg-green-500/15 text-green-700 border-green-500/30',
  busy: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'fully-booked': 'bg-error/10 text-error border-error/30',
}

const availabilityDot: Record<HireableGuide['availability'], string> = {
  available: 'bg-green-500',
  busy: 'bg-amber-500',
  'fully-booked': 'bg-error',
}

export function BookingPanel({ guide }: Props) {
  const isFullyBooked = guide.availability === 'fully-booked'

  return (
    <section className="bg-surface-container-lowest p-6 md:p-7 rounded-3xl shadow-editorial-lg border-t-4 border-primary sticky top-24">
      <div className="flex items-end justify-between mb-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Từ
          </span>
          <p className="text-3xl font-extrabold text-on-surface font-headline leading-none">
            {guide.currency}
            {guide.pricePerDay.toLocaleString('vi-VN')}
            <span className="text-sm font-medium text-on-surface-variant ml-1">/ngày</span>
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
            availabilityStyles[guide.availability]
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', availabilityDot[guide.availability])} />
          {guide.availabilityLabel ??
            (guide.availability === 'available' ? 'Còn lịch' : 'Bận')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Field
          label="Ngày khởi hành"
          input={
            <input
              type="date"
              defaultValue=""
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          }
        />
        <Field
          label="Số ngày"
          input={
            <select
              defaultValue="1"
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            >
              {[1, 2, 3, 5, 7, 10].map((n) => (
                <option key={n} value={n}>
                  {n} ngày
                </option>
              ))}
            </select>
          }
        />
      </div>
      <div className="mb-5">
        <Field
          label="Số khách"
          input={
            <input
              type="number"
              min={1}
              defaultValue={2}
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          }
        />
      </div>

      {/* Inclusions */}
      <ul className="space-y-2.5 mb-6">
        {[
          ['support_agent', 'HDV địa phương đồng hành'],
          ['translate', `${guide.languages?.length ?? 0} ngôn ngữ giao tiếp`],
          ['verified_user', 'Hỗ trợ 24/7 trong chuyến đi'],
          ['payments', 'Hoàn tiền 100% khi huỷ trước 48h'],
        ].map(([icon, text]) => (
          <li key={text} className="flex items-center gap-2.5 text-sm text-on-surface/85">
            <Icon name={icon} size={18} className="text-primary" />
            {text}
          </li>
        ))}
      </ul>

      <Button size="lg" className="w-full mb-2" disabled={isFullyBooked}>
        {isFullyBooked ? (
          <>Hết lịch</>
        ) : (
          <>
            <Icon name="calendar_add_on" />
            Đặt lịch ngay
          </>
        )}
      </Button>
      <Link to={messageThreadPath('c1')} className="block mb-2">
        <Button variant="secondary" size="lg" className="w-full">
          <Icon name="chat" />
          Nhắn tin với HDV
        </Button>
      </Link>
      <button
        type="button"
        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-headline font-bold text-on-surface-variant hover:text-primary"
      >
        <Icon name="favorite_border" />
        Lưu vào yêu thích
      </button>
    </section>
  )
}

function Field({ label, input }: { label: string; input: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">
        {label}
      </span>
      {input}
    </label>
  )
}
