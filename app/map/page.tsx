"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

interface Kiosk {
  _id: string
  kioskId: string
  username: string
  locationName: string
  address: string
  geo: { lat: number; lng: number }
  status: 'PENDING' | 'ACTIVE' | 'BLOCKED'
}

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#555555' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#000000' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#111111' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#222222' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#151515' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050508' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#333355' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1f1f1f' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0d0d0d' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0d0f0d' }] },
]

const LIGHT_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f4f4f4' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#444444' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e8eaed' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f0f0f0' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#dde1e7' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d0dff0' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6497b1' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d0d5dd' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e8ede8' }] },
]

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.maps) return resolve()
    if (document.getElementById('gmap-script')) {
      const poll = setInterval(() => { if ((window as any).google?.maps) { clearInterval(poll); resolve() } }, 100)
      return
    }
    const script = document.createElement('script')
    script.id = 'gmap-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true; script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })
}

function printerMarkerSvg(active: boolean) {
  const fill = active ? '#ff6b47' : '#333333'
  const ring = active ? '#ff6b4733' : '#33333322'
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="56" viewBox="0 0 48 56">
      <rect x="2" y="2" width="44" height="44" fill="${fill}" rx="0"/>
      <rect x="2" y="2" width="44" height="44" fill="none" stroke="white" stroke-width="1.5" rx="0"/>
      <polygon points="24,52 14,46 34,46" fill="${fill}"/>
      <rect x="14" y="12" width="20" height="4" fill="white" opacity="0.9"/>
      <rect x="14" y="20" width="20" height="2" fill="white" opacity="0.5"/>
      <rect x="14" y="26" width="12" height="2" fill="white" opacity="0.5"/>
    </svg>
  `)}`
}

function userMarkerSvg() {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <rect x="0" y="0" width="24" height="24" fill="#4285F4" rx="0"/>
      <rect x="0" y="0" width="24" height="24" fill="none" stroke="white" stroke-width="2" rx="0"/>
      <rect x="9" y="9" width="6" height="6" fill="white"/>
    </svg>
  `)}`
}

