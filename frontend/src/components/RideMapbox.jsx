import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_CENTER = { lat: -1.3771, lng: 38.0106 };
const GOOGLE_MAPS_SCRIPT_ID = "google-maps-js-api";

let googleMapsPromise;

function loadGoogleMaps(apiKey) {
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const callbackName = "__kituiRidesGoogleMapsReady";
    window[callbackName] = () => {
      resolve(window.google);
      delete window[callbackName];
    };

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&callback=${callbackName}`;
    script.onerror = () => {
      delete window[callbackName];
      googleMapsPromise = null;
      reject(new Error("Unable to load Google Maps."));
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function createMarkerOverlay(google, marker) {
  return new class extends google.maps.OverlayView {
    onAdd() {
      this.element = document.createElement("div");
      this.element.className = "h-4 w-4 rounded-full border-2 border-white shadow-md";
      this.element.style.backgroundColor = marker.color;
      this.element.style.position = "absolute";
      this.element.style.transform = "translate(-50%, -50%)";
      this.element.title = marker.label || marker.type;
      this.getPanes().overlayMouseTarget.appendChild(this.element);
    }

    draw() {
      const projection = this.getProjection();
      if (!projection || !this.element) {
        return;
      }

      const position = projection.fromLatLngToDivPixel(
        new google.maps.LatLng(marker.lat, marker.lng)
      );
      this.element.style.left = `${position.x}px`;
      this.element.style.top = `${position.y}px`;
    }

    onRemove() {
      this.element?.remove();
      this.element = null;
    }
  }();
}

export default function RideMapbox({
  pickup,
  dropoff,
  nearbyDrivers = [],
  activePoint,
  onPointSelect
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const googleRef = useRef(null);
  const markerRefs = useRef([]);
  const clickListenerRef = useRef(null);
  const activePointRef = useRef(activePoint);
  const onPointSelectRef = useRef(onPointSelect);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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
    if (!containerRef.current || !apiKey || mapRef.current) {
      return undefined;
    }

    let cancelled = false;
    setMapError("");

    loadGoogleMaps(apiKey)
      .then((google) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        const initialCenter = pickup?.lat != null && pickup?.lng != null
          ? { lat: pickup.lat, lng: pickup.lng }
          : DEFAULT_CENTER;

        const map = new google.maps.Map(containerRef.current, {
          center: initialCenter,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        });

        clickListenerRef.current = map.addListener("click", (event) => {
          if (!activePointRef.current || !onPointSelectRef.current || !event.latLng) {
            return;
          }
          onPointSelectRef.current(activePointRef.current, {
            lat: Number(event.latLng.lat().toFixed(6)),
            lng: Number(event.latLng.lng().toFixed(6))
          });
        });

        googleRef.current = google;
        mapRef.current = map;
        setMapReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setMapError("Unable to load Google Maps. Check your API key and network connection.");
        }
      });

    return () => {
      cancelled = true;
      clickListenerRef.current?.remove();
      clickListenerRef.current = null;
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = [];
      mapRef.current = null;
      googleRef.current = null;
      setMapReady(false);
    };
  }, [apiKey]);

  useEffect(() => {
    const map = mapRef.current;
    const google = googleRef.current;
    if (!map || !google || !mapReady) {
      return;
    }

    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = markers.map((marker) => {
      const overlay = createMarkerOverlay(google, marker);
      overlay.setMap(map);
      return overlay;
    });

    if (!markers.length) {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(13);
      return;
    }

    if (markers.length === 1) {
      map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
      map.setZoom(14);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    markers.forEach((marker) => bounds.extend({ lat: marker.lat, lng: marker.lng }));
    map.fitBounds(bounds, 60);
  }, [mapReady, markers]);

  if (!apiKey) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Set <code>VITE_GOOGLE_MAPS_API_KEY</code> to enable the live customer map. Coordinates and nearby-driver cards still work without it.
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
      {mapError ? (
        <p className="text-xs text-red-600">{mapError}</p>
      ) : (
        <p className="text-xs text-slate-500">
          Select a map mode below, then click on the map to update pickup or dropoff coordinates.
        </p>
      )}
    </div>
  );
}
