import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sun, Wind, Wifi } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AircoCalculator from "@/components/AircoCalculator";
import SolarCalculator from "@/components/SolarCalculator";
import UniFiCalculator from "@/components/UniFiCalculator";

// Calculator settings stored in localStorage for admin control
export interface CalculatorSettings {
  airco: { enabled: boolean; name: string };
  solar: { enabled: boolean; name: string };
  unifi: { enabled: boolean; name: string };
}

export const defaultCalculatorSettings: CalculatorSettings = {
  airco: { enabled: true, name: "Airco" },
  solar: { enabled: true, name: "Zonnepanelen" },
  unifi: { enabled: true, name: "UniFi Netwerk" },
};

export const getCalculatorSettings = (): CalculatorSettings => {
  const stored = localStorage.getItem("calculatorSettings");
  if (stored) {
    try {
      return { ...defaultCalculatorSettings, ...JSON.parse(stored) };
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
                zonnepanelen, thuisaccu's en netwerk oplossingen.
              </p>
            </div>

            <Tabs defaultValue={defaultTab} className="max-w-6xl mx-auto">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
                {settings.airco.enabled && (
                  <TabsTrigger value="airco" className="flex items-center gap-2">
                    <Wind className="w-4 h-4" />
                    <span className="hidden sm:inline">{settings.airco.name}</span>
                    <span className="sm:hidden">Airco</span>
                  </TabsTrigger>
                )}
                {settings.solar.enabled && (
                  <TabsTrigger value="solar" className="flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    <span className="hidden sm:inline">{settings.solar.name}</span>
                    <span className="sm:hidden">Solar</span>
                  </TabsTrigger>
                )}
                {settings.unifi.enabled && (
                  <TabsTrigger value="unifi" className="flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    <span className="hidden sm:inline">{settings.unifi.name}</span>
                    <span className="sm:hidden">UniFi</span>
                  </TabsTrigger>
                )}
              </TabsList>
              
              {settings.airco.enabled && (
                <TabsContent value="airco">
                  <AircoCalculator />
                </TabsContent>
              )}
              
              {settings.solar.enabled && (
                <TabsContent value="solar">
                  <SolarCalculator />
                </TabsContent>
              )}
              
              {settings.unifi.enabled && (
                <TabsContent value="unifi">
                  <UniFiCalculator />
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
