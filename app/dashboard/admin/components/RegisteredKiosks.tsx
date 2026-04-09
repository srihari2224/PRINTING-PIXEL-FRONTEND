// registered kiosk

"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Dot
} from "recharts"
import { generateInvoicePDF } from "@/utils/generateInvoicePDF"
import { QRCodeSVG } from "qrcode.react"

const KIOSK_BACKEND = "https://kiosk-backend-t1mi.onrender.com"
const FILE_UPLOADER_API = "https://printing-pixel-1.onrender.com"

// ── Color tokens ──────────────────────────────────────────────────────────────
const C = {
  orange: "#ff6b47",
  orangeDim: "rgba(255,107,71,0.12)",
  green: "#22c55e",
  greenDim: "rgba(34,197,94,0.12)",
  blue: "#3b82f6",
  blueDim: "rgba(59,130,246,0.12)",
  red: "#ef4444",
  redDim: "rgba(239,68,68,0.12)",
}

interface Kiosk {
  kioskId: string
  kioskType?: string
  serviceType?: string
  ipAddress?: string
  ownerName?: string
  ownerPhone?: string
  ownerEmail?: string
  address?: string
  locationName?: string
  geo?: { lat: number; lng: number }
  status: string
  createdAt?: string
  bankDetails?: { accountName: string; accountNumber: string; ifscCode: string; bankName: string }
  settlements?: {
    _id: string; amount: number; transactionId: string; proofImage?: string
    fromDate: string; toDate: string; status: string; createdAt: string
  }[]
}

