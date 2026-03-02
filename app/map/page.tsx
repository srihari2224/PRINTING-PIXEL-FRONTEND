"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './MapPage.module.css'

interface Kiosk {
  _id: string
  kioskId: string
  username: string
  locationName: string
  address: string
  geo: {
    lat: number
    lng: number
  }
  status: 'PENDING' | 'ACTIVE' | 'BLOCKED'
}

/* ── Load Google Maps JS SDK once ── */
function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.maps) return resolve()
    if (document.getElementById('gmap-script')) {
      // Script already injected, wait for it
      const poll = setInterval(() => {
        if ((window as any).google?.maps) { clearInterval(poll); resolve() }
      }, 100)
      return
    }
    const script = document.createElement('script')
    script.id = 'gmap-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })
}

export default function MapPage() {
  const [kiosks, setKiosks] = useState<Kiosk[]>([])
  const [selectedKiosk, setSelectedKiosk] = useState<Kiosk | null>(null)
  const [hoveredKiosk, setHoveredKiosk] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  /* ── Fetch kiosks ── */
  useEffect(() => {
    fetchKiosks()
  }, [])

  /* ── Initialise map once the container mounts ── */
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!apiKey || !mapRef.current) return

    loadGoogleMaps(apiKey).then(() => {
      if (!mapRef.current || mapInstance.current) return

      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 14.4426, lng: 79.9865 }, // South India
        zoom: 6,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#aaaaaa' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#111111' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#333333' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0d1a' }] },
          { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#333355' }] },
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
          { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#666666' }] },
          { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#888888' }] },
        ],
      })

      infoWindowRef.current = new google.maps.InfoWindow()
      mapInstance.current = map
    }).catch(console.error)
  }, [])

  /* ── Add / refresh markers whenever kiosks load ── */
  useEffect(() => {
    if (!mapInstance.current || kiosks.length === 0) return
    placeMarkers()
  }, [kiosks, mapInstance.current])

  /* ── Place Google Maps markers ── */
  const placeMarkers = useCallback(() => {
    if (!mapInstance.current) return

    // Remove old markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    kiosks.forEach(kiosk => {
      const isActive = kiosk.status === 'ACTIVE'
      const colour = isActive ? '#ff6b47' : '#666666'

      const markerDiv = document.createElement('div')
      markerDiv.style.cssText = `
        width: 44px; height: 44px;
        background: ${colour};
        border: 3px solid #ffffff;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 3px 10px rgba(0,0,0,0.5);
        cursor: pointer;
      `
      markerDiv.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
             stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>`

      const marker = new google.maps.Marker({
        position: { lat: kiosk.geo.lat, lng: kiosk.geo.lng },
        map: mapInstance.current!,
        title: kiosk.locationName,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="20" fill="${colour}" stroke="white" stroke-width="3"/>
              <polyline points="15 21 15 14 29 14 29 21"
                stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M15 30H13a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-2"
                stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <rect x="15" y="26" width="14" height="10" rx="1"
                stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`)}`,
          scaledSize: new google.maps.Size(44, 44),
          anchor: new google.maps.Point(22, 22),
        },
      })

      const infoContent = `
        <div style="
          font-family: 'Inter', Arial, sans-serif;
          min-width: 210px;
          padding: 4px 2px;
          color: #111111;
        ">
          <h3 style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0a0a0a;">${kiosk.username}</h3>
          <p style="margin:2px 0;font-size:13px;font-weight:500;color:#333;">${kiosk.locationName}</p>
          <p style="margin:2px 0 8px;font-size:12px;color:#666;">${kiosk.address}</p>
          <span style="
            display:inline-block;padding:3px 10px;
            background:${colour}22;color:${colour};
            border-radius:10px;font-size:11px;font-weight:700;
            margin-bottom:10px;
          ">${kiosk.status}</span>
          <br/>
          <button onclick="window.open('https://pixel-livid-two.vercel.app/${kiosk.username}','_blank')"
            style="
              width:100%;padding:8px;margin-top:4px;
              background:#ff6b47;color:white;border:none;
              border-radius:4px;font-size:13px;font-weight:700;
              cursor:pointer;
            ">Visit Kiosk →</button>
        </div>`

      marker.addListener('click', () => {
        infoWindowRef.current?.setContent(infoContent)
        infoWindowRef.current?.open(mapInstance.current, marker)
        setSelectedKiosk(kiosk)
      })

      markersRef.current.push(marker)
    })
  }, [kiosks])

  const fetchKiosks = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kiosks`)
      const data = await res.json()
      setKiosks(data.kiosks || [])
    } catch (e) {
      console.error('Failed to fetch kiosks:', e)
    } finally {
      setLoading(false)
    }
  }

  const filteredKiosks = kiosks.filter(k =>
    k.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleKioskClick = (kiosk: Kiosk) => {
    setSelectedKiosk(kiosk)
    if (!mapInstance.current) return

    mapInstance.current.panTo({ lat: kiosk.geo.lat, lng: kiosk.geo.lng })
    mapInstance.current.setZoom(15)

    // find and open its info window
    const idx = kiosks.findIndex(k => k._id === kiosk._id)
    if (idx !== -1 && markersRef.current[idx]) {
      const marker = markersRef.current[idx]
      const colour = kiosk.status === 'ACTIVE' ? '#ff6b47' : '#666666'
      const infoContent = `
        <div style="font-family:'Inter',Arial,sans-serif;min-width:210px;padding:4px 2px;color:#111;">
          <h3 style="margin:0 0 4px;font-size:15px;font-weight:700;">${kiosk.username}</h3>
          <p style="margin:2px 0;font-size:13px;font-weight:500;color:#333;">${kiosk.locationName}</p>
          <p style="margin:2px 0 8px;font-size:12px;color:#666;">${kiosk.address}</p>
          <span style="display:inline-block;padding:3px 10px;background:${colour}22;color:${colour};border-radius:10px;font-size:11px;font-weight:700;margin-bottom:10px;">${kiosk.status}</span><br/>
          <button onclick="window.open('https://pixel-livid-two.vercel.app/${kiosk.username}','_blank')"
            style="width:100%;padding:8px;margin-top:4px;background:#ff6b47;color:white;border:none;border-radius:4px;font-size:13px;font-weight:700;cursor:pointer;">Visit Kiosk →</button>
        </div>`
      infoWindowRef.current?.setContent(infoContent)
      infoWindowRef.current?.open(mapInstance.current, marker)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#ff6b47'
      case 'PENDING': return '#f0b429'
      case 'BLOCKED': return '#e53e3e'
      default: return '#666666'
    }
  }

  /* ── JSX ── */
  return (
    <div className={styles.container}>
      {/* ── Sidebar ── */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.logo}>
            <span className={styles.logoAccent}>PRINT</span>
            <span className={styles.logoBlack}>IT</span>
          </h1>
          <p className={styles.subtitle}>Self-Service Print Kiosk Locations</p>
        </div>

        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search kiosks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <div className={styles.statValue}>{kiosks.filter(k => k.status === 'ACTIVE').length}</div>
            <div className={styles.statLabel}>Active</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>{kiosks.filter(k => k.status === 'PENDING').length}</div>
            <div className={styles.statLabel}>Pending</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>{kiosks.length}</div>
            <div className={styles.statLabel}>Total</div>
          </div>
        </div>

        <div className={styles.kioskList}>
          {loading ? (
            <div className={styles.loading}>Loading kiosks…</div>
          ) : filteredKiosks.length === 0 ? (
            <div className={styles.noResults}>No kiosks found</div>
          ) : (
            filteredKiosks.map(kiosk => (
              <div
                key={kiosk._id}
                className={`${styles.kioskCard} ${selectedKiosk?._id === kiosk._id ? styles.selected : ''} ${hoveredKiosk === kiosk._id ? styles.hovered : ''}`}
                onClick={() => handleKioskClick(kiosk)}
                onMouseEnter={() => setHoveredKiosk(kiosk._id)}
                onMouseLeave={() => setHoveredKiosk(null)}
              >
                <div className={styles.kioskCardHeader}>
                  <div className={styles.kioskIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                  </div>
                  <div className={styles.kioskInfo}>
                    <h3 className={styles.kioskName}>{kiosk.username}</h3>
                    <p className={styles.kioskLocation}>{kiosk.locationName}</p>
                  </div>
                  <div
                    className={styles.statusDot}
                    style={{ backgroundColor: getStatusColor(kiosk.status) }}
                  />
                </div>
                <p className={styles.kioskAddress}>{kiosk.address}</p>
                <button
                  className={styles.visitButton}
                  onClick={e => { e.stopPropagation(); window.open(`https://pixel-livid-two.vercel.app/${kiosk.username}`, '_blank') }}
                >
                  Visit Kiosk →
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Google Map ── */}
      <div
        ref={mapRef}
        id="google-map"
        className={styles.mapContainer}
      />
    </div>
  )
}