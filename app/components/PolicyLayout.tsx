"use client"

import Link from "next/link"
import styles from "./PolicyLayout.module.css"

interface Section {
  heading: string
  body: string
}

interface PolicyLayoutProps {
  label: string
  title: string
  updated: string
  sections: Section[]
}

export default function PolicyLayout({ label, title, updated, sections }: PolicyLayoutProps) {
  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.backBtn} aria-label="Back to home">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <span className={styles.headerLogo}>PRINTIT</span>
        <div />
      </header>

      <main className={styles.main}>
        <div className={styles.label}>{label}</div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Last updated: {updated}</p>

        <div className={styles.divider} />

        <div className={styles.sections}>
          {sections.map((s, i) => (
            <div key={i} className={styles.section}>
              <h2 className={styles.sectionHeading}>{s.heading}</h2>
              <p className={styles.sectionBody}>{s.body}</p>
            </div>
          ))}
        </div>

        <div className={styles.divider} />

        <div className={styles.contact}>
          <span>Questions? Contact </span>
          <a href="mailto:legal@innvera.in" className={styles.contactLink}>legal@innvera.in</a>
        </div>
      </main>

      <footer className={styles.footer}>
        <nav className={styles.footerNav}>
          <Link href="/" className={styles.footerLink}>Home</Link>
          <span className={styles.footerDot}>·</span>
          <Link href="/terms" className={styles.footerLink}>Terms</Link>
          <span className={styles.footerDot}>·</span>
          <Link href="/privacy" className={styles.footerLink}>Privacy</Link>
          <span className={styles.footerDot}>·</span>
          <Link href="/refund" className={styles.footerLink}>Refund</Link>
        </nav>
        <p className={styles.footerCopy}>&copy; {new Date().getFullYear()} Innvera Technologies Pvt. Ltd.</p>
      </footer>
    </div>
  )
}
