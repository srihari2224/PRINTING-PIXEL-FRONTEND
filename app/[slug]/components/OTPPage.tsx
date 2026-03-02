"use client"

import { useState } from "react"
import { CheckCircle, Copy, Printer, ShieldCheck } from "lucide-react"
import styles from "./OTPPage.module.css"

interface OTPPageProps {
  otp: string
  onNewPrint?: () => void
  isDark?: boolean
}

export default function OTPPage({ otp, onNewPrint, isDark = true }: OTPPageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyOTP = () => {
    navigator.clipboard.writeText(otp)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.container}>
      {/* Grid lines decoration */}
      <div className={styles.gridLines} aria-hidden="true">
        <span /><span /><span /><span />
      </div>

      <div className={styles.content}>
        {/* Step label */}
        <div className={styles.stepLabel}>
          <span className={styles.stepNum}>03.</span>
          <span className={styles.stepText}>PAYMENT CONFIRMED</span>
        </div>

        {/* Icon */}
        <div className={styles.successIconWrap}>
          <CheckCircle size={48} strokeWidth={1.5} className={styles.successIcon} />
        </div>

        {/* Title */}
        <h1 className={styles.title}>PAYMENT<br />SUCCESSFUL</h1>
        <p className={styles.subtitle}>Your OTP Code</p>

        {/* OTP Display */}
        <div className={styles.otpContainer}>
          <div className={styles.otpLabel}>
            <ShieldCheck size={14} strokeWidth={2} />
            <span>SECURE CODE</span>
          </div>
          <div className={styles.otpCode}>{otp}</div>
          <div className={styles.otpHint}>Valid for this session only</div>
        </div>

        {/* Instructions */}
        <p className={styles.instructions}>
          Enter this OTP on the kiosk screen to collect your printed documents.
        </p>

        {/* Buttons */}
        <div className={styles.actionButtons}>
          <button
            className={`${styles.primaryButton} ${copied ? styles.copied : ""}`}
            onClick={handleCopyOTP}
          >
            <Copy size={16} strokeWidth={2.5} />
            {copied ? "COPIED!" : "COPY OTP"}
          </button>

          {onNewPrint && (
            <button className={styles.secondaryButton} onClick={onNewPrint}>
              <Printer size={16} strokeWidth={2} />
              PRINT ANOTHER
            </button>
          )}
        </div>

        {/* Info */}
        <div className={styles.infoBox}>
          <ShieldCheck size={16} strokeWidth={1.5} className={styles.infoIconSvg} />
          <span className={styles.infoText}>
            Your files will be deleted automatically after printing for your security.
          </span>
        </div>
      </div>
    </div>
  )
}