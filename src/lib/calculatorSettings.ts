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

export const getCalculatorSettings = (): CalculatorSettings => {
  const stored = localStorage.getItem("calculatorSettings");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        airco: { ...defaultCalculatorSettings.airco, ...parsed.airco },
        pv: { ...defaultCalculatorSettings.pv, ...parsed.pv },
        battery: { ...defaultCalculatorSettings.battery, ...parsed.battery },
        unifi: { ...defaultCalculatorSettings.unifi, ...parsed.unifi },
        charging: { ...defaultCalculatorSettings.charging, ...parsed.charging },
        schema: { ...defaultCalculatorSettings.schema, ...parsed.schema },
      };
    } catch {
      return defaultCalculatorSettings;
    }
  }
  return defaultCalculatorSettings;
};

export const saveCalculatorSettings = (settings: CalculatorSettings) => {
  localStorage.setItem("calculatorSettings", JSON.stringify(settings));
};
