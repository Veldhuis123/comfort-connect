import { useState, useCallback } from "react";
import { Cable, Router, Wifi, Camera, Battery, Zap, Plus, Trash2, Edit2, Save, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

export interface CableRun {
  id: string;
  from: string;
  to: string;
  cableType: string;
  length: number;
  notes: string;
}

export interface InstallationDevice {
  id: string;
  name: string;
  type: "router" | "switch" | "accesspoint" | "camera" | "battery" | "inverter" | "charger" | "airco" | "panel" | "custom";
  location: string;
  quantity: number;
}

interface CableType {
  id: string;
  name: string;
  pricePerMeter: number;
  description: string;
  color: string;
}

const cableTypes: CableType[] = [
  { id: "cat6", name: "CAT6 UTP", pricePerMeter: 0.85, description: "Netwerkkabel voor data", color: "#3b82f6" },
  { id: "cat6a", name: "CAT6a S/FTP", pricePerMeter: 1.25, description: "Afgeschermde netwerkkabel", color: "#6366f1" },
  { id: "cat7", name: "CAT7 S/FTP", pricePerMeter: 1.75, description: "Premium netwerkkabel", color: "#8b5cf6" },
  { id: "coax", name: "Coax RG6", pricePerMeter: 0.95, description: "Coaxkabel voor camera's", color: "#f59e0b" },
  { id: "fiber-om3", name: "Fiber OM3", pricePerMeter: 2.50, description: "Glasvezel multimode", color: "#10b981" },
  { id: "fiber-sm", name: "Fiber Singlemode", pricePerMeter: 3.00, description: "Glasvezel lange afstand", color: "#14b8a6" },
  { id: "power-3x2.5", name: "3x2.5mm² NYM", pricePerMeter: 1.80, description: "Stroomkabel standaard", color: "#ef4444" },
  { id: "power-5x2.5", name: "5x2.5mm² NYM", pricePerMeter: 2.50, description: "Stroomkabel 3-fase", color: "#dc2626" },
  { id: "power-5x6", name: "5x6mm² NYM", pricePerMeter: 4.50, description: "Stroomkabel zwaar", color: "#b91c1c" },
  { id: "solar-4mm", name: "Zonnekabel 4mm²", pricePerMeter: 1.20, description: "DC kabel zonnepanelen", color: "#eab308" },
  { id: "solar-6mm", name: "Zonnekabel 6mm²", pricePerMeter: 1.60, description: "DC kabel grotere systemen", color: "#ca8a04" },
  { id: "airco-duo", name: "Airco leiding duo", pricePerMeter: 15.00, description: "Koelleiding set", color: "#06b6d4" },
];

const deviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  router: Router,
  switch: Router,
  accesspoint: Wifi,
  camera: Camera,
  battery: Battery,
  inverter: Zap,
  charger: Zap,
  airco: Zap,
  panel: Zap,
  custom: Cable,
};

interface InstallationSchemaProps {
  initialDevices?: InstallationDevice[];
  initialCables?: CableRun[];
  onSave?: (devices: InstallationDevice[], cables: CableRun[]) => void;
  readOnly?: boolean;
}

