"use client"

import { useRouter } from "next/navigation"
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import { useRef, useState, useEffect } from "react"

interface LandingPageProps {
  isDark: boolean
  onThemeToggle: () => void
}

export default function LandingPage({ isDark, onThemeToggle }: LandingPageProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 400], [0, -60])
  const [introGone, setIntroGone] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const t = setTimeout(() => setIntroGone(true), 1600)
    return () => clearTimeout(t)
  }, [])

  const C = {
    bg: isDark ? "#000000" : "#ffffff",
    fg: isDark ? "#ffffff" : "#000000",
    muted: isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.38)",
    dim: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
    border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    surface: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    surfaceHover: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    accent: "#ff6b47",
    accentDim: "rgba(255,107,71,0.15)",
    gridLine: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    outline: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }
        ::selection { background: #ff6b47; color: #fff; }

        @keyframes stripPeel {
          0%   { transform: scaleX(1); }
          100% { transform: scaleX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes letterSlide {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0%, 100% { transform: translate(-50%,-50%) scale(1); opacity: 0.6; }
          50%       { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
        }
        @keyframes marqueeTicker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes blinkCursor {
          0%,100% { opacity:1; } 50% { opacity:0; }
        }
        @keyframes pinDrop {
          0%   { opacity:0; transform:translateY(-18px) scale(0.6); }
          70%  { transform:translateY(3px) scale(1.05); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes scanLine {
          from { top: 0%; }
          to   { top: 100%; }
        }

        .hero-letter { display:inline-block; overflow:hidden; }
        .hero-letter span {
          display:block;
          animation: letterSlide 0.7s cubic-bezier(0.22,1,0.36,1) both;
        }
        .hero-letter:nth-child(1) span { animation-delay: 0.5s; }
        .hero-letter:nth-child(2) span { animation-delay: 0.58s; }
        .hero-letter:nth-child(3) span { animation-delay: 0.66s; }
        .hero-letter:nth-child(4) span { animation-delay: 0.74s; }
        .hero-letter:nth-child(5) span { animation-delay: 0.82s; }
        .hero-letter:nth-child(6) span { animation-delay: 0.90s; }
        .hero-letter:nth-child(7) span { animation-delay: 0.98s; }

        .nav-link { position:relative; }
        .nav-link::before {
          content:''; position:absolute; bottom:-2px; left:0;
          width:0; height:1px; background:#ff6b47;
          transition:width 0.3s ease;
        }
        .nav-link:hover::before { width:100%; }

        .map-cta-btn:hover { background:#22c55e !important; color:#fff !important; }
        .map-cta-btn:active { transform:scale(0.97); }

        .strip {
          position:fixed; top:0; height:100vh; background:#000; z-index:9999;
          transform-origin: right center;
          animation: stripPeel 0.45s cubic-bezier(0.76,0,0.24,1) both;
        }

        /* ── MOBILE RESPONSIVE ── */

        /* Steps grid: 3-col → 1-col */
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
          border-left: 1px solid;
        }

        /* Bento card: 2-col → 1-col */
        .bento-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border: 1px solid;
          min-height: 480px;
          overflow: hidden;
        }

        /* Hero subtitle row */
        .hero-subtitle-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 24px;
          max-width: 900px;
        }

        /* CTA strip row */
        .cta-strip-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 40px;
        }

        /* Footer top row */
        .footer-top-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 32px;
          margin-bottom: 40px;
        }

        /* Footer bottom row */
        .footer-bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        /* Header nav */
        .header-nav {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        /* Map graphic panel */
        .bento-map-panel {
          position: relative;
          overflow: hidden;
          min-height: 300px;
        }

        @media (max-width: 768px) {

          /* Header */
          header {
            padding: 16px 18px !important;
          }
          .header-nav {
            gap: 16px;
          }
          .header-nav a {
            font-size: 0.58rem !important;
            letter-spacing: 0.14em !important;
          }

          /* Hero section */
          .hero-section-inner {
            padding: 0 18px 48px !important;
            min-height: 100dvh;
          }
          .hero-subtitle-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 28px;
          }
          .hero-find-btn {
            width: 100%;
            justify-content: center !important;
          }

          /* Steps grid → single column */
          .steps-grid {
            grid-template-columns: 1fr !important;
            border-left: none !important;
          }
          .step-card {
            border-right: none !important;
            padding: 36px 24px !important;
          }
          .step-arrow {
            display: none !important;
          }

          /* How it works section */
          .how-section {
            padding: 64px 18px !important;
          }

          /* Bento / Locations section */
          .locations-section {
            padding: 64px 18px !important;
          }
          .bento-grid {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
          }
          .bento-text-panel {
            border-right: none !important;
            padding: 36px 28px !important;
          }
          .bento-map-panel {
            min-height: 280px !important;
            border-top: 1px solid;
          }

          /* CTA strip */
          .cta-strip-section {
            padding: 56px 18px !important;
          }
          .cta-strip-row {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 28px !important;
          }
          .cta-strip-btn {
            width: 100%;
            justify-content: center !important;
          }

          /* Footer */
          footer {
            padding: 32px 18px !important;
          }
          .footer-top-row {
            flex-direction: column;
            gap: 24px !important;
          }
          .footer-wordmark {
            font-size: clamp(2.5rem, 14vw, 4.5rem) !important;
          }
          .footer-bottom-row {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 16px !important;
          }
          .footer-links-row {
            flex-wrap: wrap;
            gap: 16px !important;
          }

          /* Sections general padding */
          .section-label-row {
            margin-bottom: 40px !important;
          }
        }

        @media (max-width: 480px) {
          .header-nav a[data-label="How It Works"] {
            display: none;
          }
        }
      `}</style>

      {/* ── Intro strips ── */}
      {!introGone && (
        <div style={{ pointerEvents: "none" }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="strip" style={{
              left: `${(i / 9) * 100}%`,
              width: `${100 / 9 + 0.5}%`,
              animationDelay: `${i * 0.06}s`,
              animationDuration: "0.55s",
            }} />
          ))}
        </div>
      )}

      {/* ── Noise overlay ── */}
      <div style={{ position: "fixed", inset: 0, opacity: 0.04, mixBlendMode: "difference", zIndex: 50, pointerEvents: "none" }}>
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
          <filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

      {/* ── Grid lines ── */}
      {["16.6%", "50%", "83.3%"].map(pos => (
        <div key={pos} style={{ position: "fixed", inset: "0", width: 1, background: C.gridLine, zIndex: 1, left: pos, pointerEvents: "none" }} />
      ))}

      <div ref={containerRef} style={{
        minHeight: "100dvh", background: C.bg, color: C.fg,
        fontFamily: "'Inter', sans-serif",
        WebkitFontSmoothing: "antialiased",
        display: "flex", flexDirection: "column",
        transition: "background 0.4s, color 0.4s",
        position: "relative"
      }}>

        {/* ── HEADER ── */}
        <header style={{
          position: "fixed", top: 0, left: 0, width: "100%", zIndex: 40,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 28px",
          mixBlendMode: "difference",
          color: "#fff",
        }}>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 900,
            fontSize: "1.15rem", letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            INNVERA
          </div>

          <nav className="header-nav">
            {["Map", "How It Works"].map(label => (
              <a key={label} className="nav-link" href="#"
                data-label={label}
                style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#fff", textDecoration: "none", cursor: "pointer" }}
                onClick={e => { e.preventDefault(); if (label === "Map") router.push("/map") }}>
                {label}
              </a>
            ))}
            <button onClick={onThemeToggle}
              style={{
                fontFamily: "'Space Mono', monospace", fontSize: "0.6rem",
                fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
                color: "#fff", background: "transparent",
                border: "1px solid rgba(255,255,255,0.25)",
                padding: "6px 14px", cursor: "pointer",
              }}>
              {isDark ? "Light" : "Dark"}
            </button>
          </nav>
        </header>

        {/* ── HERO ── */}
        <motion.section style={{ y: heroY, position: "relative", zIndex: 10 }}>
          <div className="hero-section-inner" style={{
            minHeight: "100dvh", display: "flex", flexDirection: "column",
            justifyContent: "flex-end", padding: "0 28px 64px",
            borderBottom: `1px solid ${C.border}`,
          }}>

            {/* Accent label */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              style={{
                fontFamily: "'Space Mono', monospace", fontSize: "0.6rem",
                fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase",
                color: C.accent, marginBottom: "2rem",
                display: "flex", alignItems: "center", gap: 12
              }}>
              <span style={{ width: 28, height: 1, background: C.accent, display: "inline-block" }} />
              Self-Service Printing
            </motion.div>

            {/* Giant headline */}
            <h1 style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "clamp(4.5rem, 14vw, 14rem)",
              fontWeight: 900,
              lineHeight: 0.88,
              letterSpacing: "-0.04em",
              textTransform: "uppercase",
              margin: 0, marginBottom: "1.5rem",
            }}>
              {"PRINT.".split("").map((ch, i) => (
                <span key={i} className="hero-letter">
                  <span>{ch === "." ? <span style={{ color: C.accent }}>.</span> : ch}</span>
                </span>
              ))}
              <br />
              <span style={{
                WebkitTextStroke: `1.5px ${C.outline}`,
                color: "transparent",
                display: "block",
                fontSize: "clamp(4.5rem, 14vw, 14rem)",
                letterSpacing: "-0.04em",
                animation: "fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 1.1s both"
              }}>
                INSTANTLY.
              </span>
            </h1>

            {/* Subtitle row */}
            <motion.div
              className="hero-subtitle-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <p style={{
                fontSize: "clamp(0.9rem, 1.6vw, 1.2rem)",
                fontWeight: 500, color: C.muted, lineHeight: 1.7,
                maxWidth: 460, margin: 0,
              }}>
                Scan the QR code at any INNVERA print kiosk, upload your documents,
                and collect your prints in seconds. Zero friction.
              </p>

              <button
                className="hero-find-btn"
                onClick={() => router.push("/map")}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 800, fontSize: "0.65rem", letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  background: C.accent, color: "#fff",
                  border: "none", padding: "16px 32px",
                  cursor: "pointer", transition: "all 0.2s",
                  display: "flex", alignItems: "center", gap: 10,
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isDark ? "#fff" : "#000"
                  e.currentTarget.style.color = isDark ? "#000" : "#fff"
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = C.accent
                  e.currentTarget.style.color = "#fff"
                }}>
                Find a Kiosk
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </motion.div>
          </div>
        </motion.section>

        {/* ── MARQUEE TICKER ── */}
        <div style={{
          overflow: "hidden", borderBottom: `1px solid ${C.border}`,
          padding: "14px 0", background: C.bg,
          position: "relative", zIndex: 10,
        }}>
          <div style={{
            display: "flex", gap: 0,
            animation: "marqueeTicker 22s linear infinite",
            whiteSpace: "nowrap",
          }}>
            {Array.from({ length: 2 }).map((_, idx) => (
              <span key={idx} style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.65rem", fontWeight: 700,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: C.muted,
              }}>
                {["Print On Demand", "Any Kiosk", "Zero Wait", "Secure OTP", "Instant Collection", "INNVERA Network", "Print On Demand", "Any Kiosk", "Zero Wait", "Secure OTP", "Instant Collection", "INNVERA Network"]
                  .map((t, i) => (
                    <span key={i}>
                      <span style={{ color: C.accent, marginRight: 20, marginLeft: 20 }}>—</span>
                      {t}
                    </span>
                  ))}
              </span>
            ))}
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="how-section" style={{
          padding: "96px 28px",
          borderBottom: `1px solid ${C.border}`,
          position: "relative", zIndex: 10,
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>

            {/* Section label */}
            <div className="section-label-row" style={{
              display: "flex", alignItems: "center", gap: 16, marginBottom: 64
            }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: "0.6rem",
                fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase",
                color: C.accent
              }}>01 / Process</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            {/* Section title */}
            <h2 style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
              fontWeight: 900, lineHeight: 0.9,
              letterSpacing: "-0.03em", textTransform: "uppercase",
              margin: 0, marginBottom: 80,
            }}>
              How It<br />
              <span style={{ WebkitTextStroke: `1.5px ${C.outline}`, color: "transparent" }}>Works.</span>
            </h2>

            {/* Steps grid */}
            <div className="steps-grid" style={{
              borderColor: C.border,
            }}>
              {[
                {
                  num: "01",
                  title: "Scan QR",
                  desc: "Find an INNVERA kiosk and scan the QR code to open PrintIT on your device.",
                  icon: (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                      <path d="M14 14h3v3M17 17h3v3M14 20h3" />
                    </svg>
                  )
                },
                {
                  num: "02",
                  title: "Upload Files",
                  desc: "Select your documents, photos, or any printable file — PDF, DOCX, JPG and more.",
                  icon: (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  )
                },
                {
                  num: "03",
                  title: "Collect Prints",
                  desc: "Enter the secure OTP on the kiosk display and your documents print instantly.",
                  icon: (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round">
                      <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                    </svg>
                  )
                },
              ].map((step, i) => (
                <div key={i} className="step-card" style={{
                  padding: "48px 40px",
                  borderRight: `1px solid ${C.border}`,
                  borderBottom: `1px solid ${C.border}`,
                  borderLeft: `1px solid ${C.border}`,
                  position: "relative",
                  transition: "background 0.2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surface}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{
                    fontFamily: "'Space Mono', monospace", fontSize: "0.58rem",
                    fontWeight: 700, letterSpacing: "0.2em", color: C.dim,
                    textTransform: "uppercase", marginBottom: 32,
                  }}>
                    {step.num}
                  </div>
                  <div style={{ marginBottom: 24 }}>{step.icon}</div>
                  <h3 style={{
                    fontFamily: "'Inter', sans-serif", fontWeight: 900,
                    fontSize: "1.5rem", letterSpacing: "-0.02em",
                    textTransform: "uppercase", marginBottom: 12,
                  }}>{step.title}</h3>
                  <p style={{ fontSize: "0.875rem", color: C.muted, lineHeight: 1.7, margin: 0 }}>{step.desc}</p>

                  {/* Step connector arrow */}
                  {i < 2 && (
                    <div className="step-arrow" style={{
                      position: "absolute", right: -12, top: "50%",
                      transform: "translateY(-50%)",
                      width: 24, height: 24,
                      background: C.bg, border: `1px solid ${C.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      zIndex: 2,
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MAP CTA (Bento) ── */}
        <section className="locations-section" style={{
          padding: "96px 28px",
          borderBottom: `1px solid ${C.border}`,
          position: "relative", zIndex: 10,
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>

            <div className="section-label-row" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 64 }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: "0.6rem",
                fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase",
                color: C.accent
              }}>02 / Locations</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            {/* Bento card */}
            <div className="bento-grid" style={{ borderColor: C.border }}>

              {/* Left — Text */}
              <div className="bento-text-panel" style={{
                padding: "56px 52px", borderRight: `1px solid ${C.border}`,
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                background: C.surface,
              }}>
                <div>
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.2em",
                    textTransform: "uppercase", color: C.muted, marginBottom: 28,
                    display: "flex", alignItems: "center", gap: 8
                  }}>
                    <span style={{ width: 6, height: 6, background: "#22c55e", display: "inline-block" }} />
                    Live Network
                  </div>

                  <h2 style={{
                    fontFamily: "'Inter', sans-serif", fontWeight: 900,
                    fontSize: "clamp(2.2rem, 4.5vw, 4rem)",
                    lineHeight: 0.92, letterSpacing: "-0.04em",
                    textTransform: "uppercase", margin: 0, marginBottom: 24,
                  }}>
                    Find a<br />
                    Kiosk<br />
                    <span style={{ color: C.accent }}>Nearby.</span>
                  </h2>

                  <p style={{
                    fontSize: "0.9rem", color: C.muted, lineHeight: 1.7,
                    maxWidth: 340, margin: 0, marginBottom: 48,
                  }}>
                    Locate active INNVERA print stations around you on our live interactive map.
                    Real-time availability, directions, and kiosk status.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
                  <button
                    className="map-cta-btn"
                    onClick={() => router.push("/map")}
                    style={{
                      fontFamily: "'Inter', sans-serif", fontWeight: 800,
                      fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase",
                      background: C.fg, color: C.bg,
                      border: "none", padding: "16px 32px",
                      cursor: "pointer", transition: "all 0.25s",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                    Open Live Map
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>

                  <div style={{
                    fontFamily: "'Space Mono', monospace", fontSize: "0.6rem",
                    letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase",
                  }}>
                    Available in 12+ cities
                  </div>
                </div>
              </div>

              {/* Right — Abstract map graphic */}
              <div className="bento-map-panel" style={{
                borderColor: C.border,
                background: isDark ? "#0d1117" : "#f0f2f5",
              }}>
                {/* Grid road lines */}
                {[22, 45, 68].map(pct => (
                  <div key={`h${pct}`} style={{ position: "absolute", left: 0, right: 0, top: `${pct}%`, height: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)" }} />
                ))}
                {[20, 50, 75].map(pct => (
                  <div key={`v${pct}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${pct}%`, width: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)" }} />
                ))}
                {/* Diagonal roads */}
                <div style={{ position: "absolute", left: "-30%", right: "-30%", top: "35%", height: 1, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)", transform: "rotate(-7deg)" }} />
                <div style={{ position: "absolute", left: "-30%", right: "-30%", top: "72%", height: 1, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)", transform: "rotate(5deg)" }} />

                {/* Scan line */}
                <div style={{
                  position: "absolute", left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, transparent, ${C.accent}55, transparent)`,
                  animation: "scanLine 4s ease-in-out infinite",
                  pointerEvents: "none",
                }} />

                {/* Map pins */}
                {[
                  { top: "20%", left: "28%", color: "#ff6b47", delay: "0.3s" },
                  { top: "15%", left: "68%", color: "#22c55e", delay: "0.6s" },
                  { top: "55%", left: "58%", color: "#ff6b47", delay: "0.9s" },
                  { top: "72%", left: "22%", color: "#22c55e", delay: "1.2s" },
                ].map((pin, i) => (
                  <div key={i} style={{ position: "absolute", top: pin.top, left: pin.left, animation: `pinDrop 0.7s cubic-bezier(0.34,1.56,0.64,1) ${pin.delay} both` }}>
                    <svg width="22" height="28" viewBox="0 0 22 28">
                      <path d="M11 0C4.9 0 0 5 0 11.1 0 19.4 11 28 11 28s11-8.6 11-16.9C22 5 17.1 0 11 0z" fill={pin.color} />
                      <circle cx="11" cy="11" r="4.5" fill="rgba(0,0,0,0.25)" />
                    </svg>
                  </div>
                ))}

                {/* User location dot */}
                <div style={{ position: "absolute", top: "44%", left: "46%", zIndex: 2 }}>
                  <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    width: 36, height: 36,
                    border: "2px solid rgba(66,133,244,0.35)",
                    borderRadius: "50%",
                    animation: "pulseRing 2s ease-out infinite",
                  }} />
                  <div style={{
                    width: 14, height: 14,
                    background: "#4285F4",
                    border: "2.5px solid #fff",
                    borderRadius: "50%",
                    boxShadow: "0 2px 8px rgba(66,133,244,0.5)",
                    position: "relative", zIndex: 3,
                  }} />
                </div>

                {/* Corner label */}
                <div style={{
                  position: "absolute", bottom: 20, right: 20,
                  fontFamily: "'Space Mono', monospace", fontSize: "0.55rem",
                  fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
                  color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                }}>
                  Live Map
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PrintIT CTA STRIP ── */}
        <section className="cta-strip-section" style={{
          padding: "80px 28px",
          borderBottom: `1px solid ${C.border}`,
          position: "relative", zIndex: 10,
          background: C.accent,
          overflow: "hidden",
        }}>
          {/* Background texture */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
            pointerEvents: "none",
          }} />

          <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
            <div className="cta-strip-row">
              <div>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: "0.6rem",
                  fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase",
                  color: "rgba(0,0,0,0.5)", marginBottom: 16,
                }}>
                  Start Printing Now
                </div>
                <h2 style={{
                  fontFamily: "'Inter', sans-serif", fontWeight: 900,
                  fontSize: "clamp(2rem, 5vw, 4rem)",
                  lineHeight: 0.92, letterSpacing: "-0.04em",
                  textTransform: "uppercase", color: "#000", margin: 0,
                }}>
                  Your Documents.<br />Your Kiosk.
                </h2>
              </div>
              <button
                className="cta-strip-btn"
                onClick={() => router.push("/map")}
                style={{
                  fontFamily: "'Inter', sans-serif", fontWeight: 800,
                  fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase",
                  background: "#000", color: "#fff",
                  border: "none", padding: "18px 40px",
                  cursor: "pointer", transition: "all 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#000" }}
                onMouseLeave={e => { e.currentTarget.style.background = "#000"; e.currentTarget.style.color = "#fff" }}>
                Open PrintIT
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{
          padding: "40px 28px",
          display: "flex", flexDirection: "column",
          position: "relative", zIndex: 10,
        }}>
          {/* Footer top row */}
          <div className="footer-top-row">
            <div>
              <div className="footer-wordmark" style={{
                fontFamily: "'Inter', sans-serif", fontWeight: 900,
                fontSize: "clamp(3rem, 7vw, 7rem)",
                letterSpacing: "-0.04em", textTransform: "uppercase",
                color: C.dim, lineHeight: 1, margin: 0,
              }}>
                INNVERA
              </div>
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["Privacy", "Terms", "Refund", "Contact"].map(link => (
                <a key={link} href={`/${link.toLowerCase()}`} className="nav-link"
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em",
                    textTransform: "uppercase", color: C.muted,
                    textDecoration: "none", transition: "color 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = C.accent}
                  onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                  {link}
                </a>
              ))}
            </nav>
          </div>

          <div style={{ height: 1, background: C.border, marginBottom: 28 }} />

          <div className="footer-bottom-row">
            <span style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase", color: C.dim,
            }}>
              PRINTIT BY INNVERA
            </span>
            <div className="footer-links-row" style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <a href="/sign-in?role=admin"
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: C.muted,
                  textDecoration: "none", transition: "color 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = C.accent}
                onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                Admin
              </a>
              <span style={{ color: C.border, fontSize: "0.55rem" }}>|</span>
              <a href="/sign-in?role=owner"
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: C.muted,
                  textDecoration: "none", transition: "color 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = C.accent}
                onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                Owner
              </a>
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.58rem", color: C.dim, letterSpacing: "0.08em",
              }}>
                &copy; {new Date().getFullYear()} Innvera Technologies Pvt. Ltd.
              </span>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}