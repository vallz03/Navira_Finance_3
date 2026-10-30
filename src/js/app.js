import * as fb from './firebase.js'
import * as v from './views.js'
import * as sel from './selectors.js'
import {
  csvCell, formatDate, currentPeriod, setCurrency,
  EXPENSE_CATEGORIES, INCOME_CATEGORY, MAX_AMOUNT,
} from './utils.js'

const DEFAULT_NOTIFICATIONS = { weekly: true, budget: true, tips: false }

const state = {
  authReady: false, user: null, loaded: false, online: false,
  authMode: 'login', authBusy: false, authError: '', authInfo: '', draft: { name: '', email: '' }, pendingName: '',
  profile: null, transactions: [], goals: [], budgets: {},
  nav: 'Ringkasan', period: currentPeriod(), query: '', filterType: 'all', filterCategory: 'all',
  menuOpen: false, monthOpen: false, filterOpen: false, settingsSaved: false,
  modal: null, toast: null,
}

const $ = (id) => document.getElementById(id)
const setHTML = (id, html) => { const el = $(id); if (el) el.innerHTML = html }
const userBase = () => `users/${state.user.uid}`
const dbRef = (path) => fb.ref(fb.db, `${userBase()}/${path}`)
const toList = (obj) => Object.entries(obj || {}).map(([id, value]) => ({ id, ...value }))

/* ---------- Render ---------- */
function renderRoot() {
  const root = $('root')
  if (!fb.isConfigured) root.innerHTML = v.setupView()
  else if (!state.authReady || (state.user && !state.loaded)) root.innerHTML = v.splashView()
  else if (!state.user) { root.innerHTML = v.authView(state); root.querySelector('[autofocus], input')?.focus() }
  else { root.innerHTML = v.shellView(state); renderBackdrop(); renderView(); renderFooter() }
}
const renderView = () => setHTML('view', v.pageView(state))
const renderSidebar = () => { setHTML('sidebar', v.sidebarView(state)); $('sidebar')?.classList.toggle('is-open', state.menuOpen); renderBackdrop() }
const renderBackdrop = () => setHTML('backdrop-slot', v.backdropView(state))
const renderFooter = () => setHTML('footer', v.footerView(state))
const renderModal = () => {
  setHTML('modal-root', v.modalView(state))
  document.querySelector('#modal-root [autofocus]')?.focus()
}

let toastTimer = null
function showToast(text, kind = 'success') {
  clearTimeout(toastTimer)
  state.toast = { text, kind }
  setHTML('toast-root', v.toastView(state.toast))
  toastTimer = setTimeout(hideToast, 4500)
}
function hideToast() { state.toast = null; setHTML('toast-root', '') }

const dbError = (err) => (err?.code === 'PERMISSION_DENIED' || /permission_denied/i.test(err?.message || ''))
  ? 'Akses ditolak oleh aturan keamanan database.' : 'Gagal menyimpan ke database. Periksa koneksi internetmu.'

function closeModal() { state.modal = null; renderModal() }
function setModal(modal) { state.modal = modal; renderModal() }

/* ---------- Sesi & sinkronisasi realtime ---------- */
let unsubData = null, unsubConn = null, creatingProfile = false

function startSession(user) {
  stopSession()
  state.user = user
  state.loaded = false
  renderRoot()
  unsubConn = fb.onValue(fb.ref(fb.db, '.info/connected'), (snap) => { state.online = snap.val() === true; renderFooter() })
  unsubData = fb.onValue(fb.ref(fb.db, userBase()), async (snap) => {
    const data = snap.val() || {}
    if (!data.profile) { await ensureProfile(user); return }
    applyData(data)
  }, (err) => {
    console.error(err)
    state.loaded = true
    renderRoot()
    showToast('Tidak bisa membaca data. Pastikan aturan database sudah dipasang.', 'error')
  })
}

function applyData(data) {
  state.profile = data.profile
  setCurrency(data.profile?.currency)
  state.transactions = toList(data.transactions)
  state.goals = toList(data.goals).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
  state.budgets = data.budgets || {}
  const first = !state.loaded
  state.loaded = true
  if (first) renderRoot()
  else { renderSidebar(); renderView() }
}

