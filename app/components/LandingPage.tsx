"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

interface LandingPageProps {
  isDark: boolean
  onThemeToggle: () => void
}

export default function LandingPage({ isDark, onThemeToggle }: LandingPageProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen relative flex flex-col font-[Inter] transition-colors duration-300 bg-background text-foreground"
      style={{
        backgroundColor: isDark ? "#000000" : "#ffffff",
        color: isDark ? "#ffffff" : "#000000"
      }}
    >
      {/* ── Background Elements ── */}
      <div className="pointer-events-none fixed inset-0 opacity-5 mix-blend-difference z-50">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

      <div className="fixed inset-y-0 w-[1px] bg-white/10 z-0 transition-opacity duration-300" style={{ left: "16.6%", opacity: isDark ? 0.1 : 0.05 }} />
      <div className="fixed inset-y-0 w-[1px] bg-white/10 z-0 transition-opacity duration-300" style={{ left: "50%", opacity: isDark ? 0.1 : 0.05 }} />
      <div className="fixed inset-y-0 w-[1px] bg-white/10 z-0 transition-opacity duration-300" style={{ left: "83.3%", opacity: isDark ? 0.1 : 0.05 }} />

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 w-full z-40 flex justify-between items-center px-6 py-5 mix-blend-difference" style={{ color: "#fff" }}>
        <div className="font-black text-xl tracking-[0.08em] uppercase">
          INNVERA
        </div>
        <button
          onClick={onThemeToggle}
          className="text-[0.6rem] font-bold tracking-[0.2em] uppercase px-4 py-2 border transition-all"
          style={{
            borderColor: "rgba(255,255,255,0.2)",
            background: "transparent",
            color: "#fff"
          }}
        >
          {isDark ? "Light Mode" : "Dark Mode"}
        </button>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-24 px-6 z-10 w-full max-w-7xl mx-auto">
        
        {/* Hero Section */}
        <section className="w-full text-center flex flex-col items-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <p className="font-mono text-[0.65rem] font-bold tracking-[0.25em] text-[#ff6b47] uppercase mb-8">
              Self-Service Printing
            </p>
            <h1 className="font-black uppercase leading-[0.85] tracking-[-0.03em] mb-10" style={{ fontSize: "clamp(3rem, 12vw, 10rem)" }}>
              Print.
              <br />
              <span className="text-transparent" style={{ WebkitTextStroke: isDark ? "1px rgba(255,255,255,0.8)" : "1px rgba(0,0,0,0.8)" }}>Instantly.</span>
            </h1>
            <p className="text-[clamp(1rem,2vw,1.4rem)] font-medium max-w-2xl mx-auto opacity-70 leading-relaxed mb-12">
              Scan the QR code at any INNVERA print kiosk, upload your documents, and pick up your prints in seconds. Zero friction.
            </p>
          </motion.div>
        </section>

        {/* CTA Section - Mobile First Bento */}
        <section className="w-full max-w-4xl border" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
          <div className="flex flex-col md:flex-row items-stretch">
            
            <div className="flex-1 p-8 md:p-12 flex flex-col justify-center border-b md:border-b-0 md:border-r" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4">
                Find a Kiosk<br />
                <span className="text-[#ff6b47]">Nearby</span>
              </h2>
              <p className="text-sm font-medium opacity-60 mb-8 max-w-sm">
                Locate active INNVERA print stations around you on our live interactive map.
              </p>
              
              <button 
                onClick={() => router.push('/map')}
                className="group relative inline-flex items-center justify-center bg-[#ff6b47] text-black font-bold uppercase tracking-[0.15em] text-[0.7rem] px-8 py-4 overflow-hidden self-start"
              >
                <div className="absolute inset-0 bg-white translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center gap-2">
                  Open Live Map
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </span>
              </button>
            </div>
            
            <div className="flex-1 relative min-h-[300px] overflow-hidden bg-[#050505] mix-blend-luminosity opacity-80 flex items-center justify-center cursor-pointer" onClick={() => router.push('/map')}>
              {/* Abstract Map Graphic */}
              <div className="absolute w-[200%] h-[1px] bg-white/20 rotate-12" />
              <div className="absolute w-[1px] h-[200%] bg-white/20 -rotate-12" />
              <div className="absolute w-3 h-3 bg-[#ff6b47] rounded-none z-10 animate-pulse" />
              <div className="absolute w-8 h-8 border border-[#ff6b47] rounded-none z-0" />
              
              <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-white/50" />
              <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-white/50" />
            </div>

          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="w-full border-t flex flex-col items-center py-8 z-10" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
        <div className="font-black text-[0.65rem] tracking-[0.15em] uppercase opacity-40 mb-4">
          PRINTIT BY INNVERA
        </div>
        <div className="flex gap-6 text-[0.6rem] font-bold tracking-[0.1em] uppercase opacity-60 mb-6">
          <a href="/privacy" className="hover:text-[#ff6b47] transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-[#ff6b47] transition-colors">Terms</a>
          <a href="/refund" className="hover:text-[#ff6b47] transition-colors">Refund</a>
        </div>
        <p className="font-mono text-[0.55rem] opacity-30">
          &copy; {new Date().getFullYear()} Innvera Technologies Pvt. Ltd.
        </p>
      </footer>
    </div>
  )
}