// ── Styled Input Component ─────────────────────────────────────────────────────
function StyledInput({
  label, value, onChange, type = "text", placeholder = "", hint, icon, readOnly,
}: {
  label: string; value: string; onChange?: (v: string) => void
  type?: string; placeholder?: string; hint?: string; icon?: React.ReactNode; readOnly?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const isDark = typeof window !== "undefined" ? localStorage.getItem("pp-theme") !== "light" : true
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div
      onClick={() => !readOnly && ref.current?.focus()}
      style={{
        position: "relative",
        background: focused ? C.orangeDim : isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)",
        border: `1px solid ${focused ? C.orange : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
        padding: "14px 16px 12px",
        cursor: readOnly ? "default" : "text",
        transition: "border-color 0.2s, background 0.2s",
      }}
    >
      {/* Top accent line on focus */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: C.orange, transform: focused ? "scaleX(1)" : "scaleX(0)",
        transformOrigin: "left", transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {icon && (
          <div style={{ color: focused ? C.orange : isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)", marginTop: 18, flexShrink: 0, transition: "color 0.2s" }}>
            {icon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <label style={{
            display: "block", fontFamily: "'Space Mono', monospace",
            fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.22em",
            color: focused ? C.orange : isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.38)",
            marginBottom: 7, transition: "color 0.2s", pointerEvents: "none",
          }}>
            {label}
          </label>
          <input
            ref={ref}
            type={type}
            value={value}
            onChange={e => onChange?.(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            readOnly={readOnly}
            placeholder={placeholder}
            autoComplete={type === "password" ? "new-password" : "off"}
            style={{
              width: "100%", background: "transparent", border: "none", outline: "none",
              fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", fontWeight: 600,
              color: isDark ? "#ffffff" : "#0a0a0a",
              caretColor: C.orange, letterSpacing: "-0.01em", display: "block",
            }}
          />
          {hint && (
            <p style={{
              fontFamily: "'Space Mono', monospace", fontSize: "0.44rem",
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.28)", marginTop: 5,
            }}>
              {hint}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ label, children, color = C.orange }: { label: string; children?: React.ReactNode; color?: string }) {
  const isDark = typeof window !== "undefined" ? localStorage.getItem("pp-theme") !== "light" : true
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 14, paddingBottom: 10,
      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 3, height: 14, background: color, flexShrink: 0 }} />
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.25em",
          color: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.38)",
        }}>{label}</span>
      </div>
      {children}
    </div>
  )
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string; dot: string }> = {
    ACTIVE: { color: C.green, bg: C.greenDim, dot: C.green },
    PENDING: { color: C.orange, bg: C.orangeDim, dot: C.orange },
    DELETE_PENDING: { color: C.red, bg: C.redDim, dot: C.red },
    APPROVED: { color: C.green, bg: C.greenDim, dot: C.green },
    REJECTED: { color: C.red, bg: C.redDim, dot: C.red },
  }
  const s = cfg[status] || { color: "#4a4a4a", bg: "transparent", dot: "#4a4a4a" }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 8px", background: s.bg, border: `1px solid ${s.color}20`,
      fontFamily: "'Space Mono', monospace", fontSize: "0.5rem",
      fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: s.color,
    }}>
      <span style={{ width: 5, height: 5, background: s.dot, borderRadius: "50%" }} />
      {status}
    </span>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RegisteredKiosks() {
  const [kiosks, setKiosks] = useState<Kiosk[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<Kiosk | null>(null)
  const [dlLoading, setDlLoading] = useState<string | null>(null)
  const [deleteInput, setDeleteInput] = useState("")
  const [editingBank, setEditingBank] = useState(false)
  const [bankForm, setBankForm] = useState({ accountName: "", accountNumber: "", ifscCode: "", bankName: "" })
  const [bankSaving, setBankSaving] = useState(false)
  const [qrCopied, setQrCopied] = useState(false)
  const [viewCert, setViewCert] = useState(false)
  const [certBlobUrl, setCertBlobUrl] = useState<string | null>(null)
  const [certLoading, setCertLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [invoicePdfUrl, setInvoicePdfUrl] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSettlementForm, setShowSettlementForm] = useState(false)
  const [settlementForm, setSettlementForm] = useState({ amount: "", transactionId: "", fromDate: "", toDate: "", proofImage: "" })
  const [settlementSaving, setSettlementSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"info" | "analytics">("info")
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const isDark = typeof window !== "undefined" ? localStorage.getItem("pp-theme") !== "light" : true
  const bm = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"
  const bs = isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.15)"
  const surf = isDark ? "#070707" : "#ffffff"
  const lc = isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.38)"
  const tc = isDark ? "#ffffff" : "#0a0a0a"
  const sub = isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)"

  useEffect(() => {
    if (selected) {
      setBankForm(selected.bankDetails || { accountName: "", accountNumber: "", ifscCode: "", bankName: "" })
      setEditingBank(false); setViewCert(false); setCertBlobUrl(null)
      setShowSettlementForm(false)
      setSettlementForm({ amount: "", transactionId: "", fromDate: "", toDate: "", proofImage: "" })
      setActiveTab("info")
    }
  }, [selected])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setSettlementForm(p => ({ ...p, proofImage: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  const handleSaveSettlement = async () => {
    if (!selected) return
    if (!settlementForm.amount || !settlementForm.transactionId || !settlementForm.fromDate || !settlementForm.toDate) {
      alert("Please fill all required settlement fields."); return
    }
    setSettlementSaving(true)
    try {
      const res = await fetch(`${KIOSK_BACKEND}/api/kiosk/${selected.kioskId}/settlement`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settlementForm)
      })
      const data = await res.json()
      if (data.success) {
        setSelected(p => p ? { ...p, settlements: data.settlements } : p)
        setKiosks(p => p.map(k => k.kioskId === selected.kioskId ? { ...k, settlements: data.settlements } : k))
        setShowSettlementForm(false)
        setSettlementForm({ amount: "", transactionId: "", fromDate: "", toDate: "", proofImage: "" })
        alert("Settlement added and sent for approval!")
      } else { alert("Failed: " + data.error) }
    } catch { alert("Network error") } finally { setSettlementSaving(false) }
  }

  const handleSaveBank = async () => {
    if (!selected) return
    setBankSaving(true)
    try {
      const res = await fetch(`${KIOSK_BACKEND}/api/kiosk/${selected.kioskId}/bank`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bankDetails: bankForm })
      })
      const data = await res.json()
      if (data.success) {
        setSelected(p => p ? { ...p, bankDetails: bankForm } : p)
        setKiosks(p => p.map(k => k.kioskId === selected.kioskId ? { ...k, bankDetails: bankForm } : k))
        setEditingBank(false)
      } else { alert("Failed: " + data.error) }
    } catch { alert("Network error") } finally { setBankSaving(false) }
  }

  useEffect(() => {
    fetch(`${KIOSK_BACKEND}/api/kiosk/list`)
      .then(r => r.json()).then(d => { if (d.success) setKiosks(d.kiosks); else setError("Failed to load kiosks") })
      .catch(() => setError("Network error — cannot reach kiosk backend"))
      .finally(() => setLoading(false))
  }, [])

  const downloadCertificate = async (kioskId: string) => {
    setDlLoading(kioskId)
    try {
      const res = await fetch(`${KIOSK_BACKEND}/api/kiosk/${kioskId}/certificate`)
      if (!res.ok) throw new Error("Failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = url; a.download = `innvera-kiosk-${kioskId}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert("Certificate download failed") } finally { setDlLoading(null) }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, gap: 12 }}>
      <div style={{ width: 6, height: 6, background: C.orange, animation: "blink 1.2s ease-in-out infinite" }} />
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.3em", color: lc }}>Loading kiosks...</span>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ padding: "16px 20px", borderLeft: `3px solid ${C.orange}`, background: C.orangeDim }}>
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.65rem", color: C.orange }}>{error}</span>
    </div>
  )

  // Stats summary
  const activeCount = kiosks.filter(k => k.status === "ACTIVE").length
  const pendingCount = kiosks.filter(k => k.status === "PENDING").length

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{rk_styles}</style>

      {/* ── Header stats ── */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 0, marginBottom: 28, border: `1px solid ${bm}` }}>
        {[
          { num: kiosks.length, label: "Total Kiosks", color: tc, border: true },
          { num: activeCount, label: "Active", color: C.green, border: true },
          { num: pendingCount, label: "Pending", color: C.orange, border: false },
        ].map((s, i) => (
          <div key={s.label} style={{
            flex: 1, padding: "20px 24px",
            borderRight: s.border ? `1px solid ${bm}` : "none",
            background: i === 0 ? sub : "transparent",
          }}>
            <div style={{ fontSize: "2.4rem", fontWeight: 900, lineHeight: 1, color: s.color, letterSpacing: "-0.03em" }}>{s.num}</div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: lc, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      {kiosks.length === 0 ? (
        <div style={{ padding: "48px", textAlign: "center", border: `1px solid ${bm}` }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={lc} strokeWidth="1.5" style={{ marginBottom: 12 }}>
            <rect x="3" y="3" width="18" height="18" rx="0" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="3" />
          </svg>
          <p style={{ color: lc, fontSize: "0.75rem", fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: "0.2em" }}>No kiosks registered yet</p>
        </div>
      ) : (
        <div style={{ border: `1px solid ${bm}` }}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.2fr 80px",
            padding: "10px 16px", borderBottom: `1px solid ${bm}`,
            background: sub,
          }}>
            {["Kiosk ID", "Type", "Service", "Owner", "Status", "Actions"].map(h => (
              <span key={h} style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: lc }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {kiosks.map((k) => (
            <div
              key={k.kioskId}
              className="rk-row"
              style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.2fr 80px",
                padding: "14px 16px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)"}`,
                alignItems: "center", cursor: "pointer",
                background: hoveredRow === k.kioskId ? (isDark ? "rgba(255,107,71,0.04)" : "rgba(255,107,71,0.03)") : "transparent",
                transition: "background 0.18s",
              }}
              onMouseEnter={() => setHoveredRow(k.kioskId)}
              onMouseLeave={() => setHoveredRow(null)}
              onClick={() => setSelected(k)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 7, height: 7, flexShrink: 0,
                  background: k.status === "ACTIVE" ? C.green : k.status === "PENDING" ? C.orange : C.red,
                  boxShadow: `0 0 6px ${k.status === "ACTIVE" ? C.green : k.status === "PENDING" ? C.orange : C.red}60`,
                }} />
                <span style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "-0.01em", color: tc }}>{k.kioskId}</span>
              </div>
              <span style={{ fontSize: "0.72rem", color: lc }}>{k.kioskType || "—"}</span>
              <span style={{ fontSize: "0.72rem", color: lc }}>{k.serviceType || "—"}</span>
              <span style={{ fontSize: "0.72rem", color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>{k.ownerName || "—"}</span>
              <StatusBadge status={k.status} />
              <div onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => downloadCertificate(k.kioskId)}
                  disabled={dlLoading === k.kioskId}
                  className="rk-pdf-btn"
                  style={{
                    padding: "5px 10px", background: C.orange, color: "#000",
                    border: "none", cursor: "pointer", fontFamily: "'Space Mono',monospace",
                    fontSize: "0.5rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.12em", transition: "opacity 0.15s",
                    opacity: dlLoading === k.kioskId ? 0.4 : 1,
                  }}
                >
                  {dlLoading === k.kioskId ? "..." : "PDF"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Right Panel ── */}
      <AnimatePresence>
        {selected && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              style={{
                position: "relative", height: "100%", width: "80vw", maxWidth: 1200, minWidth: 640,
                display: "flex", flexDirection: "column", background: surf,
                borderLeft: `1px solid ${bs}`, zIndex: 10,
              }}
            >
              {/* Panel header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 24px", borderBottom: `1px solid ${bm}`,
                background: isDark ? "rgba(255,107,71,0.04)" : "rgba(255,107,71,0.03)", flexShrink: 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div>
                    <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.45rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.25em", color: lc, marginBottom: 3 }}>Kiosk Details</p>
                    <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: "1.4rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.03em", color: tc, lineHeight: 1 }}>
                      {selected.kioskId}
                    </h3>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Tab switcher */}
                  <div style={{ display: "flex", border: `1px solid ${bm}`, marginRight: 8 }}>
                    {(["info", "analytics"] as const).map(t => (
                      <button key={t} onClick={() => setActiveTab(t)} style={{
                        padding: "7px 16px", background: activeTab === t ? C.orange : "transparent",
                        color: activeTab === t ? "#000" : lc, border: "none", cursor: "pointer",
                        fontFamily: "'Space Mono',monospace", fontSize: "0.5rem", fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.12em", transition: "all 0.2s",
                      }}>
                        {t === "info" ? "Info" : "Analytics"}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setSelected(null)} className="rk-icon-btn" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${bm}`, background: "transparent", cursor: "pointer", color: lc, transition: "all 0.2s" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {activeTab === "info" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%" }}>

                    {/* LEFT */}
                    <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 }}>

                      {/* Overview grid */}
                      <section>
                        <SectionHeader label="Overview" color={C.blue} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: bm }}>
                          {[
                            ["Status", <StatusBadge key="s" status={selected.status} />],
                            ["Type", selected.kioskType || "—"],
                            ["Service", selected.serviceType === "KSS" ? "Kiosk Sale Services" : selected.serviceType === "MKS" ? "Managed Services" : "—"],
                            ["Owner", selected.ownerName || "—"],
                            ["Phone", selected.ownerPhone || "—"],
                            ["Email", selected.ownerEmail || "—"],
                            ["Location", selected.locationName || "—"],
                            ["Registered", selected.createdAt ? new Date(selected.createdAt).toLocaleDateString("en-IN") : "—"],
                          ].map(([label, value]) => (
                            <div key={label as string} style={{ padding: "12px 14px", background: surf, display: "flex", flexDirection: "column", gap: 5 }}>
                              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.45rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: lc }}>{label as string}</span>
                              {typeof value === "string"
                                ? <span style={{ fontSize: "0.8rem", fontWeight: 600, color: tc, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={value}>{value}</span>
                                : value}
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* SSH Access */}
                      <section>
                        <SectionHeader label="SSH Access" color={C.blue} />
                        <div style={{ padding: "12px 16px", border: `1px solid ${bm}`, background: sub, display: "flex", alignItems: "center", gap: 12 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth="2" strokeLinecap="square" style={{ flexShrink: 0 }}>
                            <rect x="2" y="3" width="20" height="14" /><path d="M8 21h8M12 17v4" /><path d="M7 8l4 3-4 3" /><line x1="12" y1="14" x2="17" y2="14" />
                          </svg>
                          <code style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.65rem", color: C.orange, flex: 1 }}>
                            ssh {(selected as any).username || `innvera-${selected.kioskId}`}@{selected.ipAddress || "0.0.0.0"}
                          </code>
                          <button
                            onClick={() => { navigator.clipboard.writeText(`ssh ${(selected as any).username || `innvera-${selected.kioskId}`}@${selected.ipAddress || "0.0.0.0"}`); alert("Copied!") }}
                            className="rk-copy-btn"
                            style={{ padding: "5px 12px", border: `1px solid ${bs}`, background: "transparent", color: lc, cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", transition: "all 0.2s", flexShrink: 0 }}
                          >Copy</button>
                        </div>
                      </section>

                      {/* QR Code */}
                      <section>
                        <SectionHeader label="Kiosk QR Code" color={C.blue} />
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "14px 16px", border: `1px solid ${bm}`, background: sub }}>
                          <div style={{ padding: 8, background: "#fff", flexShrink: 0 }}>
                            <QRCodeSVG value={`https://pixel-livid-two.vercel.app/?kiosk_id=${selected.kioskId}`} size={78} bgColor="#fff" fgColor="#000" level="M" />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.45rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: lc }}>Kiosk URL</span>
                            <code style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.6rem", color: C.orange, wordBreak: "break-all", lineHeight: 1.5 }}>
                              https://pixel-livid-two.vercel.app/?kiosk_id={selected.kioskId}
                            </code>
                            <button
                              onClick={() => { navigator.clipboard.writeText(`https://pixel-livid-two.vercel.app/?kiosk_id=${selected.kioskId}`); setQrCopied(true); setTimeout(() => setQrCopied(false), 2000) }}
                              className="rk-copy-btn"
                              style={{ alignSelf: "flex-start", padding: "6px 14px", border: `1px solid ${qrCopied ? C.green : bs}`, background: qrCopied ? C.greenDim : "transparent", color: qrCopied ? C.green : lc, cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", transition: "all 0.2s" }}
                            >{qrCopied ? "Copied!" : "Copy URL"}</button>
                          </div>
                        </div>
                      </section>

                      {/* Bank Details */}
                      <section>
                        <SectionHeader label="Bank Details" color={C.green}>
                          {!editingBank ? (
                            <button onClick={() => setEditingBank(true)} style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: C.orange, background: "none", border: "none", cursor: "pointer" }}>Edit</button>
                          ) : (
                            <div style={{ display: "flex", gap: 12 }}>
                              <button onClick={() => setEditingBank(false)} style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: lc, background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                              <button onClick={handleSaveBank} disabled={bankSaving} style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: C.green, background: "none", border: "none", cursor: "pointer" }}>{bankSaving ? "Saving..." : "Save"}</button>
                            </div>
                          )}
                        </SectionHeader>
                        {editingBank ? (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {(["accountName", "accountNumber", "ifscCode", "bankName"] as const).map((k, i) => (
                              <StyledInput key={k} label={["Account Name", "Account Number", "IFSC Code", "Bank Name"][i]} value={bankForm[k]} onChange={v => setBankForm({ ...bankForm, [k]: v })} />
                            ))}
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: bm }}>
                            {[
                              ["Account Name", selected.bankDetails?.accountName || "—"],
                              ["Account No.", selected.bankDetails?.accountNumber || "—"],
                              ["IFSC", selected.bankDetails?.ifscCode || "—"],
                              ["Bank", selected.bankDetails?.bankName || "—"],
                            ].map(([l, v]) => (
                              <div key={l} style={{ padding: "10px 14px", background: surf, display: "flex", flexDirection: "column", gap: 4 }}>
                                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.45rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: lc }}>{l}</span>
                                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: tc }}>{v}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>

                      {/* Settlements */}
                      <section>
                        <SectionHeader label="Settlements" color={C.green}>
                          {!showSettlementForm ? (
                            <button onClick={() => setShowSettlementForm(true)} style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: C.orange, background: "none", border: "none", cursor: "pointer" }}>+ Add New</button>
                          ) : (
                            <div style={{ display: "flex", gap: 12 }}>
                              <button onClick={() => setShowSettlementForm(false)} style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: lc, background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                              <button onClick={handleSaveSettlement} disabled={settlementSaving} style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: C.green, background: "none", border: "none", cursor: "pointer" }}>{settlementSaving ? "Saving..." : "Submit"}</button>
                            </div>
                          )}
                        </SectionHeader>
                        {showSettlementForm ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <StyledInput label="Amount (₹) *" type="number" value={settlementForm.amount} onChange={v => setSettlementForm({ ...settlementForm, amount: v })} placeholder="0.00" />
                              <StyledInput label="Transaction ID *" value={settlementForm.transactionId} onChange={v => setSettlementForm({ ...settlementForm, transactionId: v })} placeholder="TX ID" />
                              <StyledInput label="From Date *" type="date" value={settlementForm.fromDate} onChange={v => setSettlementForm({ ...settlementForm, fromDate: v })} />
                              <StyledInput label="To Date *" type="date" value={settlementForm.toDate} onChange={v => setSettlementForm({ ...settlementForm, toDate: v })} />
                            </div>
                            <div style={{ padding: "12px 16px", border: `1px solid ${bm}`, background: sub }}>
                              <label style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: lc, display: "block", marginBottom: 8 }}>Proof Image (Optional)</label>
                              <input type="file" accept="image/*" onChange={handleFileUpload}
                                style={{ color: tc, fontSize: "0.65rem", fontFamily: "'Inter',sans-serif" }} />
                              {settlementForm.proofImage && <span style={{ display: "block", marginTop: 6, fontSize: "0.6rem", color: C.green, fontFamily: "'Space Mono',monospace" }}>Image attached</span>}
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                            {(!selected.settlements || selected.settlements.length === 0) ? (
                              <div style={{ padding: "20px", textAlign: "center", border: `1px dashed ${bm}` }}>
                                <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.6rem", color: lc, fontStyle: "italic" }}>No settlements found</p>
                              </div>
                            ) : (
                              selected.settlements.map((s, idx) => (
                                <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: `1px solid ${bm}`, background: sub }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <span style={{ fontSize: "0.9rem", fontWeight: 800, color: tc }}>₹{s.amount}</span>
                                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.5rem", color: lc }}>Tx: {s.transactionId}</span>
                                  </div>
                                  <StatusBadge status={s.status} />
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </section>

                      {/* Certificate */}
                      <section>
                        <SectionHeader label="Certificate" color={C.orange} />
                        <button
                          onClick={async () => {
                            if (viewCert) { setViewCert(false); return }
                            setCertLoading(true)
                            try {
                              const res = await fetch(`${KIOSK_BACKEND}/api/kiosk/${selected.kioskId}/certificate`)
                              if (!res.ok) throw new Error("Failed")
                              const blob = await res.blob()
                              setCertBlobUrl(URL.createObjectURL(blob))
                              setViewCert(true)
                            } catch { alert("Could not load certificate") } finally { setCertLoading(false) }
                          }}
                          className="rk-cert-btn"
                          style={{
                            width: "100%", padding: "12px", border: `1px solid ${viewCert ? C.orange : bs}`,
                            background: viewCert ? C.orangeDim : "transparent", color: certLoading ? lc : C.orange,
                            cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: "0.55rem",
                            fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s",
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                            <rect x="3" y="3" width="18" height="18" /><path d="M9 12l2 2 4-4" /><line x1="3" y1="8" x2="21" y2="8" />
                          </svg>
                          {certLoading ? "Loading..." : viewCert ? "Hide Certificate" : "View Certificate"}
                        </button>
                        <AnimatePresence>
                          {viewCert && certBlobUrl && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }} animate={{ height: 320, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              style={{ overflow: "hidden", marginTop: 8, border: `1px solid ${bm}` }}
                            >
                              <iframe src={certBlobUrl} style={{ width: "100%", height: 320, background: "#fff" }} title={`Certificate — ${selected.kioskId}`} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      {/* Delete Kiosk — footer danger zone */}
                      <section style={{ marginTop: "auto" }}>
                        <div style={{ borderTop: `1px solid ${C.red}22`, paddingTop: 16 }}>
                          <div style={{ marginBottom: 10 }}>
                            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.42rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: C.red, opacity: 0.7 }}>Danger Zone</span>
                          </div>
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={selected.status === "DELETE_PENDING"}
                            style={{
                              width: "100%", padding: "10px 16px",
                              border: `1px solid ${C.red}55`, background: C.redDim,
                              color: selected.status === "DELETE_PENDING" ? lc : C.red,
                              cursor: selected.status === "DELETE_PENDING" ? "not-allowed" : "pointer",
                              fontFamily: "'Space Mono',monospace", fontSize: "0.5rem", fontWeight: 700,
                              textTransform: "uppercase", letterSpacing: "0.14em",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                              transition: "all 0.2s", opacity: selected.status === "DELETE_PENDING" ? 0.4 : 1,
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                            </svg>
                            {selected.status === "DELETE_PENDING" ? "Deletion Pending..." : "Delete Kiosk"}
                          </button>
                        </div>
                      </section>
                    </div>

                    {/* RIGHT — Transactions */}
                    <div style={{ padding: 24, overflowY: "auto", borderLeft: `1px solid ${bm}`, display: "flex", flexDirection: "column", gap: 24 }}>
                      <section>
                        <SectionHeader label="Recent Transactions" color={C.orange} />
                        <KioskTransactions kioskId={selected.kioskId} isDark={isDark} bm={bm} lc={lc} tc={tc} sub={sub} onInvoicePdf={setInvoicePdfUrl} />
                      </section>
                    </div>
                  </div>
                ) : (
                  /* Analytics tab */
                  <div style={{ padding: 24, overflowY: "auto" }}>
                    <KioskAnalytics kioskId={selected.kioskId} isDark={isDark} />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Modal ── */}
      <AnimatePresence>
        {showDeleteConfirm && selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.88)" }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 8 }}
              style={{ width: "100%", maxWidth: 400, background: surf, border: `1px solid ${bs}`, padding: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, background: C.redDim, border: `1px solid ${C.red}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2" strokeLinecap="square">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                  </svg>
                </div>
                <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: "1rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em", color: tc }}>Confirm Deletion</h3>
              </div>
              <p style={{ fontSize: "0.72rem", color: lc, lineHeight: 1.7, marginBottom: 20 }}>
                This will send a deletion request for <strong style={{ color: tc }}>{selected.kioskId}</strong> and initiate an approval flow.
              </p>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: lc, display: "block", marginBottom: 8 }}>Type DELETE to confirm</label>
                <StyledInput label="Confirmation" value={deleteInput} onChange={setDeleteInput} placeholder="DELETE" />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: "11px", border: `1px solid ${bm}`, background: "transparent", color: lc, cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>Cancel</button>
                <button
                  disabled={deleteInput !== "DELETE" || deleteLoading}
                  onClick={async () => {
                    if (deleteInput === "DELETE" && selected) {
                      setDeleteLoading(true)
                      try { await fetch(`${KIOSK_BACKEND}/api/kiosk/${selected.kioskId}/request-delete`, { method: "POST", headers: { "Content-Type": "application/json" } }) } catch { }
                      finally {
                        setKiosks(p => p.map(k => k.kioskId === selected.kioskId ? { ...k, status: "DELETE_PENDING" } : k))
                        setSelected(p => p && p.kioskId === selected.kioskId ? { ...p, status: "DELETE_PENDING" } : p)
                        setDeleteLoading(false); setShowDeleteConfirm(false)
                      }
                    }
                  }}
                  style={{ flex: 1, padding: "11px", background: deleteInput === "DELETE" ? C.red : "rgba(239,68,68,0.15)", color: "#fff", border: "none", cursor: deleteInput === "DELETE" ? "pointer" : "not-allowed", fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", opacity: (deleteInput !== "DELETE" || deleteLoading) ? 0.5 : 1 }}
                >{deleteLoading ? "Sending..." : "Confirm Delete"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Invoice PDF Overlay ── */}
      <AnimatePresence>
        {invoicePdfUrl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.96)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${bm}` }}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.25em", color: lc }}>Invoice PDF</span>
              <button onClick={() => setInvoicePdfUrl(null)} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${bm}`, background: "transparent", cursor: "pointer", color: lc }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div style={{ flex: 1 }}>
              <iframe src={invoicePdfUrl} style={{ width: "100%", height: "100%", background: "#fff" }} title="Invoice" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Kiosk Transactions ─────────────────────────────────────────────────────────
function KioskTransactions({ kioskId, isDark, bm, lc, tc, sub, onInvoicePdf }: {
  kioskId: string; isDark: boolean; bm: string; lc: string; tc: string; sub: string
  onInvoicePdf: (url: string) => void
}) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reactivating, setReactivating] = useState<string | null>(null)
  const [txSearch, setTxSearch] = useState("")

  useEffect(() => {
    setLoading(true)
    fetch(`${FILE_UPLOADER_API}/api/transactions/kiosk/${kioskId}?limit=50`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.success && d.transactions) setTransactions(d.transactions) })
      .finally(() => setLoading(false))
  }, [kioskId])

  const handleInvoice = async (tx: any) => {
    setGeneratingInvoice(tx.transactionId || tx._id)
    try {
      const { generateInvoicePDF } = await import("@/utils/generateInvoicePDF")
      await generateInvoicePDF({
        otp: tx.otpGenerated, kioskId: tx.kioskId, customerPhone: tx.customerPhone || "N/A",
        totalAmount: (tx.amount || 0) / 100,
        queue: (tx.printDetails || []).map((p: any) => ({
          fileName: p.fileName || "Document", pagesToPrint: p.pageCount || 1,
          printSettings: { copies: p.copies || 1, colorMode: p.colorMode || "bw", doubleSided: "one-side" },
          cost: ((p.pageCount || 1) * (p.copies || 1) * (p.colorMode === "color" ? 10 : 2))
        }))
      })
    } catch { alert("Could not generate invoice PDF") } finally { setGeneratingInvoice(null) }
  }

  const handleReactivate = async (tx: any) => {
    const txKey = tx.transactionId || tx._id
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
          (t.transactionId || t._id) === txKey ? { ...t, otpUsed: false } : t
        ))
      } else {
        alert(data.error || "Reactivation failed")
      }
    } catch { alert("Network error during reactivation") } finally { setReactivating(null) }
  }

  if (loading) return (
    <div style={{ padding: "24px", textAlign: "center" }}>
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.6rem", color: lc, fontStyle: "italic" }}>Loading transactions...</span>
    </div>
  )
  if (transactions.length === 0) return (
    <div style={{ padding: "24px", textAlign: "center", border: `1px dashed ${bm}` }}>
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.6rem", color: lc, fontStyle: "italic" }}>No transactions found</span>
    </div>
  )

  const filteredTx = transactions.filter(tx => {
    if (!txSearch.trim()) return true
    const q = txSearch.trim().toLowerCase()
    return (
      (tx.otpGenerated || "").toLowerCase().includes(q) ||
      (tx.customerPhone || "").toLowerCase().includes(q) ||
      (tx.transactionId || "").toLowerCase().includes(q)
    )
  })

  return (
    <div>
      {/* Search bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", borderBottom: `1px solid ${bm}`, background: sub,
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={lc} strokeWidth="2" strokeLinecap="square">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search OTP or mobile..."
          value={txSearch}
          onChange={e => setTxSearch(e.target.value)}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            fontFamily: "'Space Mono',monospace", fontSize: "0.52rem", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.1em", color: tc,
          }}
        />
        {txSearch && (
          <button onClick={() => setTxSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: lc, fontSize: 12, lineHeight: 1, padding: 2 }}>×</button>
        )}
      </div>
      {/* Header */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 70px 50px 60px 60px",
        padding: "8px 12px", borderBottom: `1px solid ${bm}`, background: sub,
      }}>
        {["Tx ID", "Date", "Pgs", "Amt", ""].map(h => (
          <span key={h} style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.44rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: lc }}>{h}</span>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxHeight: 480, overflowY: "auto" }}>
        {filteredTx.length === 0 && (
          <div style={{ padding: "20px", textAlign: "center" }}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", color: lc, fontStyle: "italic" }}>No results for "{txSearch}"</span>
          </div>
        )}
        {filteredTx.map((tx, idx) => {
          const txKey = tx.transactionId || tx._id
          const isCaptured = tx.status === "CAPTURED" || tx.status === "SUCCESS"
          const isExpanded = expandedId === txKey
          const otpUsed = tx.otpUsed === true

          return (
            <div key={idx} style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
              {/* ── Collapsed Row ── */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : txKey)}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 70px 50px 60px 60px",
                  padding: "10px 12px",
                  alignItems: "center", background: isExpanded ? (isDark ? "rgba(255,107,71,0.05)" : "rgba(255,107,71,0.04)") : idx % 2 === 0 ? sub : "transparent",
                  cursor: "pointer", transition: "background 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 5, height: 5, background: isCaptured ? C.green : C.red, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.58rem", fontWeight: 700, color: tc, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {(txKey || "").slice(0, 10).toUpperCase()}
                  </span>
                  <span style={{ marginLeft: 4, fontSize: "0.48rem", color: lc, transition: "transform 0.2s", display: "inline-block", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                </div>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.52rem", color: lc }}>
                  {new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
                <span style={{ fontSize: "0.62rem", fontWeight: 600, color: tc }}>{tx.totalPages || "—"}</span>
                <span style={{ fontSize: "0.65rem", fontWeight: 800, color: C.orange }}>₹{((tx.amount || 0) / 100).toFixed(0)}</span>
                <button
                  onClick={e => { e.stopPropagation(); handleInvoice(tx) }}
                  disabled={generatingInvoice === txKey}
                  style={{
                    padding: "4px 8px", border: `1px solid ${C.orange}`, background: "transparent",
                    color: C.orange, cursor: "pointer", fontFamily: "'Space Mono',monospace",
                    fontSize: "0.44rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
                    transition: "all 0.15s", opacity: generatingInvoice === txKey ? 0.4 : 1,
                  }}
                  className="rk-inv-btn"
                >
                  {generatingInvoice === txKey ? "..." : "INV"}
                </button>
              </div>

              {/* ── Expanded Details ── */}
              {isExpanded && (
                <div style={{
                  padding: "14px 16px 16px",
                  background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                  borderTop: `1px solid ${bm}`,
                  display: "flex", flexDirection: "column", gap: 10,
                }}>
                  {/* OTP block */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: `1px solid ${bm}`, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.42rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: lc, marginBottom: 4 }}>OTP</div>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "1.1rem", fontWeight: 900, color: tc, letterSpacing: "0.2em" }}>
                        {tx.otpGenerated || "—"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.42rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: lc, marginBottom: 4 }}>Status</div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 700, color: otpUsed ? C.green : C.red }}>
                        {otpUsed ? "✅ Used" : "❌ Not Used"}
                      </div>
                    </div>
                    {/* Reactivate button — only in expanded view */}
                    <button
                      onClick={() => handleReactivate(tx)}
                      disabled={reactivating === txKey}
                      style={{
                        padding: "6px 12px", border: `1px solid ${otpUsed ? C.orange : bm}`,
                        background: "transparent", color: otpUsed ? C.orange : lc,
                        cursor: reactivating === txKey ? "not-allowed" : "pointer",
                        fontFamily: "'Space Mono',monospace", fontSize: "0.42rem", fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.12em", transition: "all 0.15s",
                        opacity: reactivating === txKey ? 0.4 : 1, flexShrink: 0,
                      }}
                    >
                      {reactivating === txKey ? "..." : "Reactivate OTP"}
                    </button>
                  </div>

                  {/* Details grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {[
                      ["Phone", tx.customerPhone || "N/A"],
                      ["Payment Method", tx.paymentMethod || "—"],
                      ["Razorpay Order", (tx.razorpayOrderId || "—").slice(-12)],
                      ["Razorpay Payment", (tx.razorpayPaymentId || "—").slice(-12)],
                      ["Files", tx.filesCount || "—"],
                      ["Timestamp", new Date(tx.createdAt).toLocaleString("en-IN")],
                    ].map(([label, value]) => (
                      <div key={label} style={{ padding: "6px 8px", background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: `1px solid ${bm}` }}>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.38rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: lc, marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: "0.6rem", fontWeight: 600, color: tc, wordBreak: "break-all" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Kiosk Analytics ────────────────────────────────────────────────────────────
function KioskAnalytics({ kioskId, isDark }: { kioskId: string; isDark: boolean }) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"today" | "week" | "month">("week")
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedTx, setSelectedTx] = useState<any>(null)

  const lc = isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.38)"
  const tc = isDark ? "#ffffff" : "#0a0a0a"
  const bm = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"
  const sub = isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)"

  useEffect(() => {
    setLoading(true)
    fetch(`${FILE_UPLOADER_API}/api/transactions/kiosk/${kioskId}?limit=200`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.success && d.transactions) setTransactions(d.transactions) })
      .finally(() => setLoading(false))
  }, [kioskId])

  const filtered = (() => {
    const now = new Date()
    return transactions.filter(tx => {
      const d = new Date(tx.createdAt)
      if (period === "today") {
        const t = new Date(now); t.setDate(now.getDate() - weekOffset)
        return d.toDateString() === t.toDateString()
      } else if (period === "week") {
        const start = new Date(now); start.setDate(now.getDate() - weekOffset * 7 - 6); start.setHours(0, 0, 0, 0)
        const end = new Date(now); end.setDate(now.getDate() - weekOffset * 7); end.setHours(23, 59, 59, 999)
        return d >= start && d <= end
      } else {
        const start = new Date(now.getFullYear(), now.getMonth() - weekOffset, 1)
        const end = new Date(now.getFullYear(), now.getMonth() - weekOffset + 1, 0, 23, 59, 59)
        return d >= start && d <= end
      }
    })
  })()

  const totalRevenue = filtered.reduce((s, t) => s + (t.amount || 0), 0) / 100
  const txCount = filtered.length

  const periodLabel = (() => {
    const now = new Date()
    if (period === "today") {
      const d = new Date(now); d.setDate(now.getDate() - weekOffset)
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    } else if (period === "week") {
      const end = new Date(now); end.setDate(now.getDate() - weekOffset * 7)
      const start = new Date(now); start.setDate(now.getDate() - weekOffset * 7 - 6)
      return `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
    } else {
      const d = new Date(now.getFullYear(), now.getMonth() - weekOffset, 1)
      return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    }
  })()

  // Revenue bar chart: always 7 buckets for week, daily buckets otherwise
  const revenueChartData = (() => {
    if (period === "week") {
      // Always show 7 days
      const now = new Date()
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(now.getDate() - weekOffset * 7 - i)
        d.setHours(0, 0, 0, 0)
        const label = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
        const txsOnDay = filtered.filter(tx => {
          const td = new Date(tx.createdAt); td.setHours(0, 0, 0, 0)
          return td.getTime() === d.getTime()
        })
        days.push({ date: label, revenue: txsOnDay.reduce((s, t) => s + (t.amount || 0) / 100, 0), count: txsOnDay.length })
      }
      return days
    }
    const buckets: Record<string, { date: string; revenue: number; count: number }> = {}
    filtered.forEach(tx => {
      const day = new Date(tx.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
      if (!buckets[day]) buckets[day] = { date: day, revenue: 0, count: 0 }
      buckets[day].revenue += (tx.amount || 0) / 100
      buckets[day].count += 1
    })
    return Object.values(buckets)
  })()

  // Transaction count line chart
  const txLineData = (() => {
    if (period === "week") {
      const now = new Date()
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now); d.setDate(now.getDate() - weekOffset * 7 - (6 - i)); d.setHours(0, 0, 0, 0)
        const label = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
        const cnt = filtered.filter(tx => { const td = new Date(tx.createdAt); td.setHours(0, 0, 0, 0); return td.getTime() === d.getTime() }).length
        return { date: label, count: cnt }
      })
    }
    const bk: Record<string, { date: string; count: number }> = {}
    filtered.forEach(tx => {
      const day = new Date(tx.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
      if (!bk[day]) bk[day] = { date: day, count: 0 }; bk[day].count++
    })
    return Object.values(bk)
  })()

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.6rem", color: lc }}>Loading analytics...</span>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        {/* Period tabs */}
        <div style={{ display: "inline-flex", border: `1px solid ${bm}` }}>
          {(["today", "week", "month"] as const).map(p => (
            <button key={p} onClick={() => { setPeriod(p); setWeekOffset(0) }} style={{
              padding: "8px 18px", background: period === p ? C.orange : "transparent",
              color: period === p ? "#000" : lc, border: "none", borderRight: `1px solid ${bm}`,
              cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: "0.5rem",
              fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", transition: "all 0.18s",
            }}>
              {p === "today" ? "Day" : p === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>
        {/* Date nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setWeekOffset(o => o + 1)} className="rk-nav-btn" style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${bm}`, background: "transparent", cursor: "pointer", color: lc, transition: "all 0.15s" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.52rem", color: lc, minWidth: "8rem", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em" }}>{periodLabel}</span>
          <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0} className="rk-nav-btn" style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${bm}`, background: "transparent", cursor: weekOffset === 0 ? "not-allowed" : "pointer", color: lc, opacity: weekOffset === 0 ? 0.3 : 1, transition: "all 0.15s" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: bm }}>
        {[
          {
            label: "Revenue", value: `₹${totalRevenue.toFixed(0)}`, color: C.orange, icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth="2" strokeLinecap="square"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
            )
          },
          {
            label: "Transactions", value: txCount, color: C.green, icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="square"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>
            )
          },
        ].map(s => (
          <div key={s.label} style={{ padding: "16px 18px", background: isDark ? "#070707" : "#fff", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 38, height: 38, background: s.color + "15", border: `1px solid ${s.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.46rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: lc, marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: "1.4rem", fontWeight: 900, color: s.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Bar Chart */}
      <div style={{ border: `1px solid ${bm}`, padding: "16px 16px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 3, height: 14, background: C.orange }} />
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: lc }}>Revenue — {period === "week" ? "7 Days" : period === "today" ? "Today" : "Monthly"}</span>
        </div>
        {revenueChartData.length === 0 || revenueChartData.every(d => d.revenue === 0) ? (
          <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${bm}` }}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", color: lc }}>No data for this period</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={140} minWidth={0}>
            <BarChart data={revenueChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: lc, fontSize: 9, fontFamily: "'Space Mono',monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: lc, fontSize: 9, fontFamily: "'Space Mono',monospace" }} axisLine={false} tickLine={false} width={38} />
              <Tooltip
                contentStyle={{ background: isDark ? "#0a0a0a" : "#fff", border: `1px solid ${bm}`, fontSize: 10, fontFamily: "'Space Mono',monospace" }}
                labelStyle={{ color: lc }} itemStyle={{ color: C.orange }}
                formatter={(v: any) => [`₹${Number(v).toFixed(0)}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill={C.orange} radius={[2, 2, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Transaction Count Line Chart */}
      <div style={{ border: `1px solid ${bm}`, padding: "16px 16px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 3, height: 14, background: C.blue }} />
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: lc }}>Transaction Count</span>
        </div>
        {txLineData.length === 0 || txLineData.every(d => d.count === 0) ? (
          <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${bm}` }}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", color: lc }}>No data for this period</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={120} minWidth={0}>
            <LineChart data={txLineData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: lc, fontSize: 9, fontFamily: "'Space Mono',monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: lc, fontSize: 9, fontFamily: "'Space Mono',monospace" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: isDark ? "#0a0a0a" : "#fff", border: `1px solid ${bm}`, fontSize: 10, fontFamily: "'Space Mono',monospace" }}
                labelStyle={{ color: lc }} itemStyle={{ color: C.blue }}
                formatter={(v: any) => [v, "Transactions"]}
              />
              <Line
                type="monotone" dataKey="count" stroke={C.blue} strokeWidth={2} dot={{ fill: C.blue, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: C.blue, stroke: isDark ? "#070707" : "#fff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent transactions in analytics */}
      <div>
        <SectionHeader label="Transactions in Period" color={C.green} />
        {filtered.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", border: `1px dashed ${bm}` }}>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.6rem", color: lc }}>No transactions for this period</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
            {filtered.slice(0, 10).map((tx, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: `1px solid ${bm}`, background: sub }}>
                <div>
                  <p style={{ fontSize: "0.82rem", fontWeight: 800, color: tc }}>₹{((tx.amount || 0) / 100).toFixed(0)}</p>
                  <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.5rem", color: lc, marginTop: 2 }}>
                    {new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StatusBadge status={tx.status === "CAPTURED" ? "ACTIVE" : tx.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTx && <InvoiceModal tx={selectedTx} onClose={() => setSelectedTx(null)} isDark={isDark} />}
      </AnimatePresence>
    </div>
  )
}

// ── Invoice Modal ──────────────────────────────────────────────────────────────
function InvoiceModal({ tx, onClose, isDark }: { tx: any; onClose: () => void; isDark: boolean }) {
  const bm = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"
  const lc = isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.38)"
  const tc = isDark ? "#ffffff" : "#0a0a0a"

  const handleDownload = async () => {
    try {
      await generateInvoicePDF({
        otp: tx.otp, kioskId: tx.kioskId, customerPhone: tx.customerPhone || "N/A",
        totalAmount: (tx.amount || 0) / 100,
        queue: (tx.printDetails || []).map((p: any) => ({
          fileName: p.fileName || "Document", pagesToPrint: p.pageCount || 1,
          printSettings: { copies: p.copies || 1, colorMode: p.colorMode || "bw", doubleSided: "one-side" },
          cost: ((p.pageCount || 1) * (p.copies || 1) * (p.colorMode === "color" ? 10 : 2))
        }))
      })
    } catch { alert("Could not generate PDF invoice") }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        style={{ width: "100%", maxWidth: 400, background: isDark ? "#050505" : "#fff", border: `1px solid ${bm}` }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 20px 16px", borderBottom: `1px solid ${bm}` }}>
          <div>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: lc, marginBottom: 5 }}>Invoice</p>
            <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.9rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em", color: tc }}>{tx.transactionId}</h3>
          </div>
          <button onClick={onClose} style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.52rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: lc, background: "none", border: "none", cursor: "pointer" }}>Close</button>
        </div>
        <div style={{ padding: 20 }}>
          {[["Date", new Date(tx.createdAt).toLocaleString()], ["Amount", `₹${((tx.amount || 0) / 100).toFixed(2)}`], ["Status", tx.status], ["Pages", tx.totalPages]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${bm}` }}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.52rem", color: lc, textTransform: "uppercase", letterSpacing: "0.12em" }}>{l}</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: l === "Amount" ? C.orange : l === "Status" && v === "CAPTURED" ? C.green : tc }}>{v}</span>
            </div>
          ))}
          <button onClick={handleDownload} style={{ width: "100%", marginTop: 16, padding: "11px", background: C.orange, color: "#000", border: "none", cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em" }}>
            Download Receipt
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Component Styles ──────────────────────────────────────────────────────────
const rk_styles = `
  .rk-row:hover { border-left: 2px solid ${C.orange} !important; }
  .rk-icon-btn:hover { border-color: rgba(255,107,71,0.5) !important; color: ${C.orange} !important; }
  .rk-copy-btn:hover { background: ${C.orange} !important; color: #000 !important; border-color: ${C.orange} !important; }
  .rk-cert-btn:hover { background: ${C.orangeDim} !important; }
  .rk-pdf-btn:hover { opacity: 0.8; }
  .rk-nav-btn:hover { background: rgba(255,255,255,0.08) !important; }
  .rk-inv-btn:hover { background: ${C.orange} !important; color: #000 !important; }

  input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(0.5);
    cursor: pointer;
  }
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type="number"] { -moz-appearance: textfield; }

  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,107,71,0.3); }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,107,71,0.6); }
`