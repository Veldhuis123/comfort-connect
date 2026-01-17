import { useState } from "react";
import { Battery, Calculator, Zap, Euro, TrendingUp, Check, FileDown, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { createPDFBase, addPDFFooter, savePDF } from "@/lib/pdfExport";

interface BatteryOption {
  id: string;
  name: string;
  brand: string;
  capacity: number;
  price: number;
  warranty: string;
  features: string[];
  cycles: number;
}

const batteryOptions: BatteryOption[] = [
  {
    id: "huawei-5",
    name: "LUNA 2000",
    brand: "Huawei",
    capacity: 5,
    price: 3500,
    warranty: "10 jaar",
    features: ["Modulair uitbreidbaar", "Noodstroom mogelijk", "Smart monitoring"],
    cycles: 6000,
  },
  {
    id: "huawei-10",
    name: "LUNA 2000",
    brand: "Huawei",
    capacity: 10,
    price: 6500,
    warranty: "10 jaar",
    features: ["Modulair uitbreidbaar", "Noodstroom mogelijk", "Smart monitoring"],
    cycles: 6000,
  },
  {
    id: "huawei-15",
    name: "LUNA 2000",
    brand: "Huawei",
    capacity: 15,
    price: 9500,
    warranty: "10 jaar",
    features: ["Modulair uitbreidbaar", "Noodstroom mogelijk", "Smart monitoring"],
    cycles: 6000,
  },
  {
    id: "byd-10",
    name: "Battery-Box Premium",
    brand: "BYD",
    capacity: 10.2,
    price: 7200,
    warranty: "10 jaar",
    features: ["LFP batterij", "Zeer veilig", "Lange levensduur"],
    cycles: 8000,
  },
  {
    id: "byd-12",
    name: "Battery-Box Premium",
    brand: "BYD",
    capacity: 12.8,
    price: 8900,
    warranty: "10 jaar",
    features: ["LFP batterij", "Zeer veilig", "Lange levensduur"],
    cycles: 8000,
  },
  {
    id: "pylontech-7",
    name: "Force H2",
    brand: "Pylontech",
    capacity: 7.1,
    price: 4800,
    warranty: "10 jaar",
    features: ["High voltage", "Modulair", "Compacte installatie"],
    cycles: 6000,
  },
];

const BatteryCalculator = () => {
  const { toast } = useToast();
  const [yearlyUsage, setYearlyUsage] = useState<string>("3500");
  const [solarProduction, setSolarProduction] = useState<string>("4000");
  const [electricityPrice, setElectricityPrice] = useState<number[]>([0.30]);
  const [feedInRate, setFeedInRate] = useState<number[]>([0.07]);
  const [selectedBattery, setSelectedBattery] = useState<string>("huawei-10");
  const [showResults, setShowResults] = useState(false);

  const calculateSavings = () => {
    const battery = batteryOptions.find(b => b.id === selectedBattery);
    if (!battery) return { withBattery: 0, withoutBattery: 0, extraSavings: 0 };
    
    const usage = parseFloat(yearlyUsage) || 0;
    const production = parseFloat(solarProduction) || 0;
    
    // Without battery: 30% direct use
    const directUseWithout = Math.min(production * 0.3, usage);
    const feedInWithout = production - directUseWithout;
    const savingsWithout = directUseWithout * electricityPrice[0] + feedInWithout * feedInRate[0];
    
    // With battery: 70-80% direct use depending on capacity
    const capacityFactor = Math.min(0.85, 0.5 + (battery.capacity / 20));
    const directUseWith = Math.min(production * capacityFactor, usage);
    const feedInWith = production - directUseWith;
    const savingsWith = directUseWith * electricityPrice[0] + feedInWith * feedInRate[0];
    
    return {
      withBattery: savingsWith,
      withoutBattery: savingsWithout,
      extraSavings: savingsWith - savingsWithout,
    };
  };

  const calculatePaybackPeriod = () => {
    const battery = batteryOptions.find(b => b.id === selectedBattery);
    if (!battery) return 0;
    
    const savings = calculateSavings();
    const installationCost = 500;
    const totalCost = battery.price + installationCost;
    
    if (savings.extraSavings <= 0) return 99;
    return totalCost / savings.extraSavings;
  };

  const calculateROI = () => {
    const battery = batteryOptions.find(b => b.id === selectedBattery);
    if (!battery) return 0;
    
    const savings = calculateSavings();
    const installationCost = 500;
    const totalCost = battery.price + installationCost;
    
    // 15 years of savings (typical battery lifetime)
    const totalSavings = savings.extraSavings * 15;
    return totalSavings - totalCost;
  };

  const handleCalculate = () => {
    if (parseFloat(yearlyUsage) > 0 && parseFloat(solarProduction) > 0) {
      setShowResults(true);
    }
  };

  const handleExportPDF = async () => {
    const selectedBatteryData = batteryOptions.find(b => b.id === selectedBattery);
    const savings = calculateSavings();
    
    const { doc, yPos: startY } = await createPDFBase({ title: "Thuisaccu Offerte" });
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = startY;

    // System specs
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Uw Situatie", 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Jaarlijks verbruik: ${yearlyUsage} kWh`, 25, yPos); yPos += 6;
    doc.text(`Zonnepanelen productie: ${solarProduction} kWh/jaar`, 25, yPos); yPos += 6;
    doc.text(`Stroomprijs: €${electricityPrice[0].toFixed(2)}/kWh`, 25, yPos); yPos += 6;
    doc.text(`Teruglevertarief: €${feedInRate[0].toFixed(2)}/kWh`, 25, yPos); yPos += 15;

    // Selected battery
    if (selectedBatteryData) {
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yPos - 5, pageWidth - 30, 40, "F");
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Geselecteerde Thuisaccu", 20, yPos + 5);
      yPos += 12;
      doc.text(`${selectedBatteryData.brand} ${selectedBatteryData.name}`, 25, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Capaciteit: ${selectedBatteryData.capacity} kWh | Garantie: ${selectedBatteryData.warranty}`, 25, yPos);
      yPos += 7;
      doc.text(`Kenmerken: ${selectedBatteryData.features.join(", ")}`, 25, yPos);
      yPos += 20;
    }

    // Results
    const paybackPeriod = calculatePaybackPeriod();
    const roi = calculateROI();

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Berekende Resultaten", 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    doc.text(`Huidige besparing (zonder accu): €${Math.round(savings.withoutBattery).toLocaleString("nl-NL")},-/jaar`, 25, yPos); yPos += 6;
    doc.text(`Besparing met accu: €${Math.round(savings.withBattery).toLocaleString("nl-NL")},-/jaar`, 25, yPos); yPos += 6;
    doc.text(`Extra besparing door accu: €${Math.round(savings.extraSavings).toLocaleString("nl-NL")},-/jaar`, 25, yPos); yPos += 6;
    doc.text(`Terugverdientijd: ${paybackPeriod.toFixed(1)} jaar`, 25, yPos); yPos += 15;

    // Price
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Investering", 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    if (selectedBatteryData) {
      doc.text(`Thuisaccu (${selectedBatteryData.capacity} kWh)`, 25, yPos);
      doc.text(`€${selectedBatteryData.price.toLocaleString("nl-NL")},-`, pageWidth - 50, yPos);
      yPos += 6;
      doc.text("Installatie", 25, yPos);
      doc.text("€500,-", pageWidth - 50, yPos);
      yPos += 8;

      doc.setDrawColor(0, 102, 204);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 8;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 102, 204);
      doc.text("Totaal:", 25, yPos);
      doc.text(`€${(selectedBatteryData.price + 500).toLocaleString("nl-NL")},-`, pageWidth - 50, yPos);
      yPos += 15;

      if (roi > 0) {
        doc.setTextColor(0, 128, 0);
        doc.text(`Winst na 15 jaar: €${Math.round(roi).toLocaleString("nl-NL")},-`, 25, yPos);
      }
    }

    addPDFFooter(doc);
    savePDF(doc, "Thuisaccu-Offerte");
    
    toast({
      title: "PDF gedownload!",
      description: "Uw thuisaccu offerte is opgeslagen.",
    });
  };

  const selectedBatteryData = batteryOptions.find(b => b.id === selectedBattery);
  const savings = calculateSavings();
  const paybackPeriod = calculatePaybackPeriod();
  const roi = calculateROI();

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <span className="text-accent font-semibold text-sm uppercase tracking-wider">
          Thuisaccu
        </span>
        <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6">
          Bereken Uw Besparing
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Ontdek hoeveel extra u bespaart met een thuisaccu naast uw zonnepanelen.
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
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Sun className="w-4 h-4 inline mr-2" />
                  Zonnepanelen productie (kWh/jaar)
                </label>
                <Input
                  type="number"
                  placeholder="bijv. 4000"
                  value={solarProduction}
                  onChange={(e) => setSolarProduction(e.target.value)}
                  min="1000"
                  max="30000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Kijk op uw omvormer of energierekening
                </p>
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
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Euro className="w-4 h-4 inline mr-2" />
                  Teruglevertarief: €{feedInRate[0].toFixed(2)}/kWh
                </label>
                <Slider
                  value={feedInRate}
                  onValueChange={setFeedInRate}
                  min={0.0}
                  max={0.15}
                  step={0.01}
                  className="mt-4"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Let op: salderen wordt afgebouwd
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Battery Selection */}
        <Card className="border-2 border-accent/20">
          <CardHeader className="bg-accent/5">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Battery className="w-6 h-6 text-accent" />
              Kies Uw Thuisaccu
            </CardTitle>
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
                  <Badge variant="secondary" className="mb-2">
                    {battery.capacity} kWh
                  </Badge>
                  <ul className="space-y-1 text-sm text-muted-foreground mb-3">
                    {battery.features.slice(0, 2).map((feature) => (
                      <li key={feature} className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-accent rounded-full" />
                        {feature}
                      </li>
                    ))}
                    <li className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-accent rounded-full" />
                      {battery.cycles} laadcycli
                    </li>
                  </ul>
                  <p className="text-lg font-bold text-accent">
                    €{battery.price.toLocaleString("nl-NL")},-
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
        {showResults && selectedBatteryData && (
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
                  <Battery className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-3xl font-bold text-foreground">{selectedBatteryData.capacity}</p>
                  <p className="text-sm text-muted-foreground">kWh capaciteit</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <Euro className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-3xl font-bold text-foreground">
                    €{Math.round(savings.extraSavings).toLocaleString("nl-NL")}
                  </p>
                  <p className="text-sm text-muted-foreground">Extra besparing/jaar</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <Zap className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-3xl font-bold text-foreground">
                    €{Math.round(savings.withBattery).toLocaleString("nl-NL")}
                  </p>
                  <p className="text-sm text-muted-foreground">Totale besparing/jaar</p>
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
                      <span className="text-muted-foreground">Thuisaccu ({selectedBatteryData.capacity} kWh)</span>
                      <span>€{selectedBatteryData.price.toLocaleString("nl-NL")},-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Installatie</span>
                      <span>€500,-</span>
                    </div>
                    <hr className="my-2 border-border" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Totaal</span>
                      <span className="text-accent">€{(selectedBatteryData.price + 500).toLocaleString("nl-NL")},-</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-accent/10 rounded-lg border-2 border-accent/30">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    15 Jaar Vooruitzicht
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className={`text-3xl font-bold ${roi > 0 ? "text-green-600" : "text-red-500"}`}>
                        €{Math.round(roi).toLocaleString("nl-NL")},-
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {roi > 0 ? "Netto winst" : "Netto kosten"} na 15 jaar
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Op basis van de huidige stroomprijs en teruglevertarief.
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

export default BatteryCalculator;
