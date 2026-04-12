import { apiRequest } from './api';

export interface CalculatorSettings {
  airco: { enabled: boolean; name: string };
  pv: { enabled: boolean; name: string };
  battery: { enabled: boolean; name: string };
  unifi: { enabled: boolean; name: string };
  charging: { enabled: boolean; name: string };
  schema: { enabled: boolean; name: string };
}

export const defaultCalculatorSettings: CalculatorSettings = {
  airco: { enabled: true, name: "Airco" },
  pv: { enabled: true, name: "Zonnepanelen" },
  battery: { enabled: true, name: "Thuisaccu" },
  unifi: { enabled: true, name: "UniFi Netwerk" },
  charging: { enabled: true, name: "Laadpalen" },
  schema: { enabled: true, name: "Installatie" },
};

// In-flight promise dedup — prevents multiple parallel requests
let inflightPromise: Promise<CalculatorSettings> | null = null;

// Fetch settings from server (public endpoint)
export const fetchCalculatorSettings = async (): Promise<CalculatorSettings> => {
  // Return cached if already fetched
  if (cacheReady) return cachedSettings;

  // Dedup: reuse in-flight request
  if (inflightPromise) return inflightPromise;

  inflightPromise = (async () => {
    try {
      const data = await apiRequest<CalculatorSettings>('/settings/calculators');
      cachedSettings = {
        airco: { ...defaultCalculatorSettings.airco, ...data.airco },
        pv: { ...defaultCalculatorSettings.pv, ...data.pv },
        battery: { ...defaultCalculatorSettings.battery, ...data.battery },
        unifi: { ...defaultCalculatorSettings.unifi, ...data.unifi },
        charging: { ...defaultCalculatorSettings.charging, ...data.charging },
        schema: { ...defaultCalculatorSettings.schema, ...data.schema },
      };
      cacheReady = true;
      return cachedSettings;
    } catch {
      return defaultCalculatorSettings;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
};

// Save settings to server (admin only)
export const saveCalculatorSettings = async (settings: CalculatorSettings): Promise<void> => {
  await apiRequest('/settings/calculators', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  // Update cache after save
  cachedSettings = settings;
  cacheReady = true;
};

// Legacy compat - sync read from cache
let cachedSettings: CalculatorSettings = defaultCalculatorSettings;
let cacheReady = false;

export const getCachedCalculatorSettings = (): CalculatorSettings => cachedSettings;

export const refreshCalculatorSettings = async (): Promise<CalculatorSettings> => {
  // Force refresh: reset cache
  cacheReady = false;
  inflightPromise = null;
  return fetchCalculatorSettings();
};

// Deprecated — kept for backward compat during migration
export const getCalculatorSettings = (): CalculatorSettings => cachedSettings;
