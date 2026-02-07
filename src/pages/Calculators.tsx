import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sun, Wind, Wifi, Battery, Car, Cable, Scale } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AircoCalculator from "@/components/AircoCalculator";
import PVCalculator from "@/components/PVCalculator";
import BatteryCalculator from "@/components/BatteryCalculator";
import UniFiCalculator from "@/components/UniFiCalculator";
import ChargingStationCalculator from "@/components/ChargingStationCalculator";
import InstallationSchema from "@/components/InstallationSchema";
import ProductCompare, { CompareProduct } from "@/components/ProductCompare";

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
      // Merge with defaults to ensure all keys exist
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

const Calculators = () => {
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState<CalculatorSettings>(defaultCalculatorSettings);
  
  useEffect(() => {
    setSettings(getCalculatorSettings());
    
    // Listen for storage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "calculatorSettings") {
        setSettings(getCalculatorSettings());
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const enabledCalculators = Object.entries(settings).filter(([_, value]) => value.enabled);
  const defaultTab = searchParams.get("tab") || (enabledCalculators[0]?.[0] || "airco");

  if (enabledCalculators.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20">
          <section className="py-12 md:py-20">
            <div className="container mx-auto px-4 text-center">
              <h1 className="font-heading text-3xl font-bold text-foreground mb-4">
                Calculatoren
              </h1>
              <p className="text-muted-foreground">
                Er zijn momenteel geen calculatoren beschikbaar.
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        <section className="py-12 md:py-20 bg-gradient-to-b from-background to-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="text-accent font-semibold text-sm uppercase tracking-wider">
                Bereken Uw Besparing
              </span>
              <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6">
                Calculatoren
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Bereken eenvoudig de kosten en besparingen voor airconditioning, 
                zonnepanelen, thuisaccu's, laadpalen en netwerk oplossingen.
              </p>
            </div>

            <Tabs defaultValue={defaultTab} className="max-w-6xl mx-auto">
              <div className="flex justify-center mb-8">
                <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                {settings.airco.enabled && (
                  <TabsTrigger value="airco" className="flex items-center gap-1 text-xs sm:text-sm">
                    <Wind className="w-4 h-4" />
                    <span className="hidden sm:inline">{settings.airco.name}</span>
                  </TabsTrigger>
                )}
                {settings.pv.enabled && (
                  <TabsTrigger value="pv" className="flex items-center gap-1 text-xs sm:text-sm">
                    <Sun className="w-4 h-4" />
                    <span className="hidden sm:inline">{settings.pv.name}</span>
                  </TabsTrigger>
                )}
                {settings.battery.enabled && (
                  <TabsTrigger value="battery" className="flex items-center gap-1 text-xs sm:text-sm">
                    <Battery className="w-4 h-4" />
                    <span className="hidden sm:inline">{settings.battery.name}</span>
                  </TabsTrigger>
                )}
                {settings.charging.enabled && (
                  <TabsTrigger value="charging" className="flex items-center gap-1 text-xs sm:text-sm">
                    <Car className="w-4 h-4" />
                    <span className="hidden sm:inline">{settings.charging.name}</span>
                  </TabsTrigger>
                )}
                {settings.unifi.enabled && (
                  <TabsTrigger value="unifi" className="flex items-center gap-1 text-xs sm:text-sm">
                    <Wifi className="w-4 h-4" />
                    <span className="hidden sm:inline">{settings.unifi.name}</span>
                  </TabsTrigger>
                )}
                {settings.schema.enabled && (
                  <TabsTrigger value="schema" className="flex items-center gap-1 text-xs sm:text-sm">
                    <Cable className="w-4 h-4" />
                    <span className="hidden sm:inline">{settings.schema.name}</span>
                  </TabsTrigger>
                )}
              </TabsList>
              </div>
              
              {settings.airco.enabled && (
                <TabsContent value="airco">
                  <AircoCalculator />
                </TabsContent>
              )}
              
              {settings.pv.enabled && (
                <TabsContent value="pv">
                  <PVCalculator />
                </TabsContent>
              )}
              
              {settings.battery.enabled && (
                <TabsContent value="battery">
                  <BatteryCalculator />
                </TabsContent>
              )}
              
              {settings.charging.enabled && (
                <TabsContent value="charging">
                  <ChargingStationCalculator />
                </TabsContent>
              )}
              
              {settings.unifi.enabled && (
                <TabsContent value="unifi">
                  <UniFiCalculator />
                </TabsContent>
              )}
              
              {settings.schema.enabled && (
                <TabsContent value="schema">
                  <InstallationSchema />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Calculators;
