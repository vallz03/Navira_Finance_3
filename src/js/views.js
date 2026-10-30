// Semua fungsi di sini mengembalikan string HTML. Semua data pengguna WAJIB lewat esc().
import {
  esc, currency, compact, formatDate, monthLabel, shortMonth, periodOptions, icon, initials,
  EXPENSE_CATEGORIES, INCOME_CATEGORY, CATEGORY_STYLE, todayISO, currentPeriod,
} from './utils.js'
import * as sel from './selectors.js'

const NAV = [
  { label: 'Ringkasan', icon: 'dashboard' },
  { label: 'Transaksi', icon: 'transaction' },
  { label: 'Anggaran', icon: 'wallet' },
  { label: 'Tujuan', icon: 'target' },
]
const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform || '')

/* ---------- Layar awal ---------- */
export const splashView = () => `<div class="splash"><span class="brand-mark">S</span><p>Memuat data keuanganmu…</p></div>`

export const setupView = () => `
  <div class="splash"><div class="setup-card panel">
    <span class="brand-mark">S</span>
    <h1>Hubungkan Firebase dulu</h1>
    <p>Buka <code>src/js/firebase-config.js</code> lalu isi dengan konfigurasi web app dari Firebase Console (Project settings &gt; Your apps).</p>
    <p>Setelah itu aktifkan <strong>Authentication &gt; Email/Password</strong>, buat <strong>Realtime Database</strong>, dan salin isi <code>database.rules.json</code> ke tab Rules. Langkah lengkap ada di README.md.</p>
    <p>Simpan file, lalu jalankan ulang aplikasi.</p>
  </div></div>`

export function authView(s) {
  const mode = s.authMode
  const titles = { login: 'Masuk', register: 'Daftar', reset: 'Atur ulang kata sandi' }
  const subs = {
    login: 'Data keuanganmu tersimpan aman dan tersinkron di semua perangkat.',
    register: 'Cukup satu akun untuk mencatat transaksi, anggaran, dan tujuanmu.',
    reset: 'Kami kirim tautan pengaturan ulang ke email yang kamu daftarkan.',
  }
  const submitLabel = { login: 'Masuk', register: 'Buat akun', reset: 'Kirim tautan' }[mode]
  return `
  <div class="auth-shell">
    <section class="auth-aside">
      <div class="brand"><span class="brand-mark">S</span><span>Navira_Finance<span class="brand-dot">.</span></span></div>
      <div>
        <h1>Tahu ke mana uangmu pergi, setiap hari.</h1>
        <ul>
          <li>Catat pemasukan dan pengeluaran dalam hitungan detik.</li>
          <li>Pasang batas anggaran per kategori dan dapat peringatan sebelum jebol.</li>
          <li>Pantau progres tabungan untuk setiap tujuanmu.</li>
        </ul>
      </div>
      <p>Data tiap akun terkunci: hanya kamu yang bisa membaca dan mengubahnya.</p>
    </section>
    <section class="auth-panel">
      <form class="auth-card" data-form="auth" novalidate>
        <h2>${titles[mode]}</h2>
        <p class="auth-sub">${subs[mode]}</p>
        ${s.authError ? `<p class="form-error" role="alert">${esc(s.authError)}</p>` : ''}
        ${s.authInfo ? `<p class="form-info" role="status">${esc(s.authInfo)}</p>` : ''}
        ${mode === 'register' ? `<label>Nama lengkap<input name="name" maxlength="80" autocomplete="name" value="${esc(s.draft.name)}" data-input="draftName" required /></label>` : ''}
        <label>Alamat email<input name="email" type="email" maxlength="120" autocomplete="email" value="${esc(s.draft.email)}" data-input="draftEmail" required ${mode !== 'register' ? 'autofocus' : ''} /></label>
        ${mode !== 'reset' ? `<label>Kata sandi<input name="password" type="password" minlength="8" maxlength="128" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required />${mode === 'register' ? '<small>Minimal 8 karakter.</small>' : ''}</label>` : ''}
        <button class="add-button auth-submit" type="submit" ${s.authBusy ? 'disabled' : ''}>${s.authBusy ? 'Memproses…' : submitLabel}</button>
        <div class="auth-links">
          ${mode === 'login' ? `<button type="button" class="text-link" data-action="auth-mode" data-mode="reset">Lupa kata sandi?</button><button type="button" class="text-link" data-action="auth-mode" data-mode="register">Belum punya akun? Daftar</button>` : ''}
          ${mode !== 'login' ? `<button type="button" class="text-link" data-action="auth-mode" data-mode="login">Sudah punya akun? Masuk</button>` : ''}
        </div>
      </form>
    </section>
  </div>`
}

