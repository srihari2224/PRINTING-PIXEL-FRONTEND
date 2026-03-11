"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import styles from './MapPage.module.css'

interface Kiosk {
  _id: string
  kioskId: string
  username: string
  locationName: string
  address: string
  geo: { lat: number; lng: number }
  status: 'PENDING' | 'ACTIVE' | 'BLOCKED'
}

const LIGHT_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f8f9fa' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#444444' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e8eaed' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f0f0f0' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#dde1e7' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c8ddf0' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6497b1' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d0d5dd' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f2f4f7' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e8f4e8' }] },
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

// Professional printer marker SVG URL
function printerMarker(active: boolean) {
  const bg = active ? '#22c55e' : '#94a3b8'
  const shadow = active ? 'rgba(34,197,94,0.4)' : 'rgba(0,0,0,0.2)'
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="52" height="62" viewBox="0 0 52 62">
      <filter id="sh"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="${shadow}"/></filter>
      <ellipse cx="26" cy="58" rx="8" ry="3" fill="rgba(0,0,0,0.15)"/>
      <path d="M26 2C16 2 8 10 8 20c0 13 18 40 18 40s18-27 18-40C44 10 36 2 26 2z" fill="${bg}" filter="url(#sh)"/>
      <circle cx="26" cy="20" r="13" fill="white"/>
      <rect x="19" y="14" width="14" height="2" rx="1" fill="${bg}"/>
      <rect x="17" y="17" width="18" height="10" rx="2" fill="${bg}" opacity="0.15"/>
      <rect x="17" y="17" width="18" height="10" rx="2" stroke="${bg}" stroke-width="1.5" fill="none"/>
      <rect x="18" y="23" width="6" height="6" rx="1" fill="${bg}"/>
      <circle cx="32" cy="21.5" r="1.5" fill="${bg}"/>
    </svg>
  `)}`
}

// User location marker
function userMarker() {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="12" fill="#4285F4" stroke="white" stroke-width="3"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>
  `)}`
}

