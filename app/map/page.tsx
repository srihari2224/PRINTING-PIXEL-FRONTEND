"use client"

import { useState, useEffect, useRef } from 'react'
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

export default function MapPage() {
  const [kiosks, setKiosks] = useState<Kiosk[]>([])
  const [selectedKiosk, setSelectedKiosk] = useState<Kiosk | null>(null)
  const [hoveredKiosk, setHoveredKiosk] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    fetchKiosks()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && !mapInstanceRef.current) {
      initMap()
    }
  }, [])

  useEffect(() => {
    if (mapInstanceRef.current && kiosks.length > 0) {
      updateMarkers()
    }
  }, [kiosks])

  const initMap = () => {
    const linkElement = document.createElement('link')
    linkElement.rel = 'stylesheet'
    linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(linkElement)

    const scriptElement = document.createElement('script')
    scriptElement.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    scriptElement.onload = () => {
      if (mapRef.current && (window as any).L) {
        const L = (window as any).L
        const map = L.map(mapRef.current).setView([13.198486, 75.031437], 6)
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map)
        
        mapInstanceRef.current = map
      }
    }
    document.body.appendChild(scriptElement)
  }

  const updateMarkers = () => {
    if (!mapInstanceRef.current || typeof window === 'undefined') return
    
    const L = (window as any).L
    if (!L) return

    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    kiosks.forEach(kiosk => {
      const iconColor = kiosk.status === 'ACTIVE' ? '#4caf50' : '#999999'
      
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: 40px;
            height: 40px;
            background: ${iconColor};
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">🖨️</div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })

      const marker = L.marker([kiosk.geo.lat, kiosk.geo.lng], { icon: customIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="font-family: Arial, sans-serif; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${kiosk.username}</h3>
            <p style="margin: 4px 0; font-size: 14px; font-weight: 500;">${kiosk.locationName}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #666;">${kiosk.address}</p>
            <div style="margin: 8px 0;">
              <span style="
                display: inline-block;
                padding: 4px 12px;
                background: ${iconColor}20;
                color: ${iconColor};
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
              ">${kiosk.status}</span>
            </div>
            <button onclick="window.open('https://pixel-livid-two.vercel.app/${kiosk.username}', '_blank')" style="
              width: 100%;
              margin-top: 12px;
              padding: 8px 16px;
              background: #4caf50;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
            ">Visit Kiosk →</button>
          </div>
        `)

      marker.on('click', () => {
        setSelectedKiosk(kiosk)
      })

      markersRef.current.push(marker)
    })
  }

  const fetchKiosks = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kiosks`)
      const data = await response.json()
      console.log('Fetched kiosks:', data)
      setKiosks(data.kiosks || [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch kiosks:', error)
      setLoading(false)
    }
  }

  const filteredKiosks = kiosks.filter(kiosk =>
    kiosk.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kiosk.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kiosk.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleKioskClick = (kiosk: Kiosk) => {
    setSelectedKiosk(kiosk)
    
    if (mapInstanceRef.current && typeof window !== 'undefined') {
      const L = (window as any).L
      if (L) {
        mapInstanceRef.current.setView([kiosk.geo.lat, kiosk.geo.lng], 15)
        
        markersRef.current.forEach(marker => {
          const markerLatLng = marker.getLatLng()
          if (markerLatLng.lat === kiosk.geo.lat && markerLatLng.lng === kiosk.geo.lng) {
            marker.openPopup()
          }
        })
      }
    }
  }

  const handleNavigateToKiosk = (username: string) => {
    window.open(`https://pixel-livid-two.vercel.app/${username}`, '_blank')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#4caf50'
      case 'PENDING': return '#ff9800'
      case 'BLOCKED': return '#f44336'
      default: return '#999999'
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.logo}>
            <span className={styles.logoGreen}>Q</span>
            <span className={styles.logoBlack}>wikprint</span>
          </h1>
          <p className={styles.subtitle}>Print Kiosk Locations</p>
        </div>

        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search kiosks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <span className={styles.searchIcon}>🔍</span>
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
            <div className={styles.loading}>Loading kiosks...</div>
          ) : filteredKiosks.length === 0 ? (
            <div className={styles.noResults}>No kiosks found</div>
          ) : (
            filteredKiosks.map((kiosk) => (
              <div
                key={kiosk._id}
                className={`${styles.kioskCard} ${selectedKiosk?._id === kiosk._id ? styles.selected : ''} ${hoveredKiosk === kiosk._id ? styles.hovered : ''}`}
                onClick={() => handleKioskClick(kiosk)}
                onMouseEnter={() => setHoveredKiosk(kiosk._id)}
                onMouseLeave={() => setHoveredKiosk(null)}
              >
                <div className={styles.kioskCardHeader}>
                  <div className={styles.kioskIcon}>🖨️</div>
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
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNavigateToKiosk(kiosk.username)
                  }}
                >
                  Visit Kiosk →
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div 
        id="map" 
        ref={mapRef} 
        className={styles.mapContainer}
        style={{ height: '100vh', width: '100%' }}
      />
    </div>
  )
}