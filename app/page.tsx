"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Coffee, MapPin, Navigation, Search, Loader2 } from "lucide-react"
import PWAInstaller from "@/components/pwa-installer"

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full flex items-center justify-center bg-muted">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
})

export interface Cafe {
  id: string
  name: string
  lat: number
  lon: number
  address?: string
  cuisine?: string
}

export default function CafeFinderPage() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [cafes, setCafes] = useState<Cafe[]>([])
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get user's current location
  const getUserLocation = () => {
    setLoading(true)
    setError(null)

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation([latitude, longitude])
          searchNearbyCafes(latitude, longitude)
        },
        (error) => {
          setError("Unable to get your location. Please enable location services.")
          setLoading(false)
          // Default to San Francisco
          setUserLocation([37.7749, -122.4194])
          searchNearbyCafes(37.7749, -122.4194)
        },
      )
    } else {
      setError("Geolocation is not supported by your browser.")
      setLoading(false)
    }
  }

  // Search for cafes near a location using Overpass API
  const searchNearbyCafes = async (lat: number, lon: number, radius = 2000) => {
    setLoading(true)
    setError(null)

    try {
      const query = `
        [out:json];
        (
          node["amenity"="cafe"](around:${radius},${lat},${lon});
          way["amenity"="cafe"](around:${radius},${lat},${lon});
          relation["amenity"="cafe"](around:${radius},${lat},${lon});
        );
        out center;
      `

      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
      })

      if (!response.ok) throw new Error("Failed to fetch cafes")

      const data = await response.json()

      const cafesData: Cafe[] = data.elements.map((element: any) => ({
        id: element.id.toString(),
        name: element.tags?.name || "Unnamed Cafe",
        lat: element.lat || element.center?.lat,
        lon: element.lon || element.center?.lon,
        address: element.tags?.["addr:street"]
          ? `${element.tags["addr:housenumber"] || ""} ${element.tags["addr:street"]}`.trim()
          : undefined,
        cuisine: element.tags?.cuisine,
      }))

      setCafes(cafesData)
    } catch (err) {
      setError("Failed to search for cafes. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Search by city/location name
  const searchByLocation = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)

    try {
      // Use Nominatim to geocode the location
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
      )

      if (!response.ok) throw new Error("Failed to search location")

      const data = await response.json()

      if (data.length === 0) {
        setError("Location not found. Please try another search.")
        setLoading(false)
        return
      }

      const { lat, lon } = data[0]
      const location: [number, number] = [Number.parseFloat(lat), Number.parseFloat(lon)]
      setUserLocation(location)
      searchNearbyCafes(location[0], location[1])
    } catch (err) {
      setError("Failed to search location. Please try again.")
      setLoading(false)
    }
  }

  useEffect(() => {
    getUserLocation()
  }, [])

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Map Container */}
      <MapComponent
        userLocation={userLocation}
        cafes={cafes}
        selectedCafe={selectedCafe}
        onCafeSelect={setSelectedCafe}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none">
        <Card className="max-w-2xl mx-auto shadow-lg pointer-events-auto">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Coffee className="h-6 w-6 text-accent-strong" />
              <CardTitle className="text-2xl">Cafe Finder</CardTitle>
            </div>
            <CardDescription>Discover great cafes near you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search Bar */}
            <div className="flex gap-2">
              <Input
                placeholder="Search location (e.g., San Francisco)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchByLocation()}
                className="flex-1"
              />
              <Button onClick={searchByLocation} disabled={loading || !searchQuery.trim()}>
                <Search className="h-4 w-4" />
              </Button>
              <Button onClick={getUserLocation} disabled={loading} variant="outline">
                <Navigation className="h-4 w-4" />
              </Button>
            </div>

            {/* Status Messages */}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching for cafes...</span>
              </div>
            )}
            {error && <div className="text-sm text-destructive">{error}</div>}
            {!loading && cafes.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coffee className="h-4 w-4" />
                <span>Found {cafes.length} cafes nearby</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cafe Details Sidebar */}
      {selectedCafe && (
        <div className="absolute bottom-4 left-4 right-4 md:bottom-auto md:top-4 md:right-4 md:left-auto md:w-80 z-[1000]">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{selectedCafe.name}</CardTitle>
                  {selectedCafe.address && (
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedCafe.address}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedCafe.cuisine && (
                <div>
                  <Badge variant="secondary">{selectedCafe.cuisine}</Badge>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${selectedCafe.lat},${selectedCafe.lon}`,
                      "_blank",
                    )
                  }}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
                <Button variant="outline" onClick={() => setSelectedCafe(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PWA Install Prompt */}
      <PWAInstaller />
    </div>
  )
}
