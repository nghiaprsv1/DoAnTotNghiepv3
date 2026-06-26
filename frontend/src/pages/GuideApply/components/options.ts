import type { ChipOption } from '../../EditProfile/components/ChipSelect'

export const TOTAL_STEPS = 6

export const REGIONS: ChipOption[] = [
  { value: 'north', label: 'Miền Bắc', icon: 'terrain' },
  { value: 'central', label: 'Miền Trung', icon: 'temple_buddhist' },
  { value: 'south', label: 'Miền Nam', icon: 'beach_access' },
  { value: 'island', label: 'Đảo', icon: 'sailing' },
  { value: 'highland', label: 'Tây Nguyên', icon: 'forest' },
]

export const SPECIALTIES: ChipOption[] = [
  { value: 'mountain', label: 'Núi & Trekking', icon: 'hiking' },
  { value: 'food', label: 'Ẩm thực', icon: 'restaurant' },
  { value: 'culture', label: 'Văn hoá', icon: 'temple_buddhist' },
  { value: 'beach', label: 'Biển', icon: 'beach_access' },
  { value: 'city', label: 'Thành phố', icon: 'location_city' },
  { value: 'adventure', label: 'Phiêu lưu', icon: 'paragliding' },
  { value: 'island', label: 'Đảo', icon: 'sailing' },
  { value: 'photography', label: 'Nhiếp ảnh', icon: 'photo_camera' },
  { value: 'history', label: 'Lịch sử', icon: 'history_edu' },
  { value: 'wildlife', label: 'Thiên nhiên hoang dã', icon: 'pets' },
  { value: 'diving', label: 'Lặn biển', icon: 'pool' },
  { value: 'motorbike', label: 'Phượt xe máy', icon: 'two_wheeler' },
]

export const LANGUAGES: ChipOption[] = [
  { value: 'Tiếng Việt', label: 'Tiếng Việt' },
  { value: 'English', label: 'English' },
  { value: 'Français', label: 'Français' },
  { value: '日本語', label: '日本語' },
  { value: '한국어', label: '한국어' },
  { value: '中文', label: '中文' },
  { value: 'ไทย', label: 'ไทย' },
  { value: 'Español', label: 'Español' },
  { value: 'Русский', label: 'Русский' },
]

export const TOUR_TYPES: ChipOption[] = [
  { value: 'private', label: 'Tour riêng', icon: 'lock' },
  { value: 'group', label: 'Tour nhóm', icon: 'groups' },
  { value: 'daytrip', label: 'Tour 1 ngày', icon: 'wb_sunny' },
  { value: 'multiday', label: 'Tour nhiều ngày', icon: 'event' },
  { value: 'custom', label: 'Tour theo yêu cầu', icon: 'tune' },
]

export const STEP_INFO = [
  { icon: 'person', title: 'Thông tin cá nhân' },
  { icon: 'verified', title: 'Giấy tờ tuỳ thân' },
  { icon: 'workspace_premium', title: 'Kinh nghiệm & Chứng chỉ' },
  { icon: 'tour', title: 'Vùng & Lĩnh vực' },
  { icon: 'photo_library', title: 'Hồ sơ giới thiệu' },
  { icon: 'task_alt', title: 'Cam kết & Gửi duyệt' },
] as const
