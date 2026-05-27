import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Input } from '@components/ui/Input'
import { Button } from '@components/ui/Button'
import { FormSection } from './FormSection'

export function SecuritySection() {
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [show, setShow] = useState(false)
  const [success, setSuccess] = useState(false)

  const valid =
    oldPwd.length >= 6 &&
    newPwd.length >= 8 &&
    newPwd === confirmPwd &&
    newPwd !== oldPwd

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSuccess(true)
    setOldPwd('')
    setNewPwd('')
    setConfirmPwd('')
    setTimeout(() => setSuccess(false), 4000)
  }

  // Strength meter (0..4)
  const strength = (() => {
    let s = 0
    if (newPwd.length >= 8) s++
    if (/[A-Z]/.test(newPwd)) s++
    if (/[0-9]/.test(newPwd)) s++
    if (/[^A-Za-z0-9]/.test(newPwd)) s++
    return s
  })()
  const strengthLabel = ['Yếu', 'Tạm', 'Khá', 'Mạnh', 'Rất mạnh'][strength]
  const strengthColor = ['bg-error', 'bg-amber-500', 'bg-amber-400', 'bg-green-500', 'bg-primary'][
    strength
  ]

  return (
    <FormSection
      icon="lock"
      title="Bảo mật"
      description="Đổi mật khẩu định kỳ để bảo vệ tài khoản của bạn"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Mật khẩu hiện tại"
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
          iconLeft="lock"
          value={oldPwd}
          onChange={(e) => setOldPwd(e.target.value)}
          tone="highest"
        />
        <Input
          label="Mật khẩu mới"
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
          iconLeft="lock_reset"
          value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
          tone="highest"
        />

        {newPwd && (
          <div className="px-1">
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-colors ${
                    i < strength ? strengthColor : 'bg-surface-container-high'
                  }`}
                />
              ))}
            </div>
            <p className="text-[11px] text-on-surface-variant mt-1.5">
              Độ mạnh: <strong className="text-on-surface">{strengthLabel}</strong>
              {newPwd.length < 8 && ' · cần ≥ 8 ký tự'}
            </p>
          </div>
        )}

        <Input
          label="Nhập lại mật khẩu mới"
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
          iconLeft="check_circle"
          value={confirmPwd}
          onChange={(e) => setConfirmPwd(e.target.value)}
          tone="highest"
        />

        {confirmPwd && confirmPwd !== newPwd && (
          <p className="text-xs text-error px-1">Mật khẩu nhập lại không khớp.</p>
        )}
        {newPwd && oldPwd && newPwd === oldPwd && (
          <p className="text-xs text-error px-1">Mật khẩu mới phải khác mật khẩu cũ.</p>
        )}

        <label className="inline-flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer px-1">
          <input
            type="checkbox"
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
            className="accent-primary"
          />
          Hiện mật khẩu
        </label>

        {success && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-green-500/10 text-green-700 text-sm">
            <Icon name="check_circle" size={18} className="fill" />
            Đã đổi mật khẩu thành công.
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-on-surface-variant flex items-center gap-1">
            <Icon name="info" size={14} />
            Mọi phiên đăng nhập khác sẽ bị huỷ.
          </p>
          <Button type="submit" size="md" rounded="full" disabled={!valid}>
            <Icon name="check" />
            Đổi mật khẩu
          </Button>
        </div>
      </form>
    </FormSection>
  )
}