export default function MapPage() {
  const [kiosks, setKiosks] = useState<Kiosk[]>([])
  const [activeKiosk, setActiveKiosk] = useState<Kiosk | null>(null)
  const [loading, setLoading] = useState(true)
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const userMarkerRef = useRef<google.maps.Marker | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  // Fetch kiosks
  useEffect(() => { fetchKiosks() }, [])

  // Get user location
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )
  }, [])

  // Init map
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
        styles: LIGHT_MAP_STYLES,
        gestureHandling: 'greedy',
      })
      mapInstance.current = map
      setMapReady(true)
    }).catch(console.error)
  }, [])

  // Place user location marker
  useEffect(() => {
    if (!mapInstance.current || !userLoc) return
    userMarkerRef.current?.setMap(null)
    userMarkerRef.current = new google.maps.Marker({
      position: userLoc,
      map: mapInstance.current,
      icon: { url: userMarker(), scaledSize: new google.maps.Size(28, 28), anchor: new google.maps.Point(14, 14) },
      zIndex: 1000,
      title: 'Your location',
    })
    if (kiosks.length === 0) {
      mapInstance.current.panTo(userLoc)
      mapInstance.current.setZoom(13)
    }
  }, [userLoc, mapReady])

  // Place kiosk markers
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
          url: printerMarker(isActive),
          scaledSize: new google.maps.Size(52, 62),
          anchor: new google.maps.Point(26, 62),
        },
        zIndex: 10 + idx,
      })
      marker.addListener('click', () => {
        setActiveKiosk(kiosk)
        mapInstance.current?.panTo({ lat: kiosk.geo.lat, lng: kiosk.geo.lng })
        mapInstance.current?.setZoom(15)
        // scroll strip card into view
        const cardEl = stripRef.current?.querySelector(`[data-id="${kiosk._id}"]`)
        cardEl?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      })
      markersRef.current.push(marker)
    })

    // Fit map to markers
    if (kiosks.length > 0 && !userLoc) {
      const bounds = new google.maps.LatLngBounds()
      kiosks.forEach(k => bounds.extend({ lat: k.geo.lat, lng: k.geo.lng }))
      mapInstance.current?.fitBounds(bounds, { top: 80, right: 20, bottom: 200, left: 20 })
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

  const activeKiosks = kiosks.filter(k => k.status === 'ACTIVE')
  const totalKiosks = kiosks.length

  return (
    <div className={styles.page}>
      {/* ── Full-screen map ── */}
      <div ref={mapRef} className={styles.map} />

      {/* ── Top floating bar ── */}
      <div className={styles.topBar}>
        <Link href="/" className={styles.backBtn} aria-label="Back to home">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        <div className={styles.titleCard}>
          <span className={styles.titleLogo}>PRINTIT</span>
          <span className={styles.titleSub}>Kiosk Locator</span>
        </div>

        <div className={styles.statsRow}>
          <span className={styles.statBadge}>{activeKiosks.length} Active</span>
        </div>
      </div>

      {/* ── Re-center button ── */}
      {userLoc && (
        <button className={styles.locBtn} onClick={recenterUser} aria-label="Center on my location">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/><path d="M12 1v2M12 21v2M1 12h2M21 12h2" opacity="0.4"/>
          </svg>
        </button>
      )}

      {/* ── Zoom controls ── */}
      <div className={styles.zoomControls}>
        <button className={styles.zoomBtn} onClick={() => mapInstance.current?.setZoom((mapInstance.current.getZoom() || 10) + 1)} aria-label="Zoom in">+</button>
        <div className={styles.zoomDivider} />
        <button className={styles.zoomBtn} onClick={() => mapInstance.current?.setZoom((mapInstance.current.getZoom() || 10) - 1)} aria-label="Zoom out">−</button>
      </div>

      {/* ── Bottom kiosk strip ── */}
      <div className={styles.bottomStrip}>
        <div className={styles.stripHeader}>
          <span className={styles.stripTitle}>Nearby Kiosks</span>
          <span className={styles.stripCount}>{totalKiosks} locations</span>
        </div>

        {loading ? (
          <div className={styles.loadingStrip}>
            <div className={styles.loadCard} /><div className={styles.loadCard} /><div className={styles.loadCard} />
          </div>
        ) : kiosks.length === 0 ? (
          <div className={styles.emptyStrip}>No kiosks found in this area</div>
        ) : (
          <div className={styles.cardStrip} ref={stripRef}>
            {kiosks.map(kiosk => {
              const isActive = kiosk.status === 'ACTIVE'
              const isSelected = activeKiosk?._id === kiosk._id
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${kiosk.geo.lat},${kiosk.geo.lng}`
              const kioskUrl = `https://pixel-livid-two.vercel.app/?kiosk_id=${kiosk.username}`
              return (
                <div
                  key={kiosk._id}
                  data-id={kiosk._id}
                  className={`${styles.kioskCard} ${isSelected ? styles.kioskCardActive : ''}`}
                  onClick={() => focusKiosk(kiosk)}
                >
                  {/* Printer icon header */}
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconBox} style={{ background: isActive ? '#dcfce7' : '#f1f5f9' }}>
                      {/* Professional printer SVG */}
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="5" y="2" width="14" height="8" rx="1" stroke={isActive ? '#22c55e' : '#94a3b8'} strokeWidth="1.8" fill="none"/>
                        <path d="M5 10H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" stroke={isActive ? '#22c55e' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round"/>
                        <path d="M19 10h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2" stroke={isActive ? '#22c55e' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round"/>
                        <rect x="5" y="14" width="14" height="8" rx="1" stroke={isActive ? '#22c55e' : '#94a3b8'} strokeWidth="1.8" fill="none"/>
                        <circle cx="19" cy="13" r="1" fill={isActive ? '#22c55e' : '#94a3b8'}/>
                        <line x1="8" y1="17" x2="16" y2="17" stroke={isActive ? '#22c55e' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round"/>
                        <line x1="8" y1="19" x2="13" y2="19" stroke={isActive ? '#22c55e' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className={styles.statusDot} style={{ background: isActive ? '#22c55e' : '#94a3b8' }} />
                  </div>

                  <div className={styles.cardName}>{kiosk.username}</div>
                  <div className={styles.cardAddr}>{kiosk.locationName || kiosk.address}</div>

                  <div className={styles.cardBtns}>
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                      className={styles.dirBtnSmall} onClick={e => e.stopPropagation()}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                      </svg>
                      Directions
                    </a>
                    <a href={kioskUrl} className={styles.printBtnSmall} onClick={e => e.stopPropagation()}>
                      Print →
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}