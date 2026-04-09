"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { generateInvoicePDF } from "@/utils/generateInvoicePDF"
import { QRCodeSVG } from "qrcode.react"

const FILE_UPLOADER_API = "https://printing-pixel-1.onrender.com"
const KIOSK_BACKEND = "https://kiosk-backend-t1mi.onrender.com"

const PERIODS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "lastweek", label: "Last Week" },
  { id: "month", label: "This Month" },
]

interface Transaction {
  transactionId: string
  kioskId: string
  uploadId?: string
  amount: number
  totalPages: number
  filesCount: number
  printDetails: Array<{ fileName: string; pageCount: number; copies: number; colorMode: string }>
  status: string
  createdAt: string
  otpGenerated?: string
  otpUsed?: boolean
  customerPhone?: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  paymentMethod?: string
}

function OwnerDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const kioskIdFromUrl = searchParams.get("kiosk_id")

  const [period, setPeriod] = useState("week")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [session, setSession] = useState<any>(null)
  const [kioskData, setKioskData] = useState<any>(null)
  const [isDark, setIsDark] = useState(true)
  const [qrCopied, setQrCopied] = useState(false)
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)
  const [reactivating, setReactivating] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('pp-theme')
    const dark = saved !== 'light'
    setIsDark(dark)
    document.body.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('pp-theme', next ? 'dark' : 'light')
    document.body.setAttribute('data-theme', next ? 'dark' : 'light')
  }

  useEffect(() => {
    try {
      const isIframe = searchParams.get("iframe") === "true"
      const auth = localStorage.getItem("innvera-auth")
      
      let parsed = null
      let role = null
      let sKioskId = null
      
      if (auth) {
        parsed = JSON.parse(auth)
        setSession(parsed)
        role = parsed.role
        sKioskId = parsed.kioskId
      } else if (!isIframe) {
        router.push("/sign-in")
        return
      }

      if (role === "owner" && kioskIdFromUrl && sKioskId !== kioskIdFromUrl && !isIframe) {
        setError("You do not have access to this kiosk dashboard.")
        setLoading(false)
        return
      }

      const targetKioskId = sKioskId || kioskIdFromUrl
      
      if (!targetKioskId) {
        setError("Kiosk ID missing")
        setLoading(false)
        return
      }

      Promise.all([
        fetch(`${FILE_UPLOADER_API}/api/transactions/kiosk/${targetKioskId}`).then((r) => r.ok ? r.json() : null),
        fetch(`${KIOSK_BACKEND}/api/kiosk/${targetKioskId}`).then((r) => r.ok ? r.json() : null)
      ])
        .then(([d, kData]) => {
          if (d) {
            const txs = d.transactions || d || []
            setTransactions(Array.isArray(txs) ? txs : [])
          }
          if (kData?.success) {
            setKioskData(kData.kiosk)
          }
        })
        .catch(() => {
          setTransactions([])
        })
        .finally(() => setLoading(false))
    } catch {
      router.push("/sign-in")
    }
  }, [router, kioskIdFromUrl, searchParams])

  // Filter & Stats logic
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
  const totalRevenue = filtered.reduce((s, t) => s + (t.amount || 0), 0) / 100
  const totalPages = filtered.reduce((s, t) => s + (t.totalPages || 0), 0)
  const colorPages = filtered.reduce((s, t) => {
    const cp = (t.printDetails || []).filter((p) => p.colorMode === "color").reduce((a, p) => a + p.pageCount * p.copies, 0)
    return s + cp
  }, 0)
  const bwPages = totalPages - colorPages
  const fileCount = filtered.reduce((s, t) => s + (t.filesCount || 0), 0)

  // Chart data
  const chartData = (() => {
    const days: Record<string, { date: string; revenue: number; pages: number }> = {}
    filtered.forEach((tx) => {
      const day = new Date(tx.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
      if (!days[day]) days[day] = { date: day, revenue: 0, pages: 0 }
      days[day].revenue += (tx.amount || 0) / 100
      days[day].pages += tx.totalPages || 0
    })
    return Object.values(days)
  })()

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[0.7rem] uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>
          Loading dashboard...
        </p>
      </div>
    )
  }

  const handleSignOut = () => {
    localStorage.removeItem("innvera-auth")
    router.push("/sign-in")
  }

  const handleReactivateOTP = async (tx: Transaction) => {
    const txKey = tx.transactionId
    setReactivating(txKey)
    try {
      const res = await fetch(`${FILE_UPLOADER_API}/api/otp/reactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: tx.uploadId, kioskId: tx.kioskId })
      })
      const data = await res.json()
      if (data.success) {
        setTransactions(prev => prev.map(t =>
          t.transactionId === txKey ? { ...t, otpUsed: false } : t
        ))
      } else {
        alert(data.error || "Reactivation failed")
      }
    } catch { alert("Network error during reactivation") } finally { setReactivating(null) }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="border p-8 text-center max-w-[400px]" style={{ borderColor: "#ff6b47", background: "rgba(255,107,71,0.05)" }}>
          <h2 className="text-[1.2rem] font-bold uppercase mb-4" style={{ color: "#ff6b47" }}>Access Denied</h2>
          <p className="text-[0.8rem] mb-6" style={{ color: "#a3a3a3" }}>{error}</p>
          <button onClick={handleSignOut} className="px-6 py-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] bg-white text-black transition-opacity hover:opacity-80">
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  const targetKId = session?.kioskId || kioskIdFromUrl

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: '"Inter", sans-serif' }}>
      <div className="noise-overlay" />
      
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="px-6 py-5 border-b flex justify-between items-center bg-[#050505]" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div>
          <p className="text-[0.55rem] uppercase tracking-[0.25em] mb-1" style={{ color: "#ff6b47" }}>Owner Dashboard</p>
          <h1 className="text-[1.4rem] font-black uppercase tracking-tight leading-none">
            {targetKId}
          </h1>
        </div>
        <div className="flex gap-4 items-center">
          <a
            href="https://innveraui.vercel.app/sign-in"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2 text-[0.6rem] font-bold uppercase tracking-[0.2em] border transition-all duration-200 hover:bg-white hover:text-black"
            style={{ borderColor: "rgba(255,255,255,0.2)", color: "#a3a3a3" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
              <rect x="2" y="3" width="20" height="14" /><path d="M8 21h8M12 17v4" />
            </svg>
            Revenue Dashboard
          </a>
          <button
            onClick={toggleTheme}
            className="text-[0.6rem] uppercase tracking-[0.2em] font-bold"
            style={{ color: "#a3a3a3" }}
          >
            Mode: {isDark ? "Dark" : "Light"}
          </button>
          <button
            onClick={handleSignOut}
            className="px-5 py-2 text-[0.6rem] font-bold uppercase tracking-[0.2em] border transition-all hover:bg-white hover:text-black"
            style={{ borderColor: "rgba(255,255,255,0.2)", color: "#a3a3a3" }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto p-6 lg:p-10">
        
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total Revenue", value: `₹${totalRevenue.toFixed(0)}`, sub: "INR" },
            { label: "Transactions", value: filtered.length, sub: "orders" },
            { label: "Pages Printed", value: totalPages, sub: "total pages" },
            { label: "Color / BW", value: `${colorPages} / ${bwPages}`, sub: "breakdown" },
          ].map((s) => (
            <div key={s.label} className="p-6 border" style={{ borderColor: "rgba(255,255,255,0.1)", background: "#050505" }}>
              <p className="text-[0.55rem] uppercase tracking-[0.2em] mb-3" style={{ color: "#4a4a4a" }}>{s.label}</p>
              <p className="text-[2rem] font-black leading-none mb-1" style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
              <p className="text-[0.6rem] uppercase" style={{ color: "#4a4a4a" }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="mb-10 p-6 lg:p-8 border" style={{ borderColor: "rgba(255,255,255,0.1)", background: "#050505" }}>
          <p className="text-[0.55rem] uppercase tracking-[0.25em] mb-8" style={{ color: "#4a4a4a" }}>
            Revenue Chart (INR)
          </p>
          {chartData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center">
              <p className="text-[0.7rem] uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>No data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250} minWidth={0} minHeight={0}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "#4a4a4a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#4a4a4a", fontSize: 10 }} axisLine={false} tickLine={false} width={45} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="border p-3" style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.15)" }}>
                        <p className="text-[0.6rem] uppercase tracking-[0.2em] mb-2" style={{ color: "#4a4a4a" }}>{label}</p>
                        <p className="text-[0.75rem] font-bold" style={{ color: "#ff6b47" }}>
                          Revenue: ₹{Number(payload[0].value).toFixed(0)}
                        </p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="revenue" radius={0}>
                  {chartData.map((entry, index) => {
                    const isToday = entry.date === new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                    return <Cell key={`cell-${index}`} fill={isToday ? "#ff6b47" : "#1a1a1a"} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* QR Code Section */}
        <div className="mb-10 p-6 border" style={{ borderColor: "rgba(255,255,255,0.1)", background: "#050505" }}>
          <p className="text-[0.55rem] uppercase tracking-[0.25em] mb-5" style={{ color: "#4a4a4a" }}>Kiosk QR Code</p>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="p-3 bg-white shrink-0">
              <QRCodeSVG
                value={`https://pixel-livid-two.vercel.app/?kiosk_id=${targetKId}`}
                size={100}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[0.55rem] uppercase tracking-[0.15em] mb-1" style={{ color: "#4a4a4a" }}>Kiosk URL</p>
                <code className="text-[0.75rem] font-mono break-all" style={{ color: "#ff6b47" }}>
                  https://pixel-livid-two.vercel.app/?kiosk_id={targetKId}
                </code>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://pixel-livid-two.vercel.app/?kiosk_id=${targetKId}`)
                  setQrCopied(true)
                  setTimeout(() => setQrCopied(false), 2000)
                }}
                className="self-start px-5 py-2 text-[0.6rem] font-bold uppercase tracking-[0.2em] border transition-all hover:bg-white hover:text-black"
                style={{ borderColor: "rgba(255,255,255,0.2)", color: qrCopied ? "#22c55e" : "#a3a3a3" }}
              >
                {qrCopied ? "Copied!" : "Copy URL"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Analytics Overview (Lifetime) ──────────────────────── */}
        <div className="mb-10 border" style={{ borderColor: "rgba(255,255,255,0.1)", background: "#050505" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <p className="text-[0.55rem] uppercase tracking-[0.25em]" style={{ color: "#4a4a4a" }}>Analytics Overview — All Time</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Lifetime Revenue",
                value: `₹${(transactions.reduce((s, t) => s + (t.amount || 0), 0) / 100).toFixed(0)}`,
                sub: "all time",
              },
              { label: "Total Transactions", value: transactions.length, sub: "lifetime orders" },
              { label: "Total Pages Printed", value: transactions.reduce((s, t) => s + (t.totalPages || 0), 0), sub: "all time" },
              {
                label: "Color vs B&W",
                value: (() => {
                  const allPgs = transactions.reduce((s, t) => s + (t.totalPages || 0), 0)
                  const colPgs = transactions.reduce((s, t) => s + (t.printDetails || []).filter(p => p.colorMode === "color").reduce((a, p) => a + p.pageCount * p.copies, 0), 0)
                  return `${colPgs} / ${allPgs - colPgs}`
                })(),
                sub: "color / b&w pages",
              },
            ].map((item, idx) => (
              <div
                key={item.label}
                className="p-6 flex flex-col gap-1"
                style={{ borderRight: idx < 3 ? "1px solid rgba(255,255,255,0.08)" : "none", borderBottom: idx < 2 ? "1px solid rgba(255,255,255,0.08)" : "none" }}
              >
                <p className="text-[0.5rem] uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>{item.label}</p>
                <p className="text-[1.8rem] font-black leading-none" style={{ letterSpacing: "-0.02em", color: "#ff6b47" }}>{item.value}</p>
                <p className="text-[0.5rem] uppercase tracking-[0.1em]" style={{ color: "#4a4a4a" }}>{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History Table */}
        <div className="border" style={{ borderColor: "rgba(255,255,255,0.1)", background: "#050505" }}>
          <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <h2 className="text-[1.2rem] font-black uppercase tracking-tight">Recent Transactions</h2>
          </div>
          <div
            className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b text-[0.55rem] uppercase tracking-[0.2em]"
            style={{ borderColor: "rgba(255,255,255,0.08)", color: "#4a4a4a" }}
          >
            <span>Date & Time</span>
            <span>Transaction ID</span>
            <span>Pages</span>
            <span>Status</span>
            <span>Est. Revenue</span>
            <span>Action</span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[0.7rem]" style={{ color: "#4a4a4a" }}>No transactions found for this period.</p>
            </div>
          ) : (
            filtered.map((tx) => {
              const isExpanded = expandedTxId === tx.transactionId
              const otpUsed = tx.otpUsed === true
              return (
                <div key={tx.transactionId} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {/* ── Collapsed Row ── */}
                  <div
                    className="grid gap-4 px-6 py-4 transition-colors items-center cursor-pointer"
                    style={{
                      gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr auto",
                      background: isExpanded ? "rgba(255,107,71,0.04)" : "transparent",
                    }}
                    onClick={() => setExpandedTxId(isExpanded ? null : tx.transactionId)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[0.85rem] font-medium text-[#fff]">
                        {new Date(tx.createdAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span style={{ fontSize: "0.55rem", color: "#4a4a4a", transition: "transform 0.2s", display: "inline-block", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                    </div>
                    <span className="text-[0.75rem] font-mono tracking-wider" style={{ color: "#a3a3a3" }}>
                      {tx.transactionId.slice(-8).toUpperCase()}
                    </span>
                    <span className="text-[0.75rem]" style={{ color: "#a3a3a3" }}>{tx.totalPages} pg</span>
                    <span className="text-[0.55rem] font-bold uppercase tracking-[0.1em] px-2 py-1 border self-center inline-flex"
                      style={{
                        borderColor: (tx.status === "CAPTURED" || tx.status === "SUCCESS") ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)",
                        color: (tx.status === "CAPTURED" || tx.status === "SUCCESS") ? "#22c55e" : "#ef4444",
                        background: (tx.status === "CAPTURED" || tx.status === "SUCCESS") ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)"
                      }}>
                      {tx.status}
                    </span>
                    <span className="text-[0.8rem] font-bold" style={{ color: "#ff6b47" }}>₹{((tx.amount || 0) / 100).toFixed(0)}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedTx(tx) }}
                      className="px-4 py-2 text-[0.55rem] font-bold uppercase tracking-[0.1em] border transition-all hover:bg-white hover:text-black"
                      style={{ borderColor: "rgba(255,255,255,0.2)", color: "#a3a3a3" }}
                    >
                      Invoice
                    </button>
                  </div>

                  {/* ── Expanded Details ── */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-3" style={{ background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      {/* OTP block */}
                      <div className="flex items-center gap-6 p-4 mb-4 border" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                        <div className="flex-1">
                          <p className="text-[0.48rem] uppercase tracking-[0.18em] mb-1 font-bold" style={{ color: "#4a4a4a", fontFamily: "'Space Mono',monospace" }}>OTP Code</p>
                          <p className="text-[1.4rem] font-black tracking-[0.25em]" style={{ color: "#fff", fontFamily: "'Space Mono',monospace" }}>
                            {tx.otpGenerated || "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[0.48rem] uppercase tracking-[0.14em] mb-1 font-bold" style={{ color: "#4a4a4a", fontFamily: "'Space Mono',monospace" }}>OTP Status</p>
                          <p className="text-[0.75rem] font-bold" style={{ color: otpUsed ? "#22c55e" : "#ef4444" }}>
                            {otpUsed ? "✅ Used" : "❌ Not Used"}
                          </p>
                        </div>
                        {/* Reactivate button — only shown in expanded view */}
                        <button
                          onClick={() => handleReactivateOTP(tx)}
                          disabled={reactivating === tx.transactionId}
                          className="px-4 py-2 text-[0.55rem] font-bold uppercase tracking-[0.12em] border transition-all"
                          style={{
                            borderColor: otpUsed ? "#ff6b47" : "rgba(255,255,255,0.15)",
                            color: otpUsed ? "#ff6b47" : "#4a4a4a",
                            background: "transparent",
                            cursor: reactivating === tx.transactionId ? "not-allowed" : "pointer",
                            opacity: reactivating === tx.transactionId ? 0.4 : 1,
                            fontFamily: "'Space Mono',monospace",
                          }}
                        >
                          {reactivating === tx.transactionId ? "..." : "Reactivate OTP"}
                        </button>
                      </div>

                      {/* Detail fields */}
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                          ["Customer Phone", tx.customerPhone || "N/A"],
                          ["Payment Method", tx.paymentMethod || "—"],
                          ["Files Count", String(tx.filesCount || "—")],
                          ["Razorpay Order", (tx.razorpayOrderId || "—").slice(-14)],
                          ["Razorpay Payment", (tx.razorpayPaymentId || "—").slice(-14)],
                          ["Timestamp", new Date(tx.createdAt).toLocaleString("en-IN")],
                        ].map(([label, value]) => (
                          <div key={label} className="p-3 border" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                            <p className="text-[0.45rem] uppercase tracking-[0.15em] mb-1 font-bold" style={{ color: "#4a4a4a", fontFamily: "'Space Mono',monospace" }}>{label}</p>
                            <p className="text-[0.7rem] font-medium" style={{ color: "#fff", wordBreak: "break-all" }}>{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Settlements Section */}
        {kioskData && kioskData.settlements && kioskData.settlements.length > 0 && (
          <div className="border mt-10" style={{ borderColor: "rgba(255,255,255,0.1)", background: "#050505" }}>
            <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <h2 className="text-[1.2rem] font-black uppercase tracking-tight">Recent Settlements</h2>
            </div>
            <div
              className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b text-[0.55rem] uppercase tracking-[0.2em]"
              style={{ borderColor: "rgba(255,255,255,0.08)", color: "#4a4a4a" }}
            >
              <span>Settlement Period</span>
              <span>Tx ID</span>
              <span>Status</span>
              <span>Amount</span>
              <span>Invoice</span>
            </div>
            
            {kioskData.settlements.map((s: any, idx: number) => (
              <div
                key={idx}
                className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b hover:bg-white hover:bg-opacity-[0.02] transition-colors items-center"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-[0.7rem] font-medium text-[#fff]">
                    {new Date(s.fromDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} - {new Date(s.toDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="text-[0.55rem]" style={{ color: "#a3a3a3" }}>Processed on: {new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
                <span className="text-[0.7rem]" style={{ color: "#a3a3a3" }}>{s.transactionId}</span>
                <span
                  className="text-[0.6rem] font-bold uppercase tracking-[0.1em]"
                  style={{ color: s.status === "APPROVED" ? "#22c55e" : s.status === "REJECTED" ? "#ef4444" : "#ff6b47" }}
                >
                  {s.status}
                </span>
                <span className="text-[0.8rem] font-bold" style={{ color: "#fff" }}>₹{s.amount.toFixed(2)}</span>
                <button
                  onClick={async () => {
                    if (s.status !== "APPROVED") {
                      alert("Invoice will be available after settlement approval.")
                      return
                    }
                    try {
                      await generateInvoicePDF({
                        kioskId: kioskData.kioskId,
                        totalAmount: s.amount,
                        isSettlement: true,
                        queue: [{
                          fileName: `Settlement (${new Date(s.fromDate).toLocaleDateString()} to ${new Date(s.toDate).toLocaleDateString()})`,
                          cost: s.amount,
                          pagesToPrint: 1,
                          printSettings: { copies: 1, colorMode: "bw", doubleSided: "one-side" }
                        }]
                      })
                    } catch (e) {
                      alert("Could not generate settlement invoice.")
                    }
                  }}
                  className={`px-4 py-2 text-[0.55rem] font-bold uppercase tracking-[0.1em] border transition-all ${s.status === "APPROVED" ? "hover:bg-white hover:text-black hover:border-white text-[#ff6b47] border-[rgba(255,255,255,0.2)]" : "opacity-30 cursor-not-allowed border-[rgba(255,255,255,0.1)] text-[#a3a3a3]"}`}
                >
                  DL Invoice
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Invoice Modal */}
      <AnimatePresence>
        {selectedTx && (
          <InvoiceModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function InvoiceModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const handleDownload = async () => {
    try {
      await generateInvoicePDF({
        otp: (tx as any).otp, // In case tx happens to have an otp
        kioskId: tx.kioskId,
        customerPhone: (tx as any).customerPhone || "N/A",
        totalAmount: (tx.amount || 0) / 100,
        queue: (tx.printDetails || []).map((p: any) => ({
          fileName: p.fileName || "Document",
          pagesToPrint: p.pageCount || 1,
          printSettings: {
            copies: p.copies || 1,
            colorMode: p.colorMode || "bw",
            doubleSided: "one-side"
          },
          cost: ((p.pageCount || 1) * (p.copies || 1) * (p.colorMode === "color" ? 10 : 2))
        }))
      })
    } catch (e) {
      console.error("PDF generation failed", e)
      alert("Could not generate PDF invoice")
    }
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
        className="w-full max-w-[520px] border shadow-2xl"
        style={{ background: "#050505", borderColor: "rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start p-6 lg:p-8 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div>
            <p className="text-[0.55rem] uppercase tracking-[0.2em] mb-1" style={{ color: "#4a4a4a" }}>Invoice</p>
            <h3 className="text-[1.2rem] font-black uppercase leading-none" style={{ letterSpacing: "-0.02em" }}>
              {tx.transactionId.toUpperCase()}
            </h3>
          </div>
          <button onClick={onClose} className="text-[0.65rem] uppercase tracking-[0.15em] hover:text-white transition-colors" style={{ color: "#4a4a4a" }}>Close</button>
        </div>
        <div className="p-6 lg:p-8">
          {[
            ["Kiosk ID", tx.kioskId],
            ["Date & Time", new Date(tx.createdAt).toLocaleString("en-IN")],
            ["Total Pages", tx.totalPages],
            ["Files Loaded", tx.filesCount],
            ["Transaction Status", tx.status],
            ["Total Amount", `₹${((tx.amount || 0) / 100).toFixed(2)}`],
          ].map(([l, v]) => (
            <div key={l} className="flex border-b py-3 gap-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="text-[0.6rem] uppercase tracking-[0.15em] w-[120px] shrink-0" style={{ color: "#4a4a4a" }}>{l}</span>
              <span className="text-[0.8rem] font-medium" style={{ color: l === "Total Amount" ? "#ff6b47" : "#fff"  }}>{v}</span>
            </div>
          ))}
          
          {tx.printDetails?.length > 0 && (
            <div className="mt-6">
              <p className="text-[0.55rem] uppercase tracking-[0.2em] mb-3" style={{ color: "#ff6b47" }}>Document Breakdown</p>
              {tx.printDetails.map((p, i) => (
                <div key={i} className="flex flex-col py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <span className="text-[0.8rem] truncate mb-1" style={{ color: "#fff" }}>{p.fileName}</span>
                  <div className="flex justify-between text-[0.65rem] uppercase tracking-[0.1em]" style={{ color: "#a3a3a3" }}>
                    <span>{p.pageCount} Pages × {p.copies} Copies</span>
                    <span>{p.colorMode === "color" ? "COLOR" : "B&W"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 lg:p-8 border-t flex gap-4 bg-black" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <button
            onClick={handleDownload}
            className="flex-1 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] transition-all hover:opacity-80"
            style={{ background: "#ff6b47", color: "#000" }}
          >
            Download Invoice
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function OwnerDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <OwnerDashboardContent />
    </Suspense>
  )
}