/* ---------- Kerangka aplikasi ---------- */
export function sidebarView(s) {
  const name = s.profile?.name || 'Pengguna'
  return `
    <div class="brand"><span class="brand-mark">S</span><span>Navira_Finance<span class="brand-dot">.</span></span></div>
    <button class="close-menu" data-action="close-menu" aria-label="Tutup menu">${icon('close')}</button>
    <nav class="primary-nav" aria-label="Navigasi utama">
      <p class="nav-label">MENU UTAMA</p>
      ${NAV.map((n) => `<button class="nav-item ${s.nav === n.label ? 'active' : ''}" data-action="nav" data-view="${n.label}">${icon(n.icon)}<span>${n.label}</span></button>`).join('')}
      <p class="nav-label second">PREFERENSI</p>
      <button class="nav-item ${s.nav === 'Pengaturan' ? 'active' : ''}" data-action="nav" data-view="Pengaturan">${icon('settings')}<span>Pengaturan</span></button>
    </nav>
    <div class="sidebar-bottom">
      <div class="upgrade-card">
        <div class="upgrade-icon">${icon('target', 20)}</div>
        <p class="upgrade-title">Rencanakan lebih baik</p>
        <p class="upgrade-copy">Buat tujuan dan wujudkan rencana keuanganmu.</p>
        <button data-action="new-goal">Buat tujuan ${icon('chevron', 15)}</button>
      </div>
      <div class="profile">
        <div class="avatar">${esc(initials(name))}</div>
        <div><strong>${esc(name)}</strong><span>${esc(s.user?.email || '')}</span></div>
        <button data-action="logout" aria-label="Keluar dari akun" title="Keluar">${icon('logout', 16)}</button>
      </div>
    </div>`
}

export const shellView = (s) => `
  <div class="app-shell">
    <aside class="sidebar ${s.menuOpen ? 'is-open' : ''}" id="sidebar">${sidebarView(s)}</aside>
    <span id="backdrop-slot"></span>
    <main class="main-content">
      <header class="topbar">
        <button class="menu-button" data-action="open-menu" aria-label="Buka menu">${icon('menu')}</button>
        <div class="mobile-brand">Navira_Finance<span>.</span></div>
        <label class="search">${icon('search', 19)}<input id="search-input" value="${esc(s.query)}" data-input="query" placeholder="Cari transaksi..." /><kbd>${isMac ? '⌘ K' : 'Ctrl K'}</kbd></label>
        <button class="add-button" data-action="new-tx">${icon('plus', 19)}<span>Catat transaksi</span></button>
      </header>
      <div class="content">
        <div id="view"></div>
        <footer id="footer"></footer>
      </div>
    </main>
  </div>`

export const backdropView = (s) => (s.menuOpen ? `<button class="backdrop nav-backdrop" data-action="close-menu" aria-label="Tutup menu"></button>` : '')

export const footerView = (s) =>
  `<span class="status-dot ${s.online ? 'on' : 'off'}"></span>${s.online ? 'Tersinkron realtime dengan Firebase' : 'Offline, perubahan akan dikirim saat tersambung kembali'}<span>•</span>Nominal dalam ${esc(s.profile?.currency || 'IDR')}`

