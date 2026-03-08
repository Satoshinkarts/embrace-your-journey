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
  }>;
  routeCoords?: [number, number][];
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
  interactive = true,
  showGeolocate = false,
  mapRef,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const geoFired = useRef(false);
  const { data: token, isLoading } = useMapboxToken();

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

    // Center change callback for center-pin mode
    if (onCenterChange) {
      map.current.on("moveend", () => {
        const c = map.current?.getCenter();
        if (c) onCenterChange(c.lng, c.lat);
      });
    }

    if (showGeolocate && onGeolocate) {
      const geoCtrl = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        trackUserLocation: true,
        showUserLocation: true,
        showAccuracyCircle: true,
      });
      map.current.addControl(geoCtrl, "top-right");

      geoCtrl.on("geolocate", (e: any) => {
        onGeolocate(e.coords.longitude, e.coords.latitude);
        if (!geoFired.current) {
          geoFired.current = true;
        }
      });

      map.current.on("load", () => {
        geoCtrl.trigger();
      });
    }

    if (onMapClick) {
      map.current.on("click", (e) => {
        onMapClick(e.lngLat.lng, e.lngLat.lat);
      });
    }

    return () => {
      map.current?.remove();
      map.current = null;
      if (mapRef) mapRef.current = null;
    };
  }, [token]);

  // Update markers
  useEffect(() => {
    if (!map.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((m) => {
      const el = document.createElement("div");
      el.className = "mapbox-custom-marker";
      el.style.cssText = `
        width: 28px; height: 28px; border-radius: 50%;
        background: ${m.color || "#3A7FD9"};
        border: 3px solid rgba(255,255,255,0.9);
        box-shadow: 0 0 12px ${m.color || "#3A7FD9"}80, 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([m.lng, m.lat])
        .addTo(map.current!);

      if (m.label) {
        marker.setPopup(
          new mapboxgl.Popup({ offset: 20, closeButton: false })
            .setHTML(`<div style="padding:4px 8px;font-size:12px;font-weight:600;color:#1A1A1A;">${m.label}</div>`)
        );
      }

      markersRef.current.push(marker);
    });
  }, [markers]);

  // Draw route and auto-fit bounds
  useEffect(() => {
    if (!map.current) return;

    const fitToView = () => {
      if (!map.current) return;
      const bounds = new mapboxgl.LngLatBounds();
      let hasPoints = false;

      if (routeCoords?.length) {
        routeCoords.forEach((c) => { bounds.extend(c); hasPoints = true; });
      }

      markers.forEach((m) => { bounds.extend([m.lng, m.lat]); hasPoints = true; });

      if (hasPoints && (markers.length > 1 || (routeCoords?.length ?? 0) > 0)) {
        map.current.fitBounds(bounds, {
          padding: { top: 80, bottom: 280, left: 40, right: 40 },
          maxZoom: 15,
          duration: 800,
        });
      }
    };

    const addRoute = () => {
      if (!map.current) return;

      if (!routeCoords?.length) {
        if (map.current.getLayer("route")) map.current.removeLayer("route");
        if (map.current.getSource("route")) map.current.removeSource("route");
        fitToView();
        return;
      }

      const geojsonData: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: routeCoords },
      };

      if (map.current.getSource("route")) {
        (map.current.getSource("route") as mapboxgl.GeoJSONSource).setData(geojsonData);
      } else {
        map.current.addSource("route", { type: "geojson", data: geojsonData });
        map.current.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#3A7FD9",
            "line-width": 5,
            "line-opacity": 0.85,
          },
        });
      }

      fitToView();
    };

    if (map.current.isStyleLoaded()) {
      addRoute();
    } else {
      map.current.on("load", addRoute);
    }
  }, [routeCoords, markers]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-card ${className}`}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="h-full w-full" />
      {/* Center pin overlay */}
      {showCenterPin && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative -mt-8 flex flex-col items-center">
            <div className="h-8 w-8 rounded-full border-[3px] border-primary bg-primary/20 shadow-lg shadow-primary/30" />
            <div className="h-4 w-0.5 bg-primary" />
            <div className="h-1.5 w-3 rounded-full bg-primary/40" />
          </div>
        </div>
      )}
    </div>
  );
}
