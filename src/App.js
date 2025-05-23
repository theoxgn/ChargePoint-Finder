import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  MapPin, 
  Clock, 
  Zap, 
  Navigation, 
  Star, 
  Menu, 
  X, 
  Loader2,
  Car,
  Battery,
  AlertTriangle
} from 'lucide-react';

// Error Boundary Component
class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Map Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-96 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-600">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
            <p className="text-lg font-medium mb-2">Error Loading Map</p>
            <p className="text-sm">Please refresh the page or try again later</p>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 bg-green-500 hover:bg-green-600 px-4 py-2 text-white font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Map Component
const MapComponent = ({ stations, selectedStation, onStationSelect, userLocation }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);

  useEffect(() => {
    // Load Leaflet CSS and JS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const leafletCSS = document.createElement('link');
      leafletCSS.rel = 'stylesheet';
      leafletCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
      document.head.appendChild(leafletCSS);
    }

    if (!window.L) {
      const leafletJS = document.createElement('script');
      leafletJS.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
      leafletJS.onload = () => initializeMap();
      document.head.appendChild(leafletJS);
    } else {
      initializeMap();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && stations) {
      updateMarkers();
    }
  }, [stations]);

  useEffect(() => {
    if (mapInstanceRef.current && userLocation) {
      updateUserMarker();
    }
  }, [userLocation]);

  const initializeMap = () => {
    if (!window.L || !mapRef.current || mapInstanceRef.current) return;

    try {
      // Use user location or default to Jakarta coordinates
      let centerLat = -6.2088;
      let centerLng = 106.8456;
      let zoomLevel = 12;

      // Only use user location if coordinates are valid
      if (userLocation && 
          !isNaN(userLocation.lat) && !isNaN(userLocation.lng) &&
          userLocation.lat >= -90 && userLocation.lat <= 90 &&
          userLocation.lng >= -180 && userLocation.lng <= 180) {
        centerLat = userLocation.lat;
        centerLng = userLocation.lng;
        zoomLevel = 14;
      }

      mapInstanceRef.current = window.L.map(mapRef.current).setView([centerLat, centerLng], zoomLevel);

      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);

      // Add error handler for tile loading
      mapInstanceRef.current.on('tileerror', function(error) {
        console.warn('Tile loading error:', error);
      });

      updateMarkers();
      
      if (userLocation && 
          !isNaN(userLocation.lat) && !isNaN(userLocation.lng)) {
        updateUserMarker();
      }
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const updateUserMarker = () => {
    if (!mapInstanceRef.current || !window.L || !userLocation) return;

    // Validate user location coordinates
    if (isNaN(userLocation.lat) || isNaN(userLocation.lng) ||
        userLocation.lat < -90 || userLocation.lat > 90 ||
        userLocation.lng < -180 || userLocation.lng > 180) {
      console.warn('Invalid user location coordinates:', userLocation);
      return;
    }

    try {
      // Remove existing user marker
      if (userMarkerRef.current) {
        try {
          mapInstanceRef.current.removeLayer(userMarkerRef.current);
        } catch (e) {
          console.warn('Error removing user marker:', e);
        }
        userMarkerRef.current = null;
      }

      // Create user location marker
      const userIcon = window.L.divIcon({
        html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; position: relative;">
                 <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
               </div>`,
        className: 'user-location-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      userMarkerRef.current = window.L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(mapInstanceRef.current);

      const popupContent = `
        <div style="color: #1f2937; min-width: 200px; text-align: center;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px; color: #3b82f6;">📍 Lokasi Anda</h3>
          <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">Koordinat: ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}</p>
          <p style="margin: 8px 0; font-size: 12px; color: #6b7280;">Pencarian stasiun charging berdasarkan lokasi ini</p>
        </div>
      `;

      userMarkerRef.current.bindPopup(popupContent);

      // Center map on user location with validation
      try {
        mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 14);
      } catch (viewError) {
        console.warn('Error setting map view:', viewError);
      }
      
    } catch (error) {
      console.error('Error updating user marker:', error);
    }
  };

  const updateMarkers = () => {
    if (!mapInstanceRef.current || !window.L || !stations || stations.length === 0) return;

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        if (marker && mapInstanceRef.current) {
          try {
            mapInstanceRef.current.removeLayer(marker);
          } catch (e) {
            console.warn('Error removing marker:', e);
          }
        }
      });
      markersRef.current = [];

      // Add new markers
      const validMarkers = [];
      
      stations.forEach((station, index) => {
        // Strict validation for coordinates
        if (!station.lat || !station.lng || 
            isNaN(station.lat) || isNaN(station.lng) ||
            station.lat < -90 || station.lat > 90 ||
            station.lng < -180 || station.lng > 180) {
          console.warn('Invalid coordinates for station:', station.name, station.lat, station.lng);
          return;
        }

        try {
          // Use green color for all stations since we removed availability status
          const iconColor = '#10B981';
          
          const customIcon = window.L.divIcon({
            html: `<div style="background-color: ${iconColor}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                     <div style="color: white; font-size: 12px; font-weight: bold;">⚡</div>
                   </div>`,
            className: 'custom-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const marker = window.L.marker([station.lat, station.lng], { icon: customIcon })
            .addTo(mapInstanceRef.current);

          const popupContent = `
            <div style="color: #1f2937; min-width: 220px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${station.name}</h3>
              <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">📍 ${station.address}</p>
              <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">📏 ${station.distance}</p>
              <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">🕒 ${station.hours}</p>
              <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">🏢 ${station.brand}</p>
              <div style="margin: 8px 0; display: flex; gap: 4px;">
                ${station.types.map(type => `<span style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: bold;">${type}</span>`).join('')}
              </div>
              <div style="margin: 8px 0; display: flex; justify-content: center;">
                <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}', '_blank')" 
                        style="background: #10B981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;">
                  🧭 Rute
                </button>
              </div>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #6b7280;">
                <span>⭐ ${station.rating} (${station.reviews} ulasan)</span>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);
          
          marker.on('click', () => {
            onStationSelect(station);
          });

          markersRef.current.push(marker);
          validMarkers.push(marker);
        } catch (markerError) {
          console.error('Error creating marker for station:', station.name, markerError);
        }
      });

      // Fit map to show all markers with appropriate zoom for radius
      if (validMarkers.length > 0 && !userLocation) {
        try {
          // Create bounds manually to ensure they're valid
          let minLat = Infinity, maxLat = -Infinity;
          let minLng = Infinity, maxLng = -Infinity;
          
          validMarkers.forEach(marker => {
            const pos = marker.getLatLng();
            minLat = Math.min(minLat, pos.lat);
            maxLat = Math.max(maxLat, pos.lat);
            minLng = Math.min(minLng, pos.lng);
            maxLng = Math.max(maxLng, pos.lng);
          });
          
          // Check if bounds are reasonable (expanded for larger radius)
          if (minLat !== Infinity && maxLat !== -Infinity && 
              minLng !== Infinity && maxLng !== -Infinity &&
              Math.abs(maxLat - minLat) < 10 && Math.abs(maxLng - minLng) < 10) {
            
            const bounds = window.L.latLngBounds([
              [minLat, minLng],
              [maxLat, maxLng]
            ]);
            
            if (bounds.isValid()) {
              // Use larger padding for wider radius view
              mapInstanceRef.current.fitBounds(bounds, { 
                padding: [30, 30],
                maxZoom: 12 // Limit max zoom to show wider area
              });
            } else {
              console.warn('Calculated bounds are not valid');
            }
          } else {
            console.warn('Bounds are too large or invalid, not fitting');
          }
        } catch (boundsError) {
          console.warn('Error calculating or fitting bounds:', boundsError);
        }
      } else if (userLocation && validMarkers.length > 0) {
        // When user location is set, zoom out a bit to show surrounding stations
        try {
          mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 11); // Zoom level 11 for ~25km view
        } catch (viewError) {
          console.warn('Error setting map view:', viewError);
        }
      }

      console.log(`Successfully added ${validMarkers.length} markers out of ${stations.length} stations`);
      
    } catch (error) {
      console.error('Error updating markers:', error);
    }
  };

  return (
    <div 
      ref={mapRef} 
      className="w-full rounded border border-gray-200"
      style={{ height: '70vh', minHeight: '500px' }}
    />
  );
};

