import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapboxToken } from "@/hooks/useMapboxToken";

interface MapboxMapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMapClick?: (lng: number, lat: number) => void;
  onGeolocate?: (lng: number, lat: number) => void;
  /** Fires when map stops moving with center coords – used for center-pin mode */
  onCenterChange?: (lng: number, lat: number) => void;
  /** Show a fixed center pin overlay */
  showCenterPin?: boolean;
  markers?: Array<{
    id: string;
    lng: number;
    lat: number;
    color?: string;
    label?: string;
    /** If true, marker position animates smoothly instead of jumping */
    animate?: boolean;
    /** Pulse effect for live markers */
    pulse?: boolean;
  }>;
  routeCoords?: [number, number][];
  /** Secondary route line (e.g. rider→pickup while showing pickup→dropoff) */
  secondaryRouteCoords?: [number, number][];
  interactive?: boolean;
  showGeolocate?: boolean;
  /** Expose map ref for external control */
  mapRef?: React.MutableRefObject<mapboxgl.Map | null>;
}

export default function MapboxMap({
  center = [122.5654, 10.7202],
  zoom = 13,
  className = "",
  onMapClick,
  onGeolocate,
  onCenterChange,
  showCenterPin = false,
  markers = [],
  routeCoords,
  secondaryRouteCoords,
  interactive = true,
  showGeolocate = false,
  mapRef,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const geoFired = useRef(false);
  const { data: token, isLoading } = useMapboxToken();

  // Keep latest callback refs to avoid stale closures in map event listeners
  const onCenterChangeRef = useRef(onCenterChange);
  const onMapClickRef = useRef(onMapClick);
  const onGeolocateRef = useRef(onGeolocate);
  useEffect(() => { onCenterChangeRef.current = onCenterChange; }, [onCenterChange]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onGeolocateRef.current = onGeolocate; }, [onGeolocate]);

  // Expose map instance
  useEffect(() => {
    if (mapRef) mapRef.current = map.current;
  });

  useEffect(() => {
    if (!token || !mapContainer.current || map.current) return;

    mapboxgl.accessToken = token;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom,
      interactive,
      attributionControl: false,
      maxBounds: [
        [121.8, 10.4],
        [123.2, 12.0],
      ],
    });

    if (mapRef) mapRef.current = map.current;

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false, showZoom: false }),
      "top-right"
    );

    // Boost POI / landmark label visibility once style loads
    map.current.on("style.load", () => {
      const m = map.current;
      if (!m) return;
      const style = m.getStyle();
      if (!style?.layers) return;

      style.layers.forEach((layer) => {
        if (layer.id.includes("poi-label") || layer.id.includes("transit-label")) {
          try {
            m.setLayoutProperty(layer.id, "text-size", [
              "interpolate", ["linear"], ["zoom"],
              12, 11, 14, 13, 16, 15,
            ]);
            m.setLayoutProperty(layer.id, "icon-size", [
              "interpolate", ["linear"], ["zoom"],
              12, 0.9, 16, 1.2,
            ]);
            m.setPaintProperty(layer.id, "text-halo-width", 1.5);
            m.setPaintProperty(layer.id, "text-halo-color", "rgba(255,255,255,0.9)");
          } catch {}
        }
        if (layer.id.includes("place-label") || layer.id.includes("settlement")) {
          try {
            m.setPaintProperty(layer.id, "text-halo-width", 2);
            m.setPaintProperty(layer.id, "text-halo-color", "rgba(255,255,255,0.95)");
          } catch {}
        }
      });
    });

    // Center change callback for center-pin mode (uses ref to avoid stale closure)
    map.current.on("moveend", () => {
      const cb = onCenterChangeRef.current;
      if (!cb) return;
      const c = map.current?.getCenter();
      if (c) cb(c.lng, c.lat);
    });

    if (showGeolocate) {
      const geoCtrl = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        trackUserLocation: true,
        showUserLocation: true,
        showAccuracyCircle: true,
      });
      map.current.addControl(geoCtrl, "top-right");

      geoCtrl.on("geolocate", (e: any) => {
        const cb = onGeolocateRef.current;
        if (cb) cb(e.coords.longitude, e.coords.latitude);
        if (!geoFired.current) {
          geoFired.current = true;
        }
      });

      geoCtrl.on("error", () => {
        // GPS failed – fire geolocate with null-like to signal error handled upstream
      });

      map.current.on("load", () => {
        geoCtrl.trigger();
      });
    }

    map.current.on("click", (e) => {
      const cb = onMapClickRef.current;
      if (cb) cb(e.lngLat.lng, e.lngLat.lat);
    });

    return () => {
      map.current?.remove();
      map.current = null;
      markersRef.current.clear();
      if (mapRef) mapRef.current = null;
    };
  }, [token]);

  // Update markers with smooth animation for tracked markers
  useEffect(() => {
    if (!map.current) return;

    const currentMarkerIds = new Set(markers.map(m => m.id));
    
    // Remove markers that no longer exist
    markersRef.current.forEach((marker, id) => {
      if (!currentMarkerIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    markers.forEach((m) => {
      const existing = markersRef.current.get(m.id);
      
      if (existing) {
        // Update position – animate if flagged
        const currentPos = existing.getLngLat();
        const targetPos: [number, number] = [m.lng, m.lat];
        
        if (m.animate && (Math.abs(currentPos.lng - m.lng) > 0.00001 || Math.abs(currentPos.lat - m.lat) > 0.00001)) {
          // Smooth animation over 1 second
          animateMarker(existing, [currentPos.lng, currentPos.lat], targetPos, 1000);
        } else {
          existing.setLngLat(targetPos);
        }
      } else {
        // Create new marker
        const el = createMarkerElement(m.color || "#3A7FD9", !!m.pulse);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([m.lng, m.lat])
          .addTo(map.current!);

        if (m.label) {
          marker.setPopup(
            new mapboxgl.Popup({ offset: 20, closeButton: false })
              .setHTML(`<div style="padding:4px 8px;font-size:12px;font-weight:600;color:#1A1A1A;">${m.label}</div>`)
          );
        }

        markersRef.current.set(m.id, marker);
      }
    });
  }, [markers]);

  // Draw route and auto-fit bounds
  useEffect(() => {
    if (!map.current) return;

    const drawRoutes = () => {
      if (!map.current) return;
      
      // Primary route
      drawRoute(map.current, "route", routeCoords, "#3A7FD9", 5, 0.85);
      
      // Secondary route (dashed, e.g. rider→pickup)
      drawRoute(map.current, "route-secondary", secondaryRouteCoords, "#6FA8FF", 4, 0.6, true);

      fitToView();
    };

    const fitToView = () => {
      if (!map.current) return;
      const bounds = new mapboxgl.LngLatBounds();
      let hasPoints = false;

      [routeCoords, secondaryRouteCoords].forEach(coords => {
        if (coords?.length) {
          coords.forEach((c) => { bounds.extend(c); hasPoints = true; });
        }
      });

      markers.forEach((m) => { bounds.extend([m.lng, m.lat]); hasPoints = true; });

      if (hasPoints && (markers.length > 1 || (routeCoords?.length ?? 0) > 0 || (secondaryRouteCoords?.length ?? 0) > 0)) {
        map.current.fitBounds(bounds, {
          padding: { top: 80, bottom: 280, left: 40, right: 40 },
          maxZoom: 15,
          duration: 800,
        });
      }
    };

    if (map.current.isStyleLoaded()) {
      drawRoutes();
    } else {
      map.current.on("load", drawRoutes);
    }
  }, [routeCoords, secondaryRouteCoords, markers]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-card ${className}`}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div ref={mapContainer} className="absolute inset-0" />
      {/* Center pin overlay */}
      {showCenterPin && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative -mt-8 flex flex-col items-center">
            <div className="h-8 w-8 rounded-full border-[3px] border-primary bg-primary/20 shadow-lg shadow-primary/30 animate-pulse" />
            <div className="h-4 w-0.5 bg-primary" />
            <div className="h-1.5 w-3 rounded-full bg-primary/40" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─── */

function createMarkerElement(color: string, pulse: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "mapbox-custom-marker";
  el.style.cssText = `
    width: 28px; height: 28px; border-radius: 50%;
    background: ${color};
    border: 3px solid rgba(255,255,255,0.9);
    box-shadow: 0 0 12px ${color}80, 0 2px 8px rgba(0,0,0,0.3);
    cursor: pointer;
    transition: transform 0.2s ease;
  `;
  
  if (pulse) {
    const pulseRing = document.createElement("div");
    pulseRing.style.cssText = `
      position: absolute; top: -6px; left: -6px;
      width: 40px; height: 40px; border-radius: 50%;
      border: 2px solid ${color};
      animation: marker-pulse 2s ease-out infinite;
      opacity: 0;
    `;
    el.style.position = "relative";
    el.appendChild(pulseRing);
    
    // Add keyframes if not already added
    if (!document.getElementById("marker-pulse-style")) {
      const style = document.createElement("style");
      style.id = "marker-pulse-style";
      style.textContent = `
        @keyframes marker-pulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  return el;
}

function animateMarker(
  marker: mapboxgl.Marker,
  from: [number, number],
  to: [number, number],
  duration: number
) {
  const start = performance.now();
  
  function step(timestamp: number) {
    const progress = Math.min((timestamp - start) / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    
    const lng = from[0] + (to[0] - from[0]) * eased;
    const lat = from[1] + (to[1] - from[1]) * eased;
    
    marker.setLngLat([lng, lat]);
    
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  
  requestAnimationFrame(step);
}

function drawRoute(
  map: mapboxgl.Map,
  layerId: string,
  coords: [number, number][] | undefined,
  color: string,
  width: number,
  opacity: number,
  dashed = false
) {
  if (!coords?.length) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(layerId)) map.removeSource(layerId);
    return;
  }

  const geojsonData: GeoJSON.Feature = {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: coords },
  };

  if (map.getSource(layerId)) {
    (map.getSource(layerId) as mapboxgl.GeoJSONSource).setData(geojsonData);
  } else {
    map.addSource(layerId, { type: "geojson", data: geojsonData });
    map.addLayer({
      id: layerId,
      type: "line",
      source: layerId,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": color,
        "line-width": width,
        "line-opacity": opacity,
        ...(dashed ? { "line-dasharray": [2, 2] } : {}),
      },
    });
  }
}
