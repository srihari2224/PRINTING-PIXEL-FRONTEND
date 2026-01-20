"use client"

import { use, useState } from "react"
import axios from "axios"

export default function UploadPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)

  const [file, setFile] = useState<File | null>(null)
  const [copies, setCopies] = useState(1)
  const [duplex, setDuplex] = useState(false)
  const [pageRange, setPageRange] = useState("")
  const [loading, setLoading] = useState(false)
  const [otp, setOtp] = useState<string | null>(null)
  const [error, setError] = useState("")

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file")
      return
    }

    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("copies", String(copies))
      formData.append("duplex", String(duplex))
      formData.append("pageRange", pageRange)
      formData.append("kioskId", slug)

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/upload`,
        formData
      )

      setOtp(res.data.otp)
    } catch (err: any) {
      setError(err?.response?.data?.error || "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  if (otp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="bg-gray-900 p-6 rounded-xl text-center">
          <h1 className="text-2xl font-bold mb-4">Your OTP</h1>
          <p className="text-4xl font-mono">{otp}</p>
          <p className="mt-4 text-gray-400">
            Enter this OTP on the kiosk screen
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg">
        <h1 className="text-xl font-bold mb-4 text-center">
          Upload for kiosk: {slug}
        </h1>

        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full mb-4"
        />

        <div className="mb-3">
          <label>Copies</label>
          <input
            type="number"
            value={copies}
            min={1}
            onChange={(e) => setCopies(Number(e.target.value))}
            className="border w-full p-2 rounded"
          />
        </div>

        <div className="mb-3">
          <label>
            <input
              type="checkbox"
              checked={duplex}
              onChange={(e) => setDuplex(e.target.checked)}
            />{" "}
            Double sided
          </label>
        </div>

        <div className="mb-3">
          <label>Page range (optional)</label>
          <input
            type="text"
            placeholder="1-3,5"
            value={pageRange}
            onChange={(e) => setPageRange(e.target.value)}
            className="border w-full p-2 rounded"
          />
        </div>

        {error && <p className="text-red-500 mb-2">{error}</p>}

        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full bg-black text-white p-2 rounded"
        >
          {loading ? "Uploading..." : "Upload & Get OTP"}
        </button>
      </div>
    </div>
  )
}
