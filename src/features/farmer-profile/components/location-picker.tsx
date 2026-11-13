"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import Loader from "@/components/Loader";

type Point = { latitude: number; longitude: number };
type LngLat = { lat: number; lng: number };
// The hosted SDK exposes the same GL JS API as the npm package.
interface MapInstance {
  on(event: "load" | "error" | "click", callback: (event: { lngLat: LngLat }) => void): void;
  getCenter(): LngLat;
  flyTo(options: { center: [number, number]; zoom: number }): void;
  addControl(control: unknown): void;
  remove(): void;
}
interface MarkerInstance {
  setLngLat(point: [number, number]): MarkerInstance;
  addTo(map: MapInstance): MarkerInstance;
  on(event: "dragend", callback: () => void): MarkerInstance;
  getLngLat(): LngLat;
  setDraggable(value: boolean): MarkerInstance;
  getElement(): HTMLElement;
  remove(): void;
}
interface MapboxSDK {
  Map: new (options: { container: HTMLElement; accessToken: string; style: string; center: [number, number]; zoom: number }) => MapInstance;
  Marker: new (options: { draggable: boolean }) => MarkerInstance;
  NavigationControl: new () => unknown;
  supported(): boolean;
}

export function LocationPicker({ token, latitude, longitude, disabled, onChange }: {
  token: string; latitude: string; longitude: string; disabled: boolean;
  onChange: (point: Point | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const marker = useRef<MarkerInstance | null>(null);
  const latest = useRef({ disabled, onChange, latitude, longitude });
  const geoRequest = useRef(0);
  const [sdkReady, setSdkReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const selected = latitude !== "" && longitude !== "";

  useEffect(() => { latest.current = { disabled, onChange, latitude, longitude }; });
  useEffect(() => () => { geoRequest.current++; }, []);

  useEffect(() => {
    if (!sdkReady || !token || !container.current) return;
    const sdk = (window as Window & { mapboxgl?: MapboxSDK }).mapboxgl;
    if (!sdk) return;
    let instance: MapInstance;
    try {
      if (!sdk.supported()) throw new Error("WebGL unavailable");
      const { latitude: lat, longitude: lng } = latest.current;
      instance = new sdk.Map({ container: container.current, accessToken: token,
        style: "mapbox://styles/mapbox/streets-v12",
        center: lat && lng ? [Number(lng), Number(lat)] : [80.7718, 7.8731], zoom: lat && lng ? 12 : 6 });
      map.current = instance;
      instance.addControl(new sdk.NavigationControl());
      instance.on("load", () => setLoaded(true));
      instance.on("error", () => setError("The map could not load. Check your connection or try again later. You can continue without a location."));
      instance.on("click", ({ lngLat }) => {
        if (!latest.current.disabled) latest.current.onChange({ latitude: lngLat.lat, longitude: ((lngLat.lng + 180) % 360 + 360) % 360 - 180 });
      });
    } catch {
      // SDK errors can contain token-bearing URLs; do not surface their text.
      queueMicrotask(() => setError("The map is unavailable in this browser. You can continue without a location."));
      return;
    }
    return () => { marker.current?.remove(); marker.current = null; instance.remove(); map.current = null; };
  }, [sdkReady, token]);

  useEffect(() => {
    const instance = map.current;
    const sdk = (window as Window & { mapboxgl?: MapboxSDK }).mapboxgl;
    if (!instance || !sdk) return;
    if (!selected) { marker.current?.remove(); marker.current = null; return; }
    if (!marker.current) {
      marker.current = new sdk.Marker({ draggable: !disabled })
        .setLngLat([Number(longitude), Number(latitude)]).addTo(instance)
        .on("dragend", () => {
          const point = marker.current?.getLngLat();
          if (point && !latest.current.disabled) latest.current.onChange({ latitude: point.lat, longitude: ((point.lng + 180) % 360 + 360) % 360 - 180 });
        });
      marker.current.getElement().setAttribute("aria-label", "Selected farming location");
    }
    marker.current.setLngLat([Number(longitude), Number(latitude)]).setDraggable(!disabled);
  }, [sdkReady, latitude, longitude, selected, disabled]);

  function locate() {
    if (!navigator.geolocation) { setError("Location is unavailable in this browser. Place a pin on the map instead."); return; }
    setLocating(true); setError("");
    const request = ++geoRequest.current;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (request !== geoRequest.current) return;
      setLocating(false);
      if (latest.current.disabled) return;
      latest.current.onChange({ latitude: coords.latitude, longitude: coords.longitude });
      map.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 12 });
    }, () => {
      if (request !== geoRequest.current) return;
      setLocating(false);
      setError("Could not get your location. Allow location access and try again, or place a pin on the map.");
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  }

  return (
    <section aria-label="Approximate farming location" aria-describedby="location-hint" className="space-y-3">
      <p className="text-sm font-medium">Approximate location (optional)</p>
      <p id="location-hint" className="text-xs text-muted-foreground">Use your current location or click the map to place a pin. Drag the pin to adjust it. With a keyboard, use the map arrow keys then select its centre. Only an approximate location is saved.</p>
      {token ? <>
        <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v3.33.0/mapbox-gl.css" />
        <Script src="https://api.mapbox.com/mapbox-gl-js/v3.33.0/mapbox-gl.js" strategy="afterInteractive"
          onReady={() => setSdkReady(true)} onError={() => setError("The map could not load. You can continue without a location.")} />
        <div ref={container} className="h-80 w-full overflow-hidden rounded-lg border" aria-label="Farming location map" />
        {!loaded && !error && <div role="status" className="flex items-center gap-2 text-sm"><Loader size={16} label="Loading map" />Loading map…</div>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={locate} disabled={disabled || locating}>
            {locating && <Loader size={16} label="Finding your location" />}{locating ? "Finding location…" : "Use my current location"}
          </Button>
          <Button type="button" variant="outline" disabled={disabled || !loaded} onClick={() => {
            const point = map.current?.getCenter();
            if (point) onChange({ latitude: point.lat, longitude: ((point.lng + 180) % 360 + 360) % 360 - 180 });
          }}>Place pin at map centre</Button>
        </div>
      </> : <p className="text-sm text-muted-foreground">Location selection is currently unavailable. You can continue with your district and town.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <p role="status" className="text-sm text-muted-foreground">{selected ? "Location selected. An approximate pin will be saved." : "No location selected."}</p>
        {selected && <Button type="button" variant="ghost" disabled={disabled} onClick={() => {
          geoRequest.current++; setLocating(false); onChange(null);
        }}>Remove location</Button>}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
