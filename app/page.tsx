"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to map page
    router.push('/map')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="text-6xl mb-4">🖨️</div>
        <h1 className="text-2xl font-bold text-white mb-2">Qwikprint</h1>
        <p className="text-gray-400">Loading kiosk map...</p>
      </div>
    </div>
  )
}