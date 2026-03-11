import type { Metadata } from "next"
import PolicyLayout from "../components/PolicyLayout"

export const metadata: Metadata = {
  title: "Terms of Service — PRINTIT by Innvera",
  description: "Terms of Service for PRINTIT self-service printing kiosk by Innvera Technologies.",
}

const sections = [
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
]

export default function TermsPage() {
  return (
    <PolicyLayout
      label="LEGAL"
      title="Terms of Service"
      updated="March 2025"
      sections={sections}
    />
  )
}
