"use client"

import { useState } from "react"
import { ArrowLeft, Send, CheckCircle, Loader } from "lucide-react"
import styles from "./HelpPage.module.css"

interface HelpPageProps {
  kioskId: string
  isDark?: boolean
  onClose: () => void
}

export default function HelpPage({ kioskId, isDark = true, onClose }: HelpPageProps) {
  const [email, setEmail] = useState("")
  const [mobile, setMobile] = useState("")
  const [query, setQuery] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !mobile || !query) {
      setError("All fields are required.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kioskId, email, mobile, query }),
      })
      if (!res.ok) throw new Error("Failed to submit ticket")
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`${styles.overlay} ${isDark ? styles.dark : styles.light}`}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onClose} aria-label="Close">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <div className={styles.headerTitle}>HELP &amp; SUPPORT</div>
        <div className={styles.headerSpacer} />
      </div>

      <div className={styles.body}>

        {/* ─── RAISE TICKET SECTION ─── */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>RAISE A TICKET</div>
          <h2 className={styles.sectionTitle}>Got an issue?<br /><span className={styles.accent}>{"We'll fix it."}</span></h2>
          <p className={styles.sectionDesc}>
            Fill in the form below and our team will get back to you shortly. Your ticket will be logged
            against kiosk <strong className={styles.kioskTag}>#{kioskId}</strong>.
          </p>

          {submitted ? (
            <div className={styles.successBox}>
              <CheckCircle size={36} strokeWidth={1.5} className={styles.successIcon} />
              <p className={styles.successTitle}>Ticket Raised!</p>
              <p className={styles.successSub}>
                {"We've received your query. Our support team will reach out via email within 24 hours."}
              </p>
              <button
                className={styles.newTicketBtn}
                onClick={() => { setSubmitted(false); setEmail(""); setMobile(""); setQuery("") }}
              >
                Raise Another Ticket
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>MOBILE NUMBER</label>
                <input
                  type="tel"
                  className={styles.input}
                  placeholder="+91 99999 99999"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>YOUR QUERY</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Describe your issue or query in detail..."
                  rows={4}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  required
                />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting
                  ? <><Loader size={16} className={styles.spin} /> Submitting&hellip;</>
                  : <><Send size={16} /> SUBMIT TICKET</>
                }
              </button>
            </form>
          )}
        </section>

        <div className={styles.divider} />

        {/* ─── ABOUT THIS KIOSK SECTION ─── */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>ABOUT THIS KIOSK</div>
          <h2 className={styles.sectionTitle}>What is<br /><span className={styles.accent}>PRINTIT?</span></h2>
          <p className={styles.sectionDesc}>
            PRINTIT is a self-service document printing kiosk powered by Innvera. Upload your files
            from any device, configure print settings, pay digitally — and collect your printout in under 2 minutes.
          </p>

          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <div className={styles.infoIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="1" /><path d="M8 21h8M12 17v4" />
                </svg>
              </div>
              <div className={styles.infoContent}>
                <div className={styles.infoTitle}>Self-Service</div>
                <div className={styles.infoText}>No staff needed. Print anytime, anywhere the kiosk is placed.</div>
              </div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className={styles.infoContent}>
                <div className={styles.infoTitle}>Privacy First</div>
                <div className={styles.infoText}>Files are deleted after printing. No data stored long-term.</div>
              </div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                </svg>
              </div>
              <div className={styles.infoContent}>
                <div className={styles.infoTitle}>Digital Payment</div>
                <div className={styles.infoText}>Pay via UPI, card, or wallet. Instant receipt &amp; OTP delivery.</div>
              </div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className={styles.infoContent}>
                <div className={styles.infoTitle}>Under 2 Minutes</div>
                <div className={styles.infoText}>From upload to printed document in record time.</div>
              </div>
            </div>
          </div>

          <div className={styles.contactBox}>
            <div className={styles.contactTitle}>KIOSK ID</div>
            <div className={styles.contactKioskId}>{kioskId}</div>
            <div className={styles.contactHint}>Quote this ID when contacting support.</div>
          </div>
        </section>

        <div className={styles.divider} />

        {/* ─── GET THIS KIOSK SECTION ─── */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>OUR PRODUCTS</div>
          <h2 className={styles.sectionTitle}>Want a kiosk<br /><span className={styles.accent}>at your location?</span></h2>
          <p className={styles.sectionDesc}>
            We offer turnkey printing kiosk solutions for colleges, offices, hospitals, malls,
            and co-working spaces. Zero upfront cost. Revenue sharing model available.
          </p>

          <div className={styles.productGrid}>
            <div className={styles.productCard}>
              <div className={styles.productBadge}>DX SERIES</div>
              <div className={styles.productName}>PRINTIT DX</div>
              <div className={styles.productDesc}>
                High-capacity kiosk for large institutions. A4/A3 support, duplex printing, cloud-connected dashboard.
              </div>
              <ul className={styles.featureList}>
                <li>Up to 5000 pages/day</li>
                <li>Color &amp; Black-White</li>
                <li>A3 / A4 / Legal Sizes</li>
                <li>Campus-wide OTP delivery</li>
              </ul>
            </div>
            <div className={styles.productCard}>
              <div className={`${styles.productBadge} ${styles.accentBadge}`}>SX SERIES</div>
              <div className={styles.productName}>PRINTIT SX</div>
              <div className={styles.productDesc}>
                Compact kiosk for retail outlets, cafes, and small offices. Plug-and-play with UPI payment.
              </div>
              <ul className={styles.featureList}>
                <li>Up to 1500 pages/day</li>
                <li>Black-White Only</li>
                <li>A4 Size</li>
                <li>Instant UPI payment</li>
              </ul>
            </div>
          </div>

          <div className={styles.contactCTA}>
            <div className={styles.contactCTALeft}>
              <div className={styles.contactCTATitle}>CONTACT INNVERA</div>
              <p className={styles.contactCTADesc}>
                Ready to get a kiosk at your location? Reach out to our business team.
              </p>
            </div>
            <div className={styles.contactCTARight}>
              <a href="mailto:business@innvera.in" className={styles.contactBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                </svg>
                business@innvera.in
              </a>
              <a href="tel:+919999999999" className={styles.contactBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.39 2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72A12.84 12.84 0 0 0 9.28 7a2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 3.29.7A2 2 0 0 1 22 16.92z" />
                </svg>
                +91 99999 99999
              </a>
            </div>
          </div>
        </section>

        <div style={{ height: "2rem" }} />
      </div>
    </div>
  )
}
