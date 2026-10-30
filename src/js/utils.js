// Helper murni (tanpa DOM / Firebase) agar mudah diuji.

export const INCOME_CATEGORY = 'Pendapatan'
export const EXPENSE_CATEGORIES = ['Kebutuhan', 'Makanan', 'Tagihan', 'Transportasi', 'Belanja', 'Hiburan', 'Kesehatan', 'Lainnya']
export const CATEGORY_STYLE = {
  Makanan: ['Mk', 'food'],
  Transportasi: ['Tr', 'travel'],
  Belanja: ['Bl', 'shop'],
  Kebutuhan: ['Kb', 'need'],
  Tagihan: ['Tg', 'bill'],
  Hiburan: ['Hb', 'fun'],
  Kesehatan: ['Ks', 'health'],
  Lainnya: ['Ln', 'other'],
}
export const MAX_AMOUNT = 1e12 - 1

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c])

let activeCurrency = 'IDR'
export const setCurrency = (code) => { activeCurrency = ['IDR', 'USD', 'SGD'].includes(code) ? code : 'IDR' }

export function currency(value) {
  const n = Number(value) || 0
  if (activeCurrency === 'IDR') return `${n < 0 ? '−' : ''}Rp${new Intl.NumberFormat('id-ID').format(Math.abs(Math.round(n)))}`
  return new Intl.NumberFormat(activeCurrency === 'USD' ? 'en-US' : 'en-SG', { style: 'currency', currency: activeCurrency }).format(n)
}

export function compact(value) {
  const n = Number(value) || 0
  const a = Math.abs(n)
  if (activeCurrency !== 'IDR') return new Intl.NumberFormat('en', { notation: 'compact' }).format(n)
  const fmt = (x) => String(+x.toFixed(1)).replace('.', ',')
  if (a >= 1e9) return `${fmt(n / 1e9)} M`
  if (a >= 1e6) return `${fmt(n / 1e6)} jt`
  if (a >= 1e3) return `${Math.round(n / 1e3)} rb`
  return String(Math.round(n))
}

export function niceMax(value) {
  if (!(value > 0)) return 1000000
  const exp = 10 ** Math.floor(Math.log10(value))
  return [1, 2, 4, 5, 8, 10].map((s) => s * exp).find((x) => x >= value)
}

const pad = (n) => String(n).padStart(2, '0')
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayISO = () => toISO(new Date())
export const periodOf = (d) => toISO(d).slice(0, 7)
export const currentPeriod = () => periodOf(new Date())
export const parseISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d || 1) }
export const formatDate = (iso) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(parseISO(iso))
export const monthLabel = (period) => new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(parseISO(`${period}-01`))
export const shortMonth = (period) => new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(parseISO(`${period}-01`))
export const shiftPeriod = (period, delta) => { const [y, m] = period.split('-').map(Number); return periodOf(new Date(y, m - 1 + delta, 1)) }
export const periodOptions = (count = 12) => Array.from({ length: count }, (_, i) => shiftPeriod(currentPeriod(), -i))

export const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'

const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  transaction: '<path d="M20 7H4"/><path d="m17 4 3 3-3 3"/><path d="M4 17h16"/><path d="m7 20-3-3 3-3"/>',
  wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6"/><path d="M16 14h.01"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.4.32.76.6 1 .3.27.68.4 1.1.4h.09v4h-.09c-.4 0-.8.14-1.1.4-.28.25-.5.6-.6 1Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 21h14"/>',
  filter: '<path d="M4 5h16l-6 7v6l-4 2v-8Z"/>',
  'arrow-up': '<path d="m18 15-6-6-6 6"/>',
  'arrow-down': '<path d="m6 9 6 6 6-6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="m6 7 1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
}
export const icon = (name, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ''}</svg>`

// Cegah CSV/formula injection saat dibuka di Excel/Sheets.
export const csvCell = (value) => {
  let s = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replaceAll('"', '""')}"`
}
