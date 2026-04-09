"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google"

const ADMIN_EMAILS = ["msrihari2224@gmail.com"]
const KIOSK_BACKEND = "https://kiosk-backend-t1mi.onrender.com"
const GOOGLE_CLIENT_ID = "141654912979-15gqtfm1opias95jauppb0pc354p8db8.apps.googleusercontent.com"

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams.get("role") // "admin" | "owner" | null

  const [kioskId, setKioskId] = useState("")
  const [password, setPassword] = useState("")
  const [kioskError, setKioskError] = useState("")
  const [kioskLoading, setKioskLoading] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState("")
  const [focused, setFocused] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(true)

  const showOnlyAdmin = roleParam === "admin"
  const showOnlyOwner = roleParam === "owner"

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
      const savedAuth = localStorage.getItem("innvera-auth")
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth)
        if (parsed.role === "admin") router.push("/dashboard/admin")
        if (parsed.role === "owner") router.push(`/dashboard/owner?kiosk_id=${parsed.kioskId}`)
      }
    } catch {}
  }, [router])

  const handleKioskLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kioskId.trim() || !password.trim()) {
      setKioskError("Please enter your Kiosk ID and password")
      return
    }
    setKioskLoading(true)
    setKioskError("")
    try {
      const res = await fetch(`${KIOSK_BACKEND}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: kioskId.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setKioskError("Invalid Kiosk ID or password.")
      } else {
        localStorage.setItem("innvera-auth", JSON.stringify({
          role: "owner",
          kioskId: data.kioskId,
          token: data.token,
          username: data.username
        }))
        router.push(`/dashboard/owner?kiosk_id=${data.kioskId}`)
      }
    } catch {
      setKioskError("Network error. Could not connect to the backend.")
    } finally {
      setKioskLoading(false)
    }
  }

  const handleGoogleAuthSuccess = (credentialResponse: any) => {
    try {
      setAdminLoading(true)
      const base64Url = credentialResponse.credential?.split('.')[1] || ''
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
      const payload = JSON.parse(jsonPayload)
      if (ADMIN_EMAILS.includes(payload.email)) {
        localStorage.setItem("innvera-auth", JSON.stringify({
          role: "admin",
          email: payload.email,
          name: payload.name,
          picture: payload.picture
        }))
        router.push("/dashboard/admin")
      } else {
        setAdminError("YOU ARE NOT AN ADMIN")
        setAdminLoading(false)
      }
    } catch {
      setAdminError("Google auth parsing error")
      setAdminLoading(false)
    }
  }

  const gridCols = (showOnlyAdmin || showOnlyOwner) ? "1fr" : "1fr 1fr"

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-black text-white" style={{ fontFamily: '"Inter", sans-serif' }}>
        <div className="noise-overlay" />
        <div className="vertical-grid-line" style={{ left: "16.6%" }} />
        {!showOnlyAdmin && !showOnlyOwner && <div className="vertical-grid-line" style={{ left: "50%" }} />}
        <div className="vertical-grid-line" style={{ left: "83.3%" }} />

        {/* Header */}
        <header className="fixed top-0 left-0 w-full z-[100] flex justify-between items-start px-[2rem] pt-[1.1rem] mix-blend-difference">
          <a href="/" className="group relative block overflow-hidden">
            <div className="flex flex-col text-[1.8rem] leading-[0.9] font-black uppercase tracking-tighter">
              <div className="relative overflow-hidden h-[0.9em]">
                <div className="transition-transform duration-500 ease-in-out group-hover:-translate-y-full flex">
                  {"PrintVendo".split("").map((c, i) => <span key={i}>{c}</span>)}
                </div>
                <div className="absolute top-0 left-0 transition-transform duration-500 ease-in-out translate-y-full group-hover:translate-y-0 flex">
                  {"PrintVendo".split("").map((c, i) => <span key={i}>{c}</span>)}
                </div>
              </div>
            </div>
          </a>
          <button onClick={toggleTheme} className="text-[0.6rem] uppercase tracking-[0.2em] font-bold mt-2" style={{ color: "#a3a3a3" }}>
            Mode: {isDark ? "Dark" : "Light"}
          </button>
        </header>

        {/* Main */}
        <div className="pt-[100px] min-h-screen relative" style={{ display: "grid", gridTemplateColumns: gridCols }}>
          {!showOnlyAdmin && !showOnlyOwner && (
            <div className="hidden lg:block absolute top-0 bottom-0 w-[1px] pointer-events-none z-10"
              style={{ left: "50%", background: "rgba(255,255,255,0.08)" }} />
          )}

          {/* ── Owner Panel ── */}
          {!showOnlyAdmin && (
            <motion.div
              className="flex flex-col justify-center px-[2rem] lg:px-[4rem] py-[4rem] border-b lg:border-b-0 lg:border-r"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] mb-8" style={{ color: "#a3a3a3" }}>
                01. Kiosk Owner
              </p>
              <h1 className="uppercase font-black leading-[0.85] mb-10"
                style={{ fontSize: "clamp(2.8rem, 5vw, 5rem)", letterSpacing: "-0.03em" }}>
                Owner<br />Sign In
              </h1>
              <form onSubmit={handleKioskLogin} className="flex flex-col gap-0 w-full max-w-[440px]">
                <div className="relative border-t" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                  <label className="block text-[0.6rem] uppercase tracking-[0.2em] pt-4 pb-1 font-semibold"
                    style={{ color: focused === "kioskId" ? "#ff6b47" : "#a3a3a3" }}>
                    Kiosk ID
                  </label>
                  <input type="text" value={kioskId} onChange={e => setKioskId(e.target.value)}
                    onFocus={() => setFocused("kioskId")} onBlur={() => setFocused(null)}
                    placeholder="e.g. america"
                    className="w-full bg-transparent text-[1.1rem] font-medium pb-4 outline-none placeholder:text-[#333] transition-all duration-200"
                    style={{ caretColor: "#ff6b47", color: isDark ? "#fff" : "#000" }} />
                </div>
                <div className="relative border-t" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                  <label className="block text-[0.6rem] uppercase tracking-[0.2em] pt-4 pb-1 font-semibold"
                    style={{ color: focused === "password" ? "#ff6b47" : "#a3a3a3" }}>
                    Password
                  </label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                    placeholder="••••••••" autoComplete="current-password"
                    className="w-full bg-transparent text-[1.1rem] font-medium pb-4 outline-none placeholder:text-[#333] transition-all duration-200"
                    style={{ caretColor: "#ff6b47", color: isDark ? "#fff" : "#000" }} />
                </div>
                <AnimatePresence>
                  {kioskError && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="text-[0.75rem] py-2" style={{ color: "#ff6b47" }}>
                      {kioskError}
                    </motion.p>
                  )}
                </AnimatePresence>
                <button type="submit" disabled={kioskLoading}
                  className="mt-6 w-full py-4 text-[0.75rem] font-bold uppercase tracking-[0.2em] transition-all duration-200 disabled:opacity-50"
                  style={{ background: "#ff6b47", color: "#000" }}
                  onMouseEnter={e => { if (!kioskLoading) (e.currentTarget as HTMLElement).style.background = "#e05a38" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#ff6b47" }}>
                  {kioskLoading ? "SIGNING IN..." : "SIGN IN"}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Admin Panel ── */}
          {!showOnlyOwner && (
            <motion.div
              className="flex flex-col justify-center px-[2rem] lg:px-[4rem] py-[4rem]"
              style={{ background: "#050505" }}
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: showOnlyAdmin ? 0 : 0.15 }}
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] mb-8" style={{ color: "#a3a3a3" }}>
                02. PrintVendo Admin
              </p>
              <h2 className="uppercase font-black leading-[0.85] mb-10"
                style={{ fontSize: "clamp(2.8rem, 5vw, 5rem)", letterSpacing: "-0.03em" }}>
                Admin<br />Access
              </h2>
              <p className="text-[0.9rem] mb-10 max-w-[380px]" style={{ color: "#a3a3a3", lineHeight: 1.6 }}>
                Restricted to authorized administrators only.
                Sign in with your authorized Google account to access the control panel.
              </p>
              <div className="mb-8 p-4 border-l-2" style={{ background: "#0a0a0a", borderColor: "#ff6b47" }}>
                <p className="text-[0.6rem] uppercase tracking-[0.2em] mb-2" style={{ color: "#a3a3a3" }}>Authorized Account</p>
                <p className="text-[0.85rem] font-medium" style={{ color: "#ff6b47" }}>msrihari2224@gmail.com</p>
              </div>
              <AnimatePresence>
                {adminError && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4" style={{ background: "rgba(255,107,71,0.1)", border: "1px solid rgba(255,107,71,0.3)" }}>
                    <p className="text-[0.75rem] font-bold uppercase tracking-[0.15em]" style={{ color: "#ff6b47" }}>{adminError}</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="w-full max-w-[440px] flex">
                {adminLoading ? (
                  <p className="text-[0.75rem] font-bold uppercase tracking-[0.2em]">VERIFYING...</p>
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleAuthSuccess}
                    onError={() => setAdminError("Google Sign-In Failed")}
                    size="large" shape="rectangular" theme="filled_black"
                    text="signin_with" logo_alignment="left" width={300}
                  />
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="fixed bottom-0 left-0 w-full border-t px-8 py-4 flex justify-between items-center"
          style={{ background: "#000", borderColor: "rgba(255,255,255,0.08)", zIndex: 50 }}>
          <span className="text-[0.6rem] uppercase tracking-[0.15em]" style={{ color: "#4a4a4a" }}>PrintVendo Platform</span>
          <div className="flex gap-6 text-[0.6rem] uppercase tracking-[0.15em]" style={{ color: "#4a4a4a" }}>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000" }} />}>
      <SignInContent />
    </Suspense>
  )
}
