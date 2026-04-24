const GOOGLE_MAPS_SCRIPT_ID = "google-maps-js-api";
const DEFAULT_REGION = "ke";

let googleMapsPromise;

export function loadGoogleMaps(apiKey) {
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

export async function geocodeAddress(apiKey, address) {
  if (!apiKey || !address?.trim()) {
    return null;
  }

  const google = await loadGoogleMaps(apiKey);
  const geocoder = new google.maps.Geocoder();
  const query = /kitui|kenya/i.test(address) ? address : `${address}, Kitui, Kenya`;
  const response = await geocoder.geocode({
    address: query,
    region: DEFAULT_REGION
  });
  const result = response.results?.[0];
  if (!result?.geometry?.location) {
    return null;
  }

  return {
    lat: Number(result.geometry.location.lat().toFixed(6)),
    lng: Number(result.geometry.location.lng().toFixed(6)),
    address: result.formatted_address
  };
}

export async function reverseGeocode(apiKey, coordinates) {
  if (!apiKey || coordinates?.lat == null || coordinates?.lng == null) {
    return null;
  }

  const google = await loadGoogleMaps(apiKey);
  const geocoder = new google.maps.Geocoder();
  const response = await geocoder.geocode({
    location: coordinates
  });
  return response.results?.[0]?.formatted_address || null;
}

export function haversineKm(start, end) {
  if (start?.lat == null || start?.lng == null || end?.lat == null || end?.lng == null) {
    return 0;
  }

  const earthRadiusKm = 6371;
  const dLat = degreesToRadians(end.lat - start.lat);
  const dLng = degreesToRadians(end.lng - start.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(degreesToRadians(start.lat))
    * Math.cos(degreesToRadians(end.lat))
    * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function degreesToRadians(value) {
  return value * (Math.PI / 180);
}
