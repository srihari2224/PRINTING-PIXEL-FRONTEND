"use client"

import { ArrowLeft } from "lucide-react"
import styles from "./PolicyPage.module.css"

interface PolicyPageProps {
  type: "terms" | "privacy" | "refund"
  isDark?: boolean
  onClose: () => void
}

const POLICIES = {
  terms: {
    title: "Terms of Service",
    label: "LEGAL",
    updated: "March 2025",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: "By accessing and using the PRINTIT kiosk service ('Service') operated by Innvera Technologies Pvt. Ltd. ('Company', 'we', 'us', or 'our'), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.",
      },
      {
        heading: "2. Use of Service",
        body: "PRINTIT is a self-service document printing kiosk. Users may upload PDF and image files for printing. You agree to use the Service only for lawful purposes. You must not upload content that is obscene, defamatory, infringing, or otherwise unlawful.",
      },
      {
        heading: "3. Payment",
        body: "Payments are processed securely via Razorpay. All transactions are in Indian Rupees (INR). Once a payment is made and confirmed, an OTP is issued for document retrieval. The Company is not responsible for payment failures caused by third-party payment gateways.",
      },
      {
        heading: "4. File Handling",
        body: "Uploaded files are temporarily stored for processing and printing only. Files are automatically deleted within 24 hours of upload. The Company does not access, copy, or distribute your uploaded files.",
      },
      {
        heading: "5. Limitation of Liability",
        body: "The Company shall not be liable for any indirect, incidental, or consequential damages arising out of use of the Service or inability to use the Service. Our maximum liability is limited to the amount paid by you for the specific transaction.",
      },
      {
        heading: "6. Changes to Terms",
        body: "We reserve the right to modify these terms at any time. Your continued use of the Service after changes constitutes acceptance of the new terms.",
      },
      {
        heading: "7. Contact",
        body: "For questions about these Terms, contact us at legal@innvera.in.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    label: "PRIVACY",
    updated: "March 2025",
    sections: [
      {
        heading: "1. Information We Collect",
        body: "When you use PRINTIT, we collect: (a) Files you upload for printing — stored temporarily and deleted within 24 hours. (b) Transaction data including payment ID, amount, kiosk ID, and timestamp. (c) Contact details (phone/email) you provide during payment, used solely for OTP delivery and support.",
      },
      {
        heading: "2. How We Use Your Information",
        body: "We use collected information strictly to: process print jobs, verify payments, send OTP codes, resolve support tickets, and improve our service. We do not sell, rent, or share your personal data with third parties except as required by law.",
      },
      {
        heading: "3. Data Retention",
        body: "Uploaded files are deleted within 24 hours. Transaction records are retained for 90 days for audit purposes. Support ticket information is retained for 6 months. You may request deletion of your data by contacting privacy@innvera.in.",
      },
      {
        heading: "4. Security",
        body: "All data is transmitted over HTTPS. Payments are processed by Razorpay under PCI-DSS compliance. We employ industry-standard security measures to protect your information.",
      },
      {
        heading: "5. Cookies",
        body: "We use only functional cookies necessary for the service to operate (e.g., theme preference). No advertising or tracking cookies are used.",
      },
      {
        heading: "6. Your Rights",
        body: "You have the right to access, correct, or delete your personal data. To exercise these rights, please contact privacy@innvera.in with your request.",
      },
      {
        heading: "7. Contact",
        body: "For privacy concerns, contact: privacy@innvera.in | Innvera Technologies Pvt. Ltd., India.",
      },
    ],
  },
  refund: {
    title: "Refund & Cancellation Policy",
    label: "REFUND",
    updated: "March 2025",
    sections: [
      {
        heading: "1. General Policy",
        body: "All payments made for print jobs on PRINTIT kiosks are processed in real-time. Once a payment is confirmed and a print job is initiated, the transaction is generally non-refundable. However, we do consider refund requests on a case-by-case basis.",
      },
      {
        heading: "2. Eligible Refund Scenarios",
        body: "Refunds may be considered if: (a) The payment was charged but no OTP was delivered. (b) The kiosk failed to print due to a technical fault and the job was not completed. (c) Duplicate payments were charged for the same transaction.",
      },
      {
        heading: "3. Non-Refundable Scenarios",
        body: "The following scenarios are NOT eligible for refunds: Incorrect print settings chosen by the user, files uploaded in error by the user, poor print quality due to source file quality, partial prints where the majority of the job was completed.",
      },
      {
        heading: "4. How to Request a Refund",
        body: "To request a refund, raise a support ticket via the '?' button on the kiosk screen, or email refunds@innvera.in with: your kiosk ID, transaction/payment ID, date and time of transaction, and reason for refund request.",
      },
      {
        heading: "5. Refund Timeline",
        body: "Eligible refunds will be processed within 5–7 business days to the original payment method. Razorpay processing time may add an additional 2–3 business days.",
      },
      {
        heading: "6. Cancellation",
        body: "Once a payment is submitted, the print job cannot be cancelled as it is immediately queued for printing. If you need assistance before the job begins printing, please alert kiosk staff immediately.",
      },
      {
        heading: "7. Contact",
        body: "For refund queries: refunds@innvera.in | +91 99999 99999",
      },
    ],
  },
}

export default function PolicyPage({ type, isDark = true, onClose }: PolicyPageProps) {
  const policy = POLICIES[type]

  return (
    <div className={`${styles.overlay} ${isDark ? styles.dark : styles.light}`}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onClose} aria-label="Close">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <div className={styles.headerTitle}>{policy.label}</div>
        <div className={styles.headerSpacer} />
      </div>

      <div className={styles.body}>
        <div className={styles.policyInner}>
          <div className={styles.policyLabel}>{policy.label}</div>
          <h1 className={styles.policyTitle}>{policy.title}</h1>
          <div className={styles.policyUpdated}>Last updated: {policy.updated}</div>

          <div className={styles.sections}>
            {policy.sections.map((sec, i) => (
              <div key={i} className={styles.policySection}>
                <h3 className={styles.sectionHeading}>{sec.heading}</h3>
                <p className={styles.sectionBody}>{sec.body}</p>
              </div>
            ))}
          </div>

          <div className={styles.policyFooter}>
            <p>Innvera Technologies Pvt. Ltd. · {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
