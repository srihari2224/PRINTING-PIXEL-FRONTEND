"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

const FILE_UPLOADER_API = "https://printing-pixel-1.onrender.com"

const PERIODS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "lastweek", label: "Last Week" },
  { id: "month", label: "This Month" },
]

interface Transaction {
  transactionId: string
  kioskId: string
  amount: number
  totalPages: number
  filesCount: number
  printDetails: Array<{ fileName: string; pageCount: number; copies: number; colorMode: string }>
  status: string
  createdAt: string
}

export default function AdminAnalytics() {
  const [period, setPeriod] = useState("week")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [kioskPage, setKioskPage] = useState(0)
  const KIOSKS_PER_PAGE = 6

  // Fetch all transactions (we'll get kiosk list first, then fetch all their transactions)
  useEffect(() => {
    setLoading(true)
    fetch(`${FILE_UPLOADER_API}/api/transactions/kiosk/all`)
      .then((r) => {
        if (!r.ok) throw new Error("API error")
        return r.json()
      })
      .then((d) => {
        const txs = d.transactions || d || []
        setTransactions(Array.isArray(txs) ? txs : [])
      })
      .catch(() => {
        // Fallback: no data available
        setTransactions([])
        setError("")
      })
      .finally(() => setLoading(false))
  }, [])

  // Filter by period
  const filterByPeriod = (txs: Transaction[]) => {
    const now = new Date()
    return txs.filter((tx) => {
      const d = new Date(tx.createdAt)
      if (period === "today") {
        return d.toDateString() === now.toDateString()
      } else if (period === "week") {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
        return d >= weekAgo
      } else if (period === "lastweek") {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
        const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14)
        return d >= twoWeeksAgo && d < weekAgo
      } else if (period === "month") {
        const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 30)
        return d >= monthAgo
      }
      return true
    })
  }

  const filtered = filterByPeriod(transactions)

  // Stats
  const totalRevenue = filtered.reduce((s, t) => s + (t.amount || 0), 0) / 100
  const totalPages = filtered.reduce((s, t) => s + (t.totalPages || 0), 0)
  const colorPages = filtered.reduce((s, t) => {
    const cp = (t.printDetails || []).filter((p) => p.colorMode === "color").reduce((a, p) => a + p.pageCount * p.copies, 0)
    return s + cp
  }, 0)
  const bwPages = totalPages - colorPages

  // Chart data (daily buckets)
  const chartData = (() => {
    const days: Record<string, { date: string; revenue: number; pages: number; transactions: number }> = {}
    filtered.forEach((tx) => {
      const day = new Date(tx.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
      if (!days[day]) days[day] = { date: day, revenue: 0, pages: 0, transactions: 0 }
      days[day].revenue += (tx.amount || 0) / 100
      days[day].pages += tx.totalPages || 0
      days[day].transactions += 1
    })
    return Object.values(days)
  })()

  // Per-kiosk revenue comparison
  const kioskComparisonData = (() => {
    const kiosks: Record<string, { kiosk: string; revenue: number; transactions: number }> = {}
    filtered.forEach((tx) => {
      const id = tx.kioskId
      if (!kiosks[id]) kiosks[id] = { kiosk: id, revenue: 0, transactions: 0 }
      kiosks[id].revenue += (tx.amount || 0) / 100
      kiosks[id].transactions += 1
    })
    return Object.values(kiosks).sort((a, b) => b.revenue - a.revenue)
  })()
  const totalKioskPages = Math.ceil(kioskComparisonData.length / KIOSKS_PER_PAGE)
  const pagedKioskData = kioskComparisonData.slice(kioskPage * KIOSKS_PER_PAGE, (kioskPage + 1) * KIOSKS_PER_PAGE)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="border p-3" style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.15)" }}>
        <p className="text-[0.6rem] uppercase tracking-[0.2em] mb-2" style={{ color: "#4a4a4a" }}>{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-[0.75rem] font-bold" style={{ color: entry.fill }}>
            {entry.name}: {entry.name === "Revenue (INR)" ? `₹${entry.value.toFixed(0)}` : entry.value}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Period selector */}
      <div className="flex gap-0 mb-8 border" style={{ borderColor: "rgba(255,255,255,0.1)", display: "inline-flex" }}>
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className="px-5 py-2.5 text-[0.6rem] font-bold uppercase tracking-[0.2em] transition-all duration-200"
            style={{
              background: period === p.id ? "#ff6b47" : "transparent",
              color: period === p.id ? "#000" : "#a3a3a3",
              borderRight: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Total Revenue", value: `₹${totalRevenue.toFixed(0)}`, sub: "INR" },
          { label: "Transactions", value: filtered.length, sub: "count" },
          { label: "Total Pages", value: totalPages, sub: "printed" },
          { label: "Color / BW", value: `${colorPages} / ${bwPages}`, sub: "pages" },
        ].map((s) => (
          <div key={s.label} className="p-5 border" style={{ borderColor: "rgba(255,255,255,0.1)", background: "#050505" }}>
            <p className="text-[0.55rem] uppercase tracking-[0.2em] mb-3" style={{ color: "#4a4a4a" }}>{s.label}</p>
            <p className="text-[1.8rem] font-black leading-none mb-1" style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
            <p className="text-[0.6rem] uppercase" style={{ color: "#4a4a4a" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="mb-10 p-6 border" style={{ borderColor: "rgba(255,255,255,0.1)", background: "#050505" }}>
        <p className="text-[0.55rem] uppercase tracking-[0.25em] mb-6" style={{ color: "#4a4a4a" }}>
          Revenue Chart (INR)
        </p>
        {chartData.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center">
            <p className="text-[0.7rem] uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>
              {loading ? "Loading data..." : "No transaction data for this period"}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "#4a4a4a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a4a4a", fontSize: 10 }} axisLine={false} tickLine={false} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue (INR)" fill="#ff6b47" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-Kiosk Revenue Comparison */}
      <div className="mb-10 p-6 border" style={{ borderColor: "rgba(255,255,255,0.1)", background: "#050505" }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[0.55rem] uppercase tracking-[0.25em] mb-1" style={{ color: "#4a4a4a" }}>Revenue By Kiosk</p>
            <p className="text-[1.2rem] font-black" style={{ letterSpacing: "-0.02em" }}>
              ₹{kioskComparisonData.reduce((s, k) => s + k.revenue, 0).toFixed(0)}
              <span className="text-[0.7rem] font-normal ml-2" style={{ color: "#4a4a4a" }}>{kioskComparisonData.reduce((s, k) => s + k.transactions, 0)} txns</span>
            </p>
          </div>
          {totalKioskPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setKioskPage(p => Math.max(0, p - 1))}
                disabled={kioskPage === 0}
                className="w-8 h-8 flex items-center justify-center border transition-all hover:bg-white hover:text-black disabled:opacity-30"
                style={{ borderColor: "rgba(255,255,255,0.2)", color: "#a3a3a3" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span className="text-[0.55rem] uppercase tracking-[0.1em]" style={{ color: "#4a4a4a" }}>{kioskPage + 1}/{totalKioskPages}</span>
              <button
                onClick={() => setKioskPage(p => Math.min(totalKioskPages - 1, p + 1))}
                disabled={kioskPage >= totalKioskPages - 1}
                className="w-8 h-8 flex items-center justify-center border transition-all hover:bg-white hover:text-black disabled:opacity-30"
                style={{ borderColor: "rgba(255,255,255,0.2)", color: "#a3a3a3" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          )}
        </div>
        {kioskComparisonData.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center">
            <p className="text-[0.7rem] uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>No kiosk data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180} minWidth={0} minHeight={0}>
            <BarChart data={pagedKioskData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="kiosk" tick={{ fill: "#4a4a4a", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a4a4a", fontSize: 9 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="border p-3" style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.15)" }}>
                      <p className="text-[0.6rem] uppercase tracking-[0.2em] mb-1" style={{ color: "#4a4a4a" }}>{label}</p>
                      <p className="text-[0.75rem] font-bold" style={{ color: "#ff6b47" }}>₹{Number(payload[0].value).toFixed(0)}</p>
                      <p className="text-[0.65rem]" style={{ color: "#a3a3a3" }}>{(payload[1]?.value || 0)} txns</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="revenue" name="Revenue" fill="#ff6b47" radius={[2, 2, 0, 0]} />
              <Bar dataKey="transactions" name="Txns" fill="rgba(255,255,255,0.1)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Transaction list */}
      <div className="border" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <div
          className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b text-[0.55rem] uppercase tracking-[0.2em]"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: "#4a4a4a" }}
        >
          <span>Kiosk</span>
          <span>Date</span>
          <span>Pages</span>
          <span>Amount</span>
          <span>Invoice</span>
        </div>
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[0.7rem]" style={{ color: "#4a4a4a" }}>
              {loading ? "Loading..." : "No transactions for this period"}
            </p>
          </div>
        ) : (
          filtered.slice(0, 50).map((tx) => (
            <div
              key={tx.transactionId}
              className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b hover:bg-white hover:bg-opacity-[0.02] transition-colors items-center"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <span className="text-[0.75rem] font-medium uppercase">{tx.kioskId}</span>
              <span className="text-[0.7rem]" style={{ color: "#a3a3a3" }}>
                {new Date(tx.createdAt).toLocaleDateString("en-IN")}
              </span>
              <span className="text-[0.7rem]" style={{ color: "#a3a3a3" }}>{tx.totalPages} pages</span>
              <span className="text-[0.75rem] font-bold" style={{ color: "#ff6b47" }}>
                ₹{((tx.amount || 0) / 100).toFixed(0)}
              </span>
              <button
                onClick={() => setSelectedTx(tx)}
                className="px-3 py-1.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] border transition-all hover:bg-white hover:text-black"
                style={{ borderColor: "rgba(255,255,255,0.2)", color: "#a3a3a3" }}
              >
                View
              </button>
            </div>
          ))
        )}
      </div>

      {/* Invoice modal */}
      <AnimatePresence>
        {selectedTx && (
          <InvoiceModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Invoice Modal ─────────────────────────────────────────────────────────────
function InvoiceModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const handleDownload = () => {
    // Build simple printable invoice
    const content = `
      INNVERA KIOSK — INVOICE
      ========================
      Transaction ID: ${tx.transactionId}
      Kiosk ID: ${tx.kioskId}
      Date: ${new Date(tx.createdAt).toLocaleString("en-IN")}
      
      Print Details:
      ${(tx.printDetails || []).map((p) => `  - ${p.fileName}: ${p.pageCount} pages x${p.copies} (${p.colorMode})`).join("\n")}
      
      Total Pages: ${tx.totalPages}
      Total Files: ${tx.filesCount}
      Amount: INR ${((tx.amount || 0) / 100).toFixed(2)}
      Status: ${tx.status}
      ========================
      innvera.co
    `
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `invoice-${tx.transactionId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="w-full max-w-[520px] border"
        style={{ background: "#050505", borderColor: "rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start p-6 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div>
            <p className="text-[0.55rem] uppercase tracking-[0.2em] mb-1" style={{ color: "#4a4a4a" }}>Invoice</p>
            <h3 className="text-[1.2rem] font-black uppercase leading-none" style={{ letterSpacing: "-0.02em" }}>
              {tx.transactionId.slice(0, 12).toUpperCase()}
            </h3>
          </div>
          <button onClick={onClose} className="text-[0.65rem] uppercase tracking-[0.15em] hover:text-white transition-colors" style={{ color: "#4a4a4a" }}>Close</button>
        </div>
        <div className="p-6">
          {[
            ["Kiosk ID", tx.kioskId],
            ["Date", new Date(tx.createdAt).toLocaleString("en-IN")],
            ["Total Pages", tx.totalPages],
            ["Files", tx.filesCount],
            ["Status", tx.status],
            ["Amount", `₹${((tx.amount || 0) / 100).toFixed(2)}`],
          ].map(([l, v]) => (
            <div key={l} className="flex border-b py-2.5 gap-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="text-[0.6rem] uppercase tracking-[0.15em] w-[100px] shrink-0" style={{ color: "#4a4a4a" }}>{l}</span>
              <span className="text-[0.8rem] font-medium">{v}</span>
            </div>
          ))}
          {tx.printDetails?.length > 0 && (
            <div className="mt-4">
              <p className="text-[0.55rem] uppercase tracking-[0.2em] mb-3" style={{ color: "#4a4a4a" }}>Print Details</p>
              {tx.printDetails.map((p, i) => (
                <div key={i} className="flex justify-between py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <span className="text-[0.7rem] truncate flex-1" style={{ color: "#a3a3a3" }}>{p.fileName}</span>
                  <span className="text-[0.7rem] ml-4" style={{ color: "#fff" }}>{p.pageCount}pg x{p.copies} — {p.colorMode}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <button
            onClick={handleDownload}
            className="w-full py-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] transition-all hover:opacity-80"
            style={{ background: "#ff6b47", color: "#000" }}
          >
            Download Invoice
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
