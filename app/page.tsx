"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation, Search, Loader2, Landmark, UtensilsCrossed, Camera } from "lucide-react"
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

export interface Place {
  id: string
  name: string
  lat: number
  lon: number
  address?: string
  cuisine?: string
  type: "tourist_attraction" | "restaurant" | "attraction" | "nightclub"
}

export default function PlaceFinderPage() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "tourist_attraction",
    "restaurant",
    "attraction",
    "nightclub",
  ])

  const getUserLocation = () => {
    setLoading(true)
    setError(null)

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation([latitude, longitude])
          searchNearbyPlaces(latitude, longitude)
        },
        (error) => {
          setError("Unable to get your location. Using Accra as default.")
          setLoading(false)
          setUserLocation([5.6037, -0.187])
          searchNearbyPlaces(5.6037, -0.187)
        },
      )
    } else {
      setError("Geolocation is not supported by your browser.")
      setLoading(false)
    }
  }

  const searchNearbyPlaces = async (lat: number, lon: number, radius = 3000) => {
    setLoading(true)
    setError(null)

    try {
      const queries = []

      if (selectedCategories.includes("tourist_attraction")) {
        queries.push(`
          node["tourism"="attraction"](around:${radius},${lat},${lon});
          way["tourism"="attraction"](around:${radius},${lat},${lon});
          node["tourism"="museum"](around:${radius},${lat},${lon});
          way["tourism"="museum"](around:${radius},${lat},${lon});
          node["historic"](around:${radius},${lat},${lon});
          way["historic"](around:${radius},${lat},${lon});
        `)
      }

      if (selectedCategories.includes("restaurant")) {
        queries.push(`
          node["amenity"="restaurant"](around:${radius},${lat},${lon});
          way["amenity"="restaurant"](around:${radius},${lat},${lon});
          node["amenity"="cafe"](around:${radius},${lat},${lon});
          way["amenity"="cafe"](around:${radius},${lat},${lon});
          node["amenity"="bar"](around:${radius},${lat},${lon});
          way["amenity"="bar"](around:${radius},${lat},${lon});
        `)
      }

      if (selectedCategories.includes("attraction")) {
        queries.push(`
          node["leisure"="park"](around:${radius},${lat},${lon});
          way["leisure"="park"](around:${radius},${lat},${lon});
          node["tourism"="viewpoint"](around:${radius},${lat},${lon});
          node["amenity"="arts_centre"](around:${radius},${lat},${lon});
          way["amenity"="arts_centre"](around:${radius},${lat},${lon});
        `)
      }

      if (selectedCategories.includes("nightclub")) {
        queries.push(`
          node["amenity"="nightclub"](around:${radius},${lat},${lon});
          way["amenity"="nightclub"](around:${radius},${lat},${lon});
          node["club"="nightclub"](around:${radius},${lat},${lon});
          way["club"="nightclub"](around:${radius},${lat},${lon});
        `)
      }

      const query = `
        [out:json];
        (
          ${queries.join("")}
        );
        out center;
      `

      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
      })

      if (!response.ok) throw new Error("Failed to fetch places")

      const data = await response.json()

      const placesData: Place[] = data.elements.map((element: any) => {
        let type: Place["type"] = "attraction"

        if (element.tags?.tourism === "attraction" || element.tags?.tourism === "museum" || element.tags?.historic) {
          type = "tourist_attraction"
        } else if (
          element.tags?.amenity === "restaurant" ||
          element.tags?.amenity === "cafe" ||
          element.tags?.amenity === "bar"
        ) {
          type = "restaurant"
        } else if (element.tags?.amenity === "nightclub" || element.tags?.club === "nightclub") {
          type = "nightclub"
        }

        return {
          id: element.id.toString(),
          name: element.tags?.name || "Unnamed Place",
          lat: element.lat || element.center?.lat,
          lon: element.lon || element.center?.lon,
          address: element.tags?.["addr:street"]
            ? `${element.tags["addr:housenumber"] || ""} ${element.tags["addr:street"]}`.trim()
            : undefined,
          cuisine: element.tags?.cuisine,
          type,
        }
      })

      setPlaces(placesData)
    } catch (err) {
      setError("Failed to search for places. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const searchByLocation = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)

    try {
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
      searchNearbyPlaces(location[0], location[1])
    } catch (err) {
      setError("Failed to search location. Please try again.")
      setLoading(false)
    }
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category)
      } else {
        return [...prev, category]
      }
    })
  }

  useEffect(() => {
    if (userLocation && selectedCategories.length > 0) {
      searchNearbyPlaces(userLocation[0], userLocation[1])
    }
  }, [selectedCategories])

  useEffect(() => {
    searchByLocation()
  }, [])

  const getPlaceIcon = (type: Place["type"]) => {
    switch (type) {
      case "tourist_attraction":
        return <Landmark className="h-4 w-4" />
      case "restaurant":
        return <UtensilsCrossed className="h-4 w-4" />
      case "attraction":
        return <Camera className="h-4 w-4" />
      case "nightclub":
        return <span className="text-xs">🎵</span>
    }
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <MapComponent
        userLocation={userLocation}
        places={places}
        selectedPlace={selectedPlace}
        onPlaceSelect={setSelectedPlace}
      />

      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none">
        <Card className="max-w-2xl mx-auto shadow-lg pointer-events-auto">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-accent-strong" />
              <CardTitle className="text-2xl">Places to Visit</CardTitle>
            </div>
            <CardDescription>Discover attractions, restaurants, and places to visit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search city (e.g., Accra, London)"
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

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedCategories.includes("tourist_attraction") ? "default" : "outline"}
                onClick={() => toggleCategory("tourist_attraction")}
              >
                <Landmark className="h-4 w-4 mr-1" />
                Tourist Spots
              </Button>
              <Button
                size="sm"
                variant={selectedCategories.includes("restaurant") ? "default" : "outline"}
                onClick={() => toggleCategory("restaurant")}
              >
                <UtensilsCrossed className="h-4 w-4 mr-1" />
                Restaurants
              </Button>
              <Button
                size="sm"
                variant={selectedCategories.includes("attraction") ? "default" : "outline"}
                onClick={() => toggleCategory("attraction")}
              >
                <Camera className="h-4 w-4 mr-1" />
                Attractions
              </Button>
              <Button
                size="sm"
                variant={selectedCategories.includes("nightclub") ? "default" : "outline"}
                onClick={() => toggleCategory("nightclub")}
              >
                <span className="mr-1">🎵</span>
                Nightclubs
              </Button>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching for places...</span>
              </div>
            )}
            {error && <div className="text-sm text-destructive">{error}</div>}
            {!loading && places.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Found {places.length} places nearby</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedPlace && (
        <div className="absolute bottom-4 left-4 right-4 md:bottom-auto md:top-4 md:right-4 md:left-auto md:w-80 z-[1000]">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{selectedPlace.name}</CardTitle>
                  {selectedPlace.address && (
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedPlace.address}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  {getPlaceIcon(selectedPlace.type)}
                  {selectedPlace.type === "tourist_attraction" && "Tourist Attraction"}
                  {selectedPlace.type === "restaurant" && "Restaurant"}
                  {selectedPlace.type === "attraction" && "Attraction"}
                  {selectedPlace.type === "nightclub" && "Nightclub"}
                </Badge>
                {selectedPlace.cuisine && <Badge variant="outline">{selectedPlace.cuisine}</Badge>}
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lon}`,
                      "_blank",
                    )
                  }}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
                <Button variant="outline" onClick={() => setSelectedPlace(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <PWAInstaller />
    </div>
  )
}
