import { useState } from "react";
import { Calculator, Wind, Thermometer, Home, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AircoUnit {
  id: string;
  name: string;
  brand: string;
  capacity: string;
  minM2: number;
  maxM2: number;
  basePrice: number;
  image: string;
  features: string[];
  energyLabel: string;
}

const aircoUnits: AircoUnit[] = [
  {
    id: "basic",
    name: "Comfort Basic",
    brand: "Daikin",
    capacity: "2.5 kW",
    minM2: 15,
    maxM2: 30,
    basePrice: 1299,
    image: "https://images.unsplash.com/photo-1631545806609-aeecaf1a0aed?w=400&h=300&fit=crop",
    features: ["Stille werking", "Wifi bediening", "Koelen & verwarmen"],
    energyLabel: "A++"
  },
  {
    id: "premium",
    name: "Comfort Plus",
    brand: "Mitsubishi",
    capacity: "3.5 kW",
    minM2: 25,
    maxM2: 45,
    basePrice: 1699,
    image: "https://images.unsplash.com/photo-1625961332771-3f40b0e2bdcf?w=400&h=300&fit=crop",
    features: ["Ultra stil", "Smart Home ready", "Luchtzuivering", "Koelen & verwarmen"],
    energyLabel: "A+++"
  },
  {
    id: "deluxe",
    name: "Design Deluxe",
    brand: "LG",
    capacity: "5.0 kW",
    minM2: 40,
    maxM2: 70,
    basePrice: 2199,
    image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=300&fit=crop",
    features: ["Stijlvol design", "Dual inverter", "Ionisator", "App bediening", "Koelen & verwarmen"],
    energyLabel: "A+++"
  },
  {
    id: "multi",
    name: "Multi-Split Systeem",
    brand: "Samsung",
    capacity: "7.0 kW",
    minM2: 60,
    maxM2: 100,
    basePrice: 3499,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
    features: ["Meerdere ruimtes", "WindFree cooling", "AI Energy Mode", "5 jaar garantie"],
    energyLabel: "A+++"
  }
];

const roomTypes = [
  { id: "living", label: "Woonkamer", factor: 1.0 },
  { id: "bedroom", label: "Slaapkamer", factor: 0.9 },
  { id: "office", label: "Kantoor", factor: 1.1 },
  { id: "attic", label: "Zolder", factor: 1.3 },
];

const AircoCalculator = () => {
  const [roomSize, setRoomSize] = useState<string>("");
  const [ceilingHeight, setCeilingHeight] = useState<string>("2.5");
  const [roomType, setRoomType] = useState<string>("living");
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const calculateRequiredCapacity = () => {
    const size = parseFloat(roomSize) || 0;
    const height = parseFloat(ceilingHeight) || 2.5;
    const roomFactor = roomTypes.find(r => r.id === roomType)?.factor || 1;
    
    // Calculate volume and required capacity (roughly 100W per m³)
    const volume = size * height;
    const requiredWatts = volume * 40 * roomFactor;
    return requiredWatts / 1000; // Convert to kW
  };

  const getRecommendedUnits = () => {
    const size = parseFloat(roomSize) || 0;
    return aircoUnits.filter(unit => size >= unit.minM2 && size <= unit.maxM2);
  };

  const calculateTotalPrice = (unit: AircoUnit) => {
    const size = parseFloat(roomSize) || 0;
    const installationCost = size > 40 ? 450 : 350;
    return unit.basePrice + installationCost;
  };

  const handleCalculate = () => {
    if (roomSize && parseFloat(roomSize) > 0) {
      setShowResults(true);
    }
  };

  const recommendedUnits = getRecommendedUnits();
  const requiredCapacity = calculateRequiredCapacity();

  return (
    <section id="calculator" className="py-20 md:py-32 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">
            Prijscalculator
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6">
            Bereken Uw Airco Prijs
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Vul uw ruimtegegevens in en ontdek welke airco het beste bij u past, 
            inclusief een indicatieprijs.
          </p>
        </div>

        {/* Calculator Form */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="border-2 border-accent/20">
            <CardHeader className="bg-accent/5">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Calculator className="w-6 h-6 text-accent" />
                Ruimte Gegevens
              </CardTitle>
              <CardDescription>
                Vul de gegevens van uw ruimte in voor een accurate berekening
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Home className="w-4 h-4 inline mr-2" />
                    Oppervlakte (m²)
                  </label>
                  <Input
                    type="number"
                    placeholder="bijv. 35"
                    value={roomSize}
                    onChange={(e) => setRoomSize(e.target.value)}
                    min="10"
                    max="150"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Thermometer className="w-4 h-4 inline mr-2" />
                    Plafondhoogte (m)
                  </label>
                  <Input
                    type="number"
                    placeholder="2.5"
                    value={ceilingHeight}
                    onChange={(e) => setCeilingHeight(e.target.value)}
                    min="2"
                    max="5"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Wind className="w-4 h-4 inline mr-2" />
                    Type Ruimte
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
                  >
                    {roomTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full md:w-auto"
                onClick={handleCalculate}
                disabled={!roomSize || parseFloat(roomSize) <= 0}
              >
                <Calculator className="w-5 h-5 mr-2" />
                Bereken Prijs
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {showResults && roomSize && (
          <div className="max-w-6xl mx-auto">
            {/* Capacity Info */}
            <div className="bg-accent/10 rounded-2xl p-6 mb-10 text-center">
              <p className="text-lg text-foreground">
                Voor uw ruimte van <strong>{roomSize} m²</strong> adviseren wij een airco met minimaal{" "}
                <strong className="text-accent">{requiredCapacity.toFixed(1)} kW</strong> koelvermogen
              </p>
            </div>

            {/* Airco Units Grid */}
            <h3 className="font-heading text-2xl font-bold text-foreground mb-8 text-center">
              {recommendedUnits.length > 0 
                ? "Aanbevolen Airco's voor uw ruimte" 
                : "Beschikbare Airco Systemen"}
            </h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(recommendedUnits.length > 0 ? recommendedUnits : aircoUnits).map((unit) => (
                <Card 
                  key={unit.id}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
                    selectedUnit === unit.id 
                      ? "ring-2 ring-accent border-accent" 
                      : "hover:border-accent/50"
                  }`}
                  onClick={() => setSelectedUnit(unit.id)}
                >
                  <div className="relative">
                    <img 
                      src={unit.image} 
                      alt={unit.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <Badge className="absolute top-3 right-3 bg-green-500">
                      {unit.energyLabel}
                    </Badge>
                    {selectedUnit === unit.id && (
                      <div className="absolute top-3 left-3 w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground mb-1">{unit.brand}</div>
                    <h4 className="font-heading font-bold text-lg text-foreground mb-2">
                      {unit.name}
                    </h4>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary">{unit.capacity}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {unit.minM2}-{unit.maxM2} m²
                      </span>
                    </div>
                    <ul className="space-y-1 mb-4">
                      {unit.features.slice(0, 3).map((feature) => (
                        <li key={feature} className="text-sm text-muted-foreground flex items-center gap-2">
                          <Check className="w-3 h-3 text-accent" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-border pt-4">
                      <div className="text-sm text-muted-foreground">Totaalprijs incl. installatie</div>
                      <div className="text-2xl font-bold text-accent">
                        €{calculateTotalPrice(unit).toLocaleString('nl-NL')},-
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* CTA */}
            {selectedUnit && (
              <div className="mt-12 text-center bg-primary/5 rounded-2xl p-8">
                <h3 className="font-heading text-2xl font-bold text-foreground mb-4">
                  Interesse in de {aircoUnits.find(u => u.id === selectedUnit)?.name}?
                </h3>
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                  Vraag een vrijblijvende offerte aan. Ik neem binnen 24 uur contact met u op 
                  voor een afspraak op locatie.
                </p>
                <Button size="lg" asChild>
                  <a href="#contact">Vraag Offerte Aan</a>
                </Button>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-center text-sm text-muted-foreground mt-8">
              * Prijzen zijn indicatief en kunnen afwijken afhankelijk van de situatie ter plaatse. 
              Vraag een vrijblijvende offerte aan voor een exacte prijs.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default AircoCalculator;
