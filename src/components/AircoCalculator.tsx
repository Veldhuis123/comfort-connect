import { useState, useRef } from "react";
import { Calculator, Wind, Thermometer, Home, Check, Plus, Trash2, Camera, Upload, X, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

// Import product images
import daikinBasicImg from "@/assets/airco-daikin-basic.jpg";
import daikinPremiumImg from "@/assets/airco-daikin-premium.jpg";
import haierBasicImg from "@/assets/airco-haier-basic.jpg";
import haierPremiumImg from "@/assets/airco-haier-premium.jpg";

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

interface Room {
  id: string;
  name: string;
  size: string;
  ceilingHeight: string;
  type: string;
}

interface UploadedPhoto {
  id: string;
  file: File;
  preview: string;
  category: string;
}

const aircoUnits: AircoUnit[] = [
  {
    id: "daikin-perfera",
    name: "Perfera",
    brand: "Daikin",
    capacity: "2.5 kW",
    minM2: 15,
    maxM2: 30,
    basePrice: 1499,
    image: daikinBasicImg,
    features: ["Stille werking (19 dB)", "Wifi bediening", "Koelen & verwarmen", "Flash Streamer"],
    energyLabel: "A+++"
  },
  {
    id: "daikin-stylish",
    name: "Stylish",
    brand: "Daikin",
    capacity: "3.5 kW",
    minM2: 25,
    maxM2: 45,
    basePrice: 1899,
    image: daikinPremiumImg,
    features: ["Design model", "Coanda-effect", "Smart Home ready", "Luchtzuivering"],
    energyLabel: "A+++"
  },
  {
    id: "haier-tundra",
    name: "Tundra Plus",
    brand: "Haier",
    capacity: "2.6 kW",
    minM2: 15,
    maxM2: 35,
    basePrice: 1199,
    image: haierBasicImg,
    features: ["Self Clean", "Wifi bediening", "Koelen & verwarmen", "Turbo mode"],
    energyLabel: "A++"
  },
  {
    id: "haier-flexis",
    name: "Flexis Plus",
    brand: "Haier",
    capacity: "5.0 kW",
    minM2: 40,
    maxM2: 70,
    basePrice: 2299,
    image: haierPremiumImg,
    features: ["Premium design", "Smart AI", "UV-C sterilisatie", "Luchtzuivering"],
    energyLabel: "A+++"
  }
];

const roomTypes = [
  { id: "living", label: "Woonkamer", factor: 1.0 },
  { id: "bedroom", label: "Slaapkamer", factor: 0.9 },
  { id: "office", label: "Kantoor", factor: 1.1 },
  { id: "attic", label: "Zolder", factor: 1.3 },
  { id: "kitchen", label: "Keuken", factor: 1.2 },
];

const photoCategories = [
  { id: "meterkast", label: "Meterkast", icon: "⚡" },
  { id: "isolatie", label: "Isolatie / Woning", icon: "🏠" },
  { id: "leiding", label: "Leidinglengte / Route", icon: "📏" },
  { id: "kleur", label: "Gewenste kleur / Locatie", icon: "🎨" },
];

const pipeColors = [
  { id: "wit", label: "Wit", color: "#FFFFFF" },
  { id: "grijs", label: "Grijs", color: "#808080" },
  { id: "zwart", label: "Zwart", color: "#1a1a1a" },
  { id: "bruin", label: "Bruin", color: "#8B4513" },
];

const AircoCalculator = () => {
  const [rooms, setRooms] = useState<Room[]>([
    { id: "1", name: "Ruimte 1", size: "", ceilingHeight: "2.5", type: "living" }
  ]);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>("wit");
  const [pipeLength, setPipeLength] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState<string>("");
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const addRoom = () => {
    const newRoom: Room = {
      id: Date.now().toString(),
      name: `Ruimte ${rooms.length + 1}`,
      size: "",
      ceilingHeight: "2.5",
      type: "living"
    };
    setRooms([...rooms, newRoom]);
  };

  const removeRoom = (id: string) => {
    if (rooms.length > 1) {
      setRooms(rooms.filter(room => room.id !== id));
    }
  };

  const updateRoom = (id: string, field: keyof Room, value: string) => {
    setRooms(rooms.map(room => 
      room.id === id ? { ...room, [field]: value } : room
    ));
  };

  const getTotalSize = () => {
    return rooms.reduce((total, room) => total + (parseFloat(room.size) || 0), 0);
  };

  const calculateTotalRequiredCapacity = () => {
    return rooms.reduce((total, room) => {
      const size = parseFloat(room.size) || 0;
      const height = parseFloat(room.ceilingHeight) || 2.5;
      const roomFactor = roomTypes.find(r => r.id === room.type)?.factor || 1;
      const volume = size * height;
      const requiredWatts = volume * 40 * roomFactor;
      return total + (requiredWatts / 1000);
    }, 0);
  };

  const getRecommendedUnits = () => {
    const totalSize = getTotalSize();
    if (rooms.length > 1) {
      // For multiple rooms, recommend multi-split systems
      return aircoUnits.filter(unit => unit.id === "multi" || totalSize <= unit.maxM2);
    }
    return aircoUnits.filter(unit => totalSize >= unit.minM2 && totalSize <= unit.maxM2);
  };

  const calculateTotalPrice = (unit: AircoUnit) => {
    const totalSize = getTotalSize();
    const baseInstallation = totalSize > 40 ? 450 : 350;
    const roomMultiplier = rooms.length > 1 ? rooms.length * 200 : 0;
    const pipeLengthCost = parseFloat(pipeLength) > 5 ? (parseFloat(pipeLength) - 5) * 25 : 0;
    return unit.basePrice + baseInstallation + roomMultiplier + pipeLengthCost;
  };

  const handleCalculate = () => {
    const totalSize = getTotalSize();
    if (totalSize > 0) {
      setShowResults(true);
    }
  };

  const handlePhotoUpload = (category: string, files: FileList | null) => {
    if (!files) return;
    
    const newPhotos: UploadedPhoto[] = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      category
    }));
    
    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (photo) {
      URL.revokeObjectURL(photo.preview);
    }
    setPhotos(photos.filter(p => p.id !== id));
  };

  const getPhotosByCategory = (category: string) => {
    return photos.filter(p => p.category === category);
  };

  const generateQuoteMessage = () => {
    const selectedAirco = aircoUnits.find(u => u.id === selectedUnit);
    const totalSize = getTotalSize();
    const totalCapacity = calculateTotalRequiredCapacity();
    
    let message = `Offerte aanvraag Airco\n\n`;
    message += `📊 Ruimtes:\n`;
    rooms.forEach((room, index) => {
      const roomTypeLabel = roomTypes.find(t => t.id === room.type)?.label || room.type;
      message += `  ${index + 1}. ${room.name || roomTypeLabel}: ${room.size}m² (plafond: ${room.ceilingHeight}m)\n`;
    });
    message += `\n📐 Totaal: ${totalSize}m² | Benodigd: ${totalCapacity.toFixed(1)} kW\n`;
    
    if (selectedAirco) {
      message += `\n❄️ Geselecteerde airco: ${selectedAirco.brand} ${selectedAirco.name}\n`;
      message += `💰 Indicatieprijs: €${calculateTotalPrice(selectedAirco).toLocaleString('nl-NL')},-\n`;
    }
    
    message += `\n🎨 Gewenste kleur leidingen: ${pipeColors.find(c => c.id === selectedColor)?.label || selectedColor}`;
    if (pipeLength) {
      message += `\n📏 Geschatte leidinglengte: ${pipeLength}m`;
    }
    
    message += `\n📷 Aantal foto's bijgevoegd: ${photos.length}`;
    
    if (additionalNotes) {
      message += `\n\n📝 Opmerkingen:\n${additionalNotes}`;
    }
    
    return message;
  };

  const handleEmailQuote = () => {
    const message = generateQuoteMessage();
    const subject = encodeURIComponent("Offerte aanvraag Airco");
    const body = encodeURIComponent(message + "\n\n(Let op: foto's kunnen niet via email link worden meegestuurd. Stuur deze apart door of gebruik WhatsApp)");
    window.open(`mailto:inf0@rv-installatie.nl?subject=${subject}&body=${body}`);
  };

  const handleWhatsAppQuote = () => {
    const message = generateQuoteMessage();
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/31613629947?text=${encodedMessage}`);
  };

  const recommendedUnits = getRecommendedUnits();
  const totalCapacity = calculateTotalRequiredCapacity();
  const totalSize = getTotalSize();

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

        {/* Multi-Room Calculator Form */}
        <div className="max-w-5xl mx-auto mb-16 space-y-6">
          {/* Rooms */}
          <Card className="border-2 border-accent/20">
            <CardHeader className="bg-accent/5">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xl">
                  <Calculator className="w-6 h-6 text-accent" />
                  Ruimtes ({rooms.length})
                </span>
                <Button variant="outline" size="sm" onClick={addRoom}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ruimte Toevoegen
                </Button>
              </CardTitle>
              <CardDescription>
                Voeg alle ruimtes toe waar u airconditioning wilt
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {rooms.map((room, index) => (
                <div key={room.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <Input
                      value={room.name}
                      onChange={(e) => updateRoom(room.id, "name", e.target.value)}
                      placeholder={`Ruimte ${index + 1}`}
                      className="max-w-[200px] font-medium"
                    />
                    {rooms.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeRoom(room.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        <Home className="w-4 h-4 inline mr-2" />
                        Oppervlakte (m²)
                      </label>
                      <Input
                        type="number"
                        placeholder="bijv. 35"
                        value={room.size}
                        onChange={(e) => updateRoom(room.id, "size", e.target.value)}
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
                        value={room.ceilingHeight}
                        onChange={(e) => updateRoom(room.id, "ceilingHeight", e.target.value)}
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
                        value={room.type}
                        onChange={(e) => updateRoom(room.id, "type", e.target.value)}
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
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Photo Upload Section */}
          <Card className="border-2 border-accent/20">
            <CardHeader className="bg-accent/5">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Camera className="w-6 h-6 text-accent" />
                Foto's Uploaden (Optioneel)
              </CardTitle>
              <CardDescription>
                Upload foto's voor een nauwkeurigere offerte
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {photoCategories.map((category) => {
                  const categoryPhotos = getPhotosByCategory(category.id);
                  return (
                    <div key={category.id} className="space-y-3">
                      <div className="text-sm font-medium text-foreground flex items-center gap-2">
                        <span>{category.icon}</span>
                        {category.label}
                      </div>
                      <div 
                        className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center hover:border-accent/50 transition-colors cursor-pointer"
                        onClick={() => fileInputRefs.current[category.id]?.click()}
                      >
                        <input
                          ref={(el) => fileInputRefs.current[category.id] = el}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(category.id, e.target.files)}
                        />
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">
                          Klik om foto's te uploaden
                        </span>
                      </div>
                      {/* Preview uploaded photos */}
                      {categoryPhotos.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {categoryPhotos.map((photo) => (
                            <div key={photo.id} className="relative group">
                              <img 
                                src={photo.preview} 
                                alt={category.label}
                                className="w-full h-20 object-cover rounded-md"
                              />
                              <button
                                onClick={() => removePhoto(photo.id)}
                                className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card className="border-2 border-accent/20">
            <CardHeader className="bg-accent/5">
              <CardTitle className="flex items-center gap-2 text-xl">
                🎨 Extra Details
              </CardTitle>
              <CardDescription>
                Kleur leidingen en geschatte leidinglengte
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Gewenste kleur leidingen
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {pipeColors.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => setSelectedColor(color.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                          selectedColor === color.id 
                            ? "border-accent bg-accent/10" 
                            : "border-border hover:border-accent/50"
                        }`}
                      >
                        <div 
                          className="w-5 h-5 rounded-full border border-border"
                          style={{ backgroundColor: color.color }}
                        />
                        <span className="text-sm font-medium">{color.label}</span>
                        {selectedColor === color.id && (
                          <Check className="w-4 h-4 text-accent" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Geschatte leidinglengte (meter)
                  </label>
                  <Input
                    type="number"
                    placeholder="bijv. 5"
                    value={pipeLength}
                    onChange={(e) => setPipeLength(e.target.value)}
                    min="1"
                    max="50"
                    className="max-w-[150px]"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Standaard 5m inbegrepen, extra meters +€25/m
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Opmerkingen of bijzonderheden
                </label>
                <Textarea
                  placeholder="Bijv. specifieke wensen, toegankelijkheid, etc."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Button 
            size="lg" 
            className="w-full"
            onClick={handleCalculate}
            disabled={totalSize <= 0}
          >
            <Calculator className="w-5 h-5 mr-2" />
            Bereken Prijs voor {rooms.length} {rooms.length === 1 ? "Ruimte" : "Ruimtes"}
          </Button>
        </div>

        {/* Results */}
        {showResults && totalSize > 0 && (
          <div className="max-w-6xl mx-auto">
            {/* Capacity Info */}
            <div className="bg-accent/10 rounded-2xl p-6 mb-10 text-center">
              <p className="text-lg text-foreground">
                Voor {rooms.length} {rooms.length === 1 ? "ruimte" : "ruimtes"} met totaal <strong>{totalSize} m²</strong> adviseren wij minimaal{" "}
                <strong className="text-accent">{totalCapacity.toFixed(1)} kW</strong> koelvermogen
              </p>
              {rooms.length > 1 && (
                <p className="text-sm text-muted-foreground mt-2">
                  💡 Tip: Voor meerdere ruimtes raden wij een multi-split systeem aan
                </p>
              )}
            </div>

            {/* Airco Units Grid */}
            <h3 className="font-heading text-2xl font-bold text-foreground mb-8 text-center">
              {recommendedUnits.length > 0 
                ? "Aanbevolen Airco's voor uw situatie" 
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
                  Verstuur uw gegevens en ik neem binnen 24 uur contact met u op. 
                  {photos.length > 0 && ` (${photos.length} foto's geselecteerd)`}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" onClick={handleWhatsAppQuote} className="bg-green-600 hover:bg-green-700">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    WhatsApp Offerte
                  </Button>
                  <Button size="lg" variant="outline" onClick={handleEmailQuote}>
                    <Mail className="w-5 h-5 mr-2" />
                    Email Offerte
                  </Button>
                </div>
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