async function ensureProfile(user) {
  if (creatingProfile) return
  creatingProfile = true
  try {
    await fb.set(dbRef('profile'), {
      name: (state.pendingName || user.email.split('@')[0]).slice(0, 80),
      email: user.email,
      currency: 'IDR',
      startingBalance: 0,
      notifications: DEFAULT_NOTIFICATIONS,
      createdAt: fb.serverTimestamp(),
    })
  } catch (err) {
    console.error(err)
    state.profile = { name: user.email.split('@')[0], currency: 'IDR', startingBalance: 0, notifications: DEFAULT_NOTIFICATIONS }
    state.loaded = true
    renderRoot()
    showToast(dbError(err), 'error')
  } finally { creatingProfile = false }
}

function stopSession() {
  unsubData?.(); unsubConn?.(); unsubData = unsubConn = null
  Object.assign(state, { user: null, loaded: false, profile: null, transactions: [], goals: [], budgets: {}, nav: 'Ringkasan', query: '', modal: null, menuOpen: false, pendingName: '' })
  setHTML('modal-root', '')
}

/* ---------- Autentikasi ---------- */
const AUTH_ERRORS = {
  'auth/invalid-credential': 'Email atau kata sandi salah.',
  'auth/wrong-password': 'Email atau kata sandi salah.',
  'auth/user-not-found': 'Email atau kata sandi salah.',
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/email-already-in-use': 'Email ini sudah terdaftar. Silakan masuk.',
  'auth/weak-password': 'Kata sandi terlalu lemah. Gunakan minimal 8 karakter.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
  'auth/network-request-failed': 'Tidak ada koneksi internet.',
  'auth/operation-not-allowed': 'Login email/kata sandi belum diaktifkan di Firebase Console.',
}

async function handleAuth(form) {
  const f = new FormData(form)
  const email = String(f.get('email') || '').trim().toLowerCase()
  const password = String(f.get('password') || '')
  const name = String(f.get('name') || '').trim()
  Object.assign(state, { authError: '', authInfo: '' })
  if (!email) return fail('Isi alamat email.')
  if (state.authMode !== 'reset' && password.length < 8) return fail('Kata sandi minimal 8 karakter.')
  if (state.authMode === 'register' && !name) return fail('Isi nama lengkap.')
  state.authBusy = true; renderRoot()
  try {
    if (state.authMode === 'login') await fb.signInWithEmailAndPassword(fb.auth, email, password)
    else if (state.authMode === 'register') { state.pendingName = name; await fb.createUserWithEmailAndPassword(fb.auth, email, password) }
    else { await fb.sendPasswordResetEmail(fb.auth, email); state.authInfo = 'Jika email terdaftar, tautan pengaturan ulang sudah dikirim.' }
  } catch (err) {
    state.authError = AUTH_ERRORS[err?.code] || 'Terjadi kesalahan. Coba lagi.'
  } finally {
    state.authBusy = false
    if (!state.user) renderRoot()
  }
  function fail(msg) { state.authError = msg; renderRoot() }
}

/* ---------- Operasi database ---------- */
const validAmount = (n) => Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT

async function saveTransaction(form) {
  const f = new FormData(form)
  const type = f.get('type') === 'income' ? 'income' : 'expense'
  const name = String(f.get('name') || '').trim()
  const category = type === 'income' ? INCOME_CATEGORY : String(f.get('category'))
  const amount = Number(f.get('amount'))
  const dateISO = String(f.get('date') || '')
  if (!name || name.length > 100) return showToast('Nama transaksi wajib diisi (maks. 100 karakter).', 'error')
  if (!validAmount(amount)) return showToast('Nominal harus lebih dari 0.', 'error')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return showToast('Tanggal tidak valid.', 'error')
  if (type === 'expense' && !EXPENSE_CATEGORIES.includes(category)) return showToast('Kategori tidak valid.', 'error')

  // Hitung peringatan anggaran SEBELUM menulis (state belum memuat transaksi baru).
  let warning = ''
  const limit = Number(state.budgets[category]) || 0
  if (type === 'expense' && limit && state.profile?.notifications?.budget) {
    const spent = sel.txOfPeriod(state, dateISO.slice(0, 7)).filter((t) => t.type === 'expense' && t.category === category).reduce((a, t) => a + t.amount, 0)
    const pct = Math.round(((spent + amount) / limit) * 100)
    if (pct >= 80) warning = pct >= 100 ? `Anggaran ${category} sudah terlampaui (${pct}%).` : `Anggaran ${category} sudah ${pct}% terpakai.`
  }
  closeModal()
  try {
    const newRef = fb.push(dbRef('transactions'))
    await fb.set(newRef, { name, category, dateISO, amount, type, createdAt: fb.serverTimestamp() })
    if (warning) showToast(warning, 'warn'); else showToast('Transaksi berhasil disimpan.')
  } catch (err) { console.error(err); showToast(dbError(err), 'error') }
}

