"use client"

import { useState } from "react"
import IntroPage from "./components/IntroPage"
import UploadPage from "./components/UploadPage"
import ReviewPage from "./components/ReviewPage"
import OTPPage from "./components/OTPPage"

import { useParams } from "next/navigation"





interface UploadResult {
  uploadId: string
  totalPages: number
  files: Array<{
    originalName: string
    pageCount: number
    printOptions: any
  }>
  kioskId?: string
}



export default function KioskPage() {

  const params = useParams()
  const slug = params.slug as string

  console.log("SLUG:", slug)
  const [introDone, setIntroDone] = useState(false)

  const [step, setStep] = useState<"upload" | "review" | "otp">("upload")
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [otp, setOtp] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // ─── Intro gate ───
  if (!introDone) {
    return <IntroPage onFinish={() => setIntroDone(true)} />
  }

  // ─── Handlers ───
  const handleUploadComplete = (data: UploadResult) => {
    setUploadResult(data)
    setStep("review")
  }

  const handleBackToUpload = () => {
    setStep("upload")
    setUploadResult(null)
    setError("")
  }

  const loadRazorpay = () =>
    new Promise((resolve, reject) => {
      if ((window as any).Razorpay) return resolve(true)
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () => resolve(true)
      script.onerror = () => reject(false)
      document.body.appendChild(script)
    })

  const handleProceedToPayment = async (totalAmount: number) => {
    if (!uploadResult) return
    setLoading(true)
    setError("")

    try {
      const { uploadId, kioskId } = uploadResult
      const amountInPaise = Math.round(totalAmount * 100)
      const shortReceipt = `print_${Date.now()}`

      const requestBody = {
        amount: amountInPaise,
        currency: "INR",
        receipt: shortReceipt,
        notes: { uploadId, kioskId },
      }

      console.log("📤 Creating Razorpay order...")
      console.log("Amount (INR):", totalAmount)
      console.log("Amount (Paise):", amountInPaise)

      const orderResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payment/create-order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      )

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text()
        console.error("❌ Order creation failed:", errorText)
        try {
          const errorData = JSON.parse(errorText)
          throw new Error(errorData.error || errorData.details || "Failed to create order")
        } catch (e) {
          throw new Error(`Failed to create order: ${errorText}`)
        }
      }

      const orderData = await orderResponse.json()
      console.log("✅ Order created:", orderData)

      await loadRazorpay()

      const options: any = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.id,
        name: "Print Kiosk",
        description: `Print Job - ${kioskId}`,
        handler: async function (response: any) {
          console.log("✅ Payment successful!", response)
          try {
            console.log("📤 Verifying payment and creating transaction...")
            const confirmPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: amountInPaise,
              currency: "INR",
              customerEmail: response.email || "customer@example.com",
              customerPhone: response.contact || "",
              paymentMethod: response.method || "unknown",
            }
            console.log("📦 Confirmation payload:", confirmPayload)

            const verifyRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/upload/${uploadId}/confirm-payment`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(confirmPayload),
              }
            )

            if (!verifyRes.ok) {
              const errorText = await verifyRes.text()
              console.error("❌ Payment verification failed:", errorText)
              throw new Error("Payment verification failed")
            }

            const verifyData = await verifyRes.json()
            console.log("✅ Payment verified:", verifyData)

            if (verifyData?.warning) console.warn("⚠️ Warning:", verifyData.warning)

            if (verifyData?.otp) {
              setOtp(verifyData.otp)
              setStep("otp")
            } else {
              setError("Payment verified but OTP not received")
            }
            setLoading(false)
          } catch (err: any) {
            console.error("❌ Payment verification error:", err)
            setError(err?.message || "Payment verification failed")
            setLoading(false)
          }
        },
        prefill: {
          name: "Customer",
          email: "customer@example.com",
          contact: "",
        },
        theme: { color: "#4caf50" },
        modal: {
          ondismiss: () => {
            console.log("💳 Payment cancelled by user")
            setLoading(false)
          },
        },
      }

      console.log("🚀 Opening Razorpay checkout...")
      const rzp = new (window as any).Razorpay(options)
      rzp.on("payment.failed", function (response: any) {
        console.error("❌ Payment failed:", response.error)
        setError(`Payment failed: ${response.error.description || "Unknown error"}`)
        setLoading(false)
      })
      rzp.open()
    } catch (err: any) {
      console.error("❌ Payment error:", err)
      setError(err?.message || "Payment failed")
      setLoading(false)
    }
  }

  const handleNewPrint = () => {
    setStep("upload")
    setUploadResult(null)
    setOtp(null)
    setError("")
  }

  // ─── Render ───
  if (step === "otp" && otp) {
    return <OTPPage otp={otp} onNewPrint={handleNewPrint} />
  }

  if (step === "review" && uploadResult) {
    return (
      <ReviewPage
        uploadResult={uploadResult}
        kioskId={uploadResult.kioskId || ""}
        onBack={handleBackToUpload}
        onProceedToPayment={handleProceedToPayment}
      />
    )
  }

  console.log("SLUG:", slug)
return <UploadPage slug={slug} onUploadComplete={handleUploadComplete} />

}