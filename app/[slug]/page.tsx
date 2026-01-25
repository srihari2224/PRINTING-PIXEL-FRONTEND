"use client"

import { use, useState } from "react"

interface PrintItem {
  copies: number
  colorMode: string
  duplex: string
  pageRange: string
  name: string
}

interface UploadResult {
  uploadId: string
  totalPages: number
  files: Array<{
    originalName: string
    pageCount: number
    printOptions: any
  }>
}

export default function UploadPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  
  const [step, setStep] = useState<"upload" | "receipt" | "success">("upload")
  const [files, setFiles] = useState<File[]>([])
  const [items, setItems] = useState<PrintItem[]>([])
  const [pricePerPage, setPricePerPage] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [otp, setOtp] = useState<string | null>(null)

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || [])
    setFiles(list)
    setItems(list.map((f) => ({ 
      copies: 1, 
      colorMode: "color", 
      duplex: "single", 
      pageRange: "all", 
      name: f.name 
    })))
  }

  const updateItem = (index: number, patch: any) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], ...patch }
      return copy
    })
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

  const handleUpload = async () => {
    if (!files.length) return setError("Please select at least one file")

    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      files.forEach((f) => formData.append("files", f))
      formData.append("kioskId", slug)
      formData.append("printOptions", JSON.stringify(items))

      console.log('📤 Uploading files...')
      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/upload`,
        {
          method: 'POST',
          body: formData
        }
      )

      if (!uploadRes.ok) {
        throw new Error('Upload failed')
      }

      const data = await uploadRes.json()
      console.log('✅ Upload response:', data)

      setUploadResult(data)
      setStep("receipt")
      setLoading(false)
    } catch (err: any) {
      console.error('❌ Upload error:', err)
      setError(err?.message || 'Upload failed')
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!uploadResult) return

    setLoading(true)
    setError("")

    try {
      const { uploadId, totalPages } = uploadResult
      
      console.log('📊 Upload details:')
      console.log('  uploadId:', uploadId)
      console.log('  kioskId:', slug)
      console.log('  totalPages:', totalPages)
      console.log('  pricePerPage:', pricePerPage)
      
      const amountInPaise = Math.max(1, Number(pricePerPage || 1)) * Number(totalPages || 0) * 100
      console.log('💰 Total amount (paise):', amountInPaise, 'Pages:', totalPages)

      console.log('📤 Creating Razorpay order...')
      
      // Razorpay receipt must be max 40 chars - use short receipt
      const shortReceipt = `print_${Date.now()}`
      
      const requestBody = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: shortReceipt,
        notes: { uploadId, kioskId: slug, totalPages }
      }
      
      console.log('🔍 Request body:', JSON.stringify(requestBody, null, 2))
      
      const orderResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text()
        console.error('❌ Order creation failed. Status:', orderResponse.status)
        console.error('❌ Response:', errorText)
        
        try {
          const errorData = JSON.parse(errorText)
          throw new Error(errorData.error || errorData.details || 'Failed to create order')
        } catch (e) {
          throw new Error(`Failed to create order: ${errorText}`)
        }
      }

      const orderData = await orderResponse.json()
      console.log('✅ Order created:', orderData)

      console.log('📜 Loading Razorpay script...')
      await loadRazorpay()
      console.log('✅ Razorpay script loaded')

      const options: any = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.id,
        name: "Print Kiosk",
        description: `Print Job - ${totalPages} pages`,
        handler: async function (response: any) {
          console.log('✅ Payment successful!', response)
          
          try {
            console.log('📤 Verifying payment...')
            const verifyRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/upload/${uploadId}/confirm-payment`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                })
              }
            )

            if (!verifyRes.ok) {
              throw new Error('Payment verification failed')
            }

            const verifyData = await verifyRes.json()
            console.log('✅ Payment verified:', verifyData)
            
            if (verifyData?.otp) {
              setOtp(verifyData.otp)
              setStep("success")
            } else {
              setError('Payment verified but OTP not received')
            }
            setLoading(false)
          } catch (err: any) {
            console.error('❌ Payment verification error:', err)
            setError(err?.message || 'Payment verification failed')
            setLoading(false)
          }
        },
        prefill: {
          name: "Customer",
          email: "customer@example.com"
        },
        theme: { 
          color: '#000000' 
        },
        modal: {
          ondismiss: () => {
            console.log('💳 Payment cancelled by user')
            setLoading(false)
          }
        }
      }

      console.log('🚀 Opening Razorpay checkout...')
      const rzp = new (window as any).Razorpay(options)
      
      rzp.on('payment.failed', function (response: any) {
        console.error('❌ Payment failed:', response.error)
        setError(`Payment failed: ${response.error.description || 'Unknown error'}`)
        setLoading(false)
      })

      rzp.open()
      
    } catch (err: any) {
      console.error('❌ Payment error:', err)
      setError(err?.message || 'Payment failed')
      setLoading(false)
    }
  }

  if (step === "success" && otp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="bg-gray-900 p-8 rounded-xl text-center max-w-md">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-gray-400 mb-6">Your OTP code:</p>
          <div className="bg-black p-4 rounded-lg mb-6">
            <p className="text-5xl font-mono font-bold tracking-wider">{otp}</p>
          </div>
          <p className="text-gray-400 text-sm">
            Enter this OTP on the kiosk screen to print your documents
          </p>
        </div>
      </div>
    )
  }

  if (step === "receipt" && uploadResult) {
    const totalAmount = (uploadResult.totalPages * pricePerPage).toFixed(2)
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl w-full max-w-2xl shadow-lg">
          <h1 className="text-3xl font-bold mb-6 text-center">Print Receipt</h1>
          
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4 pb-4 border-b-2 border-gray-200">
              <span className="font-semibold text-gray-700">Upload ID:</span>
              <span className="font-mono text-sm">{uploadResult.uploadId}</span>
            </div>
            
            <div className="space-y-4 mb-4">
              <h3 className="font-semibold text-lg">Files to Print:</h3>
              {uploadResult.files.map((file, idx) => (
                <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="font-medium mb-2">{file.originalName}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>📄 Pages: {file.pageCount}</div>
                    <div>📋 Copies: {file.printOptions.copies}</div>
                    <div>🎨 Mode: {file.printOptions.colorMode === 'color' ? 'Color' : 'B&W'}</div>
                    <div>📑 Print: {file.printOptions.duplex === 'double' ? 'Double-sided' : 'Single-sided'}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total Pages:</span>
                <span className="font-bold">{uploadResult.totalPages}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Price per Page:</span>
                <span className="font-bold">₹{pricePerPage}</span>
              </div>
              <div className="flex justify-between text-2xl border-t-2 border-gray-300 pt-2 mt-2">
                <span className="font-bold">Total Amount:</span>
                <span className="font-bold text-green-600">₹{totalAmount}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <button 
              onClick={handlePayment} 
              disabled={loading}
              className="w-full bg-green-600 text-white p-4 rounded-lg font-bold text-xl hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? '💳 Processing Payment...' : `💳 Pay ₹${totalAmount} with Razorpay`}
            </button>
            
            <button 
              onClick={() => {
                setStep("upload")
                setUploadResult(null)
                setFiles([])
                setItems([])
                setError("")
              }}
              disabled={loading}
              className="w-full bg-gray-200 text-gray-700 p-3 rounded-lg font-semibold hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
            >
              ← Back to Upload
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-xl w-full max-w-2xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Print Kiosk: {slug}
        </h1>

        <div className="mb-4">
          <label className="block mb-2 font-medium text-gray-700">Select PDF files</label>
          <input 
            type="file" 
            multiple 
            accept=".pdf" 
            onChange={handleFilesChange} 
            className="w-full border-2 border-gray-300 rounded-lg p-2 hover:border-black transition-colors cursor-pointer" 
          />
        </div>

        {files.length > 0 && (
          <div className="mb-4 space-y-3">
            <h3 className="font-semibold text-lg">Selected Files ({files.length})</h3>
            {files.map((f, i) => (
              <div key={i} className="border-2 border-gray-200 p-4 rounded-lg bg-gray-50">
                <div className="font-medium mb-3 text-gray-800">{f.name}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Copies</label>
                    <input 
                      type="number" 
                      min={1} 
                      value={items[i]?.copies || 1} 
                      onChange={(e) => updateItem(i, { copies: Number(e.target.value) })} 
                      className="border-2 border-gray-300 w-full p-2 rounded-lg focus:border-black focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Color Mode</label>
                    <select 
                      value={items[i]?.colorMode || 'color'} 
                      onChange={(e) => updateItem(i, { colorMode: e.target.value })} 
                      className="border-2 border-gray-300 w-full p-2 rounded-lg focus:border-black focus:outline-none"
                    >
                      <option value="color">Color</option>
                      <option value="bw">Black & White</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Print Mode</label>
                    <select 
                      value={items[i]?.duplex || 'single'} 
                      onChange={(e) => updateItem(i, { duplex: e.target.value })} 
                      className="border-2 border-gray-300 w-full p-2 rounded-lg focus:border-black focus:outline-none"
                    >
                      <option value="single">Single Sided</option>
                      <option value="double">Double Sided</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Page Range</label>
                    <input 
                      type="text" 
                      placeholder="all or 1-3,5" 
                      value={items[i]?.pageRange || 'all'} 
                      onChange={(e) => updateItem(i, { pageRange: e.target.value })} 
                      className="border-2 border-gray-300 w-full p-2 rounded-lg focus:border-black focus:outline-none" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4">
          <label className="block mb-2 font-medium text-gray-700">Price per page (₹)</label>
          <input 
            type="number" 
            min={0} 
            step={0.5}
            value={pricePerPage} 
            onChange={(e) => setPricePerPage(Number(e.target.value))} 
            className="border-2 border-gray-300 w-full p-2 rounded-lg focus:border-black focus:outline-none" 
          />
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        <button 
          onClick={handleUpload} 
          disabled={loading || files.length === 0} 
          className="w-full bg-black text-white p-3 rounded-lg font-semibold text-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? '📤 Uploading...' : '📤 Upload Files'}
        </button>
        
        {files.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-3">
            Please select at least one PDF file to continue
          </p>
        )}
      </div>
    </div>
  )
}