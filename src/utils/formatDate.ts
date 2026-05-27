/**
 * Format a date string to a localized display format
 */
export function formatDate(date: string | Date, locale = 'vi-VN'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

/**
 * Format a date to relative time (e.g. "2 hours ago")
 */
export function formatRelativeTime(date: string | Date, locale = 'vi-VN'): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const diff = (new Date(date).getTime() - Date.now()) / 1000

  const thresholds: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [2592000, 'day'],
    [31536000, 'month'],
    [Infinity, 'year'],
  ]

  for (const [threshold, unit] of thresholds) {
    const divisor = threshold === 60 ? 1 : threshold / 60
    if (Math.abs(diff) < threshold) {
      return rtf.format(Math.round(diff / divisor), unit)
    }
  }

  return formatDate(date, locale)
}
