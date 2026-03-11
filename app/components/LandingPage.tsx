"use client"

import { useRouter } from "next/navigation"
import styles from "./LandingPage.module.css"

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.logoMark}>PRINTIT</div>
        <div className={styles.headerSub}>by INNVERA</div>
      </header>

      <main className={styles.main}>
        {/* ── Hero ── */}
        <section className={styles.hero}>
          <div className={styles.heroLabel}>SELF-SERVICE PRINTING KIOSK</div>
          <h1 className={styles.heroTitle}>
            Find. Scan.<br />
            <span className={styles.accent}>Print instantly.</span>
          </h1>
          <p className={styles.heroDesc}>
            Locate your nearest PRINTIT kiosk on the map, scan the QR code at the kiosk, and print your documents in under 2 minutes.
          </p>
        </section>

        {/* ── Bento Map CTA ── */}
        <section className={styles.bentoSection}>
          <div className={styles.bentoCard} onClick={() => router.push('/map')}>
            {/* Simulated map background */}
            <div className={styles.bentoMapBg}>
              {/* Road grid */}
              <div className={styles.bentoRoad1} />
              <div className={styles.bentoRoad2} />
              <div className={styles.bentoRoad3} />
              <div className={styles.bentoRoad4} />
              {/* Animated pins */}
              <div className={`${styles.bentoPin} ${styles.bentoPinG}`}>
                <svg width="22" height="26" viewBox="0 0 192 192" fill="none">
                  <path d="M96 0C56 0 24 32 24 72c0 54 72 120 72 120s72-66 72-120C168 32 136 0 96 0z" fill="#22c55e"/>
                  <circle cx="96" cy="72" r="30" fill="white"/>
                </svg>
              </div>
              <div className={`${styles.bentoPin} ${styles.bentoPinR}`}>
                <svg width="18" height="22" viewBox="0 0 192 192" fill="none">
                  <path d="M96 0C56 0 24 32 24 72c0 54 72 120 72 120s72-66 72-120C168 32 136 0 96 0z" fill="#EA4335"/>
                  <circle cx="96" cy="72" r="30" fill="white"/>
                </svg>
              </div>
              <div className={`${styles.bentoPin} ${styles.bentoPinB}`}>
                <svg width="16" height="20" viewBox="0 0 192 192" fill="none">
                  <path d="M96 0C56 0 24 32 24 72c0 54 72 120 72 120s72-66 72-120C168 32 136 0 96 0z" fill="#4285F4"/>
                  <circle cx="96" cy="72" r="30" fill="white"/>
                </svg>
              </div>
              {/* User dot */}
              <div className={styles.bentoUserDot} />
              <div className={styles.bentoUserPulse} />
            </div>

            {/* Gradient overlay */}
            <div className={styles.bentoOverlay} />

            {/* Content */}
            <div className={styles.bentoContent}>
              <div className={styles.bentoBadge}>
                <svg width="12" height="12" viewBox="0 0 192 192" fill="none">
                  <path d="M96 0C56 0 24 32 24 72c0 54 72 120 72 120s72-66 72-120C168 32 136 0 96 0z" fill="white"/>
                  <circle cx="96" cy="72" r="30" fill="#22c55e"/>
                </svg>
                PRINTIT on Google Maps
              </div>
              <h2 className={styles.bentoTitle}>
                Find your nearest<br /><em>print kiosk.</em>
              </h2>
              <p className={styles.bentoDesc}>
                View all PRINTIT locations on an interactive map
              </p>
              <button className={styles.bentoCta} onClick={e => { e.stopPropagation(); router.push('/map') }}>
                View All Kiosk Locations →
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>PRINTIT by INNVERA</div>
        <nav className={styles.footerNav}>
          <a href="/privacy" className={styles.footerLink}>Privacy Policy</a>
          <span className={styles.footerDot}>·</span>
          <a href="/terms" className={styles.footerLink}>Terms of Service</a>
          <span className={styles.footerDot}>·</span>
          <a href="/refund" className={styles.footerLink}>Refund Policy</a>
        </nav>
        <p className={styles.footerCopy}>&copy; {new Date().getFullYear()} Innvera Technologies Pvt. Ltd.</p>
      </footer>
    </div>
  )
}
