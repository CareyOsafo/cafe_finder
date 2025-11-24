"use client"

import { useEffect, useRef } from "react"
import type { Place } from "@/app/page"

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
  places: Place[]
  selectedPlace: Place | null
  onPlaceSelect: (place: Place | null) => void
}

export default function MapComponent({ userLocation, places, selectedPlace, onPlaceSelect }: MapComponentProps) {
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
        center: [5.6037, -0.187], // Default to Accra, Ghana
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

  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return

    const L = leafletRef.current

    // Remove old markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    const createPlaceIcon = (type: Place["type"]) => {
      let color = "#8b5cf6"
      let icon = ""

      switch (type) {
        case "tourist_attraction":
          color = "#3b82f6"
          icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>`
          break
        case "restaurant":
          color = "#ef4444"
          icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"></path>
            <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"></path>
            <path d="m2.1 21.8 6.4-6.3"></path>
            <path d="m19 5-7 7"></path>
          </svg>`
          break
        case "attraction":
          color = "#10b981"
          icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
            <circle cx="12" cy="13" r="3"></circle>
          </svg>`
          break
        case "nightclub":
          color = "#8b5cf6"
          icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>`
          break
        case "pub":
          color = "#f59e0b"
          icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M17 11h1a3 3 0 0 1 0 6h-1"></path>
            <path d="M9 12v6"></path>
            <path d="M13 12v6"></path>
            <path d="M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.5-.5 2.5-.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z"></path>
            <path d="M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"></path>
          </svg>`
          break
      }

      return L.divIcon({
        className: "place-marker",
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            background: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1);
            cursor: pointer;
            transition: transform 0.2s;
          ">
            ${icon}
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      })
    }

    // Add new markers
    places.forEach((place) => {
      if (!place.lat || !place.lon) return

      const marker = L.marker([place.lat, place.lon], { icon: createPlaceIcon(place.type) })
        .addTo(mapRef.current!)
        .bindPopup(place.name)
        .on("click", () => {
          onPlaceSelect(place)
        })

      markersRef.current.push(marker)
    })
  }, [places, onPlaceSelect])

  // Highlight selected place
  useEffect(() => {
    if (!mapRef.current || !selectedPlace) return

    mapRef.current.setView([selectedPlace.lat, selectedPlace.lon], 15)
  }, [selectedPlace])

  return <div id="map" className="h-full w-full" />
}
