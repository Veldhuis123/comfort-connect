import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin } from "lucide-react";

// Fix default marker icon issue with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface Installation {
  id: number | string;
  name: string;
  customer_name: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  status?: string;
  installation_type?: string;
  has_fault?: boolean;
}

interface Props {
  installations: Installation[];
  loading?: boolean;
  className?: string;
  height?: string;
  onInstallationClick?: (id: number | string) => void;
}

// Simple geocoding cache using localStorage
const GEOCODE_CACHE_KEY = "geocode_cache";

const getGeocodeCache = (): Record<string, { lat: number; lng: number }> => {
  try { return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || "{}"); } catch { return {}; }
};

const saveGeocodeCache = (cache: Record<string, { lat: number; lng: number }>) => {
  localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
};

const geocodeAddress = async (address: string, city: string): Promise<{ lat: number; lng: number } | null> => {
  const query = `${address}, ${city}, Netherlands`.trim();
  const cache = getGeocodeCache();
  if (cache[query]) return cache[query];

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=nl`);
    const data = await res.json();
    if (data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      cache[query] = result;
      saveGeocodeCache(cache);
      return result;
    }
  } catch {}
  return null;
};

// Custom marker icons
const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const InstallationMap = ({ installations, loading = false, className = "", height = "400px", onInstallationClick }: Props) => {
  const [geocodedInstallations, setGeocodedInstallations] = useState<(Installation & { lat: number; lng: number })[]>([]);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (installations.length === 0) return;

    const geocodeAll = async () => {
      setGeocoding(true);
      const results: (Installation & { lat: number; lng: number })[] = [];

      for (const inst of installations) {
        if (inst.lat && inst.lng) {
          results.push({ ...inst, lat: inst.lat, lng: inst.lng });
          continue;
        }
        if (inst.address || inst.city) {
          const coords = await geocodeAddress(inst.address || "", inst.city || "");
          if (coords) {
            results.push({ ...inst, ...coords });
          }
        }
        // Small delay to respect Nominatim rate limits
        await new Promise(r => setTimeout(r, 200));
      }

      setGeocodedInstallations(results);
      setGeocoding(false);
    };

    geocodeAll();
  }, [installations]);

  // Center on Netherlands by default, or on the installations
  const center = useMemo(() => {
    if (geocodedInstallations.length > 0) {
      const avgLat = geocodedInstallations.reduce((s, i) => s + i.lat, 0) / geocodedInstallations.length;
      const avgLng = geocodedInstallations.reduce((s, i) => s + i.lng, 0) / geocodedInstallations.length;
      return [avgLat, avgLng] as [number, number];
    }
    return [52.1326, 5.2913] as [number, number]; // Center of NL
  }, [geocodedInstallations]);

  const zoom = geocodedInstallations.length > 0 ? 8 : 7;

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Installaties laden...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Actieve installaties
          {geocoding && <Loader2 className="h-3 w-3 animate-spin" />}
          <Badge variant="secondary" className="ml-auto">{geocodedInstallations.length} op kaart</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden rounded-b-lg">
        <div style={{ height }}>
          <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {geocodedInstallations.map(inst => {
              const isFault = inst.has_fault || inst.status === "storing";
              return (
                <Marker key={inst.id} position={[inst.lat, inst.lng]} icon={isFault ? redIcon : greenIcon}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{inst.name}</p>
                      <p style={{ color: "#666" }}>{inst.customer_name}</p>
                      {inst.address && <p>{inst.address}</p>}
                      {inst.city && <p>{inst.city}</p>}
                      {inst.installation_type && <p className="mt-1"><strong>Type:</strong> {inst.installation_type}</p>}
                      {inst.status && <p><strong>Status:</strong> {inst.status}</p>}
                      {isFault && <p style={{ color: "red", fontWeight: "bold" }}>⚠ Storing gemeld</p>}
                      {onInstallationClick && (
                        <button 
                          onClick={() => onInstallationClick(inst.id)}
                          style={{ marginTop: 4, color: "#2563eb", cursor: "pointer", background: "none", border: "none", padding: 0, textDecoration: "underline" }}
                        >
                          Bekijk details →
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstallationMap;
