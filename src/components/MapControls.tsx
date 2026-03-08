import { Plus, Minus, LocateFixed } from "lucide-react";
import mapboxgl from "mapbox-gl";

interface MapControlsProps {
  mapRef: React.MutableRefObject<mapboxgl.Map | null>;
  onRecenter?: () => void;
}

export default function MapControls({ mapRef, onRecenter }: MapControlsProps) {
  const handleZoomIn = () => mapRef.current?.zoomIn({ duration: 300 });
  const handleZoomOut = () => mapRef.current?.zoomOut({ duration: 300 });

  const handleRecenter = () => {
    if (onRecenter) {
      onRecenter();
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 15,
          duration: 800,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
      <button
        onClick={handleZoomIn}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-md border border-border text-foreground active:bg-secondary transition-colors"
        aria-label="Zoom in"
      >
        <Plus className="h-5 w-5" />
      </button>
      <button
        onClick={handleZoomOut}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-md border border-border text-foreground active:bg-secondary transition-colors"
        aria-label="Zoom out"
      >
        <Minus className="h-5 w-5" />
      </button>
      <button
        onClick={handleRecenter}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-md border border-border text-primary active:bg-primary/10 transition-colors"
        aria-label="My location"
      >
        <LocateFixed className="h-5 w-5" />
      </button>
    </div>
  );
}
