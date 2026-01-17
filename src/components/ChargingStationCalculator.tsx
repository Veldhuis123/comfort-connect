import { useState, useEffect } from "react";
import { Car, Calculator, Zap, Euro, Check, FileDown, Plug, Home, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createPDFBase, addPDFFooter, savePDF } from "@/lib/pdfExport";
import { api, Product } from "@/lib/api";
import ProductCompare, { CompareCheckbox, CompareProduct } from "./ProductCompare";

import chargerImg from "@/assets/charger-home.jpg";
import chargerEaseeImg from "@/assets/charger-easee.jpg";
import chargerWallboxImg from "@/assets/charger-wallbox.jpg";

const fallbackImages: Record<string, string> = {
  "alfen-eve-single": chargerImg,
  "alfen-eve-single-22": chargerImg,
  "easee-home": chargerEaseeImg,
  "easee-charge": chargerEaseeImg,
  "webasto-unite": chargerImg,
  "wallbox-pulsar-plus": chargerWallboxImg,
  "charge-amps-halo": chargerImg,
};

interface ChargingStation {
  id: string;
  name: string;
  brand: string;
  power: number;
  price: number;
  features: string[];
  type: "home" | "business";
  smartFeatures: boolean;
  image?: string;
}

const defaultChargingStations: ChargingStation[] = [
  { id: "alfen-eve-single", name: "Eve Single Pro-line", brand: "Alfen", power: 11, price: 1299, features: ["11 kW laden", "MID-gecertificeerd", "RFID", "App bediening"], type: "home", smartFeatures: true },
  { id: "alfen-eve-single-22", name: "Eve Single Pro-line", brand: "Alfen", power: 22, price: 1599, features: ["22 kW laden", "MID-gecertificeerd", "RFID", "App bediening"], type: "home", smartFeatures: true },
  { id: "easee-home", name: "Home", brand: "Easee", power: 22, price: 899, features: ["Compact design", "WiFi/4G", "Smart laden", "Load balancing"], type: "home", smartFeatures: true },
  { id: "easee-charge", name: "Charge", brand: "Easee", power: 22, price: 999, features: ["Zakelijk gebruik", "WiFi/4G", "Smart laden", "Facturatie mogelijk"], type: "business", smartFeatures: true },
  { id: "webasto-unite", name: "Unite", brand: "Webasto", power: 22, price: 1199, features: ["22 kW laden", "OCPP", "RFID", "Kabel management"], type: "business", smartFeatures: true },
  { id: "wallbox-pulsar-plus", name: "Pulsar Plus", brand: "Wallbox", power: 22, price: 799, features: ["Compact", "App bediening", "Power sharing", "Eco-Smart"], type: "home", smartFeatures: true },
  { id: "charge-amps-halo", name: "Halo", brand: "Charge Amps", power: 22, price: 1599, features: ["Premium design", "Geïntegreerde kabel", "RFID", "4G connectiviteit"], type: "home", smartFeatures: true },
];

const installationTypes = [
  { id: "standard", label: "Standaard installatie", description: "Meterkast binnen 10m, geen graafwerk", price: 350 },
  { id: "extended", label: "Uitgebreide installatie", description: "Meterkast 10-20m, kleine aanpassingen", price: 550 },
  { id: "complex", label: "Complexe installatie", description: "Graafwerk, lange afstand, verzwaring", price: 850 },
];

