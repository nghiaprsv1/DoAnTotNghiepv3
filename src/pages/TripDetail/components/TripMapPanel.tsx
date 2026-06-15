import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'

/**
 * Trip map widget built on Leaflet + OpenStreetMap — no API key required.
 *
 * - Geocoding (tên địa điểm → toạ độ) qua Nominatim (OSM).
 * - Routing (đường đi origin → destination) qua OSRM public API, vẽ polyline.
 *
 * Mặc định chỉ hiện marker điểm đến. Bấm "Xem đường đi" để nhập điểm xuất
 * phát; khi có cả hai, bản đồ vẽ cung đường và fit bounds tự động.
 */
interface TripMapPanelProps {
  destination: string
  /** Toạ độ đã lưu (nếu có) — bỏ qua geocode khi sẵn có. */
  destinationLat?: number | null
  destinationLng?: number | null
  /** Điểm xuất phát đã lưu (nếu có) — tự vẽ đường đi ngay khi mở trang. */
  originName?: string | null
  originLat?: number | null
  originLng?: number | null
}

type LatLng = [number, number]

// Khắc phục lỗi marker icon mặc định của Leaflet khi đóng gói bằng Vite:
// các URL ảnh tương đối trong package bị hỏng, nên trỏ thẳng tới CDN.
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

/** Tâm Việt Nam — fallback khi chưa geocode được điểm đến. */
const VIETNAM_CENTER: LatLng = [16.047, 108.206]

