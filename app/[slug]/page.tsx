"use client"

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

/**
 * Legacy /[slug] route — redirects to the new query-param URL:
 *   /nyc  →  /?kiosk_id=nyc
 *
 * This ensures bookmarked / shared old URLs still work.
 */
export default function SlugRedirect() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  useEffect(() => {
    if (slug) router.replace(`/?kiosk_id=${slug}`)
  }, [slug, router])

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0a', color: '#555', fontFamily: 'Inter,sans-serif', fontSize: '0.85rem',
    }}>
      Redirecting to kiosk…
    </div>
  )
}