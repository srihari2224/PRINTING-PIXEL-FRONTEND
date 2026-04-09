"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"

const API = "https://printing-pixel-1.onrender.com"
const POLL_INTERVAL = 10_000   // refresh every 10 seconds

interface Agent {
  kioskId: string
  socketId: string
  connectedAt: string
  lastHeartbeat: string
  version: string | null
}

interface PrintJob {
  _id: string
  uploadId: string
  status: string
  totalPages: number
  fileCount: number
  createdAt: string
  completedAt?: string
  error?: string
  results?: { filename: string; success: boolean; error?: string }[]
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED:       "#22c55e",
  PARTIAL_FAILURE: "#f59e0b",
  FAILED:          "#ef4444",
  PRINTING:        "#3b82f6",
  PROCESSING:      "#8b5cf6",
  DOWNLOADING:     "#06b6d4",
  SENT_TO_AGENT:   "#6366f1",
  QUEUED:          "#f59e0b",
  AGENT_OFFLINE:   "#6b7280",
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 5)   return "just now"
  if (diff < 60)  return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function formatUptime(connectedAt: string): string {
  const sec = Math.floor((Date.now() - new Date(connectedAt).getTime()) / 1000)
  if (sec < 60)   return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}m`
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${h}h ${m}m`
}

