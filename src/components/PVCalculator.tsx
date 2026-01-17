import { useState } from "react";
import { Sun, Calculator, Zap, Euro, TrendingUp, Home, Check, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { createPDFBase, addPDFFooter, savePDF } from "@/lib/pdfExport";

import solarPanelsImg from "@/assets/solar-panels.jpg";

interface SolarPanel {
  id: string;
  name: string;
  brand: string;
  wattPeak: number;
  pricePerPanel: number;
  warranty: string;
  efficiency: string;
}

const solarPanels: SolarPanel[] = [
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

const roofOrientations = [
  { id: "south", label: "Zuid", factor: 1.0 },
  { id: "south-east", label: "Zuid-Oost", factor: 0.95 },
  { id: "south-west", label: "Zuid-West", factor: 0.95 },
  { id: "east", label: "Oost", factor: 0.85 },
  { id: "west", label: "West", factor: 0.85 },
  { id: "flat", label: "Plat dak", factor: 0.9 },
];

const PVCalculator = () => {
  const { toast } = useToast();
  const [yearlyUsage, setYearlyUsage] = useState<string>("3500");
  const [roofOrientation, setRoofOrientation] = useState<string>("south");
  const [roofArea, setRoofArea] = useState<string>("30");
  const [electricityPrice, setElectricityPrice] = useState<number[]>([0.30]);
  const [selectedPanel, setSelectedPanel] = useState<string>("longi-400");
  const [showResults, setShowResults] = useState(false);

  const getOrientationFactor = () => {
    return roofOrientations.find(o => o.id === roofOrientation)?.factor || 1;
  };

  const calculatePanelCount = () => {
    const panel = solarPanels.find(p => p.id === selectedPanel);
    if (!panel) return 0;
    
    const usage = parseFloat(yearlyUsage) || 0;
    const sunHours = 900;
    const orientationFactor = getOrientationFactor();
    const yearlyProductionPerPanel = (panel.wattPeak / 1000) * sunHours * orientationFactor;
    
    const neededPanels = Math.ceil(usage / yearlyProductionPerPanel);
    const maxPanels = Math.floor((parseFloat(roofArea) || 0) / 1.7);
    
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
    if (!panel) return 0;
    
    const panelCount = calculatePanelCount();
    const panelCost = panelCount * panel.pricePerPanel;
    const inverterCost = panelCount * 80;
    const installationCost = 500 + (panelCount * 40);
    
    return panelCost + inverterCost + installationCost;
  };

  const calculateYearlySavings = () => {
    const production = calculateYearlyProduction();
    const usage = parseFloat(yearlyUsage) || 0;
    
    const directUsePercentage = 0.3;
    const directUse = Math.min(production * directUsePercentage, usage);
    const feedIn = production - directUse;
    
    const savingsFromDirectUse = directUse * electricityPrice[0];
    const feedInRate = 0.07;
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

  const handleExportPDF = async () => {
    const selectedPanelData = solarPanels.find(p => p.id === selectedPanel);
    const orientationLabel = roofOrientations.find(o => o.id === roofOrientation)?.label || roofOrientation;
    
    const { doc, yPos: startY } = await createPDFBase({ title: "Zonnepanelen Offerte" });
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = startY;

    // System specs
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Systeemspecificaties", 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Jaarlijks verbruik: ${yearlyUsage} kWh`, 25, yPos); yPos += 6;
    doc.text(`Dakoppervlak: ${roofArea} m²`, 25, yPos); yPos += 6;
    doc.text(`Dakoriëntatie: ${orientationLabel}`, 25, yPos); yPos += 6;
    doc.text(`Stroomprijs: €${electricityPrice[0].toFixed(2)}/kWh`, 25, yPos); yPos += 15;

    // Selected panel
    if (selectedPanelData) {
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yPos - 5, pageWidth - 30, 35, "F");
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Geselecteerd Paneel", 20, yPos + 5);
      yPos += 12;
      doc.text(`${selectedPanelData.brand} ${selectedPanelData.name}`, 25, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedPanelData.wattPeak}Wp | Rendement: ${selectedPanelData.efficiency} | Garantie: ${selectedPanelData.warranty}`, 25, yPos);
      yPos += 20;
    }

    // Results
    const panelCount = calculatePanelCount();
    const yearlyProduction = calculateYearlyProduction();
    const totalInvestment = calculateTotalInvestment();
    const yearlySavings = calculateYearlySavings();
    const paybackPeriod = calculatePaybackPeriod();
    const profit25Year = calculate25YearProfit();

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Berekende Resultaten", 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    doc.text(`Aantal panelen: ${panelCount}`, 25, yPos); yPos += 6;
    doc.text(`Jaarlijkse productie: ${Math.round(yearlyProduction).toLocaleString("nl-NL")} kWh`, 25, yPos); yPos += 6;
    doc.text(`Dekking verbruik: ${Math.round((yearlyProduction / parseFloat(yearlyUsage)) * 100)}%`, 25, yPos); yPos += 6;
    doc.text(`Jaarlijkse besparing: €${Math.round(yearlySavings).toLocaleString("nl-NL")},-`, 25, yPos); yPos += 6;
    doc.text(`Terugverdientijd: ${paybackPeriod.toFixed(1)} jaar`, 25, yPos); yPos += 15;

    // Price breakdown
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Investering", 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const panelCost = panelCount * (selectedPanelData?.pricePerPanel || 0);
    const inverterCost = panelCount * 80;
    const installationCost = 500 + panelCount * 40;

    doc.text(`Zonnepanelen (${panelCount}x)`, 25, yPos);
    doc.text(`€${panelCost.toLocaleString("nl-NL")},-`, pageWidth - 50, yPos);
    yPos += 6;
    doc.text("Omvormer", 25, yPos);
    doc.text(`€${inverterCost.toLocaleString("nl-NL")},-`, pageWidth - 50, yPos);
    yPos += 6;
    doc.text("Installatie", 25, yPos);
    doc.text(`€${installationCost.toLocaleString("nl-NL")},-`, pageWidth - 50, yPos);
    yPos += 8;

    doc.setDrawColor(0, 102, 204);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 102, 204);
    doc.text("Totaal:", 25, yPos);
    doc.text(`€${totalInvestment.toLocaleString("nl-NL")},-`, pageWidth - 50, yPos);
    yPos += 15;

    doc.setTextColor(0, 128, 0);
    doc.text(`Winst na 25 jaar: €${Math.round(profit25Year).toLocaleString("nl-NL")},-`, 25, yPos);

    addPDFFooter(doc);
    savePDF(doc, "Zonnepanelen-Offerte");
    
    toast({
      title: "PDF gedownload!",
      description: "Uw zonnepanelen offerte is opgeslagen.",
    });
  };

  const panelCount = calculatePanelCount();
  const yearlyProduction = calculateYearlyProduction();
  const totalInvestment = calculateTotalInvestment();
  const yearlySavings = calculateYearlySavings();
  const paybackPeriod = calculatePaybackPeriod();
  const profit25Year = calculate25YearProfit();
  const selectedPanelData = solarPanels.find(p => p.id === selectedPanel);

  return (
    <div className="space-y-8">
      {/* Hero Image */}
      <div className="relative rounded-2xl overflow-hidden h-48 md:h-64">
        <img 
          src={solarPanelsImg} 
          alt="Zonnepanelen installatie"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">
            Zonnepanelen
          </span>
          <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mt-2">
            Bereken Uw Besparing
          </h2>
        </div>
      </div>
      
      <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-center">
        Ontdek hoeveel u kunt besparen met zonnepanelen, inclusief terugverdientijd.
      </p>

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
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPanel === panel.id
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
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
                    <p className="text-muted-foreground">Garantie: {panel.warranty}</p>
                  </div>
                  <p className="mt-3 text-lg font-bold text-accent">
                    €{panel.pricePerPanel},-/paneel
                  </p>
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
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <Zap className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-3xl font-bold text-foreground">
                    {Math.round(yearlyProduction).toLocaleString("nl-NL")}
                  </p>
                  <p className="text-sm text-muted-foreground">kWh per jaar</p>
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
                      Dit is uw totale besparing minus de investering.
                    </p>
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
    </div>
  );
};

export default PVCalculator;
