import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
  Polyline
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { Map as LeafletMap } from "leaflet";
import { fetchCategories, fetchNearbyPlaces, fetchPlaces, fetchCities, searchPlaces, fetchCityCoordinates, getDirections } from "./api";
import PlaceDetailsCard from "./PlaceDetailsCard";

type Category = {
  slug: string;
  displayName: string;
};

type Place = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
};

/* ---------------- MAP REF SETTER ---------------- */
function MapRefSetter({
  mapRef
}: {
  mapRef: React.MutableRefObject<LeafletMap | null>;
}) {
  const map = useMap();
  mapRef.current = map;
  return null;
}

/* ---------------- MAP UPDATER ---------------- */
function MapUpdater({
  category,
  isSearchMode,
  setPlaces,
  setLoading
}: {
  category: string | null;
  isSearchMode: boolean;
  setPlaces: (p: Place[]) => void;
  setLoading: (v: boolean) => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMapEvents({
    moveend: (e) => {
      // Don't update if search is active (search results take priority)
      if (isSearchMode || !category) return;

      const map = e.target; // ✅ SAFE SOURCE - always available from event
      const center = map.getCenter();
      const zoom = map.getZoom();

      // 🚫 Do not load markers when zoomed too far out
      if (zoom < 7) {
        setPlaces([]);
        return;
      }

      const radiusKm = zoom < 8 ? 100 : Math.max(2, 20 - zoom);

      if (timer.current) clearTimeout(timer.current);

      timer.current = setTimeout(async () => {
        setLoading(true);
        try {
          const response = await fetchNearbyPlaces(
            center.lat,
            center.lng,
            radiusKm,
            category
          );
          // Backend returns { source: "...", places: [...] }
          const placesArray = Array.isArray(response) ? response : (response.places || []);
          setPlaces(placesArray);
        } catch (error) {
          console.error("Failed to fetch nearby places:", error);
          setPlaces([]);
        } finally {
          setLoading(false);
        }
      }, 400);
    }
  });

  return null;
}

/* ---------------- APP ---------------- */
export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [zoomMessage, setZoomMessage] = useState<string | null>(null);
  
  // Search state
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Place details card state
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedPlaceCoords, setSelectedPlaceCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Directions state
  const [showDirections, setShowDirections] = useState(false);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [route, setRoute] = useState<Array<[number, number]> | null>(null);
  const [directionsInfo, setDirectionsInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [isGettingDirections, setIsGettingDirections] = useState(false);

  const mapRef = useRef<LeafletMap | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchCategories().then(setCategories);
    fetchCities().then(setCities);
  }, []);

  const handleCategoryClick = async (slug: string) => {
    setSelectedCategory(slug);
    setZoomMessage(null);
    setIsSearchMode(false); // Exit search mode when category selected

    if (!mapRef.current) return;

    const map = mapRef.current;
    const center = map.getCenter();
    const zoom = map.getZoom();
    
    // 🚫 Don't fetch when zoomed out
    if (zoom < 7) {
      setPlaces([]);
      return;
    }

    const radiusKm = zoom < 8 ? 100 : Math.max(2, 20 - zoom);

    setLoading(true);
    try {
      const response = await fetchNearbyPlaces(
        center.lat,
        center.lng,
        radiusKm,
        slug
      );
      // Backend returns { source: "...", places: [...] }
      const placesArray = Array.isArray(response) ? response : (response.places || []);
      setPlaces(placesArray);
    } catch (error) {
      console.error("Failed to fetch nearby places:", error);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCityChange = async (city: string) => {
    setSelectedCity(city || null);
    setZoomMessage(null);
    setIsSearchMode(false); // Exit search mode when city selected

    if (!city) {
      setPlaces([]);
      return;
    }

    if (!mapRef.current) return;

    setLoading(true);
    try {
      // Get city coordinates and zoom to city
      try {
        const cityCoords = await fetchCityCoordinates(city);
        if (cityCoords && cityCoords.latitude && cityCoords.longitude) {
          mapRef.current.flyTo(
            [cityCoords.latitude, cityCoords.longitude],
            12, // Zoom level for city view
            { duration: 1 }
          );
        }
      } catch (error) {
        console.error("Failed to get city coordinates:", error);
      }

      // Fetch places for the city
      const params: { city: string; category?: string } = { city };
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      const data = await fetchPlaces(params);
      // Ensure we have an array
      const placesArray = Array.isArray(data) ? data : [];
      setPlaces(placesArray);
    } catch (error) {
      console.error("Failed to fetch places:", error);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedCategory(null);
    setSelectedCity(null);
    setPlaces([]);
    setZoomMessage(null);
    setSearchText("");
    setSearchResults([]);
    setShowResultsDropdown(false);
    setSelectedResultId(null);
    setIsSearchMode(false);
    mapRef.current?.flyTo([20.5937, 78.9629], 5);
  };

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    setShowResultsDropdown(false);
    setSelectedResultId(null);

    if (!value.trim()) {
      setSearchResults([]);
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      return;
    }

    // Debounce search
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchPlaces(value);
        // Defensive normalization - ensure array
        const resultsArray = Array.isArray(results) ? results : [];
        setSearchResults(resultsArray.slice(0, 10)); // Limit to 10 results
        setShowResultsDropdown(true);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleResultClick = (place: Place) => {
    setSelectedResultId(place.id);
    setShowResultsDropdown(false);
    setIsSearchMode(true); // Enter search mode
    
    // Replace markers (don't merge)
    setPlaces([place]);
    
    // Set as destination for directions
    setDestination({
      lat: place.latitude,
      lng: place.longitude,
      name: place.name
    });
    
    // Open place details card
    setSelectedPlaceId(place.id);
    setSelectedPlaceCoords({ lat: place.latitude, lng: place.longitude });
    
    // Focus marker
    if (mapRef.current) {
      mapRef.current.flyTo([place.latitude, place.longitude], 14, {
        duration: 1
      });
    }
  };

  // Get user's current location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setOrigin({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Unable to get your location. Please allow location access.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  // Get directions
  const handleGetDirections = async () => {
    if (!origin || !destination) {
      alert("Please set origin and destination");
      return;
    }

    setIsGettingDirections(true);
    try {
      const directions = await getDirections(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng
      );
      
      // Convert coordinates to [lat, lng] tuples for Leaflet
      const routeCoords = directions.coordinates.map((coord: [number, number]) => [coord[0], coord[1]] as [number, number]);
      setRoute(routeCoords);
      setDirectionsInfo({
        distance: directions.distance,
        duration: directions.duration
      });
      setShowDirections(true);

      // Fit map to show entire route
      if (mapRef.current && routeCoords.length > 0) {
        const bounds = routeCoords.map((coord: [number, number]) => [coord[0], coord[1]] as [number, number]);
        mapRef.current.fitBounds(bounds as any, { padding: [50, 50] });
      }
    } catch (error) {
      console.error("Failed to get directions:", error);
      alert("Failed to get directions. Please try again.");
    } finally {
      setIsGettingDirections(false);
    }
  };

  const clearDirections = () => {
    setRoute(null);
    setDirectionsInfo(null);
    setShowDirections(false);
    setOrigin(null);
    setDestination(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest(".search-results-dropdown")
      ) {
        setShowResultsDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={`app-root ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      {/* SIDEBAR */}
      <div className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <button 
          className="reset-btn" 
          onClick={handleReset}
          disabled={loading}
        >
          Reset Map
        </button>

        <h3>City</h3>
        <select
          className="city-select"
          value={selectedCity || ""}
          onChange={(e) => handleCityChange(e.target.value)}
        >
          <option value="">Select city</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        {zoomMessage && (
          <div className="zoom-message">{zoomMessage}</div>
        )}

        <h3>Categories</h3>
        {categories.map((c) => (
          <div
            key={c.slug}
            className={`category-item ${
              selectedCategory === c.slug ? "active" : ""
            }`}
            onClick={() => handleCategoryClick(c.slug)}
          >
            {c.displayName}
          </div>
        ))}

        <h3>Directions</h3>
        <div className="directions-controls">
          <button
            className="directions-btn"
            onClick={getUserLocation}
            disabled={isGettingDirections}
          >
            Use My Location
          </button>
          {origin && (
            <div className="directions-info">
              Origin: {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
            </div>
          )}
          {destination && (
            <div className="directions-info">
              Destination: {destination.name}
            </div>
          )}
          {origin && destination && (
            <>
              <button
                className="directions-btn primary"
                onClick={handleGetDirections}
                disabled={isGettingDirections}
              >
                {isGettingDirections ? "Getting Directions..." : "Get Directions"}
              </button>
              {showDirections && (
                <button
                  className="directions-btn"
                  onClick={clearDirections}
                >
                  Clear Route
                </button>
              )}
            </>
          )}
          {directionsInfo && (
            <div className="directions-stats">
              <div>Distance: {directionsInfo.distance}</div>
              <div>Duration: {directionsInfo.duration}</div>
            </div>
          )}
        </div>
      </div>

      {/* MAP */}
      <div className="map-wrapper">
        {/* SEARCH BAR - Top Center */}
        <div className="search-bar">
          <div className="search-input-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Search places, cities..."
              value={searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowResultsDropdown(true);
                }
              }}
              onKeyDown={(e) => {
                // Enter key: trigger search if there are results
                if (e.key === "Enter" && searchResults.length > 0 && !isSearching) {
                  e.preventDefault();
                  const firstResult = searchResults[0];
                  if (firstResult) {
                    handleResultClick(firstResult);
                  }
                }
                // Escape key: close dropdown
                if (e.key === "Escape") {
                  setShowResultsDropdown(false);
                  searchInputRef.current?.blur();
                }
              }}
              disabled={isSearching}
            />
            {isSearching && (
              <span className="search-loading">⟳</span>
            )}
          </div>
          
          {showResultsDropdown && searchResults.length > 0 && (
            <div className="search-results-dropdown">
              {searchResults.map((place) => (
                <div
                  key={place.id}
                  className={`search-result-item ${
                    selectedResultId === place.id ? "selected" : ""
                  }`}
                  onClick={() => handleResultClick(place)}
                >
                  <div className="result-name">{place.name}</div>
                  {(place.city || place.state) && (
                    <div className="result-location">
                      {[place.city, place.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {showResultsDropdown && searchResults.length === 0 && searchText.trim() && !isSearching && (
            <div className="search-results-dropdown">
              <div className="search-no-results">No results found</div>
            </div>
          )}
        </div>

        <button
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          {isSidebarOpen ? "✕" : "☰"}
        </button>
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          className="leaflet-map"
        >
          <TileLayer
            attribution="© OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapRefSetter mapRef={mapRef} />

          <MapUpdater
            category={selectedCategory}
            isSearchMode={isSearchMode}
            setPlaces={setPlaces}
            setLoading={setLoading}
          />

          {/* Directions route */}
          {route && route.length > 0 && (
            <Polyline
              positions={route}
              color="#2563eb"
              weight={4}
              opacity={0.7}
            />
          )}

          {/* Origin marker */}
          {origin && (
            <Marker position={[origin.lat, origin.lng]}>
              <Popup>Your Location</Popup>
            </Marker>
          )}

          {/* Destination marker */}
          {destination && (
            <Marker position={[destination.lat, destination.lng]}>
              <Popup>{destination.name}</Popup>
            </Marker>
          )}

          <MarkerClusterGroup chunkedLoading>
            {places.map((p) => (
              <Marker
                key={p.id}
                position={[p.latitude, p.longitude]}
                eventHandlers={{
                  click: () => {
                    setSelectedResultId(p.id);
                    // Set as destination when marker clicked
                    setDestination({
                      lat: p.latitude,
                      lng: p.longitude,
                      name: p.name
                    });
                    // Open place details card
                    setSelectedPlaceId(p.id);
                    setSelectedPlaceCoords({ lat: p.latitude, lng: p.longitude });
                  }
                }}
              >
                <Popup autoPan={false}>
                  <strong>{p.name}</strong>
                  {(p.city || p.state) && (
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                      {[p.city, p.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                  <button
                    style={{
                      marginTop: "8px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      setDestination({
                        lat: p.latitude,
                        lng: p.longitude,
                        name: p.name
                      });
                    }}
                  >
                    Set as Destination
                  </button>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        {loading && (
          <div className="map-overlay">Loading places…</div>
        )}

        {/* Place Details Card */}
        {selectedPlaceId && selectedPlaceCoords && (
          <PlaceDetailsCard
            placeId={selectedPlaceId}
            onClose={() => {
              setSelectedPlaceId(null);
              setSelectedPlaceCoords(null);
            }}
            onViewOnMap={() => {
              if (mapRef.current && selectedPlaceCoords) {
                mapRef.current.flyTo([selectedPlaceCoords.lat, selectedPlaceCoords.lng], 15, {
                  duration: 1
                });
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