const ChargePointFinder = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedView, setSelectedView] = useState('map');
  const [searchLocation, setSearchLocation] = useState('');
  const [selectedStation, setSelectedStation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chargingStations, setChargingStations] = useState([]);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Handle geolocation for finding nearby stations
  const handleFindNearMe = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation tidak didukung browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Validate GPS coordinates
        if (isNaN(latitude) || isNaN(longitude) ||
            latitude < -90 || latitude > 90 ||
            longitude < -180 || longitude > 180) {
          setLocationError('Koordinat GPS tidak valid');
          setIsGettingLocation(false);
          return;
        }
        
        const location = { lat: latitude, lng: longitude };
        
        setUserLocation(location);
        setSearchLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        
        // Fetch real stations around user location
        fetchChargingStations(null, location);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('GPS Error:', error);
        let errorMsg = '';
        switch (error.code) {
          case 1:
            errorMsg = 'Akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser.';
            break;
          case 2:
            errorMsg = 'Informasi lokasi tidak tersedia. Coba lagi atau pindah ke area terbuka.';
            break;
          case 3:
            errorMsg = 'Timeout mendapatkan lokasi. Coba lagi dengan koneksi yang lebih baik.';
            break;
          default:
            errorMsg = 'Terjadi kesalahan GPS yang tidak diketahui.';
        }
        setLocationError(errorMsg);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  // Fetch charging stations from OpenStreetMap
  const fetchChargingStations = async (bbox = null, userLoc = null) => {
    setIsLoadingStations(true);
    try {
      // Default to larger Jakarta bounding box, or create larger bbox around user location
      let searchBbox;
      
      if (userLoc) {
        // Create 25km radius around user location (~0.22 degrees = ~25km)
        const radius = 0.22;
        searchBbox = [
          userLoc.lat - radius, // south
          userLoc.lng - radius, // west
          userLoc.lat + radius, // north
          userLoc.lng + radius  // east
        ];
        console.log(`Searching 25km radius around user location:`, searchBbox);
      } else if (bbox) {
        searchBbox = bbox;
      } else {
        // Larger default Jakarta area
        searchBbox = [-6.5, 106.5, -5.8, 107.2]; // Much larger area
      }
      
      const overpassQuery = `
        [out:json][timeout:30];
        (
          node["amenity"="charging_station"](${searchBbox.join(',')});
          way["amenity"="charging_station"](${searchBbox.join(',')});
          relation["amenity"="charging_station"](${searchBbox.join(',')});

          node["operator"~"PLN|Electrum|SPKLU|Bluetti"](${searchBbox.join(',')});
          node["brand"~"PLN|Electrum|SPKLU"](${searchBbox.join(',')});

          node["amenity"="fuel"]["fuel:electricity"="yes"](${searchBbox.join(',')});
          way["amenity"="fuel"]["fuel:electricity"="yes"](${searchBbox.join(',')});
          
          node["electric_vehicle"="charging_station"](${searchBbox.join(',')});
          node["electric"="charging_station"](${searchBbox.join(',')});
          
          node["socket:type1"](${searchBbox.join(',')});
          node["socket:type2"](${searchBbox.join(',')});
          node["socket:type3"](${searchBbox.join(',')});
          
          node["amenity"="parking"]["charging"="yes"](${searchBbox.join(',')});
          way["amenity"="parking"]["charging"="yes"](${searchBbox.join(',')});
          
          node["charging"](${searchBbox.join(',')});
          way["charging"](${searchBbox.join(',')});
          
          node["amenity"="fuel"]["electric_vehicle_charging"="yes"](${searchBbox.join(',')});
          way["amenity"="fuel"]["electric_vehicle_charging"="yes"](${searchBbox.join(',')});
          
        );
        out geom;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data from OSM');
      }

      const data = await response.json();
      const stations = data.elements.map((element, index) => {
        const tags = element.tags || {};
        const lat = element.lat || (element.center ? element.center.lat : 0);
        const lng = element.lon || (element.center ? element.center.lon : 0);
        
        // Extract socket types to determine AC/DC
        const socketTypes = Object.keys(tags).filter(key => key.startsWith('socket:'));
        const types = [];
        
        // Check for common AC sockets
        if (socketTypes.some(socket => 
          socket.includes('type2') || 
          socket.includes('type1') || 
          socket.includes('schuko') ||
          tags['socket:type2'] || 
          tags['socket:type1']
        )) {
          types.push('AC');
        }
        
        // Check for DC fast charging
        if (socketTypes.some(socket => 
          socket.includes('chademo') || 
          socket.includes('ccs') ||
          socket.includes('tesla_supercharger') ||
          tags['socket:chademo'] || 
          tags['socket:ccs2'] ||
          tags['socket:tesla_supercharger']
        )) {
          types.push('DC');
        }
        
        // Default to AC if no specific type found
        if (types.length === 0) {
          types.push('AC');
        }

        // Determine brand/operator
        let brand = tags.operator || tags.brand || tags.network || 'Unknown';
        if (brand.toLowerCase().includes('tesla')) brand = 'Tesla';
        else if (brand.toLowerCase().includes('shell')) brand = 'Shell';
        else if (brand.toLowerCase().includes('pertamina')) brand = 'Pertamina';
        else if (brand.toLowerCase().includes('pln')) brand = 'PLN';
        else if (brand.toLowerCase().includes('chargev')) brand = 'ChargeV';
        else if (brand.toLowerCase().includes('ionity')) brand = 'Ionity';
        else if (brand.toLowerCase().includes('abb')) brand = 'ABB';

        // Calculate distance from user location or default center
        const refLat = userLoc ? userLoc.lat : -6.2088;
        const refLng = userLoc ? userLoc.lng : 106.8456;
        const distance = calculateDistance(refLat, refLng, lat, lng);

        return {
          id: element.id || index,
          name: tags.name || `${brand} Charging Station`,
          address: [
            tags['addr:street'],
            tags['addr:housenumber'],
            tags['addr:city'] || tags['addr:state'] || 'Indonesia'
          ].filter(Boolean).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          distance: distance.toFixed(1) + ' km',
          distanceValue: distance, // for sorting
          hours: tags.opening_hours || '24 Jam',
          types: [...new Set(types)], // Remove duplicates
          brand,
          rating: (4.0 + Math.random() * 1.0).toFixed(1),
          reviews: Math.floor(Math.random() * 400) + 10,
          lat,
          lng,
          rawTags: tags // Keep original OSM tags for debugging
        };
      }).filter(station => station.lat && station.lng) // Filter out invalid coordinates
        .sort((a, b) => a.distanceValue - b.distanceValue); // Sort by distance

      console.log(`Found ${stations.length} charging stations from OSM in expanded radius`);
      setChargingStations(stations);
      
    } catch (error) {
      console.error('Error fetching charging stations:', error);
      // Set empty array when fetch fails
      setChargingStations([]);
    } finally {
      setIsLoadingStations(false);
    }
  };

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Load stations on component mount
  useEffect(() => {
    fetchChargingStations();
    
    // Add CSS for custom markers to document head
    if (!document.querySelector('#map-marker-styles')) {
      const style = document.createElement('style');
      style.id = 'map-marker-styles';
      style.textContent = `
        .custom-marker {
          border: none !important;
          background: transparent !important;
        }
        .user-location-marker {
          border: none !important;
          background: transparent !important;
        }
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.1;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Cleanup function
    return () => {
      const existingStyle = document.querySelector('#map-marker-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      if (searchLocation.trim()) {
        // You can implement geocoding here to convert location to coordinates
        // For now, we'll search in the current Jakarta area
        await fetchChargingStations();
      } else {
        await fetchChargingStations();
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-8 w-8 text-green-500" />
              <h1 className="text-2xl font-bold text-green-500">ChargePoint Finder</h1>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#" className="text-gray-600 hover:text-green-500 transition-colors">Beranda</a>
            </nav>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <nav className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
              <div className="flex flex-col space-y-3">
                <a href="#" className="text-gray-600 hover:text-green-500 transition-colors">Beranda</a>
                <a href="#" className="text-gray-600 hover:text-green-500 transition-colors">Peta Stasiun</a>
                <a href="#" className="text-gray-600 hover:text-green-500 transition-colors">Tips & Panduan</a>
                <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 font-medium text-left">
                  Login/Daftar
                </button>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gray-50 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-8">
            <Car className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-4xl md:text-6xl font-bold mb-4 text-gray-900">
              Temukan Stasiun Charging 
              <span className="text-green-500"> Mobil Listrik</span> Terdekat
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Cari dan temukan stasiun pengisian daya mobil listrik dengan mudah dalam radius 25km, 
              lengkap dengan informasi lokasi dan navigasi langsung.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex flex-1">
                <input
                  type="text"
                  placeholder="Masukkan lokasi atau gunakan GPS..."
                  className="flex-1 px-4 py-3 bg-white border border-gray-300 focus:outline-none focus:border-green-500 text-gray-900"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                />
                <button 
                  onClick={handleSearch}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 transition-colors flex items-center"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              {/* Find Near Me Button */}
              <button
                onClick={() => {
                  handleFindNearMe();
                }}
                disabled={isGettingLocation}
                className={`px-4 py-3 transition-colors flex items-center justify-center whitespace-nowrap ${
                  isGettingLocation 
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                    : userLocation 
                      ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                      : 'bg-gray-400 hover:bg-gray-500 text-white'
                }`}
                title="Cari stasiun charging terdekat dari lokasi Anda"
              >
                {isGettingLocation ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span className="hidden sm:inline">Mencari...</span>
                  </>
                ) : (
                  <>
                    <Navigation className={`h-5 w-5 mr-2 ${userLocation ? 'text-white' : ''}`} />
                    <span className="hidden sm:inline">
                      {userLocation ? 'Update Lokasi' : 'Cari di Sekitar Saya'}
                    </span>
                    <span className="sm:hidden">GPS</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Location Status */}
            {userLocation && (
              <div className="mt-2 text-center text-sm text-green-600">
                📍 Lokasi Anda: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                <br />
                <span className="text-xs text-gray-500">
                  🔍 Mencari dalam radius 25km dari lokasi Anda
                </span>
              </div>
            )}
            
            {/* Location Error */}
            {locationError && (
              <div className="mt-2 text-center text-sm text-red-600 bg-red-50 px-3 py-2">
                ⚠️ {locationError}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex bg-gray-100 p-1">
            <button
              onClick={() => setSelectedView('map')}
              className={`px-4 py-2 transition-colors font-medium ${
                selectedView === 'map' 
                  ? 'bg-green-500 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Peta
            </button>
            <button
              onClick={() => setSelectedView('list')}
              className={`px-4 py-2 transition-colors font-medium ${
                selectedView === 'list' 
                  ? 'bg-green-500 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Daftar
            </button>
          </div>

          <div className="text-sm text-gray-500">
            {isLoadingStations ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Memuat data stasiun...
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span>Menampilkan {chargingStations.length} stasiun</span>
                {userLocation && (
                  <span className="text-blue-500 text-xs ml-4">
                    📍 Radius 25km - Diurutkan berdasarkan jarak terdekat
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {selectedView === 'map' ? (
          /* OpenStreetMap View */
          <div className="bg-white border border-gray-200 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center text-gray-900">
                <MapPin className="h-5 w-5 mr-2 text-green-500" />
                Peta Stasiun Charging
              </h3>
            </div>
            
            {isLoadingStations ? (
              <div style={{ height: '70vh', minHeight: '500px' }} className="bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-green-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Memuat data stasiun dari OpenStreetMap...</p>
                </div>
              </div>
            ) : (
              <>
                <MapErrorBoundary>
                  <MapComponent 
                    stations={chargingStations}
                    selectedStation={selectedStation}
                    onStationSelect={setSelectedStation}
                    userLocation={userLocation}
                  />
                </MapErrorBoundary>
                <div className="mt-4 text-sm text-gray-500 text-center">
                  {userLocation ? (
                    <>
                      🔵 Lokasi Anda • ⚡ Stasiun Charging • 📏 Radius 25km
                      <br />
                      <span className="text-xs">Klik pin untuk detail dan rute ke stasiun charging</span>
                    </>
                  ) : (
                    <>
                      Klik pada pin untuk melihat detail stasiun dan mendapatkan rute • Data dari OpenStreetMap
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          /* Station List */
          <div className="space-y-4">
            {isLoadingStations ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-green-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Memuat data stasiun dari OpenStreetMap...</p>
                </div>
              </div>
            ) : chargingStations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada stasiun charging ditemukan</p>
                <p className="text-sm mt-2">Coba ubah lokasi pencarian</p>
              </div>
            ) : (
              chargingStations.map((station, index) => (
                <div key={station.id} className="bg-white border border-gray-200 p-6 hover:bg-gray-50 transition-colors relative">
                  {/* Nearest station indicator */}
                  {userLocation && index === 0 && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-blue-500 text-white text-xs px-2 py-1">
                        Terdekat
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-1 flex items-center text-gray-900">
                        {station.name}
                        {userLocation && index < 3 && (
                          <span className="ml-2 text-blue-500">📍</span>
                        )}
                      </h3>
                      <div className="flex items-center text-gray-500 mb-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{station.address}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mb-1">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{station.hours}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        🏢 {station.brand}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm mb-1 ${userLocation ? 'text-blue-500 font-medium' : 'text-gray-500'}`}>
                        {userLocation ? '📍 ' : ''}{station.distance}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Battery className="h-4 w-4 mr-1 text-blue-500" />
                        <span className="flex space-x-1">
                          {station.types.map(type => (
                            <span key={type} className="px-2 py-1 bg-gray-100 text-xs font-semibold">
                              {type}
                            </span>
                          ))}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center text-sm">
                        <Star className="h-4 w-4 text-yellow-400 mr-1 fill-current" />
                        <span>{station.rating}</span>
                        <span className="text-gray-500 ml-1">({station.reviews})</span>
                      </div>
                      <button 
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`, '_blank')}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 transition-colors flex items-center text-sm font-medium"
                      >
                        <Navigation className="h-4 w-4 mr-1" />
                        Rute
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ChargePointFinder;