async function saveGoal(form) {
  const f = new FormData(form)
  const name = String(f.get('goalName') || '').trim()
  const target = Number(f.get('goalTarget')), saved = Number(f.get('goalSaved')) || 0
  const deadline = String(f.get('goalDeadline') || '')
  if (!name || name.length > 80) return showToast('Nama tujuan wajib diisi (maks. 80 karakter).', 'error')
  if (!validAmount(target)) return showToast('Target dana harus lebih dari 0.', 'error')
  if (!(saved >= 0 && saved <= MAX_AMOUNT)) return showToast('Nominal terkumpul tidak valid.', 'error')
  if (!/^\d{4}-\d{2}$/.test(deadline)) return showToast('Pilih bulan target selesai.', 'error')
  closeModal()
  try {
    await fb.set(fb.push(dbRef('goals')), { name, target, saved, deadline, tone: ['green', 'blue', 'orange'][state.goals.length % 3], createdAt: fb.serverTimestamp() })
    showToast('Tujuan berhasil dibuat.')
  } catch (err) { console.error(err); showToast(dbError(err), 'error') }
}

async function saveSaving(form) {
  const goal = state.goals.find((g) => g.id === state.modal?.id)
  const amount = Number(new FormData(form).get('amount'))
  if (!goal) return closeModal()
  if (!validAmount(amount) || goal.saved + amount > MAX_AMOUNT) return showToast('Nominal harus lebih dari 0.', 'error')
  closeModal()
  try {
    await fb.update(dbRef(`goals/${goal.id}`), { saved: goal.saved + amount })
    showToast(goal.saved + amount >= goal.target ? `Selamat! Tujuan “${goal.name}” tercapai.` : 'Tabungan berhasil ditambahkan.')
  } catch (err) { console.error(err); showToast(dbError(err), 'error') }
}

async function saveBudget(form) {
  const category = state.modal?.category
  const limit = Number(new FormData(form).get('limit'))
  if (!EXPENSE_CATEGORIES.includes(category) || !validAmount(limit)) return showToast('Batas anggaran harus lebih dari 0.', 'error')
  closeModal()
  try { await fb.set(dbRef(`budgets/${category}`), limit); showToast('Batas anggaran disimpan.') }
  catch (err) { console.error(err); showToast(dbError(err), 'error') }
}

async function removeBudget() {
  const category = state.modal?.category
  closeModal()
  try { await fb.remove(dbRef(`budgets/${category}`)); showToast('Batas anggaran dihapus.') }
  catch (err) { console.error(err); showToast(dbError(err), 'error') }
}

async function saveSettings(form) {
  const f = new FormData(form)
  const name = String(f.get('name') || '').trim()
  const currencyCode = String(f.get('currency'))
  const startingBalance = Number(f.get('startingBalance')) || 0
  if (!name || name.length > 80) return showToast('Nama wajib diisi (maks. 80 karakter).', 'error')
  if (!['IDR', 'USD', 'SGD'].includes(currencyCode)) return showToast('Mata uang tidak valid.', 'error')
  if (Math.abs(startingBalance) > MAX_AMOUNT) return showToast('Saldo awal terlalu besar.', 'error')
  try {
    await fb.update(dbRef('profile'), {
      name, currency: currencyCode, startingBalance,
      notifications: { weekly: f.get('weekly') === 'on', budget: f.get('budget') === 'on', tips: f.get('tips') === 'on' },
    })
    state.settingsSaved = true; renderView()
    setTimeout(() => { state.settingsSaved = false; if (state.nav === 'Pengaturan') renderView() }, 3000)
  } catch (err) { console.error(err); showToast(dbError(err), 'error') }
}

async function confirmYes() {
  const m = state.modal
  closeModal()
  try {
    if (m.kind === 'tx') { await fb.remove(dbRef(`transactions/${m.id}`)); showToast('Transaksi dihapus.') }
    if (m.kind === 'goal') { await fb.remove(dbRef(`goals/${m.id}`)); showToast('Tujuan dihapus.') }
  } catch (err) { console.error(err); showToast(dbError(err), 'error') }
}

