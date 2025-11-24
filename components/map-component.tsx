"use client"

import { useEffect, useRef } from "react"
import type { Cafe } from "@/app/page"

// Fix for default marker icons in Leaflet
const initializeLeaflet = async () => {
  // @ts-ignore
  const L = (await import("leaflet")).default

  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  })

  return L
}

interface MapComponentProps {
  userLocation: [number, number] | null
  cafes: Cafe[]
  selectedCafe: Cafe | null
  onCafeSelect: (cafe: Cafe | null) => void
}

export default function MapComponent({ userLocation, cafes, selectedCafe, onCafeSelect }: MapComponentProps) {
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const userMarkerRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)

  // Initialize map
  useEffect(() => {
    let mounted = true

    const setupMap = async () => {
      if (mapRef.current) return

      const L = await initializeLeaflet()
      leafletRef.current = L

      // Load Leaflet CSS dynamically
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }

      if (!mounted) return

      const map = L.map("map", {
        center: [37.7749, -122.4194], // Default to San Francisco
        zoom: 13,
        zoomControl: true,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
    }

    setupMap()

    return () => {
      mounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current || !userLocation || !leafletRef.current) return

    const L = leafletRef.current

    // Remove old user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
    }

    // Create custom user location icon
    const userIcon = L.divIcon({
      className: "user-location-marker",
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

    // Add new user marker
    const marker = L.marker(userLocation, { icon: userIcon }).addTo(mapRef.current).bindPopup("You are here")

    userMarkerRef.current = marker

    // Pan to user location
    mapRef.current.setView(userLocation, 13)
  }, [userLocation])

  // Update cafe markers
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return

    const L = leafletRef.current

    // Remove old markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Create custom cafe icon
    const cafeIcon = L.divIcon({
      className: "cafe-marker",
      html: `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: #8b5cf6;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
            <line x1="6" y1="1" x2="6" y2="4"></line>
            <line x1="10" y1="1" x2="10" y2="4"></line>
            <line x1="14" y1="1" x2="14" y2="4"></line>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    })

    // Add new markers
    cafes.forEach((cafe) => {
      if (!cafe.lat || !cafe.lon) return

      const marker = L.marker([cafe.lat, cafe.lon], { icon: cafeIcon })
        .addTo(mapRef.current!)
        .bindPopup(cafe.name)
        .on("click", () => {
          onCafeSelect(cafe)
        })

      markersRef.current.push(marker)
    })
  }, [cafes, onCafeSelect])

  // Highlight selected cafe
  useEffect(() => {
    if (!mapRef.current || !selectedCafe) return

    mapRef.current.setView([selectedCafe.lat, selectedCafe.lon], 15)
  }, [selectedCafe])

  return <div id="map" className="h-full w-full" />
}