/* ---------- Halaman ---------- */
export function pageView(s) {
  switch (s.nav) {
    case 'Transaksi': return transactionsPage(s)
    case 'Anggaran': return budgetPage(s)
    case 'Tujuan': return goalsPage(s)
    case 'Pengaturan': return settingsPage(s)
    default: return dashboardPage(s)
  }
}

function monthPicker(s) {
  return `<div class="month-wrap">
    <button class="month-button" data-action="toggle-month" aria-haspopup="listbox" aria-expanded="${s.monthOpen}">${icon('calendar', 17)} ${esc(monthLabel(s.period))} ${icon('chevron', 14)}</button>
    ${s.monthOpen ? `<div class="month-menu" role="listbox">${periodOptions().map((p) => `<button role="option" class="${p === s.period ? 'selected' : ''}" data-action="set-period" data-value="${p}">${esc(monthLabel(p))}</button>`).join('')}</div>` : ''}
  </div>`
}

function trend(now, before, goodWhenUp) {
  if (!before) return ''
  const pct = Math.round(((now - before) / before) * 100)
  if (!pct) return ''
  const good = goodWhenUp ? pct > 0 : pct < 0
  return `<span class="trend ${good ? 'up' : 'down'}">${pct > 0 ? '+' : '−'}${Math.abs(pct)}%</span>`
}

const greeting = () => { const h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam' }

function smooth(points) {
  let d = `M${points[0][0]} ${points[0][1].toFixed(1)}`
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i], mx = (x0 + x1) / 2
    d += ` C${mx} ${y0.toFixed(1)} ${mx} ${y1.toFixed(1)} ${x1} ${y1.toFixed(1)}`
  }
  return d
}

