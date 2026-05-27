import { Icon } from '@components/ui/Icon'

export function EmptyThread() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center bg-gradient-to-b from-surface-container-lowest to-surface-container-low/40">
      <div className="w-20 h-20 rounded-full editorial-gradient text-on-primary flex items-center justify-center shadow-editorial-lg mb-6">
        <Icon name="forum" className="text-3xl" />
      </div>
      <h2 className="font-headline text-2xl font-extrabold text-on-surface mb-2">
        Chọn một cuộc trò chuyện
      </h2>
      <p className="text-on-surface-variant max-w-sm leading-relaxed">
        Kết nối với bạn đồng hành và lên kế hoạch cho chuyến đi tiếp theo của bạn.
      </p>
    </div>
  )
}
