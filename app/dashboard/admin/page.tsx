"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import KioskRegistration from "@/app/dashboard/admin/components/KioskRegistration"
import RegisteredKiosks from "@/app/dashboard/admin/components/RegisteredKiosks"
import AdminAnalytics from "@/app/dashboard/admin/components/AdminAnalytics"
import KioskLiveStatus from "@/app/dashboard/admin/components/KioskLiveStatus"

const NAV_ITEMS = [
  { id: "registration", label: "Kiosk Registration", num: "01" },
  { id: "kiosks",       label: "Registered Kiosks",  num: "02" },
  { id: "analytics",   label: "Analytics & Revenue", num: "03" },
  { id: "livestatus",  label: "Live Status",          num: "04" },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [active, setActive] = useState("registration")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [adminEmail, setAdminEmail] = useState("")
  const [isDark, setIsDark] = useState(true)
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)

  const applyTheme = (dark: boolean) => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light")
    document.body.setAttribute("data-theme", dark ? "dark" : "light")
  }

  useEffect(() => {
    const saved = localStorage.getItem("pp-theme")
    const dark = saved !== "light"
    setIsDark(dark)
    applyTheme(dark)
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem("pp-theme", next ? "dark" : "light")
    applyTheme(next)
  }

  useEffect(() => {
    try {
      const auth = localStorage.getItem("innvera-auth")
      if (!auth) { router.push("/sign-in"); return }
      const parsed = JSON.parse(auth)
      if (parsed.role !== "admin") { router.push("/sign-in"); return }
      setAdminEmail(parsed.email || "Admin User")
      setLoading(false)
    } catch {
      router.push("/sign-in")
    }
  }, [router])

  const handleSignOut = () => {
    localStorage.removeItem("innvera-auth")
    router.push("/sign-in")
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--page-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <style>{themeStyles}</style>
        {/* Animated loader */}
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, background: "#ff6b47",
              animation: `loadBounce 1s ease-in-out ${i * 0.15}s infinite`,
            }} />
          ))}
        </div>
        <div style={{ color: "var(--label-muted)", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.35em", fontFamily: "'Space Mono', monospace" }}>
          Verifying access...
        </div>
        <style>{`@keyframes loadBounce{0%,80%,100%{opacity:0.3;transform:scaleY(0.6)}40%{opacity:1;transform:scaleY(1.2)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)", color: "var(--text-primary)", display: "flex", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <style>{themeStyles}</style>

      {/* ── Mobile Sidebar Overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 90 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 260, zIndex: 100, background: "var(--card-surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}
            >
              <SidebarContent
                active={active}
                setActive={(id) => { setActive(id); setSidebarOpen(false) }}
                hoveredNav={hoveredNav}
                setHoveredNav={setHoveredNav}
                adminEmail={adminEmail}
                onSignOut={handleSignOut}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop Sidebar ── */}
      <aside className="admin-sidebar" style={{
        display: "flex", flexDirection: "column", width: 260, minHeight: "100vh",
        borderRight: "1px solid var(--border)", background: "var(--card-surface)", flexShrink: 0,
      }}>
        <SidebarContent
          active={active}
          setActive={setActive}
          hoveredNav={hoveredNav}
          setHoveredNav={setHoveredNav}
          adminEmail={adminEmail}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", overflowX: "hidden" }}>

        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px", borderBottom: "1px solid var(--border)",
          background: "var(--card-surface)", flexWrap: "wrap", gap: 12, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Mobile menu */}
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              style={{ background: "none", border: "1px solid var(--border)", cursor: "pointer", padding: "6px 8px", display: "none" }}
            >
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <line x1="0" y1="1" x2="16" y2="1" stroke="var(--text-primary)" strokeWidth="1.5" />
                <line x1="0" y1="6" x2="16" y2="6" stroke="var(--text-primary)" strokeWidth="1.5" />
                <line x1="0" y1="11" x2="16" y2="11" stroke="var(--text-primary)" strokeWidth="1.5" />
              </svg>
            </button>
            <div>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.48rem", textTransform: "uppercase", letterSpacing: "0.28em", marginBottom: 3, color: "var(--label-muted)", fontWeight: 700 }}>
                Admin Dashboard
              </p>
              <h1 style={{ fontSize: "1.15rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 1, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                {NAV_ITEMS.find(i => i.id === active)?.label}
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.48rem", fontWeight: 700, color: "#ff6b47", letterSpacing: "0.15em" }}>
                  {NAV_ITEMS.find(i => i.id === active)?.num}
                </span>
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="topbar-btn"
              style={{
                background: "var(--toggle-bg)", border: "1px solid var(--border)",
                color: "var(--text-secondary)", fontSize: "0.55rem",
                fontFamily: "'Space Mono', monospace", fontWeight: 700,
                letterSpacing: "0.15em", textTransform: "uppercase",
                padding: "7px 14px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s",
              }}
            >
              {isDark ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                  <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
              {isDark ? "Light" : "Dark"}
            </button>

            <div style={{ width: 1, height: 28, background: "var(--border)" }} />

            {/* User info */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--label-muted)", fontWeight: 700, marginBottom: 2 }}>Signed in as</p>
                <p style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text-secondary)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adminEmail}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="signout-btn"
                style={{
                  padding: "8px 16px", fontSize: "0.55rem", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.2em",
                  fontFamily: "'Space Mono', monospace",
                  border: "1px solid var(--border)", background: "transparent",
                  color: "var(--text-primary)", cursor: "pointer", transition: "all 0.2s",
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "28px 24px", overflowY: "auto" }}>
          <AnimatePresence mode="wait">
            {active === "registration" && (
              <motion.div key="registration" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <KioskRegistration />
              </motion.div>
            )}
            {active === "kiosks" && (
              <motion.div key="kiosks" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <RegisteredKiosks />
              </motion.div>
            )}
            {active === "analytics" && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <AdminAnalytics />
              </motion.div>
            )}
            {active === "livestatus" && (
              <motion.div key="livestatus" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <KioskLiveStatus />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

// ── Sidebar Content Component ─────────────────────────────────────────────────
function SidebarContent({
  active, setActive, hoveredNav, setHoveredNav, adminEmail, onSignOut,
}: {
  active: string
  setActive: (id: string) => void
  hoveredNav: string | null
  setHoveredNav: (id: string | null) => void
  adminEmail: string
  onSignOut: () => void
}) {
  return (
    <>
      {/* Logo block */}
      <div style={{ padding: "22px 22px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <a href="/" style={{ textDecoration: "none", display: "block" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em", color: "var(--text-primary)", lineHeight: 1 }}>
            INNVERA
          </div>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <div style={{ width: 5, height: 5, background: "#ff6b47", animation: "blink 2s ease-in-out infinite" }} />
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.48rem", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--label-muted)", fontWeight: 700 }}>
            Admin Panel
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "20px 14px" }}>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: "var(--label-muted)", padding: "0 8px", marginBottom: 12 }}>Navigation</p>
        {NAV_ITEMS.map(item => {
          const isActive = active === item.id
          const isHovered = hoveredNav === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              onMouseEnter={() => setHoveredNav(item.id)}
              onMouseLeave={() => setHoveredNav(null)}
              style={{
                width: "100%", textAlign: "left",
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 12px", marginBottom: 2,
                background: isActive ? "var(--nav-active-bg)" : isHovered ? "rgba(255,107,71,0.04)" : "transparent",
                borderLeft: `2px solid ${isActive ? "#ff6b47" : "transparent"}`,
                border: "none", borderLeftStyle: "solid", borderLeftWidth: 2,
                borderLeftColor: isActive ? "#ff6b47" : "transparent",
                cursor: "pointer", transition: "all 0.18s",
                position: "relative", overflow: "hidden",
              }}
            >
              {/* Nav item number */}
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", fontWeight: 700,
                letterSpacing: "0.18em", color: isActive ? "#ff6b47" : "var(--label-muted)",
                transition: "color 0.18s", flexShrink: 0,
              }}>
                {item.num}
              </span>

              {/* Nav icons */}
              <span style={{ color: isActive ? "#ff6b47" : "var(--label-muted)", flexShrink: 0, transition: "color 0.18s" }}>
                {item.id === "registration" && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
                    <rect x="2" y="3" width="20" height="14" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                )}
                {item.id === "kiosks" && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                  </svg>
                )}
                {item.id === "analytics" && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
                  </svg>
                )}
                {item.id === "livestatus" && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M6.3 6.3a8 8 0 0 0 0 11.4" />
                    <path d="M17.7 6.3a8 8 0 0 1 0 11.4" />
                    <path d="M3.5 3.5a13 13 0 0 0 0 17" />
                    <path d="M20.5 3.5a13 13 0 0 1 0 17" />
                  </svg>
                )}
              </span>

              <span style={{
                fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700,
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                transition: "color 0.18s",
              }}>
                {item.label}
              </span>

              {/* Active indicator arrow */}
              {isActive && (
                <span style={{ marginLeft: "auto", color: "#ff6b47" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom user block */}
      <div style={{ padding: "16px 14px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ padding: "12px 14px", border: "1px solid var(--border)", background: "var(--card-bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            {/* User avatar */}
            <div style={{ width: 28, height: 28, background: "rgba(255,107,71,0.15)", border: "1px solid rgba(255,107,71,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b47" strokeWidth="2" strokeLinecap="square">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--label-muted)", fontWeight: 700, marginBottom: 2 }}>Admin</p>
              <p style={{ fontSize: "0.62rem", fontWeight: 600, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adminEmail}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="signout-btn"
            style={{
              width: "100%", padding: "7px", fontSize: "0.52rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.18em",
              fontFamily: "'Space Mono', monospace", border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}

// ── Theme CSS Variables ────────────────────────────────────────────────────────
const themeStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Space+Mono:wght@400;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root,
  [data-theme="dark"] {
    --page-bg: #000000;
    --card-surface: #050505;
    --footer-bg: #030303;
    --border: rgba(255,255,255,0.08);
    --field-bg: rgba(255,255,255,0.025);
    --field-border: rgba(255,255,255,0.1);
    --card-bg: rgba(255,255,255,0.025);
    --card-border: rgba(255,255,255,0.08);
    --ssh-bg: rgba(255,255,255,0.02);
    --checkbox-border: rgba(255,255,255,0.2);
    --nav-active-bg: rgba(255,107,71,0.08);
    --toggle-bg: rgba(255,255,255,0.04);
    --signout-hover-bg: rgba(255,255,255,0.06);
    --signout-hover-text: #ffffff;
    --text-primary: #ffffff;
    --text-secondary: rgba(255,255,255,0.55);
    --text-muted: rgba(255,255,255,0.45);
    --label-muted: rgba(255,255,255,0.28);
    --bullet-idle: rgba(255,255,255,0.15);
    --step-done-num: #3a3a3a;
    --step-done-label: #444;
    --step-idle-num: #1e1e1e;
    --step-idle-label: #1e1e1e;
    --progress-done: rgba(255,255,255,0.22);
    --progress-idle: rgba(255,255,255,0.07);
    --btn-loading-bg: #111;
    --btn-loading-text: rgba(255,255,255,0.3);
  }

  [data-theme="light"] {
    --page-bg: #f4f4f4;
    --card-surface: #ffffff;
    --footer-bg: #fafafa;
    --border: rgba(0,0,0,0.1);
    --field-bg: rgba(0,0,0,0.03);
    --field-border: rgba(0,0,0,0.12);
    --card-bg: rgba(0,0,0,0.02);
    --card-border: rgba(0,0,0,0.1);
    --ssh-bg: rgba(0,0,0,0.03);
    --checkbox-border: rgba(0,0,0,0.25);
    --nav-active-bg: rgba(255,107,71,0.08);
    --toggle-bg: rgba(0,0,0,0.04);
    --signout-hover-bg: rgba(0,0,0,0.06);
    --signout-hover-text: #000000;
    --text-primary: #0a0a0a;
    --text-secondary: rgba(0,0,0,0.55);
    --text-muted: rgba(0,0,0,0.45);
    --label-muted: rgba(0,0,0,0.38);
    --bullet-idle: rgba(0,0,0,0.18);
    --step-done-num: #bdbdbd;
    --step-done-label: #b0b0b0;
    --step-idle-num: #d8d8d8;
    --step-idle-label: #d8d8d8;
    --progress-done: rgba(0,0,0,0.25);
    --progress-idle: rgba(0,0,0,0.1);
    --btn-loading-bg: #e8e8e8;
    --btn-loading-text: rgba(0,0,0,0.3);
  }

  body { background: var(--page-bg) !important; color: var(--text-primary) !important; }

  @media (max-width: 1023px) {
    .admin-sidebar { display: none !important; }
    .mobile-menu-btn { display: flex !important; }
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
  @keyframes slideDown {
    from { opacity:0; transform:translateY(-8px); }
    to { opacity:1; transform:translateY(0); }
  }
  @keyframes loadBounce {
    0%,80%,100% { opacity:0.3; transform:scaleY(0.6); }
    40% { opacity:1; transform:scaleY(1.2); }
  }

  .cta-btn:hover { background: #e05c3a !important; border-color: #e05c3a !important; }
  .cta-btn:active { opacity: 0.85; }
  .back-btn:hover { color: var(--text-secondary) !important; }
  .topbar-btn:hover { background: rgba(255,107,71,0.08) !important; border-color: rgba(255,107,71,0.3) !important; color: #ff6b47 !important; }
  .signout-btn:hover { background: var(--signout-hover-bg) !important; color: var(--signout-hover-text) !important; border-color: rgba(255,107,71,0.3) !important; }

  [data-theme="light"] input::placeholder { color: rgba(0,0,0,0.22) !important; font-family: 'Inter', sans-serif; font-weight: 400; }
  [data-theme="dark"] input::placeholder { color: rgba(255,255,255,0.16) !important; font-family: 'Inter', sans-serif; font-weight: 400; }
  input::placeholder { font-family: 'Inter', sans-serif; font-weight: 400; }

  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }

  input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(0.4); cursor: pointer; opacity: 0.6;
  }

  ::selection { background: #ff6b47; color: #000; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,107,71,0.25); }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,107,71,0.5); }
`