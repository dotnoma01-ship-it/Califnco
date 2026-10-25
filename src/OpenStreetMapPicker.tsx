import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface OpenStreetMapPickerProps {
  selectedPin: LatLngPoint | null;
  center: LatLngPoint;
  onSelectPin: (point: LatLngPoint) => void;
  onTileLoadError?: () => void;
}

const CUSTOM_PIN_ICON = L.divIcon({
  className: 'califnco-osm-pin-marker',
  html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 3px 6px rgba(10,37,64,0.38));">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="#0A2540" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#ffffff" stroke-width="1.6"/>
      <circle cx="12" cy="9" r="3" fill="#14B8A6"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 30],
});

/**
 * Interactive OpenStreetMap picker using Leaflet (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`).
 * Never assumes map coordinates produce a verified postal address; emits raw WGS84 coordinates
 * and triggers `onTileLoadError` if tile requests cannot be reached so manual fallback can engage.
 */
export const OpenStreetMapPicker: React.FC<OpenStreetMapPickerProps> = ({
  selectedPin,
  center,
  onSelectPin,
  onTileLoadError,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileErrorsCountRef = useRef<number>(0);

  const onSelectPinRef = useRef(onSelectPin);
  onSelectPinRef.current = onSelectPin;
  const onTileErrorRef = useRef(onTileLoadError);
  onTileErrorRef.current = onTileLoadError;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: [center.lat, center.lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    });

    tileLayer.on('tileload', () => {
      tileErrorsCountRef.current = 0;
    });

    tileLayer.on('tileerror', () => {
      tileErrorsCountRef.current += 1;
      if (tileErrorsCountRef.current >= 4) {
        onTileErrorRef.current?.();
      }
    });

    tileLayer.addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      onSelectPinRef.current({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      });
    });

    mapRef.current = map;

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 120);

    return () => {
      window.clearTimeout(resizeTimer);
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync map center when updated externally (e.g., city preset or GPS fix)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  }, [center.lat, center.lng]);

  // Sync draggable pin marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!selectedPin) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    if (!markerRef.current) {
      const marker = L.marker([selectedPin.lat, selectedPin.lng], {
        icon: CUSTOM_PIN_ICON,
        draggable: true,
      });
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onSelectPinRef.current({
          lat: Number(pos.lat.toFixed(6)),
          lng: Number(pos.lng.toFixed(6)),
        });
      });
      marker.addTo(map);
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng([selectedPin.lat, selectedPin.lng]);
    }
  }, [selectedPin?.lat, selectedPin?.lng]);

  return (
    <div
      ref={containerRef}
      className="w-full h-48 bg-slate-100 relative z-0 select-none"
      aria-label="OpenStreetMap delivery pin selector"
    />
  );
};
