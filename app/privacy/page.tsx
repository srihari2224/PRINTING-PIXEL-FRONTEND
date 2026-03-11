import type { Metadata } from "next"
import PolicyLayout from "../components/PolicyLayout"

export const metadata: Metadata = {
  title: "Privacy Policy — PRINTIT by Innvera",
  description: "Privacy Policy for PRINTIT self-service printing kiosk by Innvera Technologies.",
}

const sections = [
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
]

export default function PrivacyPage() {
  return (
    <PolicyLayout
      label="PRIVACY"
      title="Privacy Policy"
      updated="March 2025"
      sections={sections}
    />
  )
}
