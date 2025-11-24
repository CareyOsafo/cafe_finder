"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  Navigation,
  Search,
  Loader2,
  Landmark,
  UtensilsCrossed,
  Camera,
  Music,
  Beer,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
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
  type: "tourist_attraction" | "restaurant" | "attraction" | "nightclub" | "pub"
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
    "pub",
  ])

  const [showCategories, setShowCategories] = useState(true)

  const [isIOS, setIsIOS] = useState(false)

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

      if (selectedCategories.includes("pub")) {
        queries.push(`
          node["amenity"="pub"](around:${radius},${lat},${lon});
          way["amenity"="pub"](around:${radius},${lat},${lon});
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
        } else if (element.tags?.amenity === "pub") {
          type = "pub"
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
    const detectIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase()
      return /iphone|ipad|ipod/.test(userAgent)
    }
    setIsIOS(detectIOS())
  }, [])

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
        return <Music className="h-4 w-4" />
      case "pub":
        return <Beer className="h-4 w-4" />
    }
  }

  const openDirections = (place: Place) => {
    if (isIOS) {
      // Use Apple Maps on iOS devices
      window.open(`http://maps.apple.com/?daddr=${place.lat},${place.lon}&dirflg=d`, "_blank")
    } else {
      // Use Google Maps on other devices
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`, "_blank")
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

      <div className="absolute top-0 left-0 right-0 z-[1000] p-3 md:p-4 pointer-events-none">
        <Card className="max-w-3xl mx-auto shadow-xl backdrop-blur-sm bg-card/95 border-border/50 pointer-events-auto">
          <CardHeader className="pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-semibold">Explore Places Around You</CardTitle>
                  <CardDescription className="text-sm">See what's around you and touch grass BITCH!!!</CardDescription>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search city (e.g., Accra, London, Paris)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchByLocation()}
                  className="pl-9 h-11"
                />
              </div>
              <Button onClick={searchByLocation} disabled={loading || !searchQuery.trim()} size="lg" className="px-6">
                Go
              </Button>
              <Button
                onClick={getUserLocation}
                disabled={loading}
                variant="outline"
                size="lg"
                className="px-4 bg-transparent"
              >
                <Navigation className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Filter by Category</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCategories(!showCategories)} className="h-8 px-2">
                {showCategories ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show
                  </>
                )}
              </Button>
            </div>

            {showCategories && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Button
                  size="default"
                  variant={selectedCategories.includes("tourist_attraction") ? "default" : "outline"}
                  onClick={() => toggleCategory("tourist_attraction")}
                  className="h-11 justify-start gap-2"
                >
                  <Landmark className="h-4 w-4" />
                  <span className="text-sm font-medium">Tourist Spots</span>
                </Button>
                <Button
                  size="default"
                  variant={selectedCategories.includes("restaurant") ? "default" : "outline"}
                  onClick={() => toggleCategory("restaurant")}
                  className="h-11 justify-start gap-2"
                >
                  <UtensilsCrossed className="h-4 w-4" />
                  <span className="text-sm font-medium">Restaurants</span>
                </Button>
                <Button
                  size="default"
                  variant={selectedCategories.includes("attraction") ? "default" : "outline"}
                  onClick={() => toggleCategory("attraction")}
                  className="h-11 justify-start gap-2"
                >
                  <Camera className="h-4 w-4" />
                  <span className="text-sm font-medium">Attractions</span>
                </Button>
                <Button
                  size="default"
                  variant={selectedCategories.includes("nightclub") ? "default" : "outline"}
                  onClick={() => toggleCategory("nightclub")}
                  className="h-11 justify-start gap-2"
                >
                  <Music className="h-4 w-4" />
                  <span className="text-sm font-medium">Nightclubs</span>
                </Button>
                <Button
                  size="default"
                  variant={selectedCategories.includes("pub") ? "default" : "outline"}
                  onClick={() => toggleCategory("pub")}
                  className="h-11 justify-start gap-2"
                >
                  <Beer className="h-4 w-4" />
                  <span className="text-sm font-medium">Pubs</span>
                </Button>
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching for places...</span>
              </div>
            )}
            {error && (
              <div className="px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}
            {!loading && places.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg text-sm text-primary font-medium">
                <MapPin className="h-4 w-4" />
                <span>Found {places.length} places nearby</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedPlace && (
        <div className="absolute bottom-4 left-4 right-4 md:bottom-auto md:top-4 md:right-4 md:left-auto md:w-96 z-[1000]">
          <Card className="shadow-xl backdrop-blur-sm bg-card/95 border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <CardTitle className="text-xl font-semibold leading-tight">{selectedPlace.name}</CardTitle>
                  {selectedPlace.address && (
                    <CardDescription className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">{selectedPlace.address}</span>
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
                  {getPlaceIcon(selectedPlace.type)}
                  <span className="capitalize">
                    {selectedPlace.type === "tourist_attraction" && "Tourist Attraction"}
                    {selectedPlace.type === "restaurant" && "Restaurant"}
                    {selectedPlace.type === "attraction" && "Attraction"}
                    {selectedPlace.type === "nightclub" && "Nightclub"}
                    {selectedPlace.type === "pub" && "Pub"}
                  </span>
                </Badge>
                {selectedPlace.cuisine && (
                  <Badge variant="outline" className="px-3 py-1">
                    {selectedPlace.cuisine}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 h-11" onClick={() => openDirections(selectedPlace)}>
                  <Navigation className="h-4 w-4 mr-2" />
                  {isIOS ? "Open in Apple Maps" : "Get Directions"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedPlace(null)} className="h-11 px-6">
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
