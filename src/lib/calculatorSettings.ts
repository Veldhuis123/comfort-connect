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

// Fetch settings from server (public endpoint)
export const fetchCalculatorSettings = async (): Promise<CalculatorSettings> => {
  try {
    const data = await apiRequest<CalculatorSettings>('/settings/calculators');
    return {
      airco: { ...defaultCalculatorSettings.airco, ...data.airco },
      pv: { ...defaultCalculatorSettings.pv, ...data.pv },
      battery: { ...defaultCalculatorSettings.battery, ...data.battery },
      unifi: { ...defaultCalculatorSettings.unifi, ...data.unifi },
      charging: { ...defaultCalculatorSettings.charging, ...data.charging },
      schema: { ...defaultCalculatorSettings.schema, ...data.schema },
    };
  } catch {
    return defaultCalculatorSettings;
  }
};

// Save settings to server (admin only)
export const saveCalculatorSettings = async (settings: CalculatorSettings): Promise<void> => {
  await apiRequest('/settings/calculators', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
};

// Legacy compat - sync read from cache
let cachedSettings: CalculatorSettings = defaultCalculatorSettings;

export const getCachedCalculatorSettings = (): CalculatorSettings => cachedSettings;

export const refreshCalculatorSettings = async (): Promise<CalculatorSettings> => {
  cachedSettings = await fetchCalculatorSettings();
  return cachedSettings;
};

// Deprecated — kept for backward compat during migration
export const getCalculatorSettings = (): CalculatorSettings => cachedSettings;
