import { useState, useRef, useEffect } from "react";
import { Calculator, Wind, Thermometer, Home, Check, Plus, Trash2, Camera, Upload, X, Mail, MessageCircle, Send, User, Phone, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api, Product } from "@/lib/api";
import ProductCompare, { CompareProduct, CompareCheckbox } from "@/components/ProductCompare";

// Fallback product images
import daikinBasicImg from "@/assets/airco-daikin-basic.jpg";
import daikinPremiumImg from "@/assets/airco-daikin-premium.jpg";
import haierBasicImg from "@/assets/airco-haier-basic.jpg";
import haierPremiumImg from "@/assets/airco-haier-premium.jpg";

const fallbackImages: Record<string, string> = {
  "daikin-perfera": daikinBasicImg,
  "daikin-stylish": daikinPremiumImg,
  "haier-tundra": haierBasicImg,
  "haier-flexis": haierPremiumImg,
};

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

const defaultAircoUnits: AircoUnit[] = [
  { id: "daikin-perfera", name: "Perfera", brand: "Daikin", capacity: "2.5 kW", minM2: 15, maxM2: 30, basePrice: 1499, image: daikinBasicImg, features: ["Stille werking (19 dB)", "Wifi bediening", "Koelen & verwarmen", "Flash Streamer"], energyLabel: "A+++" },
  { id: "daikin-stylish", name: "Stylish", brand: "Daikin", capacity: "3.5 kW", minM2: 25, maxM2: 45, basePrice: 1899, image: daikinPremiumImg, features: ["Design model", "Coanda-effect", "Smart Home ready", "Luchtzuivering"], energyLabel: "A+++" },
  { id: "haier-tundra", name: "Tundra Plus", brand: "Haier", capacity: "2.6 kW", minM2: 15, maxM2: 35, basePrice: 1199, image: haierBasicImg, features: ["Self Clean", "Wifi bediening", "Koelen & verwarmen", "Turbo mode"], energyLabel: "A++" },
  { id: "haier-flexis", name: "Flexis Plus", brand: "Haier", capacity: "5.0 kW", minM2: 40, maxM2: 70, basePrice: 2299, image: haierPremiumImg, features: ["Premium design", "Smart AI", "UV-C sterilisatie", "Luchtzuivering"], energyLabel: "A+++" },
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

const insulationClasses = [
  { id: "30", label: "Goed geïsoleerd", factor: 30, description: "Nieuwbouw of recent gerenoveerd" },
  { id: "40", label: "Gemiddeld geïsoleerd", factor: 40, description: "Woning uit jaren 80-2000" },
  { id: "50", label: "Matig geïsoleerd", factor: 50, description: "Oudere woning of veel glas" },
];

const systemTypes = [
  { id: "single", label: "Losse units", description: "Elke ruimte een aparte buitenunit" },
  { id: "multisplit", label: "Multi-split", description: "Één buitenunit voor meerdere ruimtes" },
];

const AircoCalculator = () => {
  const { toast } = useToast();
  const [aircoUnits, setAircoUnits] = useState<AircoUnit[]>(defaultAircoUnits);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([
    { id: "1", name: "Ruimte 1", size: "", ceilingHeight: "2.5", type: "living" }
  ]);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>("wit");
  const [pipeLength, setPipeLength] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [insulationClass, setInsulationClass] = useState<string>("40");
  const [separateGroup, setSeparateGroup] = useState<boolean>(false);
  const [systemType, setSystemType] = useState<string>("single");
  const [compareProducts, setCompareProducts] = useState<string[]>([]);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Pricing settings from backend
  const [pricingSettings, setPricingSettings] = useState<Record<string, number>>({
    electrical_group: 185,
    pipe_per_meter: 35,
    pipe_included_meters: 3,
    cable_duct_per_meter: 12.5,
    vat_rate: 21,
  });
  const [globalSettings, setGlobalSettings] = useState<Record<string, number>>({
    margin_percent: 30,
    base_installation_small: 350,
    base_installation_large: 450,
    multisplit_per_room: 200,
    extra_unit_discount: 0.8,
  });

  // Load products and pricing settings from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apiProducts, aircoSettings, globalSettingsRes] = await Promise.all([
          api.getProducts("airco").catch(() => []),
          api.getInstallationSettings("airco").catch(() => ({ settings: {} })),
          api.getInstallationSettings("global").catch(() => ({ settings: {} }))
        ]);

        // Map products
        if (apiProducts.length > 0) {
          const mapped = apiProducts.map((p: Product): AircoUnit => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            capacity: String((p.specs as Record<string, unknown>).capacity) || "",
            minM2: Number((p.specs as Record<string, unknown>).min_m2) || 0,
            maxM2: Number((p.specs as Record<string, unknown>).max_m2) || 0,
            basePrice: p.base_price,
            image: p.image_url || fallbackImages[p.id] || daikinBasicImg,
            features: p.features,
            energyLabel: String((p.specs as Record<string, unknown>).energy_label) || "A++",
          }));
          setAircoUnits(mapped);
        }

        // Map airco pricing settings
        const aircoSettingsFlat: Record<string, number> = {};
        Object.entries(aircoSettings.settings || {}).forEach(([key, val]) => {
          aircoSettingsFlat[key] = (val as { value: number }).value;
        });
        if (Object.keys(aircoSettingsFlat).length > 0) {
          setPricingSettings(prev => ({ ...prev, ...aircoSettingsFlat }));
        }

        // Map global settings
        const globalSettingsFlat: Record<string, number> = {};
        Object.entries(globalSettingsRes.settings || {}).forEach(([key, val]) => {
          globalSettingsFlat[key] = (val as { value: number }).value;
        });
        if (Object.keys(globalSettingsFlat).length > 0) {
          setGlobalSettings(prev => ({ ...prev, ...globalSettingsFlat }));
        }
      } catch (err) {
        console.log("Using fallback settings (API not available)");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleCompare = (unitId: string) => {
    if (compareProducts.includes(unitId)) {
      setCompareProducts(compareProducts.filter(id => id !== unitId));
    } else if (compareProducts.length < 4) {
      setCompareProducts([...compareProducts, unitId]);
    }
  };

  const formatPrice = (price: number) => {
    return `€${price.toFixed(2).replace('.', ',')}`;
  };

  const getCompareProductsData = (): CompareProduct[] => {
    return aircoUnits.map(u => ({
      id: u.id,
      name: u.name,
      brand: u.brand,
      category: "Airco",
      price: calculateTotalPrice(u),
      image: u.image,
      specs: {
        Capaciteit: u.capacity,
        "Min. oppervlakte": `${u.minM2} m²`,
        "Max. oppervlakte": `${u.maxM2} m²`,
        Energielabel: u.energyLabel,
        Basisprijs: `€${u.basePrice.toLocaleString('nl-NL')},-`,
      },
      features: u.features,
    }));
  };

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
    const insulation = insulationClasses.find(i => i.id === insulationClass)?.factor || 40;
    return rooms.reduce((total, room) => {
      const size = parseFloat(room.size) || 0;
      const height = parseFloat(room.ceilingHeight) || 2.5;
      const roomFactor = roomTypes.find(r => r.id === room.type)?.factor || 1;
      const volume = size * height;
      const requiredWatts = volume * insulation * roomFactor;
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

  const calculateTotalPrice = (unit: AircoUnit): number => {
    const totalSize = getTotalSize();
    const basePrice = Number(unit.basePrice) || 0;
    
    // Use dynamic pricing from backend
    const baseInstallation = totalSize > 40 
      ? (globalSettings.base_installation_large || 450) 
      : (globalSettings.base_installation_small || 350);
    const multisplitPerRoom = globalSettings.multisplit_per_room || 200;
    const extraUnitDiscount = globalSettings.extra_unit_discount || 0.8;
    const pipePerMeter = pricingSettings.pipe_per_meter || 35;
    const pipeIncluded = pricingSettings.pipe_included_meters || 3;
    const electricalGroupPrice = pricingSettings.electrical_group || 185;
    
    const roomMultiplier = rooms.length > 1 && systemType === "multisplit" ? rooms.length * multisplitPerRoom : 0;
    const singleUnitMultiplier = rooms.length > 1 && systemType === "single" ? (rooms.length - 1) * basePrice * extraUnitDiscount : 0;
    const pipeLengthValue = parseFloat(pipeLength) || 0;
    const pipeLengthCost = pipeLengthValue > pipeIncluded ? (pipeLengthValue - pipeIncluded) * pipePerMeter : 0;
    const separateGroupCost = separateGroup ? electricalGroupPrice : 0;
    
    return basePrice + baseInstallation + roomMultiplier + singleUnitMultiplier + pipeLengthCost + separateGroupCost;
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
    const insulationLabel = insulationClasses.find(i => i.id === insulationClass)?.label || insulationClass;
    const systemLabel = systemTypes.find(s => s.id === systemType)?.label || systemType;
    
    let message = `Offerte aanvraag Airco\n\n`;
    message += `📊 Ruimtes:\n`;
    rooms.forEach((room, index) => {
      const roomTypeLabel = roomTypes.find(t => t.id === room.type)?.label || room.type;
      message += `  ${index + 1}. ${room.name || roomTypeLabel}: ${room.size}m² (plafond: ${room.ceilingHeight}m)\n`;
    });
    message += `\n📐 Totaal: ${totalSize}m² | Benodigd: ${totalCapacity.toFixed(1)} kW\n`;
    message += `\n🏠 Isolatieklasse: ${insulationLabel}`;
    message += `\n⚡ Systeem: ${systemLabel}`;
    message += `\n🔌 Aparte groep: ${separateGroup ? `Ja (+€${(pricingSettings.electrical_group || 185).toFixed(0)})` : "Nee"}`;
    
    if (selectedAirco) {
      message += `\n\n❄️ Geselecteerde airco: ${selectedAirco.brand} ${selectedAirco.name}\n`;
      message += `💰 Indicatieprijs: ${formatPrice(calculateTotalPrice(selectedAirco))}\n`;
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

  const handleSubmitQuote = async () => {
    // Validatie: email en telefoon zijn verplicht
    if (!customerEmail || !customerPhone) {
      toast({
        title: "Vul uw contactgegevens in",
        description: "E-mail en telefoonnummer zijn verplicht voor een offerte aanvraag.",
        variant: "destructive",
      });
      return;
    }

    const selectedAirco = aircoUnits.find(u => u.id === selectedUnit);
    setIsSubmitting(true);

    const quoteData = {
      customer_name: customerName || undefined,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      rooms: rooms.map(r => ({
        name: r.name,
        size: r.size,
        ceilingHeight: r.ceilingHeight,
        type: r.type
      })),
      total_size: getTotalSize(),
      total_capacity: calculateTotalRequiredCapacity(),
      selected_airco_id: selectedUnit || undefined,
      selected_airco_name: selectedAirco?.name,
      selected_airco_brand: selectedAirco?.brand,
      estimated_price: selectedAirco ? calculateTotalPrice(selectedAirco) : undefined,
      pipe_color: selectedColor,
      pipe_length: pipeLength ? parseFloat(pipeLength) : undefined,
      additional_notes: additionalNotes || undefined,
      insulation_class: insulationClass,
      separate_group: separateGroup,
      system_type: systemType
    };

    try {
      const result = await api.createQuote(quoteData);
      
      // Upload foto's als die er zijn
      if (photos.length > 0) {
        try {
          // Groepeer foto's per categorie en upload ze
          const photosByCategory = photos.reduce((acc, photo) => {
            if (!acc[photo.category]) acc[photo.category] = [];
            acc[photo.category].push(photo);
            return acc;
          }, {} as Record<string, UploadedPhoto[]>);

          for (const [category, categoryPhotos] of Object.entries(photosByCategory)) {
            await api.uploadQuotePhotos(
              result.id, 
              categoryPhotos.map(p => ({ file: p.file, category }))
            );
          }
        } catch (uploadError) {
          console.error('Photo upload failed:', uploadError);
          // Continue anyway, quote is created
        }
      }

      setQuoteSubmitted(true);
      toast({
        title: "Offerte aanvraag verzonden!",
        description: `Bedankt! Ik neem binnen 24 uur contact met u op.${photos.length > 0 ? ` ${photos.length} foto(s) meegestuurd.` : ''}`,
      });
    } catch (error) {
      // Fallback to WhatsApp if API fails
      handleWhatsAppQuote();
      toast({
        title: "WhatsApp geopend",
        description: "De aanvraag wordt via WhatsApp verstuurd.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailQuote = () => {
    const message = generateQuoteMessage();
    const subject = encodeURIComponent("Offerte aanvraag Airco");
    const body = encodeURIComponent(message + "\n\n(Let op: foto's kunnen niet via email link worden meegestuurd. Stuur deze apart door of gebruik WhatsApp)");
    window.open(`mailto:info@rv-installatie.nl?subject=${subject}&body=${body}`);
  };

  const handleWhatsAppQuote = () => {
    const message = generateQuoteMessage();
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/31613629947?text=${encodedMessage}`);
  };

  const handleExportPDF = () => {
    const selectedAirco = aircoUnits.find(u => u.id === selectedUnit);
    const insulationLabel = insulationClasses.find(i => i.id === insulationClass)?.label || insulationClass;
    const systemLabel = systemTypes.find(s => s.id === systemType)?.label || systemType;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(0, 102, 204);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Airco Offerte', 20, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Datum: ${new Date().toLocaleDateString('nl-NL')}`, pageWidth - 50, 25);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    let yPos = 55;
    
    // Customer info
    if (customerName || customerEmail || customerPhone) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Klantgegevens', 20, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (customerName) { doc.text(`Naam: ${customerName}`, 20, yPos); yPos += 6; }
      if (customerEmail) { doc.text(`E-mail: ${customerEmail}`, 20, yPos); yPos += 6; }
      if (customerPhone) { doc.text(`Telefoon: ${customerPhone}`, 20, yPos); yPos += 6; }
      yPos += 10;
    }
    
    // Rooms section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Ruimtes', 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    rooms.forEach((room, index) => {
      const roomTypeLabel = roomTypes.find(t => t.id === room.type)?.label || room.type;
      doc.text(`${index + 1}. ${room.name || roomTypeLabel}: ${room.size} m² (plafond: ${room.ceilingHeight}m)`, 25, yPos);
      yPos += 6;
    });
    
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Totaal oppervlakte: ${totalSize} m²`, 20, yPos);
    yPos += 6;
    doc.text(`Benodigde capaciteit: ${totalCapacity.toFixed(1)} kW`, 20, yPos);
    yPos += 15;
    
    // Specifications
    doc.setFontSize(14);
    doc.text('Specificaties', 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Isolatieklasse: ${insulationLabel}`, 25, yPos); yPos += 6;
    if (rooms.length > 1) {
      doc.text(`Systeemtype: ${systemLabel}`, 25, yPos); yPos += 6;
    }
    doc.text(`Aparte groep in meterkast: ${separateGroup ? `Ja (+€${(pricingSettings.electrical_group || 185).toFixed(0)})` : 'Nee'}`, 25, yPos); yPos += 6;
    doc.text(`Kleur leidingen: ${pipeColors.find(c => c.id === selectedColor)?.label || selectedColor}`, 25, yPos); yPos += 6;
    if (pipeLength) {
      doc.text(`Geschatte leidinglengte: ${pipeLength}m`, 25, yPos); yPos += 6;
    }
    yPos += 10;
    
    // Selected airco
    if (selectedAirco) {
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yPos - 5, pageWidth - 30, 40, 'F');
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Geselecteerde Airco', 20, yPos + 5);
      yPos += 12;
      doc.setFontSize(12);
      doc.text(`${selectedAirco.brand} ${selectedAirco.name}`, 25, yPos + 3);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Capaciteit: ${selectedAirco.capacity} | Energielabel: ${selectedAirco.energyLabel}`, 25, yPos + 3);
      yPos += 15;
      
      // Price breakdown - use dynamic pricing settings
      const basePrice = Number(selectedAirco.basePrice) || 0;
      const baseInstallation = totalSize > 40 
        ? (globalSettings.base_installation_large || 450) 
        : (globalSettings.base_installation_small || 350);
      const multisplitPerRoom = globalSettings.multisplit_per_room || 200;
      const extraUnitDiscount = globalSettings.extra_unit_discount || 0.8;
      const pipePerMeter = pricingSettings.pipe_per_meter || 35;
      const pipeIncluded = pricingSettings.pipe_included_meters || 3;
      const electricalGroupPrice = pricingSettings.electrical_group || 185;
      
      const roomMultiplier = rooms.length > 1 && systemType === "multisplit" ? rooms.length * multisplitPerRoom : 0;
      const singleUnitMultiplier = rooms.length > 1 && systemType === "single" ? (rooms.length - 1) * basePrice * extraUnitDiscount : 0;
      const pipeLengthValue = parseFloat(pipeLength) || 0;
      const pipeLengthCost = pipeLengthValue > pipeIncluded ? (pipeLengthValue - pipeIncluded) * pipePerMeter : 0;
      const separateGroupCost = separateGroup ? electricalGroupPrice : 0;
      const totalPrice = calculateTotalPrice(selectedAirco);
      
      yPos += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Prijsopbouw', 20, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      doc.text(`Airco unit (${selectedAirco.brand} ${selectedAirco.name})`, 25, yPos);
      doc.text(`€${basePrice.toFixed(2).replace('.', ',')}`, pageWidth - 50, yPos);
      yPos += 6;
      
      doc.text('Basisinstallatie', 25, yPos);
      doc.text(`€${baseInstallation.toFixed(2).replace('.', ',')}`, pageWidth - 50, yPos);
      yPos += 6;
      
      if (roomMultiplier > 0) {
        doc.text(`Multi-split toeslag (${rooms.length} ruimtes)`, 25, yPos);
        doc.text(`€${roomMultiplier.toFixed(2).replace('.', ',')}`, pageWidth - 50, yPos);
        yPos += 6;
      }
      
      if (singleUnitMultiplier > 0) {
        doc.text(`Extra units (${rooms.length - 1}x)`, 25, yPos);
        doc.text(`€${singleUnitMultiplier.toFixed(2).replace('.', ',')}`, pageWidth - 50, yPos);
        yPos += 6;
      }
      
      if (pipeLengthCost > 0) {
        const extraPipeLength = pipeLengthValue - pipeIncluded;
        doc.text(`Extra leidinglengte (${extraPipeLength.toFixed(1)}m)`, 25, yPos);
        doc.text(`€${pipeLengthCost.toFixed(2).replace('.', ',')}`, pageWidth - 50, yPos);
        yPos += 6;
      }
      
      if (separateGroupCost > 0) {
        doc.text('Aparte groep meterkast', 25, yPos);
        doc.text(`€${separateGroupCost.toFixed(2).replace('.', ',')}`, pageWidth - 50, yPos);
        yPos += 6;
      }
      
      yPos += 4;
      doc.setDrawColor(0, 102, 204);
      doc.setLineWidth(0.5);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 8;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 102, 204);
      doc.text('Totaal indicatieprijs (excl. BTW):', 25, yPos);
      doc.text(`€${totalPrice.toFixed(2).replace('.', ',')}`, pageWidth - 50, yPos);
      yPos += 8;
      // Add incl. BTW line
      const vatRate = pricingSettings.vat_rate || 21;
      const totalInclBTW = totalPrice * (1 + vatRate / 100);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Incl. ${vatRate}% BTW:`, 25, yPos);
      doc.text(`€${totalInclBTW.toFixed(2).replace('.', ',')}`, pageWidth - 50, yPos);
    }
    
    // Footer
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('* Alle prijzen zijn exclusief BTW (21%) tenzij anders vermeld. Prijzen zijn indicatief.', 20, 280);
    doc.text('RV Installatie | info@rv-installatie.nl | 06-13629947', 20, 286);
    
    // Save PDF
    const fileName = `Airco-Offerte-${customerName ? customerName.replace(/\s+/g, '-') : 'RV-Installatie'}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    toast({
      title: "PDF gedownload!",
      description: "Uw offerte is opgeslagen als PDF.",
    });
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

          {/* Insulation & System Type */}
          <Card className="border-2 border-accent/20">
            <CardHeader className="bg-accent/5">
              <CardTitle className="flex items-center gap-2 text-xl">
                🏠 Isolatie & Systeemkeuze
              </CardTitle>
              <CardDescription>
                Bepaalt de benodigde capaciteit en installatiekosten
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Isolation Class */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Isolatieklasse woning
                </label>
                <div className="grid sm:grid-cols-3 gap-3">
                  {insulationClasses.map((insulation) => (
                    <button
                      key={insulation.id}
                      onClick={() => setInsulationClass(insulation.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        insulationClass === insulation.id 
                          ? "border-accent bg-accent/10" 
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{insulation.label}</span>
                        <Badge variant="outline">{insulation.factor} W/m³</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{insulation.description}</span>
                      {insulationClass === insulation.id && (
                        <Check className="w-4 h-4 text-accent absolute top-2 right-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* System Type */}
              {rooms.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Systeemtype
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {systemTypes.map((system) => (
                      <button
                        key={system.id}
                        onClick={() => setSystemType(system.id)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          systemType === system.id 
                            ? "border-accent bg-accent/10" 
                            : "border-border hover:border-accent/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">{system.label}</span>
                          {systemType === system.id && (
                            <Check className="w-4 h-4 text-accent" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{system.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Separate Electrical Group */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Aparte groep in meterkast
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSeparateGroup(false)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      !separateGroup 
                        ? "border-accent bg-accent/10" 
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <span className="font-medium">Nee, niet nodig</span>
                    {!separateGroup && <Check className="w-4 h-4 text-accent" />}
                  </button>
                  <button
                    onClick={() => setSeparateGroup(true)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      separateGroup 
                        ? "border-accent bg-accent/10" 
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <span className="font-medium">Ja, graag (+€{(pricingSettings.electrical_group || 185).toFixed(0)})</span>
                    {separateGroup && <Check className="w-4 h-4 text-accent" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Een aparte groep zorgt voor stabiele stroomvoorziening en is soms verplicht
                </p>
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
                    {/* Compare Button */}
                    <CompareCheckbox
                      productId={unit.id}
                      isSelected={compareProducts.includes(unit.id)}
                      onToggle={toggleCompare}
                      disabled={compareProducts.length >= 4}
                    />
                    {selectedUnit === unit.id && (
                      <div className="absolute bottom-3 left-3 w-8 h-8 bg-accent rounded-full flex items-center justify-center">
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
                        €{calculateTotalPrice(unit).toFixed(2).replace('.', ',')}
                      </div>
                      <div className="text-xs text-muted-foreground">excl. BTW</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* CTA with Customer Form */}
            {selectedUnit && !quoteSubmitted && (
              <div className="mt-12 bg-primary/5 rounded-2xl p-8">
                <h3 className="font-heading text-2xl font-bold text-foreground mb-4 text-center">
                  Interesse in de {aircoUnits.find(u => u.id === selectedUnit)?.name}?
                </h3>
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto text-center">
                  Vul uw gegevens in en ik neem binnen 24 uur contact met u op.
                  {photos.length > 0 && ` (${photos.length} foto's geselecteerd)`}
                </p>

                {/* Customer Details Form */}
                <div className="max-w-md mx-auto space-y-4 mb-6">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Vul uw contactgegevens in zodat ik u kan bereiken.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Uw naam <span className="text-muted-foreground font-normal">(optioneel)</span>
                    </label>
                    <Input
                      placeholder="Uw volledige naam"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        <Mail className="w-4 h-4 inline mr-2" />
                        E-mail <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="email"
                        placeholder="uw@email.nl"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className={!customerEmail ? "border-muted-foreground/50" : "border-green-500"}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        <Phone className="w-4 h-4 inline mr-2" />
                        Telefoon <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="tel"
                        placeholder="06-12345678"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className={!customerPhone ? "border-muted-foreground/50" : "border-green-500"}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
                  <Button 
                    size="lg" 
                    onClick={handleSubmitQuote}
                    disabled={isSubmitting || !customerEmail || !customerPhone}
                    className="bg-accent hover:bg-accent/90 disabled:opacity-50"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    {isSubmitting ? "Verzenden..." : "Offerte Aanvragen"}
                  </Button>
                  <Button size="lg" variant="outline" onClick={handleWhatsAppQuote}>
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Via WhatsApp
                  </Button>
                  <Button size="lg" variant="secondary" onClick={handleExportPDF}>
                    <FileDown className="w-5 h-5 mr-2" />
                    Download PDF
                  </Button>
                </div>
                {(!customerEmail || !customerPhone) && (
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Vul e-mail en telefoon in om een offerte aan te vragen
                  </p>
                )}
              </div>
            )}

            {/* Success Message */}
            {quoteSubmitted && (
              <div className="mt-12 text-center bg-green-50 border border-green-200 rounded-2xl p-8">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-foreground mb-4">
                  Aanvraag Ontvangen!
                </h3>
                <p className="text-muted-foreground max-w-xl mx-auto mb-6">
                  Bedankt voor uw offerteaanvraag. Ik neem binnen 24 uur contact met u op om de mogelijkheden te bespreken.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setQuoteSubmitted(false);
                    setSelectedUnit(null);
                    setShowResults(false);
                    setRooms([{ id: "1", name: "Ruimte 1", size: "", ceilingHeight: "2.5", type: "living" }]);
                    setPhotos([]);
                    setCustomerName("");
                    setCustomerEmail("");
                    setCustomerPhone("");
                    setAdditionalNotes("");
                    setInsulationClass("40");
                    setSeparateGroup(false);
                    setSystemType("single");
                  }}
                >
                  Nieuwe Berekening
                </Button>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-center text-sm text-muted-foreground mt-8">
              * Alle prijzen zijn exclusief BTW (21%) en indicatief. Vraag een vrijblijvende offerte aan voor een exacte prijs.
            </p>
          </div>
        )}

        {/* Product Compare Component */}
        <ProductCompare 
          products={getCompareProductsData()} 
          category="Airco"
          selectedProducts={compareProducts}
          onToggleProduct={toggleCompare}
        />
      </div>
    </section>
  );
};

export default AircoCalculator;
