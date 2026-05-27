import type { ChipOption } from './ChipSelect'

export const TRAVEL_STYLES: ChipOption[] = [
  { value: 'adventure', label: 'Phiêu lưu', icon: 'hiking' },
  { value: 'relax', label: 'Nghỉ dưỡng', icon: 'spa' },
  { value: 'culture', label: 'Văn hoá', icon: 'temple_buddhist' },
  { value: 'food', label: 'Ẩm thực', icon: 'restaurant' },
  { value: 'photography', label: 'Nhiếp ảnh', icon: 'photo_camera' },
  { value: 'nightlife', label: 'Sôi động', icon: 'nightlife' },
  { value: 'budget', label: 'Tiết kiệm', icon: 'savings' },
  { value: 'luxury', label: 'Sang trọng', icon: 'diamond' },
]

export const TERRAIN_PREFS: ChipOption[] = [
  { value: 'beach', label: 'Biển', icon: 'beach_access' },
  { value: 'mountain', label: 'Núi', icon: 'terrain' },
  { value: 'island', label: 'Đảo', icon: 'sailing' },
  { value: 'city', label: 'Thành phố', icon: 'location_city' },
  { value: 'countryside', label: 'Nông thôn', icon: 'cottage' },
  { value: 'desert', label: 'Sa mạc', icon: 'sunny' },
  { value: 'jungle', label: 'Rừng', icon: 'forest' },
]

export const ACTIVITIES: ChipOption[] = [
  { value: 'trekking', label: 'Trekking', icon: 'directions_walk' },
  { value: 'diving', label: 'Lặn biển', icon: 'pool' },
  { value: 'cycling', label: 'Đạp xe', icon: 'directions_bike' },
  { value: 'motorbike', label: 'Phượt xe máy', icon: 'two_wheeler' },
  { value: 'kayak', label: 'Kayak', icon: 'rowing' },
  { value: 'climbing', label: 'Leo núi', icon: 'landscape' },
  { value: 'cooking', label: 'Học nấu ăn', icon: 'soup_kitchen' },
  { value: 'workshop', label: 'Workshop', icon: 'palette' },
]

export const TRIP_PURPOSES: ChipOption[] = [
  { value: 'solo', label: 'Đi một mình', icon: 'person' },
  { value: 'couple', label: 'Cặp đôi', icon: 'favorite' },
  { value: 'family', label: 'Gia đình', icon: 'family_restroom' },
  { value: 'friends', label: 'Nhóm bạn', icon: 'group' },
  { value: 'business', label: 'Công tác', icon: 'work' },
]

export const BUDGET_LEVELS: ChipOption[] = [
  { value: 'low', label: '$ Tiết kiệm' },
  { value: 'mid', label: '$$ Trung bình' },
  { value: 'high', label: '$$$ Cao cấp' },
  { value: 'luxury', label: '$$$$ Sang trọng' },
]

export const EXPERIENCE_LEVELS: ChipOption[] = [
  { value: 'newbie', label: 'Mới bắt đầu', icon: 'star' },
  { value: 'casual', label: 'Đi thường xuyên', icon: 'star_half' },
  { value: 'pro', label: 'Dày dạn', icon: 'auto_awesome' },
  { value: 'guide', label: 'Hướng dẫn viên', icon: 'verified' },
]

export const LANGUAGES: ChipOption[] = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '中文' },
  { value: 'th', label: 'ไทย' },
  { value: 'es', label: 'Español' },
]

export const DIETARY: ChipOption[] = [
  { value: 'none', label: 'Không kiêng' },
  { value: 'vegetarian', label: 'Ăn chay', icon: 'eco' },
  { value: 'vegan', label: 'Thuần chay', icon: 'spa' },
  { value: 'halal', label: 'Halal' },
  { value: 'glutenfree', label: 'Không gluten' },
  { value: 'allergyseafood', label: 'Dị ứng hải sản' },
  { value: 'allergynuts', label: 'Dị ứng hạt' },
]