const InstallationSchema = ({ 
  initialDevices = [], 
  initialCables = [], 
  onSave,
  readOnly = false 
}: InstallationSchemaProps) => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<InstallationDevice[]>(initialDevices);
  const [cables, setCables] = useState<CableRun[]>(initialCables);
  const [editingCable, setEditingCable] = useState<string | null>(null);

  // New cable form
  const [newCable, setNewCable] = useState<Partial<CableRun>>({
    from: "",
    to: "",
    cableType: "cat6",
    length: 0,
    notes: "",
  });

  // New device form
  const [newDevice, setNewDevice] = useState<Partial<InstallationDevice>>({
    name: "",
    type: "custom",
    location: "",
    quantity: 1,
  });

  const addDevice = () => {
    if (!newDevice.name || !newDevice.location) {
      toast({ title: "Vul alle velden in", variant: "destructive" });
      return;
    }
    const device: InstallationDevice = {
      id: Date.now().toString(),
      name: newDevice.name || "",
      type: newDevice.type || "custom",
      location: newDevice.location || "",
      quantity: newDevice.quantity || 1,
    };
    setDevices([...devices, device]);
    setNewDevice({ name: "", type: "custom", location: "", quantity: 1 });
  };

  const removeDevice = (id: string) => {
    setDevices(devices.filter(d => d.id !== id));
    // Also remove cables connected to this device
    setCables(cables.filter(c => c.from !== id && c.to !== id));
  };

  const addCable = () => {
    if (!newCable.from || !newCable.to || !newCable.length) {
      toast({ title: "Vul alle velden in", variant: "destructive" });
      return;
    }
    const cable: CableRun = {
      id: Date.now().toString(),
      from: newCable.from || "",
      to: newCable.to || "",
      cableType: newCable.cableType || "cat6",
      length: newCable.length || 0,
      notes: newCable.notes || "",
    };
    setCables([...cables, cable]);
    setNewCable({ from: "", to: "", cableType: "cat6", length: 0, notes: "" });
  };

  const updateCable = (id: string, updates: Partial<CableRun>) => {
    setCables(cables.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCable = (id: string) => {
    setCables(cables.filter(c => c.id !== id));
  };

  const getTotalCableLength = () => {
    return cables.reduce((sum, c) => sum + c.length, 0);
  };

  const getTotalCableCost = () => {
    return cables.reduce((sum, c) => {
      const cableType = cableTypes.find(t => t.id === c.cableType);
      return sum + (c.length * (cableType?.pricePerMeter || 0));
    }, 0);
  };

  const getCableLengthByType = () => {
    const byType: Record<string, number> = {};
    cables.forEach(c => {
      byType[c.cableType] = (byType[c.cableType] || 0) + c.length;
    });
    return byType;
  };

  const getDeviceName = (id: string) => {
    const device = devices.find(d => d.id === id);
    return device ? `${device.name} (${device.location})` : id;
  };

  const handleSave = () => {
    onSave?.(devices, cables);
    toast({ title: "Schema opgeslagen!" });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(0, 102, 204);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Installatieschema', 20, 22);
    doc.setFontSize(10);
    doc.text(`Datum: ${new Date().toLocaleDateString('nl-NL')}`, pageWidth - 50, 22);
    
    doc.setTextColor(0, 0, 0);
    let yPos = 50;

    // Devices section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Apparaten', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    devices.forEach(device => {
      doc.text(`• ${device.quantity}x ${device.name} - ${device.location}`, 25, yPos);
      yPos += 6;
    });
    
    yPos += 10;

    // Cables section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Bekabeling', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    cables.forEach(cable => {
      const cableType = cableTypes.find(t => t.id === cable.cableType);
      doc.text(`• ${getDeviceName(cable.from)} → ${getDeviceName(cable.to)}`, 25, yPos);
      yPos += 5;
      doc.text(`  ${cableType?.name || cable.cableType}: ${cable.length}m`, 30, yPos);
      yPos += 6;
    });

    yPos += 10;

    // Summary
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPos - 5, pageWidth - 30, 45, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Samenvatting', 20, yPos + 5);
    yPos += 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Totaal kabellengte: ${getTotalCableLength()}m`, 25, yPos);
    yPos += 6;
    doc.text(`Geschatte kabelkosten: €${getTotalCableCost().toFixed(2)}`, 25, yPos);
    yPos += 10;

    // Cable breakdown
    const byType = getCableLengthByType();
    Object.entries(byType).forEach(([type, length]) => {
      const cableType = cableTypes.find(t => t.id === type);
      doc.text(`${cableType?.name || type}: ${length}m`, 25, yPos);
      yPos += 5;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('R. Veldhuis Installatie - www.rv-installatie.nl', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    doc.save('installatieschema.pdf');
    toast({ title: "PDF gedownload!" });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <Card className="border-2 border-accent/20">
          <CardHeader className="bg-accent/5">
            <CardTitle className="flex items-center gap-2">
              <Cable className="w-6 h-6 text-accent" />
              Interactief Installatieschema
            </CardTitle>
            <CardDescription>
              Voeg apparaten toe en plan de bekabeling met lengtes en kosten
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Devices Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Router className="w-5 h-5 text-accent" />
                Apparaten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Device List */}
              {devices.map(device => {
                const Icon = deviceIcons[device.type] || Cable;
                return (
                  <div key={device.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Icon className="w-5 h-5 text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{device.quantity}x {device.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{device.location}</p>
                    </div>
                    {!readOnly && (
                      <Button variant="ghost" size="icon" onClick={() => removeDevice(device.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                );
              })}

              {/* Add Device Form */}
              {!readOnly && (
                <div className="border-t pt-4 mt-4 space-y-3">
                  <p className="font-medium text-sm">Apparaat toevoegen</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Naam (bijv. UDM-SE)"
                      value={newDevice.name}
                      onChange={e => setNewDevice({ ...newDevice, name: e.target.value })}
                    />
                    <Input
                      placeholder="Locatie"
                      value={newDevice.location}
                      onChange={e => setNewDevice({ ...newDevice, location: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={newDevice.type} onValueChange={v => setNewDevice({ ...newDevice, type: v as InstallationDevice["type"] })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="router">Router/Gateway</SelectItem>
                        <SelectItem value="switch">Switch</SelectItem>
                        <SelectItem value="accesspoint">Access Point</SelectItem>
                        <SelectItem value="camera">Camera</SelectItem>
                        <SelectItem value="battery">Thuisaccu</SelectItem>
                        <SelectItem value="inverter">Omvormer</SelectItem>
                        <SelectItem value="charger">Laadpaal</SelectItem>
                        <SelectItem value="airco">Airco</SelectItem>
                        <SelectItem value="panel">Zonnepaneel</SelectItem>
                        <SelectItem value="custom">Anders</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Aantal"
                        value={newDevice.quantity}
                        onChange={e => setNewDevice({ ...newDevice, quantity: parseInt(e.target.value) || 1 })}
                        min={1}
                        className="w-20"
                      />
                      <Button onClick={addDevice} className="flex-1">
                        <Plus className="w-4 h-4 mr-1" /> Toevoegen
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cables Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Cable className="w-5 h-5 text-accent" />
                Bekabeling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cable List */}
              {cables.map(cable => {
                const cableType = cableTypes.find(t => t.id === cable.cableType);
                const isEditing = editingCable === cable.id;
                
                return (
                  <div 
                    key={cable.id} 
                    className="p-3 bg-muted/30 rounded-lg space-y-2"
                    style={{ borderLeft: `4px solid ${cableType?.color || '#888'}` }}
                  >
                    {isEditing && !readOnly ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={cable.from} onValueChange={v => updateCable(cable.id, { from: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {devices.map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.name} ({d.location})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={cable.to} onValueChange={v => updateCable(cable.id, { to: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {devices.map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.name} ({d.location})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Select value={cable.cableType} onValueChange={v => updateCable(cable.id, { cableType: v })}>
                            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {cableTypes.map(t => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name} (€{t.pricePerMeter}/m)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={cable.length}
                            onChange={e => updateCable(cable.id, { length: parseFloat(e.target.value) || 0 })}
                            className="w-24"
                            placeholder="Meter"
                          />
                          <Button size="icon" onClick={() => setEditingCable(null)}>
                            <Save className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">
                              {getDeviceName(cable.from)} → {getDeviceName(cable.to)}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" style={{ backgroundColor: cableType?.color, color: 'white' }}>
                                {cableType?.name}
                              </Badge>
                              <span className="text-sm font-medium">{cable.length}m</span>
                              <span className="text-sm text-muted-foreground">
                                (€{(cable.length * (cableType?.pricePerMeter || 0)).toFixed(2)})
                              </span>
                            </div>
                          </div>
                          {!readOnly && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setEditingCable(cable.id)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => removeCable(cable.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {cable.notes && (
                          <p className="text-sm text-muted-foreground">{cable.notes}</p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {/* Add Cable Form */}
              {!readOnly && devices.length >= 2 && (
                <div className="border-t pt-4 mt-4 space-y-3">
                  <p className="font-medium text-sm">Kabelverbinding toevoegen</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={newCable.from} onValueChange={v => setNewCable({ ...newCable, from: v })}>
                      <SelectTrigger><SelectValue placeholder="Van..." /></SelectTrigger>
                      <SelectContent>
                        {devices.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name} ({d.location})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={newCable.to} onValueChange={v => setNewCable({ ...newCable, to: v })}>
                      <SelectTrigger><SelectValue placeholder="Naar..." /></SelectTrigger>
                      <SelectContent>
                        {devices.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name} ({d.location})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Select value={newCable.cableType} onValueChange={v => setNewCable({ ...newCable, cableType: v })}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Kabeltype..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cableTypes.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                              {t.name} (€{t.pricePerMeter}/m)
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="Lengte"
                        value={newCable.length || ""}
                        onChange={e => setNewCable({ ...newCable, length: parseFloat(e.target.value) || 0 })}
                        className="w-28 pr-8"
                        min={0}
                        step={0.5}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">m</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Notities (optioneel)"
                      value={newCable.notes}
                      onChange={e => setNewCable({ ...newCable, notes: e.target.value })}
                      className="flex-1"
                    />
                    <Button onClick={addCable}>
                      <Plus className="w-4 h-4 mr-1" /> Toevoegen
                    </Button>
                  </div>
                </div>
              )}

              {devices.length < 2 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Voeg minimaal 2 apparaten toe om kabels te plannen
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        {cables.length > 0 && (
          <Card className="border-2 border-accent">
            <CardHeader className="bg-accent/10">
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-accent" />
                Samenvatting Bekabeling
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-foreground">{getTotalCableLength()}</p>
                  <p className="text-sm text-muted-foreground">meter totaal</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-accent">€{getTotalCableCost().toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">kabelkosten (excl. arbeid)</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-foreground">{cables.length}</p>
                  <p className="text-sm text-muted-foreground">kabelverbindingen</p>
                </div>
              </div>

              {/* Cable breakdown by type */}
              <div className="space-y-2">
                <p className="font-medium text-sm mb-3">Kabeloverzicht per type:</p>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(getCableLengthByType()).map(([type, length]) => {
                    const cableType = cableTypes.find(t => t.id === type);
                    return (
                      <div 
                        key={type} 
                        className="flex items-center gap-2 p-2 bg-muted/20 rounded"
                        style={{ borderLeft: `3px solid ${cableType?.color || '#888'}` }}
                      >
                        <span className="text-sm flex-1">{cableType?.name || type}</span>
                        <span className="font-medium">{length}m</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-4 border-t">
                {onSave && !readOnly && (
                  <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" /> Schema Opslaan
                  </Button>
                )}
                <Button variant="outline" onClick={exportToPDF}>
                  <Download className="w-4 h-4 mr-2" /> Exporteer PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

export default InstallationSchema;
