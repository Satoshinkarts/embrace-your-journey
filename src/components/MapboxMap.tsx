import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapboxToken } from "@/hooks/useMapboxToken";

interface MapboxMapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMapClick?: (lng: number, lat: number) => void;
  markers?: Array<{
    id: string;
    lng: number;
    lat: number;
    color?: string;
    label?: string;
  }>;
  routeCoords?: [number, number][];
  interactive?: boolean;
}

export default function MapboxMap({
  center = [122.5654, 10.7202], // Iloilo City
  zoom = 13,
  className = "",
  onMapClick,
  markers = [],
  routeCoords,
  interactive = true,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { data: token, isLoading } = useMapboxToken();

  useEffect(() => {
    if (!token || !mapContainer.current || map.current) return;

    mapboxgl.accessToken = token;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center,
      zoom,
      interactive,
      attributionControl: false,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    if (onMapClick) {
      map.current.on("click", (e) => {
        onMapClick(e.lngLat.lng, e.lngLat.lat);
      });
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [token]);

  // Update markers
  useEffect(() => {
    if (!map.current) return;

    // Clear existing
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((m) => {
      const el = document.createElement("div");
      el.className = "mapbox-custom-marker";
      el.style.cssText = `
        width: 28px; height: 28px; border-radius: 50%;
        background: ${m.color || "#22c55e"};
        border: 3px solid rgba(255,255,255,0.9);
        box-shadow: 0 0 12px ${m.color || "#22c55e"}80, 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([m.lng, m.lat])
        .addTo(map.current!);

      if (m.label) {
        marker.setPopup(
          new mapboxgl.Popup({ offset: 20, closeButton: false })
            .setHTML(`<div style="padding:4px 8px;font-size:12px;font-weight:600;color:#1a1a2e;">${m.label}</div>`)
        );
      }

      markersRef.current.push(marker);
    });

    // Fit bounds if multiple markers
    if (markers.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    }
  }, [markers]);

  // Draw route
  useEffect(() => {
    if (!map.current || !routeCoords?.length) return;

    const addRoute = () => {
      if (map.current!.getSource("route")) {
        (map.current!.getSource("route") as mapboxgl.GeoJSONSource).setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: routeCoords! },
        });
      } else {
        map.current!.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: routeCoords! },
          },
        });
        map.current!.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#4facfe",
            "line-width": 4,
            "line-opacity": 0.8,
          },
        });
      }
    };

    if (map.current.isStyleLoaded()) {
      addRoute();
    } else {
      map.current.on("load", addRoute);
    }
  }, [routeCoords]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-card ${className}`}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <div ref={mapContainer} className={`${className}`} />;
}