const ChargingStationCalculator = () => {
  const { toast } = useToast();
  const [chargingStations, setChargingStations] = useState<ChargingStation[]>(defaultChargingStations);
  const [loading, setLoading] = useState(true);
  const [locationType, setLocationType] = useState<"home" | "business">("home");
  const [yearlyKm, setYearlyKm] = useState<string>("15000");
  const [consumption, setConsumption] = useState<string>("18");
  const [electricityPrice, setElectricityPrice] = useState<string>("0.25");
  const [hasSolarPanels, setHasSolarPanels] = useState(false);
  const [selectedStation, setSelectedStation] = useState<string>("easee-home");
  const [installationType, setInstallationType] = useState<string>("standard");
  const [showResults, setShowResults] = useState(false);
  const [compareProducts, setCompareProducts] = useState<string[]>([]);

  const toggleCompare = (productId: string) => {
    if (compareProducts.includes(productId)) {
      setCompareProducts(compareProducts.filter(id => id !== productId));
    } else if (compareProducts.length < 4) {
      setCompareProducts([...compareProducts, productId]);
    }
  };

  const getCompareProducts = (): CompareProduct[] => {
    return chargingStations.map(station => ({
      id: station.id,
      name: station.name,
      brand: station.brand,
      category: "Laadpaal",
      price: station.price,
      image: getChargerImage(station),
      specs: {
        "Vermogen": `${station.power} kW`,
        "Type": station.type === "home" ? "Particulier" : "Zakelijk",
        "Smart Features": station.smartFeatures ? "Ja" : "Nee",
      },
      features: station.features,
    }));
  };

  // Load products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const apiProducts = await api.getProducts("charger");
        if (apiProducts.length > 0) {
          const mapped = apiProducts.map((p: Product): ChargingStation => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            power: Number((p.specs as Record<string, unknown>).power) || 22,
            price: p.base_price,
            features: p.features,
            type: ((p.specs as Record<string, unknown>).type as "home" | "business") || "home",
            smartFeatures: true,
            image: p.image_url || undefined,
          }));
          setChargingStations(mapped);
        }
      } catch (err) {
        console.log("Using fallback charging stations (API not available)");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const getChargerImage = (station: ChargingStation) => {
    return station.image || fallbackImages[station.id] || chargerImg;
  };

  const calculateYearlyConsumption = () => {
    const km = parseFloat(yearlyKm) || 0;
    const cons = parseFloat(consumption) || 18;
    return (km / 100) * cons;
  };

  const calculateYearlyCost = () => {
    const kWh = calculateYearlyConsumption();
    const price = parseFloat(electricityPrice) || 0.25;
    const solarDiscount = hasSolarPanels ? 0.7 : 1; // 30% korting met zonnepanelen
    return kWh * price * solarDiscount;
  };

  const calculateFuelComparison = () => {
    const km = parseFloat(yearlyKm) || 0;
    const fuelPrice = 1.95; // €/liter
    const fuelConsumption = 7; // liter per 100km
    const fuelCost = (km / 100) * fuelConsumption * fuelPrice;
    return fuelCost - calculateYearlyCost();
  };

  const getTotalPrice = () => {
    const station = chargingStations.find(s => s.id === selectedStation);
    const installation = installationTypes.find(i => i.id === installationType);
    return (station?.price || 0) + (installation?.price || 0);
  };

  const handleCalculate = () => {
    if (parseFloat(yearlyKm) > 0) {
      setShowResults(true);
    }
  };

  const handleExportPDF = async () => {
    const selectedStationData = chargingStations.find(s => s.id === selectedStation);
    const selectedInstallation = installationTypes.find(i => i.id === installationType);
    
    const { doc, yPos: startY } = await createPDFBase({ title: "Laadpaal Offerte" });
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = startY;

    // Situation
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Uw Situatie", 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Locatie: ${locationType === "home" ? "Particulier" : "Zakelijk"}`, 25, yPos); yPos += 6;
    doc.text(`Jaarlijks rijden: ${parseInt(yearlyKm).toLocaleString("nl-NL")} km`, 25, yPos); yPos += 6;
    doc.text(`Verbruik: ${consumption} kWh/100km`, 25, yPos); yPos += 6;
    doc.text(`Stroomprijs: €${electricityPrice}/kWh`, 25, yPos); yPos += 6;
    doc.text(`Zonnepanelen: ${hasSolarPanels ? "Ja" : "Nee"}`, 25, yPos); yPos += 15;

    // Selected charger
    if (selectedStationData) {
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yPos - 5, pageWidth - 30, 40, "F");
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Geselecteerde Laadpaal", 20, yPos + 5);
      yPos += 12;
      doc.text(`${selectedStationData.brand} ${selectedStationData.name}`, 25, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Vermogen: ${selectedStationData.power} kW`, 25, yPos);
      yPos += 7;
      doc.text(`Kenmerken: ${selectedStationData.features.join(", ")}`, 25, yPos);
      yPos += 20;
    }

    // Results
    const yearlyConsumption = calculateYearlyConsumption();
    const yearlyCost = calculateYearlyCost();
    const fuelSavings = calculateFuelComparison();
    const totalPrice = getTotalPrice();

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Berekende Resultaten", 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    doc.text(`Jaarlijks verbruik: ${Math.round(yearlyConsumption).toLocaleString("nl-NL")} kWh`, 25, yPos); yPos += 6;
    doc.text(`Jaarlijkse laadkosten: €${Math.round(yearlyCost).toLocaleString("nl-NL")},-`, 25, yPos); yPos += 6;
    doc.text(`Besparing t.o.v. benzine: €${Math.round(fuelSavings).toLocaleString("nl-NL")},-/jaar`, 25, yPos); yPos += 15;

    // Price breakdown
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Investering", 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    if (selectedStationData && selectedInstallation) {
      doc.text(`${selectedStationData.brand} ${selectedStationData.name}`, 25, yPos);
      doc.text(`€${selectedStationData.price.toLocaleString("nl-NL")},-`, pageWidth - 50, yPos);
      yPos += 6;
      doc.text(`${selectedInstallation.label}`, 25, yPos);
      doc.text(`€${selectedInstallation.price.toLocaleString("nl-NL")},-`, pageWidth - 50, yPos);
      yPos += 8;

      doc.setDrawColor(0, 102, 204);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 8;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 102, 204);
      doc.text("Totaal:", 25, yPos);
      doc.text(`€${totalPrice.toLocaleString("nl-NL")},-`, pageWidth - 50, yPos);
      yPos += 15;

      const paybackYears = totalPrice / fuelSavings;
      doc.setTextColor(0, 128, 0);
      doc.text(`Terugverdientijd (t.o.v. benzine): ${paybackYears.toFixed(1)} jaar`, 25, yPos);
    }

    addPDFFooter(doc);
    savePDF(doc, "Laadpaal-Offerte");
    
    toast({
      title: "PDF gedownload!",
      description: "Uw laadpaal offerte is opgeslagen.",
    });
  };

  const filteredStations = chargingStations.filter(s => s.type === locationType || s.type === "home");
  const selectedStationData = chargingStations.find(s => s.id === selectedStation);
  const selectedInstallation = installationTypes.find(i => i.id === installationType);
  const yearlyConsumption = calculateYearlyConsumption();
  const yearlyCost = calculateYearlyCost();
  const fuelSavings = calculateFuelComparison();
  const totalPrice = getTotalPrice();

  return (
    <div className="space-y-8">
      {/* Hero Image */}
      <div className="relative rounded-2xl overflow-hidden h-48 md:h-64">
        <img 
          src={chargerImg} 
          alt="Laadpaal voor elektrische auto"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">
            Laadpalen
          </span>
          <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mt-2">
            Configureer Uw Laadpaal
          </h2>
        </div>
      </div>
      
      <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-center">
        Bereken uw laadkosten en besparing t.o.v. benzine. Kies de perfecte laadpaal voor uw situatie.
      </p>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Location Type */}
        <Card className="border-2 border-accent/20">
          <CardHeader className="bg-accent/5">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Plug className="w-6 h-6 text-accent" />
              Type Locatie
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => setLocationType("home")}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  locationType === "home"
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Home className="w-6 h-6 text-accent" />
                  <span className="font-semibold">Particulier</span>
                  {locationType === "home" && <Check className="w-5 h-5 text-accent ml-auto" />}
                </div>
                <p className="text-sm text-muted-foreground">
                  Laadpaal voor thuis, privé gebruik
                </p>
              </button>
              <button
                onClick={() => setLocationType("business")}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  locationType === "business"
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-6 h-6 text-accent" />
                  <span className="font-semibold">Zakelijk</span>
                  {locationType === "business" && <Check className="w-5 h-5 text-accent ml-auto" />}
                </div>
                <p className="text-sm text-muted-foreground">
                  Laadpaal voor bedrijf, meerdere gebruikers
                </p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Usage Input */}
        <Card className="border-2 border-accent/20">
          <CardHeader className="bg-accent/5">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calculator className="w-6 h-6 text-accent" />
              Uw Rijgedrag
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Car className="w-4 h-4 inline mr-2" />
                  Jaarlijks gereden km
                </label>
                <Input
                  type="number"
                  placeholder="bijv. 15000"
                  value={yearlyKm}
                  onChange={(e) => setYearlyKm(e.target.value)}
                  min="1000"
                  max="100000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Zap className="w-4 h-4 inline mr-2" />
                  Verbruik (kWh/100km)
                </label>
                <Input
                  type="number"
                  placeholder="bijv. 18"
                  value={consumption}
                  onChange={(e) => setConsumption(e.target.value)}
                  min="10"
                  max="30"
                  step="0.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Gemiddeld: 15-20 kWh/100km
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Euro className="w-4 h-4 inline mr-2" />
                  Stroomprijs (€/kWh)
                </label>
                <Input
                  type="number"
                  placeholder="0.25"
                  value={electricityPrice}
                  onChange={(e) => setElectricityPrice(e.target.value)}
                  min="0.10"
                  max="0.50"
                  step="0.01"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="solar"
                  checked={hasSolarPanels}
                  onChange={(e) => setHasSolarPanels(e.target.checked)}
                  className="w-5 h-5 accent-accent"
                />
                <label htmlFor="solar" className="text-sm font-medium cursor-pointer">
                  Ik heb zonnepanelen (±30% goedkoper laden)
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charger Selection */}
        <Card className="border-2 border-accent/20">
          <CardHeader className="bg-accent/5">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Plug className="w-6 h-6 text-accent" />
              Kies Uw Laadpaal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStations.map((station) => (
                <div
                  key={station.id}
                  onClick={() => setSelectedStation(station.id)}
                  className={`relative rounded-lg border-2 cursor-pointer transition-all overflow-hidden ${
                    selectedStation === station.id
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <CompareCheckbox
                    productId={station.id}
                    isSelected={compareProducts.includes(station.id)}
                    onToggle={toggleCompare}
                    disabled={compareProducts.length >= 4}
                  />
                  {/* Product Image */}
                  <div className="h-28 bg-muted/30 overflow-hidden">
                    <img 
                      src={getChargerImage(station)}
                      alt={`${station.brand} ${station.name}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{station.brand}</p>
                        <h4 className="font-semibold">{station.name}</h4>
                      </div>
                      {selectedStation === station.id && (
                        <Check className="w-5 h-5 text-accent" />
                      )}
                    </div>
                    <Badge variant="secondary" className="mb-2">
                      {station.power} kW
                    </Badge>
                    <ul className="space-y-1 text-sm text-muted-foreground mb-3">
                      {station.features.slice(0, 3).map((feature) => (
                        <li key={feature} className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-accent rounded-full" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <p className="text-lg font-bold text-accent">
                      €{station.price.toLocaleString("nl-NL")},-
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Installation Type */}
        <Card className="border-2 border-accent/20">
          <CardHeader className="bg-accent/5">
            <CardTitle className="flex items-center gap-2 text-xl">
              🔧 Installatietype
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-4">
              {installationTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setInstallationType(type.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    installationType === type.id
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{type.label}</span>
                    {installationType === type.id && <Check className="w-5 h-5 text-accent" />}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{type.description}</p>
                  <p className="text-lg font-bold text-accent">€{type.price},-</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Calculate Button */}
        <div className="text-center">
          <Button size="lg" onClick={handleCalculate} className="text-lg px-12">
            <Calculator className="w-5 h-5 mr-2" />
            Bereken Kosten
          </Button>
        </div>

        {/* Results */}
        {showResults && selectedStationData && selectedInstallation && (
          <Card className="border-2 border-accent">
            <CardHeader className="bg-accent/10">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Car className="w-7 h-7 text-accent" />
                Uw Resultaten
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <Zap className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-3xl font-bold text-foreground">
                    {Math.round(yearlyConsumption).toLocaleString("nl-NL")}
                  </p>
                  <p className="text-sm text-muted-foreground">kWh per jaar</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <Euro className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-3xl font-bold text-foreground">
                    €{Math.round(yearlyCost).toLocaleString("nl-NL")}
                  </p>
                  <p className="text-sm text-muted-foreground">Laadkosten/jaar</p>
                </div>
                <div className="text-center p-4 bg-green-100 rounded-lg border-2 border-green-500">
                  <Car className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-green-600">
                    €{Math.round(fuelSavings).toLocaleString("nl-NL")}
                  </p>
                  <p className="text-sm text-muted-foreground">Besparing/jaar t.o.v. benzine</p>
                </div>
                <div className="text-center p-4 bg-accent/20 rounded-lg border-2 border-accent">
                  <Plug className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-3xl font-bold text-accent">
                    {(totalPrice / fuelSavings).toFixed(1)} jaar
                  </p>
                  <p className="text-sm text-muted-foreground">Terugverdientijd</p>
                </div>
              </div>

              <div className="p-6 bg-muted/30 rounded-lg mb-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-accent" />
                  Investering Overzicht
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {selectedStationData.brand} {selectedStationData.name} ({selectedStationData.power} kW)
                    </span>
                    <span>€{selectedStationData.price.toLocaleString("nl-NL")},-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{selectedInstallation.label}</span>
                    <span>€{selectedInstallation.price.toLocaleString("nl-NL")},-</span>
                  </div>
                  <hr className="my-2 border-border" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Totaal</span>
                    <span className="text-accent">€{totalPrice.toLocaleString("nl-NL")},-</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
                  <Button size="lg" asChild>
                    <a href="/#contact">Offerte Aanvragen</a>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="tel:0613629947">Bel voor Advies</a>
                  </Button>
                  <Button size="lg" variant="secondary" onClick={handleExportPDF}>
                    <FileDown className="w-5 h-5 mr-2" />
                    Download PDF
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
        category="Laadpaal"
        maxCompare={4}
        selectedProducts={compareProducts}
        onToggleProduct={toggleCompare}
      />
    </div>
  );
};

export default ChargingStationCalculator;