function exportCsv() {
  const rows = [
    ['Transaksi', 'Kategori', 'Tanggal', 'Jenis', 'Nominal'],
    ...sel.filteredTx(state).map((t) => [t.name, t.category, formatDate(t.dateISO), t.type === 'income' ? 'Pemasukan' : 'Pengeluaran', t.amount]),
  ]
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `transaksi-${state.period}.csv` })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ---------- Event delegation ---------- */
const actions = {
  nav: (el) => { state.nav = el.dataset.view; state.menuOpen = false; state.monthOpen = state.filterOpen = false; state.settingsSaved = false; renderRoot() },
  'open-menu': () => { state.menuOpen = true; renderSidebar() },
  'close-menu': () => { state.menuOpen = false; renderSidebar() },
  'toggle-month': () => { state.monthOpen = !state.monthOpen; renderView() },
  'set-period': (el) => { state.period = el.dataset.value; state.monthOpen = false; state.filterCategory = 'all'; renderView() },
  'toggle-filter': () => { state.filterOpen = !state.filterOpen; renderView() },
  'reset-filter': () => { state.filterType = state.filterCategory = 'all'; renderView() },
  'export-csv': exportCsv,
  'new-tx': () => setModal({ type: 'tx' }),
  'new-goal': () => { state.menuOpen = false; if (state.nav !== 'Tujuan') { state.nav = 'Tujuan'; renderRoot() } setModal({ type: 'goal' }) },
  'add-saving': (el) => setModal({ type: 'saving', id: el.dataset.id }),
  'edit-budget': (el) => setModal({ type: 'budget', category: el.dataset.category }),
  'remove-budget': removeBudget,
  'ask-delete-tx': (el) => setModal({ type: 'confirm', kind: 'tx', id: el.dataset.id, title: 'Hapus transaksi?', text: 'Transaksi ini akan dihapus permanen dan saldo dihitung ulang.', confirmLabel: 'Hapus transaksi' }),
  'ask-delete-goal': (el) => setModal({ type: 'confirm', kind: 'goal', id: el.dataset.id, title: 'Hapus tujuan?', text: 'Tujuan beserta progres tabungannya akan dihapus permanen.', confirmLabel: 'Hapus tujuan' }),
  'confirm-yes': confirmYes,
  'close-modal': closeModal,
  'close-toast': hideToast,
  'reset-settings': renderView,
  'auth-mode': (el) => { state.authMode = el.dataset.mode; state.authError = state.authInfo = ''; renderRoot() },
  logout: async () => { try { await fb.signOut(fb.auth) } catch (err) { console.error(err); showToast('Gagal keluar. Coba lagi.', 'error') } },
}

document.addEventListener('click', (e) => {
  if (state.monthOpen && !e.target.closest('.month-wrap')) { state.monthOpen = false; renderView() }
  if (state.filterOpen && !e.target.closest('.filter-wrap')) { state.filterOpen = false; renderView() }
  const el = e.target.closest('[data-action]')
  if (el) actions[el.dataset.action]?.(el, e)
})

document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]')
  if (!form) return
  e.preventDefault()
  const handlers = { auth: handleAuth, tx: saveTransaction, goal: saveGoal, saving: saveSaving, budget: saveBudget, settings: saveSettings }
  handlers[form.dataset.form]?.(form)
})

const inputHandlers = {
  query: (el) => { state.query = el.value; if (state.nav === 'Ringkasan' || state.nav === 'Transaksi') renderView() },
  filterType: (el) => { state.filterType = el.value; renderView() },
  filterCategory: (el) => { state.filterCategory = el.value; renderView() },
  draftName: (el) => { state.draft.name = el.value },
  draftEmail: (el) => { state.draft.email = el.value },
  txType: (el) => { const c = $('tx-category'); if (c) c.innerHTML = v.categoryOptions(el.value === 'income' ? 'income' : 'expense') },
}
const onInput = (e) => { const el = e.target.closest('[data-input]'); if (el) inputHandlers[el.dataset.input]?.(el) }
document.addEventListener('input', onInput)
document.addEventListener('change', onInput)

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.modal) closeModal()
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && state.user) { e.preventDefault(); $('search-input')?.focus() }
})

/* ---------- Mulai ---------- */
renderRoot()
if (fb.isConfigured) {
  fb.onAuthStateChanged(fb.auth, (user) => {
    state.authReady = true
    if (user) startSession(user)
    else { stopSession(); renderRoot() }
  })
}
