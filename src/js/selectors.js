// Perhitungan turunan dari state (murni, tanpa DOM).
import { EXPENSE_CATEGORIES, niceMax, shiftPeriod } from './utils.js'

const byNewest = (a, b) => b.dateISO.localeCompare(a.dateISO) || (b.createdAt || 0) - (a.createdAt || 0)
const sum = (list, type) => list.filter((t) => t.type === type).reduce((acc, t) => acc + t.amount, 0)

export const txOfPeriod = (s, period = s.period) => s.transactions.filter((t) => t.dateISO.startsWith(period))

export function filteredTx(s) {
  const q = s.query.trim().toLowerCase()
  return txOfPeriod(s)
    .filter((t) =>
      `${t.name} ${t.category}`.toLowerCase().includes(q) &&
      (s.filterType === 'all' || t.type === s.filterType) &&
      (s.filterCategory === 'all' || t.category === s.filterCategory))
    .sort(byNewest)
}

export const balanceAt = (s, period) =>
  (Number(s.profile?.startingBalance) || 0) +
  s.transactions.filter((t) => t.dateISO.slice(0, 7) <= period).reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0)

export function summary(s, period = s.period) {
  const list = txOfPeriod(s, period)
  return {
    income: sum(list, 'income'),
    expense: sum(list, 'expense'),
    incomeCount: list.filter((t) => t.type === 'income').length,
    expenseCount: list.filter((t) => t.type === 'expense').length,
    balance: balanceAt(s, period),
  }
}

export function balanceBars(s) {
  const values = Array.from({ length: 12 }, (_, i) => balanceAt(s, shiftPeriod(s.period, i - 11)))
  const min = Math.min(...values), max = Math.max(...values)
  return values.map((v) => (max === min ? 60 : 25 + (75 * (v - min)) / (max - min)))
}

export function cashflow(s) {
  const periods = Array.from({ length: 6 }, (_, i) => shiftPeriod(s.period, i - 5))
  const data = periods.map((p) => { const x = summary(s, p); return { period: p, income: x.income, expense: x.expense } })
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.income, d.expense))))
  return { data, max, ticks: [1, 0.75, 0.5, 0.25, 0].map((f) => max * f) }
}

export function budgetUsage(s) {
  const spentBy = {}
  txOfPeriod(s).filter((t) => t.type === 'expense').forEach((t) => { spentBy[t.category] = (spentBy[t.category] || 0) + t.amount })
  return EXPENSE_CATEGORIES.map((category) => {
    const limit = Number(s.budgets?.[category]) || 0
    const spent = spentBy[category] || 0
    return { category, limit, spent, pct: limit ? Math.round((spent / limit) * 100) : 0 }
  })
}