function dashboardPage(s) {
  const cur = sel.summary(s), prev = sel.summary(s, sel.cashflow(s).data[4].period)
  const cf = sel.cashflow(s), bars = sel.balanceBars(s)
  const x = (i) => i * 132, y = (v) => 209 - (v / cf.max) * 199
  const inc = smooth(cf.data.map((d, i) => [x(i), y(d.income)]))
  const exp = smooth(cf.data.map((d, i) => [x(i), y(d.expense)]))
  const first = (s.profile?.name || 'kamu').split(' ')[0]
  const budgets = sel.budgetUsage(s).filter((b) => b.limit)
  const totalLimit = budgets.reduce((a, b) => a + b.limit, 0), totalSpent = budgets.reduce((a, b) => a + b.spent, 0)
  const top = [...budgets].sort((a, b) => b.pct - a.pct).slice(0, 3)
  const safe = budgets.filter((b) => b.pct < 80).length
  return `
  <section class="greeting-row">
    <div>
      <p class="eyebrow">${esc(new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()).toUpperCase())}</p>
      <h1>${greeting()}, ${esc(first)}.</h1>
      <p>Ini kabar terbaru dari keuanganmu bulan ini.</p>
    </div>
    ${monthPicker(s)}
  </section>
  <section class="metric-grid" aria-label="Ringkasan keuangan">
    <article class="metric-card balance-card">
      <div class="metric-head"><span>Total saldo</span><span class="metric-icon">${icon('wallet')}</span></div>
      <strong>${currency(cur.balance)}</strong>
      <p>Saldo tercatat hingga ${esc(monthLabel(s.period))}</p>
      <div class="mini-bars" aria-hidden="true">${bars.map((h) => `<i style="height:${h.toFixed(0)}%"></i>`).join('')}</div>
    </article>
    <article class="metric-card">
      <div class="metric-head"><span>Pemasukan</span><span class="metric-icon income">${icon('arrow-down')}</span></div>
      <strong>${currency(cur.income)}</strong>
      <p>${trend(cur.income, prev.income, true)} ${cur.incomeCount} transaksi pada ${esc(monthLabel(s.period))}</p>
    </article>
    <article class="metric-card">
      <div class="metric-head"><span>Pengeluaran</span><span class="metric-icon expense">${icon('arrow-up')}</span></div>
      <strong>${currency(cur.expense)}</strong>
      <p>${trend(cur.expense, prev.expense, false)} ${cur.expenseCount} transaksi pada ${esc(monthLabel(s.period))}</p>
    </article>
  </section>
  <section class="dashboard-grid">
    <article class="panel cashflow-panel">
      <div class="panel-heading"><div><h2>Arus kas</h2><p>Pemasukan dan pengeluaran 6 bulan terakhir</p></div></div>
      <div class="chart-legend"><span><i class="dot income-dot"></i>Pemasukan</span><span><i class="dot expense-dot"></i>Pengeluaran</span></div>
      <div class="chart">
        <div class="y-axis">${cf.ticks.map((t) => `<span>${esc(compact(t))}</span>`).join('')}</div>
        <svg viewBox="0 0 660 210" preserveAspectRatio="none" role="img" aria-label="Grafik arus kas 6 bulan terakhir">
          <defs><linearGradient id="income-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#15745c" stop-opacity=".18"/><stop offset="1" stop-color="#15745c" stop-opacity="0"/></linearGradient></defs>
          <g class="grid-lines"><path d="M0 10H660M0 60H660M0 110H660M0 160H660M0 209H660"/></g>
          <path class="area" d="${inc} L660 210 L0 210Z"/>
          <path class="income-line" d="${inc}"/>
          <path class="expense-line" d="${exp}"/>
        </svg>
        <div class="x-axis">${cf.data.map((d) => `<span>${esc(shortMonth(d.period))}</span>`).join('')}</div>
      </div>
    </article>
    <article class="panel budget-panel">
      <div class="panel-heading"><div><h2>Anggaran bulanan</h2><p>${budgets.length ? `${safe} dari ${budgets.length} kategori aman` : 'Belum ada batas anggaran'}</p></div></div>
      ${budgets.length ? `
        <div class="budget-total"><span>Terpakai</span><strong>${currency(totalSpent)} <small>/ ${currency(totalLimit)}</small></strong></div>
        <div class="progress large"><i class="${barTone(totalLimit ? (totalSpent / totalLimit) * 100 : 0)}" style="width:${Math.min(100, totalLimit ? (totalSpent / totalLimit) * 100 : 0).toFixed(0)}%"></i></div>
        <div class="budget-list">${top.map((b) => `<div><span class="category-icon ${CATEGORY_STYLE[b.category][1]}">${CATEGORY_STYLE[b.category][0]}</span><p><strong>${esc(b.category)}</strong><span>${esc(currency(b.spent))} dari ${esc(currency(b.limit))}</span></p><b>${b.pct}%</b></div>`).join('')}</div>`
      : `<p class="panel-empty">Atur batas pengeluaran per kategori supaya Navira_Finance bisa mengingatkanmu sebelum anggaran habis.</p>`}
      <button class="text-link" data-action="nav" data-view="Anggaran">${budgets.length ? 'Lihat semua anggaran' : 'Atur anggaran'} ${icon('chevron', 14)}</button>
    </article>
  </section>
  ${txPanel(s, 6, 'Transaksi terbaru')}`
}

const barTone = (pct) => (pct >= 100 ? 'danger' : pct >= 80 ? 'warn' : '')