/** Geocode 1 truy vấn địa điểm → toạ độ qua Nominatim. */
async function geocode(query: string): Promise<LatLng | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      query,
    )}`
    const res = await fetch(url, { headers: { 'Accept-Language': 'vi' } })
    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    if (!data.length) return null
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
  } catch {
    return null
  }
}

/** Lấy hình học cung đường driving giữa 2 điểm qua OSRM → mảng [lat, lng]. */
async function fetchRoute(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
    const res = await fetch(url)
    const data = (await res.json()) as {
      routes?: Array<{ geometry: { coordinates: [number, number][] } }>
    }
    const coords = data.routes?.[0]?.geometry?.coordinates
    if (!coords?.length) return null
    // GeoJSON trả [lng, lat] → đảo lại thành [lat, lng] cho Leaflet.
    return coords.map(([lng, lat]) => [lat, lng] as LatLng)
  } catch {
    return null
  }
}

/** Hiệu chỉnh viewport bản đồ theo các điểm/đường hiện có. */
function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 11)
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] })
    }
  }, [map, points])
  return null
}

export function TripMapPanel({
  destination,
  destinationLat,
  destinationLng,
  originName,
  originLat,
  originLng,
}: TripMapPanelProps) {
  const hasSavedDest = destinationLat != null && destinationLng != null
  const hasSavedOrigin = originLat != null && originLng != null

  const [destCoord, setDestCoord] = useState<LatLng | null>(
    hasSavedDest ? [destinationLat!, destinationLng!] : null,
  )
  const [destLoading, setDestLoading] = useState(!hasSavedDest)
  const [origin, setOrigin] = useState<string | null>(hasSavedOrigin ? originName ?? 'Điểm xuất phát' : null)
  const [originCoord, setOriginCoord] = useState<LatLng | null>(
    hasSavedOrigin ? [originLat!, originLng!] : null,
  )
  const [route, setRoute] = useState<LatLng[] | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOriginDialog, setShowOriginDialog] = useState(false)

  // Geocode điểm đến khi destination thay đổi — bỏ qua nếu đã có toạ độ lưu.
  useEffect(() => {
    if (hasSavedDest) return
    let active = true
    setDestLoading(true)
    setError(null)
    geocode(`${destination}, Vietnam`).then((coord) => {
      if (!active) return
      setDestCoord(coord)
      setDestLoading(false)
      if (!coord) setError(`Không tìm được toạ độ cho "${destination}".`)
    })
    return () => {
      active = false
    }
  }, [destination, hasSavedDest])

  // Khi có điểm xuất phát (do người dùng nhập): geocode origin rồi lấy cung đường.
  useEffect(() => {
    if (!origin || !destCoord) return
    // Nếu origin toạ độ đã có sẵn (từ DB), không cần geocode lại.
    if (originCoord) return
    let active = true
    setRouteLoading(true)
    setError(null)
    ;(async () => {
      const oCoord = await geocode(`${origin}, Vietnam`)
      if (!active) return
      if (!oCoord) {
        setError(`Không tìm được điểm xuất phát "${origin}".`)
        setRouteLoading(false)
        return
      }
      setOriginCoord(oCoord)
      const path = await fetchRoute(oCoord, destCoord)
      if (!active) return
      setRoute(path)
      if (!path) setError('Không lấy được cung đường. Hiển thị đường thẳng nối hai điểm.')
      setRouteLoading(false)
    })()
    return () => {
      active = false
    }
  }, [origin, destCoord, originCoord])

  // Khi đã có cả originCoord + destCoord (từ DB hoặc vừa geocode) mà chưa có
  // route, lấy cung đường driving.
  useEffect(() => {
    if (!originCoord || !destCoord || route) return
    let active = true
    setRouteLoading(true)
    fetchRoute(originCoord, destCoord).then((path) => {
      if (!active) return
      setRoute(path)
      if (!path) setError('Không lấy được cung đường. Hiển thị đường thẳng nối hai điểm.')
      setRouteLoading(false)
    })
    return () => {
      active = false
    }
  }, [originCoord, destCoord, route])

  const clearOrigin = () => {
    setOrigin(null)
    setOriginCoord(null)
    setRoute(null)
    setError(null)
  }

  // Tập điểm để fit bounds: origin + destination (nếu có).
  const boundsPoints: LatLng[] = []
  if (originCoord) boundsPoints.push(originCoord)
  if (destCoord) boundsPoints.push(destCoord)

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-primary tracking-tight font-headline">
            Bản đồ chuyến đi
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            {origin
              ? `Đường đi từ ${origin} đến ${destination}.`
              : `Điểm đến: ${destination}. Bấm "Xem đường đi" để nhập điểm xuất phát.`}
          </p>
        </div>
        {origin ? (
          <Button size="sm" variant="secondary" rounded="full" onClick={clearOrigin}>
            <Icon name="close" size={14} />
            Bỏ điểm xuất phát
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            rounded="full"
            onClick={() => setShowOriginDialog(true)}
            disabled={!destCoord}
          >
            <Icon name="alt_route" size={14} />
            Xem đường đi
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-2xl bg-amber-500/10 text-amber-700 px-4 py-2.5 text-sm flex items-start gap-2">
          <Icon name="info" size={16} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative w-full overflow-hidden rounded-3xl shadow-editorial-lg ring-1 ring-outline/30">
        {destLoading ? (
          <div className="w-full aspect-[16/9] flex items-center justify-center bg-surface-container-low">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <MapContainer
            center={destCoord ?? VIETNAM_CENTER}
            zoom={destCoord ? 11 : 6}
            scrollWheelZoom={false}
            className="w-full aspect-[16/9] z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {destCoord && (
              <Marker position={destCoord}>
                <Popup>Điểm đến: {destination}</Popup>
              </Marker>
            )}
            {originCoord && (
              <Marker position={originCoord}>
                <Popup>Điểm xuất phát: {origin}</Popup>
              </Marker>
            )}
            {/* Cung đường thật từ OSRM; nếu thất bại, vẽ đường thẳng nối 2 điểm. */}
            {route ? (
              <Polyline positions={route} pathOptions={{ color: '#ab2d00', weight: 4 }} />
            ) : (
              originCoord &&
              destCoord && (
                <Polyline
                  positions={[originCoord, destCoord]}
                  pathOptions={{ color: '#ab2d00', weight: 3, dashArray: '8 8' }}
                />
              )
            )}
            <FitBounds points={boundsPoints} />
          </MapContainer>
        )}
        {routeLoading && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-on-surface text-xs font-bold px-3 py-1.5 rounded-full shadow-editorial inline-flex items-center gap-1.5">
            <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
            Đang tìm đường…
          </div>
        )}
      </div>

      {showOriginDialog && (
        <OriginDialog
          onCancel={() => setShowOriginDialog(false)}
          onSubmit={(value) => {
            const v = value.trim()
            if (!v) return
            setOrigin(v)
            setShowOriginDialog(false)
          }}
        />
      )}
    </section>
  )
}

function OriginDialog({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (value: string) => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-[1000] bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onCancel}
    >
      <div
        className="bg-surface-container-lowest rounded-t-3xl md:rounded-3xl shadow-editorial-lg p-5 md:p-6 w-full max-w-md safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-headline font-extrabold text-xl mb-1">Điểm xuất phát</h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Nhập tên thành phố / địa chỉ để xem cung đường đến điểm đến.
        </p>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="VD: Hà Nội"
          className="w-full rounded-2xl bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit(value)
          }}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" rounded="full" onClick={onCancel}>
            Huỷ
          </Button>
          <Button size="sm" rounded="full" onClick={() => onSubmit(value)}>
            <Icon name="alt_route" size={14} />
            Xem đường đi
          </Button>
        </div>
      </div>
    </div>
  )
}
