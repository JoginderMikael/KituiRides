import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const DEFAULT_CENTER = [38.0106, -1.3771];

export default function RideMapbox({
  pickup,
  dropoff,
  nearbyDrivers = [],
  activePoint,
  onPointSelect
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef([]);
  const activePointRef = useRef(activePoint);
  const onPointSelectRef = useRef(onPointSelect);
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    activePointRef.current = activePoint;
    onPointSelectRef.current = onPointSelect;
  }, [activePoint, onPointSelect]);

  const markers = useMemo(() => {
    const points = [];
    if (pickup?.lat != null && pickup?.lng != null) {
      points.push({ type: "pickup", lat: pickup.lat, lng: pickup.lng, color: "#0f766e" });
    }
    if (dropoff?.lat != null && dropoff?.lng != null) {
      points.push({ type: "dropoff", lat: dropoff.lat, lng: dropoff.lng, color: "#ea580c" });
    }
    nearbyDrivers.forEach((driver) => {
      if (driver.latitude != null && driver.longitude != null) {
        points.push({
          type: "driver",
          lat: driver.latitude,
          lng: driver.longitude,
          color: "#1d4ed8",
          label: driver.driverName
        });
      }
    });
    return points;
  }, [dropoff, nearbyDrivers, pickup]);

  useEffect(() => {
    if (!containerRef.current || !token || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: pickup?.lng && pickup?.lat ? [pickup.lng, pickup.lat] : DEFAULT_CENTER,
      zoom: 13
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("click", (event) => {
      if (!activePointRef.current || !onPointSelectRef.current) {
        return;
      }
      onPointSelectRef.current(activePointRef.current, {
        lat: Number(event.lngLat.lat.toFixed(6)),
        lng: Number(event.lngLat.lng.toFixed(6))
      });
    });

    mapRef.current = map;
    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [pickup?.lat, pickup?.lng, token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = markers.map((marker) => {
      const element = document.createElement("div");
      element.className = "h-4 w-4 rounded-full border-2 border-white shadow-md";
      element.style.backgroundColor = marker.color;
      element.title = marker.label || marker.type;
      return new mapboxgl.Marker({ element })
        .setLngLat([marker.lng, marker.lat])
        .addTo(map);
    });

    const bounds = new mapboxgl.LngLatBounds();
    markers.forEach((marker) => bounds.extend([marker.lng, marker.lat]));
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
    }
  }, [markers]);

  if (!token) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Set <code>VITE_MAPBOX_TOKEN</code> to enable the live customer map. Coordinates and nearby-driver cards still work without it.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        <span className={`rounded-full px-3 py-1 ${activePoint === "pickup" ? "bg-teal-600 text-white" : "bg-teal-100 text-teal-800"}`}>
          Pickup
        </span>
        <span className={`rounded-full px-3 py-1 ${activePoint === "dropoff" ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-800"}`}>
          Dropoff
        </span>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">Nearby Drivers</span>
      </div>
      <div ref={containerRef} className="h-80 overflow-hidden rounded-3xl border border-slate-200 shadow-inner" />
      <p className="text-xs text-slate-500">
        Select a map mode below, then click on the map to update pickup or dropoff coordinates.
      </p>
    </div>
  );
}
