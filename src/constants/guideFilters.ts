/**
 * Guide marketplace filter dictionaries — pure UI metadata,
 * decoupled from any mock dataset.
 */

export const REGION_FILTERS = [
  { key: 'all', label: 'Tất cả', icon: 'public' },
  { key: 'north', label: 'Miền Bắc', icon: 'terrain' },
  { key: 'central', label: 'Miền Trung', icon: 'temple_buddhist' },
  { key: 'south', label: 'Miền Nam', icon: 'beach_access' },
  { key: 'island', label: 'Đảo', icon: 'sailing' },
] as const

export const CATEGORY_FILTERS = [
  { key: 'all', label: 'Tất cả lĩnh vực', icon: 'apps' },
  { key: 'mountain', label: 'Núi & Trekking', icon: 'terrain' },
  { key: 'food', label: 'Ẩm thực', icon: 'restaurant' },
  { key: 'culture', label: 'Văn hoá', icon: 'temple_buddhist' },
  { key: 'beach', label: 'Biển', icon: 'beach_access' },
  { key: 'city', label: 'Thành phố', icon: 'location_city' },
  { key: 'adventure', label: 'Phiêu lưu', icon: 'hiking' },
  { key: 'island', label: 'Đảo', icon: 'sailing' },
] as const
