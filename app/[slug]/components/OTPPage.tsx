"use client"

import styles from "./OTPPage.module.css"

interface OTPPageProps {
  otp: string
  onNewPrint?: () => void
}

export default function OTPPage({ otp, onNewPrint }: OTPPageProps) {
  const handleCopyOTP = () => {
    navigator.clipboard.writeText(otp)
    alert('OTP copied to clipboard!')
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Success Icon */}
        <div className={styles.successIcon}>
          <svg viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className={styles.title}>PAYMENT SUCCESSFUL</h1>
        <p className={styles.subtitle}>Your OTP Code</p>

        {/* OTP Display */}
        <div className={styles.otpContainer}>
          <div className={styles.otpCode}>{otp}</div>
        </div>

        {/* Instructions */}
        <p className={styles.instructions}>
          Enter this OTP on the kiosk screen to print your documents
        </p>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button 
            className={styles.primaryButton}
            onClick={handleCopyOTP}
          >
            COPY OTP
          </button>
          
          {onNewPrint && (
            <button 
              className={styles.secondaryButton}
              onClick={onNewPrint}
            >
              PRINT ANOTHER DOCUMENT
            </button>
          )}
        </div>

        {/* Info */}
        <div className={styles.infoBox}>
          <span className={styles.infoIcon}>ℹ️</span>
          <span className={styles.infoText}>
            Your files will be deleted automatically after printing for your security
          </span>
        </div>
      </div>
    </div>
  )
}