import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Icon } from '@components/ui/Icon'

/**
 * Reusable location picker built on Leaflet + OpenStreetMap (no API key).
 *
 * - Ô tìm kiếm gõ tên → gợi ý autocomplete (Nominatim, debounce 400ms).
 * - Bản đồ Leaflet: bấm hoặc kéo ghim để chọn chính xác → reverse-geocode lấy tên.
 *
 * Value = { name, lat, lng }. `onChange(null)` khi người dùng xoá lựa chọn.
 */
export interface LocationValue {
  name: string
  lat: number
  lng: number
}

interface LocationPickerProps {
  label: string
  /** Material icon hiển thị cạnh nhãn. */
  icon?: string
  value: LocationValue | null
  onChange: (value: LocationValue | null) => void
  placeholder?: string
  /** Ẩn bản đồ, chỉ để lại ô tìm kiếm (dùng cho layout chật). */
  hideMap?: boolean
}

const DEFAULT_CENTER: [number, number] = [16.047, 108.206] // tâm Việt Nam

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

/** Tìm kiếm địa điểm theo từ khoá (giới hạn Việt Nam, tối đa 5 gợi ý). */
async function searchPlaces(query: string): Promise<NominatimResult[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=vn&q=${encodeURIComponent(
      query,
    )}`
    const res = await fetch(url, { headers: { 'Accept-Language': 'vi' } })
    return (await res.json()) as NominatimResult[]
  } catch {
    return []
  }
}

/** Reverse-geocode toạ độ → tên địa điểm dễ đọc. */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    const res = await fetch(url, { headers: { 'Accept-Language': 'vi' } })
    const data = (await res.json()) as { display_name?: string }
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

// PLACEHOLDER_SUBCOMPONENTS

/** Đặt lại view bản đồ khi toạ độ chọn thay đổi (từ ô tìm kiếm). */
function Recenter({ coord }: { coord: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (coord) map.setView(coord, 12)
  }, [map, coord])
  return null
}

/** Bắt sự kiện click trên bản đồ → trả về toạ độ điểm vừa bấm. */
function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}
// PLACEHOLDER_MAIN

export function LocationPicker({
  label,
  icon = 'location_on',
  value,
  onChange,
  placeholder = 'Tìm địa điểm…',
  hideMap = false,
}: LocationPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [reverseLoading, setReverseLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const coord: [number, number] | null = value ? [value.lat, value.lng] : null

  // Debounced autocomplete khi gõ.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const r = await searchPlaces(q)
      setResults(r)
      setOpen(true)
      setSearching(false)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const pickResult = (r: NominatimResult) => {
    onChange({ name: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) })
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const pickOnMap = async (lat: number, lng: number) => {
    setReverseLoading(true)
    const name = await reverseGeocode(lat, lng)
    onChange({ name, lat, lng })
    setReverseLoading(false)
  }

  // PLACEHOLDER_RENDER
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
        <Icon name={icon} size={14} className="text-primary" />
        {label}
      </label>

      {/* Ô tìm kiếm + dropdown gợi ý */}
      <div className="relative">
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface-container-low focus-within:ring-2 focus-within:ring-primary/40">
          <Icon name="search" size={16} className="text-on-surface-variant" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder={placeholder}
            className="bg-transparent border-none outline-none text-sm flex-1 placeholder:text-on-surface-variant/60"
          />
          {searching && (
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          )}
        </div>
        {open && results.length > 0 && (
          <ul className="absolute z-[500] mt-1 w-full bg-surface-container-lowest rounded-2xl shadow-editorial-lg ring-1 ring-outline/20 overflow-hidden max-h-60 overflow-y-auto">
            {results.map((r, i) => (
              <li key={`${r.lat}-${r.lon}-${i}`}>
                <button
                  type="button"
                  onClick={() => pickResult(r)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-low flex items-start gap-2"
                >
                  <Icon name="place" size={16} className="text-primary mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{r.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Địa điểm đã chọn */}
      {value && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-primary/5 text-sm">
          <Icon name="check_circle" size={16} className="text-primary mt-0.5 shrink-0" />
          <span className="flex-1 line-clamp-2 text-on-surface">{value.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Xoá địa điểm"
            className="text-on-surface-variant hover:text-error shrink-0"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {!hideMap && (
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-outline/20">
          <MapContainer
            center={coord ?? DEFAULT_CENTER}
            zoom={coord ? 12 : 5}
            scrollWheelZoom={false}
            className="w-full h-48 z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {coord && (
              <Marker
                position={coord}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target as L.Marker
                    const pos = m.getLatLng()
                    void pickOnMap(pos.lat, pos.lng)
                  },
                }}
              />
            )}
            <ClickHandler onPick={(lat, lng) => void pickOnMap(lat, lng)} />
            <Recenter coord={coord} />
          </MapContainer>
          <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur text-on-surface text-[11px] px-2.5 py-1 rounded-full shadow-editorial inline-flex items-center gap-1">
            <Icon name="touch_app" size={12} />
            {reverseLoading ? 'Đang lấy địa chỉ…' : 'Bấm hoặc kéo ghim để chọn'}
          </div>
        </div>
      )}
    </div>
  )
}
