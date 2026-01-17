import { useState, useEffect } from "react";
import { Sun, Battery, Calculator, Zap, Euro, TrendingUp, Home, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import ProductCompare, { CompareCheckbox, CompareProduct } from "./ProductCompare";
import { api, Product } from "@/lib/api";

interface SolarPanel {
  id: string;
  name: string;
  brand: string;
  wattPeak: number;
  pricePerPanel: number;
  warranty: string;
  efficiency: string;
}

interface BatteryOption {
  id: string;
  name: string;
  brand: string;
  capacity: number; // kWh
  price: number;
  warranty: string;
  features: string[];
}

const defaultSolarPanels: SolarPanel[] = [
  {
    id: "longi-400",
    name: "Hi-MO 5",
    brand: "LONGi",
    wattPeak: 400,
    pricePerPanel: 180,
    warranty: "25 jaar",
    efficiency: "20.9%",
  },
  {
    id: "jinko-410",
    name: "Tiger Neo",
    brand: "Jinko Solar",
    wattPeak: 410,
    pricePerPanel: 195,
    warranty: "25 jaar",
    efficiency: "21.3%",
  },
  {
    id: "canadian-420",
    name: "HiKu6",
    brand: "Canadian Solar",
    wattPeak: 420,
    pricePerPanel: 210,
    warranty: "25 jaar",
    efficiency: "21.5%",
  },
];

const batteryOptions: BatteryOption[] = [
  {
    id: "no-battery",
    name: "Geen thuisaccu",
    brand: "-",
    capacity: 0,
    price: 0,
    warranty: "-",
    features: [],
  },
  {
    id: "huawei-5",
    name: "LUNA 2000",
    brand: "Huawei",
    capacity: 5,
    price: 3500,
    warranty: "10 jaar",
    features: ["Modulair uitbreidbaar", "Noodstroom mogelijk", "Smart monitoring"],
  },
  {
    id: "huawei-10",
    name: "LUNA 2000",
    brand: "Huawei",
    capacity: 10,
    price: 6500,
    warranty: "10 jaar",
    features: ["Modulair uitbreidbaar", "Noodstroom mogelijk", "Smart monitoring"],
  },
  {
    id: "byd-10",
    name: "Battery-Box Premium",
    brand: "BYD",
    capacity: 10.2,
    price: 7200,
    warranty: "10 jaar",
    features: ["LFP batterij", "Zeer veilig", "Lange levensduur"],
  },
  {
    id: "byd-12",
    name: "Battery-Box Premium",
    brand: "BYD",
    capacity: 12.8,
    price: 8900,
    warranty: "10 jaar",
    features: ["LFP batterij", "Zeer veilig", "Lange levensduur"],
  },
];

const roofOrientations = [
  { id: "south", label: "Zuid", factor: 1.0 },
  { id: "south-east", label: "Zuid-Oost", factor: 0.95 },
  { id: "south-west", label: "Zuid-West", factor: 0.95 },
  { id: "east", label: "Oost", factor: 0.85 },
  { id: "west", label: "West", factor: 0.85 },
  { id: "flat", label: "Plat dak", factor: 0.9 },
];

const SolarCalculator = () => {
  const [solarPanels, setSolarPanels] = useState<SolarPanel[]>(defaultSolarPanels);
  const [loading, setLoading] = useState(true);
  const [yearlyUsage, setYearlyUsage] = useState<string>("3500");
  const [roofOrientation, setRoofOrientation] = useState<string>("south");
  const [roofArea, setRoofArea] = useState<string>("30");
  const [electricityPrice, setElectricityPrice] = useState<number[]>([0.30]);
  const [selectedPanel, setSelectedPanel] = useState<string>("longi-400");
  const [selectedBattery, setSelectedBattery] = useState<string>("no-battery");
  const [showResults, setShowResults] = useState(false);
  const [compareProducts, setCompareProducts] = useState<string[]>([]);

  // Load products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const apiProducts = await api.getProducts("solar");
        if (apiProducts.length > 0) {
          const mapped = apiProducts.map((p: Product): SolarPanel => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            wattPeak: Number((p.specs as Record<string, unknown>).watt_peak) || 400,
            pricePerPanel: p.base_price,
            warranty: String((p.specs as Record<string, unknown>).warranty) || "25 jaar",
            efficiency: String((p.specs as Record<string, unknown>).efficiency) || "21%",
          }));
          setSolarPanels(mapped);
        }
      } catch (err) {
        console.log("Using fallback solar panels (API not available)");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const toggleCompare = (productId: string) => {
    if (compareProducts.includes(productId)) {
      setCompareProducts(compareProducts.filter(id => id !== productId));
    } else if (compareProducts.length < 4) {
      setCompareProducts([...compareProducts, productId]);
    }
  };

  const getCompareProducts = (): CompareProduct[] => {
    return solarPanels.map(panel => ({
      id: panel.id,
      name: panel.name,
      brand: panel.brand,
      category: "Zonnepaneel",
      price: panel.pricePerPanel,
      specs: {
        "Vermogen": `${panel.wattPeak} Wp`,
        "Efficiëntie": panel.efficiency,
        "Garantie": panel.warranty,
      },
      features: [
        `${panel.wattPeak} Watt peak`,
        `${panel.efficiency} efficiëntie`,
        `${panel.warranty} garantie`,
      ],
    }));
  };

  const getOrientationFactor = () => {
    return roofOrientations.find(o => o.id === roofOrientation)?.factor || 1;
  };

  const calculatePanelCount = () => {
    const panel = solarPanels.find(p => p.id === selectedPanel);
    if (!panel) return 0;
    
    const usage = parseFloat(yearlyUsage) || 0;
    const sunHours = 900; // Average for Netherlands
    const orientationFactor = getOrientationFactor();
    const yearlyProductionPerPanel = (panel.wattPeak / 1000) * sunHours * orientationFactor;
    
    const neededPanels = Math.ceil(usage / yearlyProductionPerPanel);
    const maxPanels = Math.floor((parseFloat(roofArea) || 0) / 1.7); // ~1.7m² per panel
    
    return Math.min(neededPanels, maxPanels);
  };

  const calculateYearlyProduction = () => {
    const panel = solarPanels.find(p => p.id === selectedPanel);
    if (!panel) return 0;
    
    const panelCount = calculatePanelCount();
    const sunHours = 900;
    const orientationFactor = getOrientationFactor();
    
    return panelCount * (panel.wattPeak / 1000) * sunHours * orientationFactor;
  };

  const calculateTotalInvestment = () => {
    const panel = solarPanels.find(p => p.id === selectedPanel);
    const battery = batteryOptions.find(b => b.id === selectedBattery);
    if (!panel) return 0;
    
    const panelCount = calculatePanelCount();
    const panelCost = panelCount * panel.pricePerPanel;
    const inverterCost = panelCount * 80; // Approx inverter cost per panel
    const installationCost = 500 + (panelCount * 40);
    const batteryCost = battery?.price || 0;
    
    return panelCost + inverterCost + installationCost + batteryCost;
  };

  const calculateYearlySavings = () => {
    const production = calculateYearlyProduction();
    const usage = parseFloat(yearlyUsage) || 0;
    const battery = batteryOptions.find(b => b.id === selectedBattery);
    
    // Without battery: 30% direct use, 70% sold back at lower rate
    // With battery: 70% direct use, 30% sold back
    const directUsePercentage = battery && battery.capacity > 0 ? 0.7 : 0.3;
    const directUse = Math.min(production * directUsePercentage, usage);
    const feedIn = production - directUse;
    
    const savingsFromDirectUse = directUse * electricityPrice[0];
    const feedInRate = 0.07; // Feed-in tariff
    const feedInEarnings = feedIn * feedInRate;
    
    return savingsFromDirectUse + feedInEarnings;
  };

  const calculatePaybackPeriod = () => {
    const totalInvestment = calculateTotalInvestment();
    const yearlySavings = calculateYearlySavings();
    
    if (yearlySavings <= 0) return 0;
    return totalInvestment / yearlySavings;
  };

  const calculate25YearProfit = () => {
    const yearlySavings = calculateYearlySavings();
    const totalInvestment = calculateTotalInvestment();
    
    // Account for 0.5% efficiency degradation per year
    let totalSavings = 0;
    for (let year = 1; year <= 25; year++) {
      totalSavings += yearlySavings * Math.pow(0.995, year - 1);
    }
    
    return totalSavings - totalInvestment;
  };

  const handleCalculate = () => {
    if (parseFloat(yearlyUsage) > 0 && parseFloat(roofArea) > 0) {
      setShowResults(true);
    }
  };

  const panelCount = calculatePanelCount();
  const yearlyProduction = calculateYearlyProduction();
  const totalInvestment = calculateTotalInvestment();
  const yearlySavings = calculateYearlySavings();
  const paybackPeriod = calculatePaybackPeriod();
  const profit25Year = calculate25YearProfit();
  const selectedPanelData = solarPanels.find(p => p.id === selectedPanel);
  const selectedBatteryData = batteryOptions.find(b => b.id === selectedBattery);

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <span className="text-accent font-semibold text-sm uppercase tracking-wider">
          Zonnepanelen & Thuisaccu
        </span>
        <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6">
          Bereken Uw Besparing
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Ontdek hoeveel u kunt besparen met zonnepanelen en een thuisaccu, 
          inclusief terugverdientijd berekening.
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Input Section */}
        <Card className="border-2 border-accent/20">
          <CardHeader className="bg-accent/5">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calculator className="w-6 h-6 text-accent" />
              Uw Situatie
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Zap className="w-4 h-4 inline mr-2" />
                  Jaarlijks stroomverbruik (kWh)
                </label>
                <Input
                  type="number"
                  placeholder="bijv. 3500"
                  value={yearlyUsage}
                  onChange={(e) => setYearlyUsage(e.target.value)}
                  min="1000"
                  max="20000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Gemiddeld huishouden: 2500-4000 kWh/jaar
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Home className="w-4 h-4 inline mr-2" />
                  Beschikbaar dakoppervlak (m²)
                </label>
                <Input
                  type="number"
                  placeholder="bijv. 30"
                  value={roofArea}
                  onChange={(e) => setRoofArea(e.target.value)}
                  min="10"
                  max="200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Sun className="w-4 h-4 inline mr-2" />
                  Dakoriëntatie
                </label>
                <select
                  value={roofOrientation}
                  onChange={(e) => setRoofOrientation(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
                >
                  {roofOrientations.map((orientation) => (
                    <option key={orientation.id} value={orientation.id}>
                      {orientation.label} ({Math.round(orientation.factor * 100)}% opbrengst)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Euro className="w-4 h-4 inline mr-2" />
                  Stroomprijs: €{electricityPrice[0].toFixed(2)}/kWh
                </label>
                <Slider
                  value={electricityPrice}
                  onValueChange={setElectricityPrice}
                  min={0.15}
                  max={0.50}
                  step={0.01}
                  className="mt-4"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Huidige gemiddelde: €0.25-0.35/kWh
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel Selection */}
        <Card className="border-2 border-accent/20">
          <CardHeader className="bg-accent/5">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sun className="w-6 h-6 text-accent" />
              Kies Uw Zonnepanelen
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-4">
              {solarPanels.map((panel) => (
                <div
                  key={panel.id}
                  onClick={() => setSelectedPanel(panel.id)}
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPanel === panel.id
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <CompareCheckbox
                    productId={panel.id}
                    isSelected={compareProducts.includes(panel.id)}
                    onToggle={toggleCompare}
                    disabled={compareProducts.length >= 4}
                  />
                  <div className="flex justify-between items-start mb-3 pt-6">
                    <div>
                      <p className="text-xs text-muted-foreground">{panel.brand}</p>
                      <h4 className="font-semibold">{panel.name}</h4>
                    </div>
                    {selectedPanel === panel.id && (
                      <Check className="w-5 h-5 text-accent" />
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">{panel.wattPeak}Wp</strong> per paneel
                    </p>
                    <p className="text-muted-foreground">
                      Rendement: <strong className="text-foreground">{panel.efficiency}</strong>
                    </p>
                    <p className="text-muted-foreground">
                      Garantie: {panel.warranty}
                    </p>
                  </div>
                  <p className="mt-3 text-lg font-bold text-accent">
                    €{panel.pricePerPanel},-/paneel
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Battery Selection */}
        <Card className="border-2 border-accent/20">
          <CardHeader className="bg-accent/5">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Battery className="w-6 h-6 text-accent" />
              Thuisaccu (Optioneel)
            </CardTitle>
            <CardDescription>
              Met een thuisaccu gebruikt u meer van uw eigen opgewekte stroom
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batteryOptions.map((battery) => (
                <div
                  key={battery.id}
                  onClick={() => setSelectedBattery(battery.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedBattery === battery.id
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{battery.brand}</p>
                      <h4 className="font-semibold">{battery.name}</h4>
                    </div>
                    {selectedBattery === battery.id && (
                      <Check className="w-5 h-5 text-accent" />
                    )}
                  </div>
                  {battery.capacity > 0 ? (
                    <>
                      <Badge variant="secondary" className="mb-2">
                        {battery.capacity} kWh
                      </Badge>
                      <ul className="space-y-1 text-sm text-muted-foreground mb-3">
                        {battery.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-accent rounded-full" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <p className="text-lg font-bold text-accent">
                        €{battery.price.toLocaleString("nl-NL")},-
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Geen extra investering nodig
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Calculate Button */}
        <div className="text-center">
          <Button size="lg" onClick={handleCalculate} className="text-lg px-12">
            <Calculator className="w-5 h-5 mr-2" />
            Bereken Besparing
          </Button>
        </div>

        {/* Results */}
        {showResults && (
          <Card className="border-2 border-accent">
            <CardHeader className="bg-accent/10">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <TrendingUp className="w-7 h-7 text-accent" />
                Uw Resultaten
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <Sun className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-3xl font-bold text-foreground">{panelCount}</p>
                  <p className="text-sm text-muted-foreground">Panelen nodig</p>
                  {selectedPanelData && (
                    <p className="text-xs text-accent mt-1">
                      {selectedPanelData.brand} {selectedPanelData.name}
                    </p>
                  )}
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <Zap className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-3xl font-bold text-foreground">
                    {Math.round(yearlyProduction).toLocaleString("nl-NL")}
                  </p>
                  <p className="text-sm text-muted-foreground">kWh per jaar</p>
                  <p className="text-xs text-accent mt-1">
                    {Math.round((yearlyProduction / parseFloat(yearlyUsage)) * 100)}% van uw verbruik
                  </p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <Euro className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-3xl font-bold text-foreground">
                    €{Math.round(yearlySavings).toLocaleString("nl-NL")}
                  </p>
                  <p className="text-sm text-muted-foreground">Besparing per jaar</p>
                </div>
                <div className="text-center p-4 bg-accent/20 rounded-lg border-2 border-accent">
                  <TrendingUp className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-3xl font-bold text-accent">
                    {paybackPeriod.toFixed(1)} jaar
                  </p>
                  <p className="text-sm text-muted-foreground">Terugverdientijd</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-accent" />
                    Investering Overzicht
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Zonnepanelen ({panelCount}x)</span>
                      <span>€{(panelCount * (selectedPanelData?.pricePerPanel || 0)).toLocaleString("nl-NL")},-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Omvormer</span>
                      <span>€{(panelCount * 80).toLocaleString("nl-NL")},-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Installatie</span>
                      <span>€{(500 + panelCount * 40).toLocaleString("nl-NL")},-</span>
                    </div>
                    {selectedBatteryData && selectedBatteryData.capacity > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Thuisaccu ({selectedBatteryData.capacity} kWh)
                        </span>
                        <span>€{selectedBatteryData.price.toLocaleString("nl-NL")},-</span>
                      </div>
                    )}
                    <hr className="my-2 border-border" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Totaal</span>
                      <span className="text-accent">€{totalInvestment.toLocaleString("nl-NL")},-</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-accent/10 rounded-lg border-2 border-accent/30">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    25 Jaar Vooruitzicht
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-3xl font-bold text-accent">
                        €{Math.round(profit25Year).toLocaleString("nl-NL")},-
                      </p>
                      <p className="text-sm text-muted-foreground">Netto winst na 25 jaar</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Dit is uw totale besparing minus de investering, rekening houdend met 
                      0.5% efficiëntieverlies per jaar.
                    </p>
                    {selectedBatteryData && selectedBatteryData.capacity > 0 && (
                      <p className="text-sm text-accent">
                        ✓ Met thuisaccu gebruikt u ~70% van uw eigen stroom direct
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center space-y-4">
                <p className="text-muted-foreground">
                  Interesse? Vraag een vrijblijvende offerte aan voor uw situatie.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild>
                    <a href="/#contact">Offerte Aanvragen</a>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="tel:0613629947">Bel voor Advies</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product Compare */}
      <ProductCompare
        products={getCompareProducts()}
        category="Zonnepaneel"
        maxCompare={4}
        selectedProducts={compareProducts}
        onToggleProduct={toggleCompare}
      />
    </div>
  );
};

export default SolarCalculator;