function txPanel(s, limit, title) {
  const list = sel.filteredTx(s), shown = limit ? list.slice(0, limit) : list
  const cats = [...new Set(sel.txOfPeriod(s).map((t) => t.category))]
  const filtering = s.filterType !== 'all' || s.filterCategory !== 'all'
  return `
  <section class="panel transactions-panel">
    <div class="panel-heading transaction-heading">
      <div><h2>${title}</h2><p>${list.length} transaksi ditemukan</p></div>
      <div class="table-actions">
        <div class="filter-wrap">
          <button class="${filtering ? 'filter-active' : ''}" data-action="toggle-filter">${icon('filter', 16)} Filter${filtering ? ' aktif' : ''}</button>
          ${s.filterOpen ? `<div class="filter-menu">
            <div class="filter-title"><strong>Filter transaksi</strong><button data-action="toggle-filter" aria-label="Tutup filter">${icon('close', 16)}</button></div>
            <label>Jenis<select data-input="filterType"><option value="all">Semua jenis</option><option value="income" ${s.filterType === 'income' ? 'selected' : ''}>Pemasukan</option><option value="expense" ${s.filterType === 'expense' ? 'selected' : ''}>Pengeluaran</option></select></label>
            <label>Kategori<select data-input="filterCategory"><option value="all">Semua kategori</option>${cats.map((c) => `<option ${s.filterCategory === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
            <div class="filter-actions"><button data-action="reset-filter">Reset</button><button data-action="toggle-filter">Terapkan</button></div>
          </div>` : ''}
        </div>
        <button data-action="export-csv" ${list.length ? '' : 'disabled'} aria-label="Unduh transaksi sebagai CSV">${icon('download', 17)}</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>TRANSAKSI</th><th>KATEGORI</th><th>TANGGAL</th><th class="amount-cell">NOMINAL</th><th class="actions-cell"><span class="sr-only">Aksi</span></th></tr></thead>
        <tbody>${shown.map((t) => `<tr>
          <td><div class="transaction-icon ${t.type}">${icon(t.type === 'income' ? 'arrow-down' : 'arrow-up', 15)}</div><strong>${esc(t.name)}</strong></td>
          <td><span class="category-pill">${esc(t.category)}</span></td>
          <td>${esc(formatDate(t.dateISO))}</td>
          <td class="amount-cell ${t.type}">${t.type === 'income' ? '+' : '−'}${currency(t.amount)}</td>
          <td class="actions-cell"><button class="row-action" data-action="ask-delete-tx" data-id="${esc(t.id)}" aria-label="Hapus transaksi ${esc(t.name)}">${icon('trash', 15)}</button></td>
        </tr>`).join('')}</tbody>
      </table>
      ${list.length === 0 ? `<div class="empty-state">${s.query ? `Tidak ada transaksi yang cocok dengan “${esc(s.query)}”.` : `Belum ada transaksi di ${esc(monthLabel(s.period))}. Pilih “Catat transaksi” untuk mulai.`}</div>` : ''}
      ${limit && list.length > limit ? `<div class="table-more"><button class="text-link" data-action="nav" data-view="Transaksi">Lihat semua ${list.length} transaksi ${icon('chevron', 14)}</button></div>` : ''}
    </div>
  </section>`
}

function transactionsPage(s) {
  return `<section class="feature-page">
    <div class="page-title-row"><div><p class="eyebrow">RIWAYAT</p><h1>Transaksi</h1><p>Semua pemasukan dan pengeluaran pada ${esc(monthLabel(s.period))}.</p></div>${monthPicker(s)}</div>
    ${txPanel(s, 0, 'Daftar transaksi')}</section>`
}

function budgetPage(s) {
  const usage = sel.budgetUsage(s), set = usage.filter((b) => b.limit)
  const limit = set.reduce((a, b) => a + b.limit, 0), spent = set.reduce((a, b) => a + b.spent, 0)
  const pct = limit ? Math.round((spent / limit) * 100) : 0
  return `<section class="feature-page">
    <div class="page-title-row"><div><p class="eyebrow">PENGENDALIAN</p><h1>Anggaran</h1><p>Atur batas pengeluaran tiap kategori untuk ${esc(monthLabel(s.period))}.</p></div>${monthPicker(s)}</div>
    <div class="goal-summary panel">
      <div><span>Terpakai dari anggaran yang diatur</span><strong>${currency(spent)}</strong><p>${limit ? `dari batas total ${currency(limit)}` : 'Belum ada batas yang diatur'}</p></div>
      <div class="summary-ring"><span>${pct}%</span></div>
    </div>
    <div class="goals-grid">${usage.map((b) => {
      const [abbr, tone] = CATEGORY_STYLE[b.category]
      return `<article class="goal-card panel">
        <div class="goal-symbol-row"><span class="category-icon ${tone}">${abbr}</span><h2>${esc(b.category)}</h2></div>
        <strong>${currency(b.spent)}</strong><span class="goal-target">${b.limit ? `dari batas ${currency(b.limit)}` : 'Batas belum diatur'}</span>
        <div class="goal-progress ${tone === 'x' ? '' : 'green'} ${barTone(b.pct)}"><i style="width:${Math.min(100, b.pct)}%"></i></div>
        <div class="goal-meta"><b>${b.limit ? `${b.pct}% terpakai` : 'Tanpa batas'}</b><span>${b.limit ? (b.pct >= 100 ? 'Melebihi batas' : `Sisa ${currency(b.limit - b.spent)}`) : ''}</span></div>
        <button class="goal-action" data-action="edit-budget" data-category="${esc(b.category)}">${b.limit ? 'Ubah batas' : 'Atur batas'}</button>
      </article>`
    }).join('')}</div></section>`
}

function goalsPage(s) {
  const saved = s.goals.reduce((a, g) => a + g.saved, 0), target = s.goals.reduce((a, g) => a + g.target, 0)
  return `<section class="feature-page">
    <div class="page-title-row"><div><p class="eyebrow">RENCANA KEUANGAN</p><h1>Tujuan keuangan</h1><p>Pantau progres dan wujudkan rencana satu langkah setiap hari.</p></div>
      <button class="add-button" data-action="new-goal">${icon('plus', 18)} Buat tujuan</button></div>
    <div class="goal-summary panel">
      <div><span>Total terkumpul</span><strong>${currency(saved)}</strong><p>dari ${currency(target)} target keseluruhan</p></div>
      <div class="summary-ring"><span>${Math.round((saved / Math.max(target, 1)) * 100)}%</span></div>
    </div>
    ${s.goals.length ? `<div class="goals-grid">${s.goals.map((g) => {
      const progress = Math.min(Math.round((g.saved / g.target) * 100), 100)
      return `<article class="goal-card panel">
        <div class="goal-symbol ${esc(g.tone)}">${icon('target', 20)}</div>
        <div class="goal-card-head"><div><p>Target tabungan</p><h2>${esc(g.name)}</h2></div><button data-action="ask-delete-goal" data-id="${esc(g.id)}" aria-label="Hapus tujuan ${esc(g.name)}">${icon('trash', 16)}</button></div>
        <strong>${currency(g.saved)}</strong><span class="goal-target">dari ${currency(g.target)}</span>
        <div class="goal-progress ${esc(g.tone)}"><i style="width:${progress}%"></i></div>
        <div class="goal-meta"><b>${progress >= 100 ? 'Tercapai' : `${progress}% tercapai`}</b><span>${icon('calendar', 13)} ${esc(/^\d{4}-\d{2}$/.test(g.deadline) ? monthLabel(g.deadline) : g.deadline)}</span></div>
        <button class="goal-action" data-action="add-saving" data-id="${esc(g.id)}">Tambah tabungan</button>
      </article>`
    }).join('')}</div>` : `<div class="panel empty-state">Belum ada tujuan. Pilih “Buat tujuan” untuk menetapkan target tabungan pertamamu.</div>`}
  </section>`
}

function settingsPage(s) {
  const p = s.profile || {}, n = p.notifications || {}
  return `<section class="feature-page settings-page">
    <div class="page-title-row"><div><p class="eyebrow">PREFERENSI</p><h1>Pengaturan</h1><p>Kelola profil dan sesuaikan pengalaman penggunaan Navira_Finance.</p></div></div>
    ${s.settingsSaved ? `<div class="success-banner" role="status">Perubahan pengaturan berhasil disimpan.</div>` : ''}
    <form data-form="settings">
      <article class="settings-card panel">
        <div class="settings-heading"><div class="settings-icon">${icon('settings')}</div><div><h2>Profil pribadi</h2><p>Informasi dasar akunmu.</p></div></div>
        <div class="settings-fields">
          <label>Nama lengkap<input name="name" maxlength="80" required value="${esc(p.name)}" /></label>
          <label>Alamat email<input type="email" value="${esc(s.user?.email)}" disabled /></label>
        </div>
      </article>
      <article class="settings-card panel">
        <div class="settings-heading"><div class="settings-icon">${icon('wallet')}</div><div><h2>Keuangan</h2><p>Mata uang dan saldo awal pencatatan.</p></div></div>
        <div class="settings-fields">
          <label>Mata uang<select name="currency">${[['IDR', 'Rupiah Indonesia (IDR)'], ['USD', 'US Dollar (USD)'], ['SGD', 'Singapore Dollar (SGD)']].map(([v, l]) => `<option value="${v}" ${p.currency === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label>Saldo awal<input name="startingBalance" type="number" step="1" value="${esc(Number(p.startingBalance) || 0)}" /></label>
        </div>
      </article>
      <article class="settings-card panel">
        <div class="settings-heading"><div class="settings-icon">${icon('target')}</div><div><h2>Notifikasi</h2><p>Pilih kabar yang ingin kamu terima.</p></div></div>
        <div class="toggle-list">
          <label><span><strong>Ringkasan mingguan</strong><small>Preferensi tersimpan di akunmu.</small></span><input type="checkbox" name="weekly" ${n.weekly ? 'checked' : ''} /></label>
          <label><span><strong>Peringatan anggaran</strong><small>Tampil di aplikasi saat pengeluaran mencapai 80% batas.</small></span><input type="checkbox" name="budget" ${n.budget ? 'checked' : ''} /></label>
          <label><span><strong>Tips keuangan</strong><small>Preferensi tersimpan di akunmu.</small></span><input type="checkbox" name="tips" ${n.tips ? 'checked' : ''} /></label>
        </div>
      </article>
      <div class="settings-actions"><button type="button" class="secondary-button" data-action="reset-settings">Batalkan</button><button type="submit" class="add-button">Simpan perubahan</button></div>
    </form>
  </section>`
}

/* ---------- Modal & toast ---------- */
const modalFrame = (id, eyebrow, title, body, formName) => `
  <div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="${id}">
    <button class="backdrop" data-action="close-modal" aria-label="Tutup dialog"></button>
    <form class="modal" data-form="${formName}">
      <div class="modal-head"><div><p class="eyebrow">${eyebrow}</p><h2 id="${id}">${title}</h2></div><button type="button" data-action="close-modal" aria-label="Tutup">${icon('close')}</button></div>
      ${body}
    </form>
  </div>`
const actionsRow = (submit, extra = '') => `<div class="modal-actions">${extra}<button type="button" class="secondary-button" data-action="close-modal">Batal</button><button class="add-button" type="submit">${submit}</button></div>`
export const categoryOptions = (type, selected) =>
  type === 'income' ? `<option>${INCOME_CATEGORY}</option>` : EXPENSE_CATEGORIES.map((c) => `<option ${c === selected ? 'selected' : ''}>${c}</option>`).join('')

export function modalView(s) {
  const m = s.modal
  if (!m) return ''
  if (m.type === 'tx') {
    const date = s.period === currentPeriod() ? todayISO() : `${s.period}-01`
    return modalFrame('modal-title', 'TRANSAKSI BARU', 'Catat keuanganmu', `
      <label>Nama transaksi<input name="name" required maxlength="100" placeholder="Contoh: Belanja mingguan" autofocus /></label>
      <div class="form-row">
        <label>Jenis<select name="type" data-input="txType"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select></label>
        <label>Kategori<select name="category" id="tx-category">${categoryOptions('expense')}</select></label>
      </div>
      <div class="form-row">
        <label>Nominal<input name="amount" required min="1" step="1" type="number" placeholder="0" /></label>
        <label>Tanggal<input name="date" required type="date" value="${date}" /></label>
      </div>${actionsRow('Simpan transaksi')}`, 'tx')
  }
  if (m.type === 'goal') return modalFrame('modal-title', 'TUJUAN BARU', 'Apa yang ingin dicapai?', `
      <label>Nama tujuan<input name="goalName" required maxlength="80" placeholder="Contoh: Dana pendidikan" autofocus /></label>
      <label>Target dana<input name="goalTarget" required min="1" step="1" type="number" placeholder="0" /></label>
      <div class="form-row">
        <label>Sudah terkumpul<input name="goalSaved" min="0" step="1" type="number" placeholder="0" /></label>
        <label>Target selesai<input name="goalDeadline" required type="month" min="${currentPeriod()}" /></label>
      </div>${actionsRow('Buat tujuan')}`, 'goal')
  if (m.type === 'saving') {
    const g = s.goals.find((x) => x.id === m.id)
    if (!g) return ''
    return modalFrame('modal-title', 'TABUNGAN', `Tambah ke ${esc(g.name)}`, `
      <label>Nominal tabungan<input name="amount" required min="1" step="1" type="number" placeholder="0" autofocus /></label>
      <p class="modal-hint">Terkumpul ${currency(g.saved)} dari ${currency(g.target)}.</p>${actionsRow('Tambah tabungan')}`, 'saving')
  }
  if (m.type === 'budget') {
    const cur = Number(s.budgets?.[m.category]) || 0
    return modalFrame('modal-title', 'ANGGARAN', `Batas ${esc(m.category)}`, `
      <label>Batas per bulan<input name="limit" required min="1" step="1" type="number" value="${cur || ''}" placeholder="0" autofocus /></label>
      <p class="modal-hint">Batas ini berlaku untuk setiap bulan. Kamu akan diingatkan saat pemakaian mencapai 80%.</p>
      ${actionsRow('Simpan batas', cur ? `<button type="button" class="secondary-button danger-text" data-action="remove-budget">Hapus batas</button>` : '')}`, 'budget')
  }
  if (m.type === 'confirm') return `
    <div class="modal-layer" role="alertdialog" aria-modal="true" aria-labelledby="modal-title">
      <button class="backdrop" data-action="close-modal" aria-label="Tutup dialog"></button>
      <div class="modal">
        <div class="modal-head"><div><p class="eyebrow">KONFIRMASI</p><h2 id="modal-title">${esc(m.title)}</h2></div></div>
        <p class="modal-hint">${esc(m.text)}</p>
        <div class="modal-actions"><button class="secondary-button" data-action="close-modal">Batal</button><button class="add-button danger" data-action="confirm-yes" autofocus>${esc(m.confirmLabel)}</button></div>
      </div>
    </div>`
  return ''
}

export const toastView = (t) => t ? `
  <div class="toast ${t.kind}" role="status">
    <span class="toast-icon">${icon(t.kind === 'success' ? 'check' : 'alert', 17)}</span>
    <div><strong>${t.kind === 'success' ? 'Berhasil' : t.kind === 'warn' ? 'Perhatian' : 'Gagal'}</strong><p>${esc(t.text)}</p></div>
    <button data-action="close-toast" aria-label="Tutup notifikasi">${icon('close', 16)}</button>
  </div>` : ''
