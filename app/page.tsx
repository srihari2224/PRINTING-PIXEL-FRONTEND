"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import UploadPage from './[slug]/components/UploadPage'
import ReviewPage from './[slug]/components/ReviewPage'
import OTPPage from './[slug]/components/OTPPage'
import LandingPage from './components/LandingPage'
import { generateInvoicePDF } from './[slug]/utils/generateInvoicePDF'

interface UploadResult {
  uploadId: string
  totalPages: number
  files: Array<{ originalName: string; pageCount: number; printOptions: any }>
  kioskId?: string
}

/* ── Inner component (needs useSearchParams inside Suspense) ── */
function KioskApp() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('kiosk_id') || ''

  // ── Theme ──
  const [isDark, setIsDark] = useState(true)
  useEffect(() => {
    const saved = localStorage.getItem('pp-theme')
    const dark = saved !== 'light'
    setIsDark(dark)
    document.body.setAttribute('data-theme', dark ? 'dark' : 'light')
    // ── Warm up the backend on page load to prevent cold-start delay ──
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`).catch(() => { })
  }, [])
  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('pp-theme', next ? 'dark' : 'light')
    document.body.setAttribute('data-theme', next ? 'dark' : 'light')
  }

  // ── App state ──
  const [step, setStep] = useState<'upload' | 'review' | 'otp'>('upload')
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [savedQueue, setSavedQueue] = useState<any[]>([])
  const [savedFiles, setSavedFiles] = useState<File[]>([])
  const [savedImageFiles, setSavedImageFiles] = useState<File[]>([])
  const [otp, setOtp] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── No kiosk_id: show the QR scanner landing page ──
  if (!slug) {
    return <LandingPage />
  }

  // ── Handlers ──
  const handleUploadComplete = (data: UploadResult & { _queue?: any[]; _files?: File[]; _imageFiles?: File[] }) => {
    if (data._queue) setSavedQueue(data._queue)
    if (data._files) setSavedFiles(data._files)
    if (data._imageFiles) setSavedImageFiles(data._imageFiles)
    setUploadResult(data)
    setStep('review')
  }

  const handleBackToUpload = () => {
    setStep('upload')
    setUploadResult(null)
    setError('')
  }

  const loadRazorpay = () =>
    new Promise((resolve, reject) => {
      if ((window as any).Razorpay) return resolve(true)
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.onload = () => resolve(true)
      s.onerror = () => reject(false)
      document.body.appendChild(s)
    })

  const handleProceedToPayment = async (totalAmount: number) => {
    if (!uploadResult) return
    setLoading(true); setError('')
    try {
      const { uploadId, kioskId } = uploadResult
      const amountInPaise = Math.round(totalAmount * 100)

      const orderResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payment/create-order`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amountInPaise, currency: 'INR',
            receipt: `print_${Date.now()}`,
            notes: { uploadId, kioskId },
          }),
        }
      )
      if (!orderResponse.ok) throw new Error('Failed to create order')
      const orderData = await orderResponse.json()
      await loadRazorpay()

      const options: any = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.id,
        name: 'PRINTIT Kiosk',
        description: `Print Job — ${kioskId}`,
        handler: async (response: any) => {
          try {
            const phone = response.contact || ''
            const verifyRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/upload/${uploadId}/confirm-payment`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  amount: amountInPaise, currency: 'INR',
                  customerEmail: response.email || '',
                  customerPhone: phone,
                  paymentMethod: response.method || 'unknown',
                }),
              }
            )
            if (!verifyRes.ok) throw new Error('Payment verification failed')
            const verifyData = await verifyRes.json()
            if (verifyData?.otp) {
              setOtp(verifyData.otp)
              setStep('otp')
              try {
                await generateInvoicePDF({
                  otp: verifyData.otp,
                  kioskId: uploadResult.kioskId || slug,
                  queue: savedQueue,
                  totalAmount,
                  customerPhone: phone,
                })
              } catch (e) { console.error('Invoice error:', e) }
            } else {
              setError('Payment verified but OTP not received')
            }
          } catch (err: any) {
            setError(err?.message || 'Payment verification failed')
          } finally { setLoading(false) }
        },
        prefill: { name: 'Customer', email: '', contact: '' },
        theme: { color: '#000000ff' },
        modal: { ondismiss: () => setLoading(false) },
      }
      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', (r: any) => {
        setError(`Payment failed: ${r.error.description || 'Unknown error'}`)
        setLoading(false)
      })
      rzp.open()
    } catch (err: any) {
      setError(err?.message || 'Payment failed')
      setLoading(false)
    }
  }

  const handleNewPrint = () => {
    setStep('upload'); setUploadResult(null); setOtp(null); setError('')
    setSavedQueue([]); setSavedFiles([]); setSavedImageFiles([])
  }

  const handleShopPaymentSuccess = async (shopOtp: string, shopCart: any[]) => {
    setOtp(shopOtp)
    setStep('otp')
    try {
      const shopQueueForInvoice = shopCart.map((c: any, i: number) => ({
        id: Date.now() + i,
        fileName: c.name,
        cost: c.qty * c.pricePerItem,
        copies: c.qty,
        type: 'pdf' as const,
        timestamp: new Date().toLocaleTimeString(),
        fileType: 'pdf',
      }))
      const shopTotal = shopCart.reduce((s: number, c: any) => s + c.qty * c.pricePerItem, 0)
      await generateInvoicePDF({
        otp: shopOtp,
        kioskId: slug,
        queue: shopQueueForInvoice,
        totalAmount: shopTotal,
        customerPhone: '',
      })
    } catch (e) { console.error('Shop invoice error:', e) }
  }

  // ── Render ──
  if (step === 'otp' && otp) {
    return <OTPPage otp={otp} onNewPrint={handleNewPrint} isDark={isDark} />
  }
  if (step === 'review' && uploadResult) {
    return (
      <ReviewPage
        uploadResult={uploadResult}
        kioskId={uploadResult.kioskId || ''}
        onBack={handleBackToUpload}
        onProceedToPayment={handleProceedToPayment}
        isDark={isDark}
      />
    )
  }
  return (
    <UploadPage
      slug={slug}
      onUploadComplete={handleUploadComplete}
      initialQueue={savedQueue}
      initialFiles={savedFiles}
      initialImageFiles={savedImageFiles}
      isDark={isDark}
      onThemeToggle={toggleTheme}
      onShopPaymentSuccess={handleShopPaymentSuccess}
    />
  )
}

/* ── Root export (Suspense required for useSearchParams) ── */
export default function Home() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#555', fontFamily: 'Inter,sans-serif', fontSize: '0.85rem' }}>Loading…</span>
      </div>
    }>
      <KioskApp />
    </Suspense>
  )
}