// ── Kiosk row expandable card ─────────────────────────────────────────────────
function KioskCard({ kioskId, agent, registered }: {
  kioskId: string
  agent: Agent | null
  registered?: any
}) {
  const [expanded, setExpanded]     = useState(false)
  const [jobs, setJobs]             = useState<PrintJob[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [updating, setUpdating]     = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [actionMsg, setActionMsg]   = useState<string | null>(null)
  const isOnline = !!agent

  const showMsg = (msg: string) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(null), 4000)
  }

  const handleUpdate = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOnline) return
    setUpdating(true)
    try {
      const res  = await fetch(`${API}/api/agents/${kioskId}/update`, { method: "POST" })
      const data = await res.json()
      showMsg(data.success ? `✓ Update sent to ${kioskId}` : `✗ ${data.error}`)
    } catch (_) { showMsg("Network error") }
    setUpdating(false)
  }

  const handleRestart = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOnline) return
    setRestarting(true)
    try {
      const res  = await fetch(`${API}/api/agents/${kioskId}/restart`, { method: "POST" })
      const data = await res.json()
      showMsg(data.success ? `✓ Restart sent to ${kioskId}` : `✗ ${data.error}`)
    } catch (_) { showMsg("Network error") }
    setRestarting(false)
  }

  const loadJobs = useCallback(async () => {
    if (!expanded) return
    setLoadingJobs(true)
    try {
      const res  = await fetch(`${API}/api/printjobs/kiosk/${kioskId}?limit=8`)
      const data = await res.json()
      if (data.success) setJobs(data.jobs || [])
    } catch (_) {}
    setLoadingJobs(false)
  }, [kioskId, expanded])

  useEffect(() => { loadJobs() }, [loadJobs])

  return (
    <motion.div
      layout
      style={{
        border: `1px solid ${isOnline ? "rgba(34,197,94,0.25)" : "var(--border)"}`,
        background: "var(--card-bg)",
        marginBottom: 10,
        overflow: "hidden",
        transition: "border-color 0.3s",
      }}
    >
      {/* ── Header row ── */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", cursor: "pointer", gap: 12,
          userSelect: "none",
        }}
      >
        {/* Left: status dot + kiosk ID */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
            background: isOnline ? "#22c55e" : "#4b5563",
            boxShadow: isOnline ? "0 0 8px #22c55e88" : "none",
            animation: isOnline ? "pulse 2s ease-in-out infinite" : "none",
          }} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontWeight: 700,
              fontSize: "0.72rem", letterSpacing: "0.05em",
              color: "var(--text-primary)", textTransform: "uppercase",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {kioskId}
            </div>
            {registered?.locationName && (
              <div style={{ fontSize: "0.58rem", color: "var(--text-secondary)", marginTop: 2 }}>
                {registered.locationName}
              </div>
            )}
          </div>
        </div>

        {/* Centre: badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: "0.48rem", fontWeight: 700,
            letterSpacing: "0.18em", textTransform: "uppercase",
            padding: "3px 8px",
            background: isOnline ? "rgba(34,197,94,0.12)" : "rgba(75,85,99,0.15)",
            color: isOnline ? "#22c55e" : "#9ca3af",
            border: `1px solid ${isOnline ? "rgba(34,197,94,0.3)" : "rgba(75,85,99,0.3)"}`,
          }}>
            {isOnline ? "● ONLINE" : "○ OFFLINE"}
          </span>
          {isOnline && agent?.version && (
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", fontWeight: 700,
              letterSpacing: "0.12em", color: "var(--label-muted)",
              padding: "3px 7px", border: "1px solid var(--border)",
            }}>
              v{agent.version}
            </span>
          )}
        </div>

        {/* Right: action buttons + uptime */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {isOnline && (
            <>
              <button
                onClick={handleUpdate}
                disabled={updating}
                style={{
                  fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", fontWeight: 700,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  padding: "4px 9px", cursor: updating ? "not-allowed" : "pointer",
                  background: updating ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.12)",
                  border: "1px solid rgba(99,102,241,0.35)",
                  color: updating ? "#6b7280" : "#818cf8",
                  transition: "all 0.2s",
                }}
              >
                {updating ? "updating…" : "↑ update"}
              </button>
              <button
                onClick={handleRestart}
                disabled={restarting}
                style={{
                  fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", fontWeight: 700,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  padding: "4px 9px", cursor: restarting ? "not-allowed" : "pointer",
                  background: restarting ? "rgba(245,158,11,0.1)" : "transparent",
                  border: "1px solid rgba(245,158,11,0.3)",
                  color: restarting ? "#6b7280" : "#f59e0b",
                  transition: "all 0.2s",
                }}
              >
                {restarting ? "…" : "↺ restart"}
              </button>
            </>
          )}
          <div style={{ marginLeft: 4 }}>
            {isOnline ? (
              <>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", color: "#22c55e", fontWeight: 700, textAlign: "right" }}>
                  ↑ {formatUptime(agent.connectedAt)}
                </div>
                <div style={{ fontSize: "0.5rem", color: "var(--label-muted)", marginTop: 2, textAlign: "right" }}>
                  hb {timeAgo(agent.lastHeartbeat)}
                </div>
              </>
            ) : (
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "var(--label-muted)" }}>
                agent offline
              </div>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="var(--label-muted)" strokeWidth="2.5" strokeLinecap="square"
          style={{ flexShrink: 0, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Action feedback message */}
      {actionMsg && (
        <div style={{
          padding: "6px 18px",
          fontFamily: "'Space Mono', monospace", fontSize: "0.52rem",
          color: actionMsg.startsWith("✓") ? "#22c55e" : "#ef4444",
          background: actionMsg.startsWith("✓") ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)",
          borderTop: "1px solid var(--border)",
        }}>
          {actionMsg}
        </div>
      )}

      {/* ── Expanded: agent details + recent jobs ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ borderTop: "1px solid var(--border)", overflow: "hidden" }}
          >
            <div style={{ padding: "14px 18px" }}>
              {/* Agent details grid */}
              {isOnline && (
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 10, marginBottom: 18,
                }}>
                  {[
                    { label: "Socket ID",    value: agent.socketId?.slice(0, 12) + "…" },
                    { label: "Connected",    value: new Date(agent.connectedAt).toLocaleTimeString() },
                    { label: "Heartbeat",    value: new Date(agent.lastHeartbeat).toLocaleTimeString() },
                    { label: "Version",      value: agent.version || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      padding: "8px 12px", background: "var(--field-bg)",
                      border: "1px solid var(--field-border)",
                    }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "var(--label-muted)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--text-primary)", fontWeight: 700 }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent jobs */}
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--label-muted)", marginBottom: 10 }}>
                Recent Print Jobs
              </div>
              {loadingJobs ? (
                <div style={{ color: "var(--label-muted)", fontSize: "0.6rem", fontFamily: "'Space Mono', monospace" }}>loading…</div>
              ) : jobs.length === 0 ? (
                <div style={{ color: "var(--label-muted)", fontSize: "0.6rem", fontFamily: "'Space Mono', monospace" }}>No jobs yet</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {jobs.map(job => (
                    <div key={job._id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px", border: "1px solid var(--border)",
                      background: "var(--ssh-bg)", gap: 12,
                    }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {job.uploadId}
                        </div>
                        <div style={{ fontSize: "0.5rem", color: "var(--label-muted)", marginTop: 2 }}>
                          {job.fileCount} file{job.fileCount !== 1 ? "s" : ""} · {job.totalPages} page{job.totalPages !== 1 ? "s" : ""} · {timeAgo(job.createdAt)}
                        </div>
                      </div>
                      <span style={{
                        fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", fontWeight: 700,
                        letterSpacing: "0.12em", textTransform: "uppercase",
                        padding: "3px 8px", flexShrink: 0,
                        color: STATUS_COLOR[job.status] || "#9ca3af",
                        border: `1px solid ${STATUS_COLOR[job.status] || "#4b5563"}44`,
                        background: `${STATUS_COLOR[job.status] || "#4b5563"}11`,
                      }}>
                        {job.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function KioskLiveStatus() {
  const [agents, setAgents]             = useState<Agent[]>([])
  const [kiosks, setKiosks]             = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [lastRefresh, setLastRefresh]   = useState<Date>(new Date())
  const [error, setError]               = useState<string | null>(null)
  const [updatingAll, setUpdatingAll]   = useState(false)
  const [updateAllMsg, setUpdateAllMsg] = useState<string | null>(null)

  const handleUpdateAll = async () => {
    setUpdatingAll(true)
    setUpdateAllMsg(null)
    try {
      const res  = await fetch(`${API}/api/agents/update-all`, { method: "POST" })
      const data = await res.json()
      setUpdateAllMsg(data.success ? `✓ ${data.message}` : `✗ ${data.error}`)
    } catch (_) { setUpdateAllMsg("✗ Network error") }
    setUpdatingAll(false)
    setTimeout(() => setUpdateAllMsg(null), 6000)
  }

  const fetchData = useCallback(async () => {
    try {
      const [agentsRes, kiosksRes] = await Promise.all([
        fetch(`${API}/api/printjobs/agents/status`),
        fetch(`${API}/api/kiosks?limit=100`),
      ])
      const agentsData = await agentsRes.json()
      const kiosksData = await kiosksRes.json()

      if (agentsData.success) setAgents(agentsData.agents || [])
      if (kiosksData.kiosks) setKiosks(kiosksData.kiosks)

      setError(null)
    } catch (err: any) {
      setError("Could not reach backend — check server status")
    }
    setLoading(false)
    setLastRefresh(new Date())
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchData])

  // Build merged list: registered kiosks + any online agents not in DB
  const registeredIds = new Set(kiosks.map((k: any) => k.kioskId || k.username))
  const agentIds      = new Set(agents.map(a => a.kioskId))

  const allKioskIds = [
    ...kiosks.map((k: any) => k.kioskId || k.username),
    ...agents.filter(a => !registeredIds.has(a.kioskId)).map(a => a.kioskId),
  ]

  const onlineCount  = agents.length
  const offlineCount = allKioskIds.length - onlineCount

  return (
    <div>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.48rem", textTransform: "uppercase", letterSpacing: "0.3em", color: "#ff6b47", fontWeight: 700, marginBottom: 8 }}>
          04 — Live Monitor
        </div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: 6 }}>
          Kiosk Live Status
        </h2>
        <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 520 }}>
          Real-time view of all kiosk print agents. Refreshes every 10 seconds automatically.
        </p>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Total Kiosks",  value: allKioskIds.length, color: "var(--text-primary)" },
          { label: "Online Now",    value: onlineCount,         color: "#22c55e" },
          { label: "Offline",       value: offlineCount,        color: "#ef4444" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: "14px 16px", border: "1px solid var(--border)", background: "var(--card-bg)" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--label-muted)", marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color, fontFamily: "'Space Mono', monospace" }}>{loading ? "—" : value}</div>
          </div>
        ))}

        {/* Last refresh */}
        <div style={{ padding: "14px 16px", border: "1px solid var(--border)", background: "var(--card-bg)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--label-muted)", marginBottom: 8 }}>Last Refresh</div>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--text-secondary)", fontFamily: "'Space Mono', monospace" }}>
            {lastRefresh.toLocaleTimeString()}
          </div>
          <button
            onClick={fetchData}
            style={{
              marginTop: 10, padding: "5px 0", fontSize: "0.44rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.18em",
              fontFamily: "'Space Mono', monospace", border: "1px solid var(--border)",
              background: "transparent", color: "#ff6b47", cursor: "pointer",
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Update All button */}
        <div style={{ padding: "14px 16px", border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.06)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#818cf8", marginBottom: 8 }}>OTA Update</div>
          <div style={{ fontSize: "0.58rem", color: "var(--text-secondary)", marginBottom: 10 }}>
            Push latest code to all {onlineCount} online kiosk{onlineCount !== 1 ? "s" : ""}
          </div>
          <button
            onClick={handleUpdateAll}
            disabled={updatingAll || onlineCount === 0}
            style={{
              padding: "7px 0", fontSize: "0.5rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.18em",
              fontFamily: "'Space Mono', monospace",
              border: "1px solid rgba(99,102,241,0.5)",
              background: updatingAll ? "transparent" : "rgba(99,102,241,0.15)",
              color: (updatingAll || onlineCount === 0) ? "#6b7280" : "#818cf8",
              cursor: (updatingAll || onlineCount === 0) ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {updatingAll ? "Sending…" : `↑ Update All (${onlineCount})`}
          </button>
          {updateAllMsg && (
            <div style={{
              marginTop: 8, fontSize: "0.5rem", fontFamily: "'Space Mono', monospace",
              color: updateAllMsg.startsWith("✓") ? "#22c55e" : "#ef4444",
            }}>
              {updateAllMsg}
            </div>
          )}
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          padding: "12px 16px", marginBottom: 16,
          border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)",
          color: "#ef4444", fontSize: "0.65rem", fontFamily: "'Space Mono', monospace",
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Kiosk cards ── */}
      {loading ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center", padding: 20 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 6, height: 6, background: "#ff6b47", animation: `pulse 1s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
          <span style={{ color: "var(--label-muted)", fontSize: "0.6rem", fontFamily: "'Space Mono', monospace", marginLeft: 8 }}>
            Connecting to backend...
          </span>
        </div>
      ) : allKioskIds.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--label-muted)", fontFamily: "'Space Mono', monospace" }}>
            No kiosks registered yet.<br />Register a kiosk first, then install the print agent.
          </div>
        </div>
      ) : (
        <div>
          {/* Online section */}
          {onlineCount > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "#22c55e", marginBottom: 10 }}>
                ● Online Agents ({onlineCount})
              </div>
              {agents.map(agent => (
                <KioskCard
                  key={agent.kioskId}
                  kioskId={agent.kioskId}
                  agent={agent}
                  registered={kiosks.find((k: any) => (k.kioskId || k.username) === agent.kioskId)}
                />
              ))}
            </div>
          )}

          {/* Offline section */}
          {offlineCount > 0 && (
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "#6b7280", marginBottom: 10 }}>
                ○ Offline Kiosks ({offlineCount})
              </div>
              {allKioskIds
                .filter(id => !agentIds.has(id))
                .map(id => (
                  <KioskCard
                    key={id}
                    kioskId={id}
                    agent={null}
                    registered={kiosks.find((k: any) => (k.kioskId || k.username) === id)}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
