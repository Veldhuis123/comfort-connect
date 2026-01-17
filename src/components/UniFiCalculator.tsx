import { useState } from "react";
import { Wifi, Camera, Calculator, Check, Router, Shield, Plus, Minus, Euro, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { createPDFBase, addPDFFooter, savePDF } from "@/lib/pdfExport";

import unifiApImg from "@/assets/unifi-ap.jpg";

interface NetworkProduct {
  id: string;
  name: string;
  category: "router" | "switch" | "accesspoint" | "camera";
  price: number;
  description: string;
  features: string[];
}

const products: NetworkProduct[] = [
  // Routers/Gateways
  {
    id: "udm-se",
    name: "UniFi Dream Machine SE",
    category: "router",
    price: 499,
    description: "All-in-one router met PoE+ switch en NVR",
    features: ["8-poorts PoE+ switch", "Ingebouwde NVR", "2.5GbE WAN", "IDS/IPS beveiliging"],
  },
  {
    id: "ucg-ultra",
    name: "UniFi Cloud Gateway Ultra",
    category: "router",
    price: 129,
    description: "Compacte gateway voor kleinere netwerken",
    features: ["2.5GbE poort", "Tot 1 Gbps routering", "UniFi OS", "Compact formaat"],
  },
  // Switches
  {
    id: "usw-lite-8-poe",
    name: "USW Lite 8 PoE",
    category: "switch",
    price: 119,
    description: "8-poorts switch met 4x PoE",
    features: ["4 PoE poorten (52W)", "Gigabit", "Compact design", "Stille werking"],
  },
  {
    id: "usw-pro-24-poe",
    name: "USW Pro 24 PoE",
    category: "switch",
    price: 499,
    description: "24-poorts managed switch met PoE+",
    features: ["16 PoE+ poorten", "400W budget", "Layer 3", "SFP+ uplinks"],
  },
  // Access Points
  {
    id: "u6-lite",
    name: "U6 Lite",
    category: "accesspoint",
    price: 99,
    description: "WiFi 6 access point voor basis gebruik",
    features: ["WiFi 6 (AX1500)", "PoE powered", "Tot 300+ apparaten", "Dual-band"],
  },
  {
    id: "u6-pro",
    name: "U6 Pro",
    category: "accesspoint",
    price: 159,
    description: "High-performance WiFi 6 access point",
    features: ["WiFi 6 (AX5400)", "PoE+ powered", "MU-MIMO", "Band steering"],
  },
  {
    id: "u7-pro",
    name: "U7 Pro",
    category: "accesspoint",
    price: 189,
    description: "WiFi 7 access point voor maximale snelheid",
    features: ["WiFi 7 (BE11000)", "6 GHz band", "MLO technologie", "Tri-band"],
  },
  // Cameras
  {
    id: "g4-bullet",
    name: "G4 Bullet",
    category: "camera",
    price: 199,
    description: "4MP bullet camera voor buiten",
    features: ["4MP resolutie", "Weerbestendig (IP67)", "Nachtzicht 25m", "Smart detectie"],
  },
  {
    id: "g4-dome",
    name: "G4 Dome",
    category: "camera",
    price: 199,
    description: "4MP dome camera voor binnen/buiten",
    features: ["4MP resolutie", "Vandaalbestendig", "IR nachtzicht", "PoE powered"],
  },
  {
    id: "g5-pro",
    name: "G5 Pro",
    category: "camera",
    price: 449,
    description: "4K Pro camera met AI functies",
    features: ["4K resolutie", "AI detectie", "Optische zoom 3x", "Premium kwaliteit"],
  },
  {
    id: "g4-doorbell-pro",
    name: "G4 Doorbell Pro",
    category: "camera",
    price: 299,
    description: "Smart video deurbel met pakketdetectie",
    features: ["5MP camera", "Pakketdetectie", "Two-way audio", "Fingerprint reader"],
  },
];

interface SelectedProduct {
  product: NetworkProduct;
  quantity: number;
}

const UniFiCalculator = () => {
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [buildingSize, setBuildingSize] = useState<string>("100");
  const [floors, setFloors] = useState<string>("1");
  const [outdoorCoverage, setOutdoorCoverage] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const addProduct = (product: NetworkProduct) => {
    const existing = selectedProducts.find(sp => sp.product.id === product.id);
    if (existing) {
      setSelectedProducts(selectedProducts.map(sp => 
        sp.product.id === product.id 
          ? { ...sp, quantity: sp.quantity + 1 }
          : sp
      ));
    } else {
      setSelectedProducts([...selectedProducts, { product, quantity: 1 }]);
    }
  };

  const removeProduct = (productId: string) => {
    const existing = selectedProducts.find(sp => sp.product.id === productId);
    if (existing && existing.quantity > 1) {
      setSelectedProducts(selectedProducts.map(sp => 
        sp.product.id === productId 
          ? { ...sp, quantity: sp.quantity - 1 }
          : sp
      ));
    } else {
      setSelectedProducts(selectedProducts.filter(sp => sp.product.id !== productId));
    }
  };

  const getQuantity = (productId: string) => {
    return selectedProducts.find(sp => sp.product.id === productId)?.quantity || 0;
  };

  const calculateRecommendation = () => {
    const size = parseFloat(buildingSize) || 100;
    const floorCount = parseInt(floors) || 1;
    
    // Recommend access points based on size (1 AP per 80m² roughly)
    const recommendedAPs = Math.ceil((size * floorCount) / 80);
    
    return {
      accessPoints: recommendedAPs,
      needsSwitch: recommendedAPs > 2 || floorCount > 1,
      needsOutdoorAP: outdoorCoverage,
    };
  };

  const getTotalPrice = () => {
    const productTotal = selectedProducts.reduce(
      (total, sp) => total + (sp.product.price * sp.quantity), 
      0
    );
    const installationCost = calculateInstallationCost();
    return productTotal + installationCost;
  };

  const calculateInstallationCost = () => {
    const totalProducts = selectedProducts.reduce((sum, sp) => sum + sp.quantity, 0);
    const cameras = selectedProducts.filter(sp => sp.product.category === "camera")
      .reduce((sum, sp) => sum + sp.quantity, 0);
    const accessPoints = selectedProducts.filter(sp => sp.product.category === "accesspoint")
      .reduce((sum, sp) => sum + sp.quantity, 0);
    
    // Base installation + per device cost
    const baseCost = 150;
    const perAPCost = 50;
    const perCameraCost = 75;
    const otherDeviceCost = 25;
    
    return baseCost + 
      (accessPoints * perAPCost) + 
      (cameras * perCameraCost) + 
      ((totalProducts - accessPoints - cameras) * otherDeviceCost);
  };

  const handleExportPDF = async () => {
    const { doc, yPos: startY } = await createPDFBase({ title: "UniFi Netwerk Offerte" });
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = startY;

    // Building info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Situatie", 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Oppervlakte: ${buildingSize} m²`, 25, yPos); yPos += 6;
    doc.text(`Verdiepingen: ${floors}`, 25, yPos); yPos += 6;
    doc.text(`Buitenbereik: ${outdoorCoverage ? "Ja" : "Nee"}`, 25, yPos); yPos += 15;

    // Selected products
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Geselecteerde Producten", 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    selectedProducts.forEach(({ product, quantity }) => {
      doc.text(`${quantity}x ${product.name}`, 25, yPos);
      doc.text(`€${(product.price * quantity).toLocaleString("nl-NL")},-`, pageWidth - 50, yPos);
      yPos += 6;
    });

    yPos += 5;
    doc.text("Installatie & configuratie", 25, yPos);
    doc.text(`€${calculateInstallationCost().toLocaleString("nl-NL")},-`, pageWidth - 50, yPos);
    yPos += 10;

    doc.setDrawColor(0, 102, 204);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 102, 204);
    doc.text("Totaal:", 25, yPos);
    doc.text(`€${getTotalPrice().toLocaleString("nl-NL")},-`, pageWidth - 50, yPos);
    yPos += 15;

    // Included services
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Inbegrepen bij installatie:", 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("• Professionele montage van alle apparatuur", 25, yPos); yPos += 5;
    doc.text("• Netwerk configuratie en optimalisatie", 25, yPos); yPos += 5;
    doc.text("• UniFi Controller setup", 25, yPos); yPos += 5;
    doc.text("• App configuratie op uw telefoon", 25, yPos); yPos += 5;
    doc.text("• Uitleg en handleiding", 25, yPos);

    addPDFFooter(doc);
    savePDF(doc, "UniFi-Offerte");
    
    toast({
      title: "PDF gedownload!",
      description: "Uw UniFi netwerk offerte is opgeslagen.",
    });
  };

  const recommendation = calculateRecommendation();
  const totalPrice = getTotalPrice();
  const installationCost = calculateInstallationCost();
  const productTotal = totalPrice - installationCost;

  const groupedProducts = {
    router: products.filter(p => p.category === "router"),
    switch: products.filter(p => p.category === "switch"),
    accesspoint: products.filter(p => p.category === "accesspoint"),
    camera: products.filter(p => p.category === "camera"),
  };

  const categoryLabels = {
    router: "Routers & Gateways",
    switch: "Switches",
    accesspoint: "Access Points (WiFi)",
    camera: "Camera's",
  };

  const categoryIcons = {
    router: Router,
    switch: Wifi,
    accesspoint: Wifi,
    camera: Camera,
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <span className="text-accent font-semibold text-sm uppercase tracking-wider">
          UniFi Netwerk & Camera's
        </span>
        <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6">
          Configureer Uw Netwerk
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Stel uw ideale UniFi netwerk samen met professionele WiFi en camerabewaking.
        </p>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Building Info */}
        <Card className="border-2 border-accent/20">
          <CardHeader className="bg-accent/5">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calculator className="w-6 h-6 text-accent" />
              Uw Situatie
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Oppervlakte (m²)
                </label>
                <Input
                  type="number"
                  placeholder="bijv. 150"
                  value={buildingSize}
                  onChange={(e) => setBuildingSize(e.target.value)}
                  min="20"
                  max="2000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Aantal verdiepingen
                </label>
                <Input
                  type="number"
                  placeholder="1"
                  value={floors}
                  onChange={(e) => setFloors(e.target.value)}
                  min="1"
                  max="10"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Checkbox
                  id="outdoor"
                  checked={outdoorCoverage}
                  onCheckedChange={(checked) => setOutdoorCoverage(checked as boolean)}
                />
                <label htmlFor="outdoor" className="text-sm font-medium cursor-pointer">
                  Buitenbereik gewenst
                </label>
              </div>
            </div>
            
            {/* Recommendation */}
            <div className="mt-6 p-4 bg-accent/10 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent" />
                Aanbeveling voor uw situatie:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Minimaal <strong className="text-foreground">{recommendation.accessPoints} access point(s)</strong> voor volledige dekking</li>
                {recommendation.needsSwitch && (
                  <li>• Een <strong className="text-foreground">PoE switch</strong> wordt aanbevolen</li>
                )}
                {recommendation.needsOutdoorAP && (
                  <li>• Overweeg een <strong className="text-foreground">outdoor access point</strong> voor buitenbereik</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Product Selection */}
        {Object.entries(groupedProducts).map(([category, categoryProducts]) => {
          const Icon = categoryIcons[category as keyof typeof categoryIcons];
          return (
            <Card key={category} className="border-2 border-accent/20">
              <CardHeader className="bg-accent/5">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Icon className="w-6 h-6 text-accent" />
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {categoryProducts.map((product) => {
                    const quantity = getQuantity(product.id);
                    return (
                      <div
                        key={product.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          quantity > 0
                            ? "border-accent bg-accent/5"
                            : "border-border hover:border-accent/50"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{product.name}</h4>
                            <p className="text-sm text-muted-foreground">{product.description}</p>
                          </div>
                          <p className="text-lg font-bold text-accent whitespace-nowrap ml-4">
                            €{product.price},-
                          </p>
                        </div>
                        <ul className="flex flex-wrap gap-2 mb-3">
                          {product.features.slice(0, 3).map((feature) => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </ul>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => removeProduct(product.id)}
                            disabled={quantity === 0}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">{quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => addProduct(product)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Calculate Button */}
        <div className="text-center">
          <Button 
            size="lg" 
            onClick={() => setShowResults(true)} 
            className="text-lg px-12"
            disabled={selectedProducts.length === 0}
          >
            <Calculator className="w-5 h-5 mr-2" />
            Bekijk Offerte
          </Button>
        </div>

        {/* Results */}
        {showResults && selectedProducts.length > 0 && (
          <Card className="border-2 border-accent">
            <CardHeader className="bg-accent/10">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Euro className="w-7 h-7 text-accent" />
                Uw Configuratie
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4 mb-6">
                {selectedProducts.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between items-center py-2 border-b border-border">
                    <div>
                      <span className="font-medium">{quantity}x {product.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({product.category === "camera" ? "Camera" : 
                          product.category === "accesspoint" ? "Access Point" :
                          product.category === "switch" ? "Switch" : "Router"})
                      </span>
                    </div>
                    <span className="font-medium">€{(product.price * quantity).toLocaleString("nl-NL")},-</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Installatie & configuratie</span>
                  <span className="font-medium">€{installationCost.toLocaleString("nl-NL")},-</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xl font-bold p-4 bg-accent/10 rounded-lg">
                <span>Totaal indicatieprijs</span>
                <span className="text-accent">€{totalPrice.toLocaleString("nl-NL")},-</span>
              </div>

              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Check className="w-5 h-5 text-accent" />
                  Inbegrepen bij installatie:
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Professionele montage van alle apparatuur</li>
                  <li>• Netwerk configuratie en optimalisatie</li>
                  <li>• UniFi Controller setup</li>
                  <li>• App configuratie op uw telefoon</li>
                  <li>• Uitleg en handleiding</li>
                </ul>
              </div>

              <div className="mt-8 text-center space-y-4">
                <p className="text-muted-foreground">
                  Interesse? Vraag een vrijblijvende offerte aan.
                </p>
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

export default UniFiCalculator;
