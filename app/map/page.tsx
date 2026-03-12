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

// Minimal printer marker SVG
function printerMarker(active: boolean) {
  const bg = active ? '#ff6b47' : '#555555' 
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="52" height="62" viewBox="0 0 52 62">
      <path d="M26 2C16 2 8 10 8 20c0 13 18 40 18 40s18-27 18-40C44 10 36 2 26 2z" fill="${bg}" stroke="white" stroke-width="2"/>
      <circle cx="26" cy="20" r="8" fill="white"/>
    </svg>
  `)}`
}

function userMarker() {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="12" fill="#000" stroke="white" stroke-width="3"/>
      <circle cx="14" cy="14" r="4" fill="white"/>
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

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const userMarkerRef = useRef<google.maps.Marker | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  // ── Theme ──
  useEffect(() => {
    const saved = localStorage.getItem('pp-theme')
    const dark = saved !== 'light'
    setIsDark(dark)
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('pp-theme', next ? 'dark' : 'light')
    document.body.setAttribute('data-theme', next ? 'dark' : 'light')
  }

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

  // filter kiosks
  const filteredKiosks = kiosks.filter(k => 
    k.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    k.kioskId?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        const cardEl = stripRef.current?.querySelector(`[data-id="${kiosk._id}"]`)
        cardEl?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      })
      markersRef.current.push(marker)
    })

    if (kiosks.length > 0 && !userLoc) {
      const bounds = new google.maps.LatLngBounds()
      kiosks.forEach(k => bounds.extend({ lat: k.geo.lat, lng: k.geo.lng }))
      mapInstance.current?.fitBounds(bounds, { top: 120, right: 20, bottom: 250, left: 20 })
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

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden font-[Inter] bg-[#f4f4f4]">
      
      {/* ── Background Map ── */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />

      {/* ── Top Bar Container ── */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col md:flex-row gap-4 pointer-events-none">
        
        {/* Header / Brand */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link href="/" className="flex items-center justify-center w-12 h-12 bg-black border border-white/20 text-white" style={{ background: isDark ? '#000' : '#fff', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#e5e5e5' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="flex items-center justify-between px-4 h-12 flex-1 md:flex-none min-w-[200px]" style={{ background: isDark ? '#000' : '#fff', color: isDark ? '#fff' : '#000', border: `1px solid ${isDark ? '#333' : '#e5e5e5'}` }}>
            <span className="font-black tracking-[0.08em] uppercase text-sm">PRINTIT</span>
            <span className="font-mono text-[0.6rem] font-bold tracking-widest opacity-50 uppercase">MAP</span>
          </div>
        </div>

        {/* Search Bar & Actions */}
        <div className="flex items-center gap-3 flex-1 pointer-events-auto">
          <div className="flex-1 flex items-center px-4 h-12" style={{ background: isDark ? '#000' : '#fff', border: `1px solid ${isDark ? '#333' : '#e5e5e5'}` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#888' : '#aaa'} strokeWidth="2" strokeLinecap="square">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              type="text" 
              placeholder="SEARCH KIOSK ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none font-mono text-[0.7rem] ml-3 font-bold uppercase tracking-wider"
              style={{ color: isDark ? '#fff' : '#000' }}
            />
          </div>
          <button onClick={toggleTheme} className="h-12 px-4 font-bold text-[0.6rem] uppercase tracking-widest whitespace-nowrap hidden md:flex items-center justify-center transition-colors" style={{ background: isDark ? '#000' : '#fff', color: isDark ? '#fff' : '#000', border: `1px solid ${isDark ? '#333' : '#e5e5e5'}` }}>
            {isDark ? 'Light' : 'Dark'}
          </button>
        </div>

      </div>

      {/* ── Floating Controls ── */}
      <div className="absolute right-4 bottom-48 flex flex-col gap-3 z-10">
        {userLoc && (
          <button onClick={recenterUser} className="w-12 h-12 flex items-center justify-center border transition-transform active:scale-95 shadow-lg" style={{ background: isDark ? '#000' : '#fff', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#e5e5e5' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
            </svg>
          </button>
        )}
        <div className="flex flex-col border shadow-lg" style={{ background: isDark ? '#000' : '#fff', borderColor: isDark ? '#333' : '#e5e5e5' }}>
          <button onClick={() => mapInstance.current?.setZoom((mapInstance.current.getZoom() || 10) + 1)} className="w-12 h-12 flex items-center justify-center pb-1 text-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5 border-b" style={{ color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#e5e5e5' }}>
            +
          </button>
          <button onClick={() => mapInstance.current?.setZoom((mapInstance.current.getZoom() || 10) - 1)} className="w-12 h-12 flex items-center justify-center pb-1 text-2xl transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ color: isDark ? '#fff' : '#000' }}>
            -
          </button>
        </div>
      </div>

      {/* ── Bottom Kiosk Strip ── */}
      <div className="absolute bottom-0 left-0 w-full z-20 pb-4 pt-4 border-t" style={{ background: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderColor: isDark ? '#333' : '#e5e5e5' }}>
        <div className="flex items-center justify-between px-6 mb-4">
          <span className="font-black uppercase tracking-[0.1em] text-[0.85rem]" style={{ color: isDark ? '#fff' : '#000' }}>
            Nearby Locations
          </span>
          <span className="font-mono text-[0.65rem] opacity-50 uppercase tracking-widest font-bold" style={{ color: isDark ? '#fff' : '#000' }}>
            {filteredKiosks.length} Found
          </span>
        </div>

        {loading ? (
          <div className="flex gap-4 px-6 overflow-x-hidden">
            {[1, 2, 3].map(i => <div key={i} className="w-[240px] h-[120px] bg-black/5 dark:bg-white/5 animate-pulse shrink-0 border" style={{ borderColor: isDark ? '#333' : '#e5e5e5' }} />)}
          </div>
        ) : filteredKiosks.length === 0 ? (
          <div className="px-6 py-8 text-center font-mono text-sm opacity-50 uppercase font-bold tracking-widest" style={{ color: isDark ? '#fff' : '#000' }}>
            No Kiosks Found
          </div>
        ) : (
          <div className="flex gap-4 px-6 overflow-x-auto pb-2 snap-x snap-mandatory hide-scroll" ref={stripRef}>
            {filteredKiosks.map(kiosk => {
              const isActive = kiosk.status === 'ACTIVE'
              const isSelected = activeKiosk?._id === kiosk._id
              const kioskUrl = `/?kiosk_id=${kiosk.username}`

              return (
                <div
                  key={kiosk._id}
                  data-id={kiosk._id}
                  onClick={() => focusKiosk(kiosk)}
                  className="shrink-0 w-[260px] p-5 cursor-pointer flex flex-col justify-between border snap-start transition-all duration-200 group"
                  style={{ 
                    background: isSelected 
                      ? (isDark ? '#222' : '#f0f0f0') 
                      : (isDark ? '#080808' : '#fff'),
                    borderColor: isSelected 
                      ? '#ff6b47' 
                      : (isDark ? '#333' : '#e5e5e5')
                  }}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-10 h-10 flex items-center justify-center border" style={{ borderColor: isDark ? '#333' : '#e5e5e5', background: isDark ? '#111' : '#f9f9f9', color: isDark ? '#fff' : '#000' }}>
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="5" y="2" width="14" height="8" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                          <path d="M5 10H3v6h2" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                          <path d="M19 10h2v6h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                          <rect x="5" y="14" width="14" height="8" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                        </svg>
                    </div>
                    {isActive ? (
                      <span className="font-mono text-[0.55rem] font-bold text-[#ff6b47] uppercase tracking-widest flex items-center gap-1.5 border px-2 py-1" style={{ borderColor: '#ff6b47' }}>
                        <span className="w-1.5 h-1.5 bg-[#ff6b47] inline-block animate-pulse" /> Live
                      </span>
                    ) : (
                      <span className="font-mono text-[0.55rem] font-bold opacity-50 uppercase tracking-widest border px-2 py-1" style={{ borderColor: isDark ? '#333' : '#e5e5e5', color: isDark ? '#fff' : '#000' }}>
                        Offline
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-black uppercase text-sm tracking-widest truncate mb-1" style={{ color: isDark ? '#fff' : '#000' }}>
                      {kiosk.username}
                    </h3>
                    <p className="font-mono text-[0.6rem] font-bold opacity-50 truncate uppercase" style={{ color: isDark ? '#fff' : '#000' }}>
                      {kiosk.locationName || kiosk.address}
                    </p>
                  </div>

                  <a href={kioskUrl} className="mt-5 w-full flex items-center justify-center border font-bold text-[0.65rem] uppercase tracking-widest py-3 transition-colors hover:bg-[#ff6b47] hover:text-black hover:border-[#ff6b47]" style={{ borderColor: isDark ? '#333' : '#e5e5e5', color: isDark ? '#fff' : '#000' }}>
                    Connect
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style jsx global>{`
        .hide-scroll::-webkit-scrollbar {
          display: none;
        }
        .hide-scroll {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>
    </div>
  )
}