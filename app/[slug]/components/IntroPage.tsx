"use client"

import { useState, useEffect, useRef } from "react"
import styles from "./IntroPage.module.css"

interface IntroPageProps {
  onFinish: () => void
}

// ─── Icons: same subtle white stroke style as video ───
const ICONS = [
  // Smile
  <svg key="smile" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" />
  </svg>,
  // Printer
  <svg key="printer" viewBox="0 0 24 24">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" rx="1" />
  </svg>,
  // File
  <svg key="file" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>,
  // Cloud
  <svg key="cloud" viewBox="0 0 24 24">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>,
  // Wifi
  <svg key="wifi" viewBox="0 0 24 24">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <circle cx="12" cy="20" r="1.2" fill="rgba(255,255,255,0.78)" stroke="none" />
  </svg>,
  // Star
  <svg key="star" viewBox="0 0 24 24">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>,
  // Lock
  <svg key="lock" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>,
  // Zap
  <svg key="zap" viewBox="0 0 24 24">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>,
]

// timing budget (ms) — must all fit inside 3000ms
const ICON_SHOW   = 180  // how long icon is visible
const ICON_GAP    = 110  // pause between icons
const TOTAL_MS    = 3000 // hard cap

export default function IntroPage({ onFinish }: IntroPageProps) {
  const [current, setCurrent]   = useState(0)
  const [visible, setVisible]   = useState(false)
  const [exiting, setExiting]   = useState(false)
  const tickRef                 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idxRef                  = useRef(0)
  const doneRef                 = useRef(false)

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    setVisible(false)
    setExiting(true)
    setTimeout(() => onFinish(), 260)
  }

  useEffect(() => {
    // hard 3-second kill
    const hard = setTimeout(finish, TOTAL_MS)

    const step = () => {
      // show
      setVisible(true)

      tickRef.current = setTimeout(() => {
        // hide
        setVisible(false)

        tickRef.current = setTimeout(() => {
          idxRef.current += 1
          if (idxRef.current >= ICONS.length) {
            finish()
          } else {
            setCurrent(idxRef.current)
            step()
          }
        }, ICON_GAP)
      }, ICON_SHOW)
    }

    step()

    return () => {
      clearTimeout(hard)
      if (tickRef.current) clearTimeout(tickRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={`${styles.container} ${exiting ? styles.exiting : ""}`}
      onClick={finish}
    >
      <div className={styles.iconWrap}>
        <div className={`${styles.icon} ${visible ? styles.show : ""}`}>
          {ICONS[current]}
        </div>
      </div>
    </div>
  )
}