export default function MapPage() {
  const [kiosks, setKiosks] = useState<Kiosk[]>([])
  const [activeKiosk, setActiveKiosk] = useState<Kiosk | null>(null)
  const [loading, setLoading] = useState(true)
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const userMarkerRef = useRef<google.maps.Marker | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  // Theme
  useEffect(() => {
    const saved = localStorage.getItem('pp-theme')
    setIsDark(saved !== 'light')
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('pp-theme', next ? 'dark' : 'light')
    if (mapInstance.current) {
      mapInstance.current.setOptions({ styles: next ? DARK_MAP_STYLES : LIGHT_MAP_STYLES })
    }
  }

  useEffect(() => { fetchKiosks() }, [])

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { }
    )
  }, [])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!apiKey || !mapRef.current) return
    loadGoogleMaps(apiKey).then(() => {
      if (!mapRef.current || mapInstance.current) return
      const map = new google.maps.Map(mapRef.current, {
        center: userLoc || { lat: 14.4426, lng: 79.9865 },
        zoom: userLoc ? 12 : 6,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: false,
        styles: isDark ? DARK_MAP_STYLES : LIGHT_MAP_STYLES,
        gestureHandling: 'greedy',
      })
      mapInstance.current = map
      setMapReady(true)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!mapInstance.current || !userLoc) return
    userMarkerRef.current?.setMap(null)
    userMarkerRef.current = new google.maps.Marker({
      position: userLoc,
      map: mapInstance.current,
      icon: { url: userMarkerSvg(), scaledSize: new google.maps.Size(24, 24), anchor: new google.maps.Point(12, 12) },
      zIndex: 1000,
      title: 'Your location',
    })
    if (kiosks.length === 0) {
      mapInstance.current.panTo(userLoc)
      mapInstance.current.setZoom(13)
    }
  }, [userLoc, mapReady])

  const filteredKiosks = kiosks.filter(k =>
    k.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.kioskId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.locationName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    if (!mapInstance.current || kiosks.length === 0) return
    placeMarkers()
  }, [kiosks, mapReady])

  const placeMarkers = useCallback(() => {
    if (!mapInstance.current) return
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    kiosks.forEach((kiosk, idx) => {
      const isActive = kiosk.status === 'ACTIVE'
      const marker = new google.maps.Marker({
        position: { lat: kiosk.geo.lat, lng: kiosk.geo.lng },
        map: mapInstance.current!,
        title: kiosk.username,
        icon: {
          url: printerMarkerSvg(isActive),
          scaledSize: new google.maps.Size(48, 56),
          anchor: new google.maps.Point(24, 56),
        },
        zIndex: 10 + idx,
      })
      marker.addListener('click', () => {
        setActiveKiosk(kiosk)
        setSidebarOpen(true)
        mapInstance.current?.panTo({ lat: kiosk.geo.lat, lng: kiosk.geo.lng })
        mapInstance.current?.setZoom(15)
        const cardEl = stripRef.current?.querySelector(`[data-id="${kiosk._id}"]`)
        cardEl?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      })
      markersRef.current.push(marker)
    })
    if (kiosks.length > 0 && !userLoc) {
      const bounds = new google.maps.LatLngBounds()
      kiosks.forEach(k => bounds.extend({ lat: k.geo.lat, lng: k.geo.lng }))
      mapInstance.current?.fitBounds(bounds, { top: 80, right: 20, bottom: 240, left: 20 })
    }
  }, [kiosks, userLoc])

  const fetchKiosks = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kiosks`)
      const data = await res.json()
      setKiosks(data.kiosks || [])
    } catch { } finally { setLoading(false) }
  }

  const focusKiosk = (kiosk: Kiosk) => {
    setActiveKiosk(kiosk)
    mapInstance.current?.panTo({ lat: kiosk.geo.lat, lng: kiosk.geo.lng })
    mapInstance.current?.setZoom(15)
  }

  const recenterUser = () => {
    if (!userLoc || !mapInstance.current) return
    mapInstance.current.panTo(userLoc)
    mapInstance.current.setZoom(14)
  }

  // ── Design tokens ──
  const C = {
    bg: isDark ? '#000000' : '#ffffff',
    fg: isDark ? '#ffffff' : '#000000',
    surface: isDark ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.92)',
    surfaceHover: isDark ? '#111111' : '#f4f4f4',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    borderStrong: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.2)',
    muted: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.4)',
    dim: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
    accent: '#ff6b47',
    cardBg: isDark ? '#0a0a0a' : '#ffffff',
    cardBgActive: isDark ? '#1a0e0a' : '#fff5f2',
  }

  const btnBase: React.CSSProperties = {
    fontFamily: "'Space Mono', monospace",
    fontWeight: 700, fontSize: '0.6rem', letterSpacing: '0.18em',
    textTransform: 'uppercase', border: `1px solid ${C.border}`,
    background: C.surface, color: C.fg,
    cursor: 'pointer', transition: 'all 0.15s',
    backdropFilter: 'blur(16px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Space+Mono:wght@400;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow: hidden; width: 100%; height: 100%; }
        ::selection { background: #ff6b47; color: #fff; }
        .hide-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      {/* Noise overlay */}
      <div style={{ position: 'fixed', inset: 0, opacity: 0.035, mixBlendMode: 'difference', zIndex: 999, pointerEvents: 'none' }}>
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter="url(#n)" />
        </svg>
      </div>

      <div style={{
        position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden',
        fontFamily: "'Inter', sans-serif", WebkitFontSmoothing: 'antialiased',
        background: C.bg,
      }}>

        {/* ── Full-screen Map ── */}
        <div ref={mapRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

        {/* ── TOP BAR ── */}
        <div style={{
          position: 'absolute', top: 16, left: 16, right: 16, zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 8,
          pointerEvents: 'none',
        }}>
          {/* Back button */}
          <Link href="/" style={{
            ...btnBase,
            width: 44, height: 44, flexShrink: 0,
            textDecoration: 'none', pointerEvents: 'all',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.fg }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>

          {/* Brand pill */}
          <div style={{
            ...btnBase,
            height: 44, padding: '0 16px', gap: 10,
            pointerEvents: 'all', flexShrink: 0,
          }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.fg }}>
              PRINTIT
            </span>
            <span style={{ width: 1, height: 14, background: C.border }} />
            <span style={{ color: C.muted, fontSize: '0.58rem', letterSpacing: '0.22em' }}>MAP</span>
          </div>

          {/* Search */}
          <div style={{
            flex: 1, height: 44,
            background: C.surface, border: `1px solid ${C.border}`,
            backdropFilter: 'blur(16px)',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0 14px', pointerEvents: 'all',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="square">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="SEARCH KIOSK..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: C.fg,
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, lineHeight: 1, fontSize: 14, padding: 2 }}>
                ×
              </button>
            )}
          </div>

          {/* Count badge */}
          <div style={{ ...btnBase, height: 44, padding: '0 14px', gap: 8, flexShrink: 0, pointerEvents: 'all' }}>
            <span style={{ width: 6, height: 6, background: C.accent, display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ color: C.fg }}>{filteredKiosks.filter(k => k.status === 'ACTIVE').length} Live</span>
          </div>

          {/* Theme toggle */}
          <button onClick={toggleTheme} style={{ ...btnBase, height: 44, padding: '0 14px', pointerEvents: 'all' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderStrong; e.currentTarget.style.color = C.fg }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.fg }}>
            {isDark ? 'Light' : 'Dark'}
          </button>
        </div>

        {/* ── Floating Controls (right side) ── */}
        <div style={{ position: 'absolute', right: 16, bottom: 260, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {userLoc && (
            <button onClick={recenterUser} style={{
              ...btnBase, width: 44, height: 44,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4285F4'; e.currentTarget.style.color = '#4285F4' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.fg }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                <circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
              </svg>
            </button>
          )}
          <button onClick={() => mapInstance.current?.setZoom((mapInstance.current.getZoom() || 10) + 1)}
            style={{ ...btnBase, width: 44, height: 44, borderBottom: 'none' }}>
            <span style={{ fontSize: '1.2rem', lineHeight: 1, fontFamily: 'monospace' }}>+</span>
          </button>
          <button onClick={() => mapInstance.current?.setZoom((mapInstance.current.getZoom() || 10) - 1)}
            style={{ ...btnBase, width: 44, height: 44 }}>
            <span style={{ fontSize: '1.4rem', lineHeight: 1, fontFamily: 'monospace' }}>−</span>
          </button>
        </div>

        {/* ── BOTTOM KIOSK PANEL ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: C.surface,
          borderTop: `1px solid ${C.border}`,
          backdropFilter: 'blur(24px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {/* Panel header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px 12px',
            borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: '0.78rem',
                letterSpacing: '0.1em', textTransform: 'uppercase', color: C.fg,
              }}>Locations</span>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted,
              }}>
                {filteredKiosks.length} Found
              </span>
            </div>
            {/* Decorative line */}
            <div style={{ height: 1, flex: 1, background: C.border, margin: '0 16px' }} />
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 5, height: 5, background: C.accent, display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
              Live Network
            </span>
          </div>

          {/* Card strip */}
          {loading ? (
            <div style={{ display: 'flex', gap: 8, padding: '12px 20px 16px', overflow: 'hidden' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  width: 220, height: 110, flexShrink: 0,
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${C.border}`,
                  animation: 'pulse 1.4s ease-in-out infinite',
                }} />
              ))}
            </div>
          ) : filteredKiosks.length === 0 ? (
            <div style={{
              padding: '32px 20px', textAlign: 'center',
              fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted,
            }}>
              No Kiosks Found
            </div>
          ) : (
            <div
              ref={stripRef}
              className="hide-scroll"
              style={{
                display: 'flex', gap: 8,
                padding: '12px 20px 20px',
                overflowX: 'auto', scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
              }}>
              {filteredKiosks.map(kiosk => {
                const isActive = kiosk.status === 'ACTIVE'
                const isSelected = activeKiosk?._id === kiosk._id
                const kioskUrl = `/?kiosk_id=${kiosk.username}`

                return (
                  <div
                    key={kiosk._id}
                    data-id={kiosk._id}
                    onClick={() => focusKiosk(kiosk)}
                    style={{
                      flexShrink: 0, width: 240,
                      background: isSelected ? C.cardBgActive : C.cardBg,
                      border: `1px solid ${isSelected ? C.accent : C.border}`,
                      padding: '16px',
                      cursor: 'pointer', scrollSnapAlign: 'start',
                      transition: 'all 0.2s ease',
                      display: 'flex', flexDirection: 'column', gap: 12,
                      animation: 'fadeIn 0.3s ease both',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.borderColor = C.border
                    }}
                  >
                    {/* Card top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      {/* Printer icon box */}
                      <div style={{
                        width: 36, height: 36,
                        background: isActive ? 'rgba(255,107,71,0.1)' : C.surfaceHover,
                        border: `1px solid ${isActive ? 'rgba(255,107,71,0.3)' : C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isActive ? C.accent : C.muted,
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
                          <rect x="5" y="2" width="14" height="8" />
                          <path d="M5 10H3v6h2" /><path d="M19 10h2v6h-2" />
                          <rect x="5" y="14" width="14" height="8" />
                        </svg>
                      </div>

                      {/* Status badge */}
                      {isActive ? (
                        <div style={{
                          fontFamily: "'Space Mono', monospace", fontSize: '0.52rem', fontWeight: 700,
                          letterSpacing: '0.18em', textTransform: 'uppercase',
                          color: C.accent, border: `1px solid ${C.accent}`,
                          padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          <span style={{ width: 4, height: 4, background: C.accent, display: 'inline-block', borderRadius: '50%', animation: 'pulse 2s ease-in-out infinite' }} />
                          Live
                        </div>
                      ) : (
                        <div style={{
                          fontFamily: "'Space Mono', monospace", fontSize: '0.52rem', fontWeight: 700,
                          letterSpacing: '0.18em', textTransform: 'uppercase',
                          color: C.muted, border: `1px solid ${C.border}`,
                          padding: '3px 8px',
                        }}>
                          Offline
                        </div>
                      )}
                    </div>

                    {/* Name + location */}
                    <div>
                      <div style={{
                        fontFamily: "'Inter', sans-serif", fontWeight: 900,
                        fontSize: '0.82rem', letterSpacing: '-0.01em', textTransform: 'uppercase',
                        color: C.fg, marginBottom: 4,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {kiosk.username}
                      </div>
                      <div style={{
                        fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700,
                        letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {kiosk.locationName || kiosk.address}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${kiosk.geo.lat},${kiosk.geo.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{
                          flex: 1, height: 32,
                          fontFamily: "'Space Mono', monospace", fontSize: '0.52rem', fontWeight: 700,
                          letterSpacing: '0.14em', textTransform: 'uppercase',
                          border: `1px solid ${C.border}`, background: 'transparent',
                          color: C.muted, textDecoration: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#4285F4'; e.currentTarget.style.color = '#4285F4' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        Dir
                      </a>
                      <a
                        href={kioskUrl}
                        onClick={e => e.stopPropagation()}
                        style={{
                          flex: 1, height: 32,
                          fontFamily: "'Space Mono', monospace", fontSize: '0.52rem', fontWeight: 700,
                          letterSpacing: '0.14em', textTransform: 'uppercase',
                          border: `1px solid ${isActive ? C.accent : C.border}`,
                          background: isActive ? C.accent : 'transparent',
                          color: isActive ? '#fff' : C.muted, textDecoration: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: isActive ? 'pointer' : 'not-allowed',
                          transition: 'all 0.15s',
                          pointerEvents: isActive ? 'all' : 'none',
                          opacity: isActive ? 1 : 0.4,
                        }}
                        onMouseEnter={e => { if (isActive) { e.currentTarget.style.background = '#e05c3a'; e.currentTarget.style.borderColor = '#e05c3a' } }}
                        onMouseLeave={e => { if (isActive) { e.currentTarget.style.background = C.accent; e.currentTarget.style.borderColor = C.accent } }}>
                        Connect
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </>
  )
}