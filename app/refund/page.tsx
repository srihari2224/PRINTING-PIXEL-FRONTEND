import type { Metadata } from "next"
import PolicyLayout from "../components/PolicyLayout"

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — PRINTIT by Innvera",
  description: "Refund and Cancellation Policy for PRINTIT self-service printing kiosk by Innvera Technologies.",
}

const sections = [
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
    body: "The following are NOT eligible for refunds: Incorrect print settings chosen by the user, files uploaded in error by the user, poor print quality due to source file quality, partial prints where the majority of the job was completed.",
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
]

export default function RefundPage() {
  return (
    <PolicyLayout
      label="REFUND"
      title="Refund & Cancellation Policy"
      updated="March 2025"
      sections={sections}
    />
  )
}
